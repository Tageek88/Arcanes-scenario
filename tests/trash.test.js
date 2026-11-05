import { describe, it, expect } from "vitest";
import { api, db } from "@/api/localClient";
import { withTrashGroup } from "@/api/trashCapture";
import { buildBackupPayload, restoreFromPayload } from "@/lib/save/backup";
import { deleteCampaignCascade } from "@/lib/services/campaignDelete";
import { deleteQuest } from "@/lib/services/quests";
import {
  MissingCampaignError,
  TRASH_DAYS,
  daysLeft,
  describeContent,
  deleteTrashEntry,
  emptyTrash,
  listTrash,
  purgeExpiredTrash,
  restoreTrash,
} from "@/lib/services/trash";
import { all, makeCampaign } from "./helpers";

const DAY = 24 * 60 * 60 * 1000;

describe("corbeille : suppression et restauration", () => {
  it("une suppression simple est copiée, puis se restaure à l'identique", async () => {
    const campaign = await makeCampaign();
    const scene = await api.entities.Scene.create({ campaign_id: campaign.id, title: "Embuscade", summary: "Au gué" });
    await api.entities.Scene.delete(scene.id);
    expect(await all("Scene", campaign.id)).toHaveLength(0);

    const [entry] = await listTrash();
    expect(entry.label).toBe("Embuscade");
    expect(entry.kind).toBe("Scene");
    expect(entry.campaign_id).toBe(campaign.id);

    const { restored } = await restoreTrash(entry.id);
    expect(restored).toBe(1);
    const back = await api.entities.Scene.get(scene.id);
    expect(back).toEqual(scene);
    expect(await listTrash()).toHaveLength(0);
  });

  it("un groupe rassemble ce qui est supprimé en une action", async () => {
    const campaign = await makeCampaign();
    const act = await api.entities.Act.create({ campaign_id: campaign.id, title: "Acte I" });
    await api.entities.Scene.create({ campaign_id: campaign.id, act_id: act.id, title: "A" });
    await api.entities.Scene.create({ campaign_id: campaign.id, act_id: act.id, title: "B" });
    await withTrashGroup({ label: "Acte I (et ses scènes)", kind: "Act", campaignId: campaign.id }, async () => {
      await api.entities.Scene.deleteMany({ act_id: act.id });
      await api.entities.Act.delete(act.id);
    });
    const entries = await listTrash();
    expect(entries).toHaveLength(1);
    expect(describeContent(entries[0])).toBe("2 scènes, 1 acte");
    await restoreTrash(entries[0].id);
    expect(await all("Scene", campaign.id)).toHaveLength(2);
    expect(await all("Act", campaign.id)).toHaveLength(1);
  });

  it("une relation seule n'est pas copiée, mais celles d'un PNJ supprimé dans un groupe le sont", async () => {
    const campaign = await makeCampaign();
    const relation = await api.entities.NPCRelation.create({ campaign_id: campaign.id, pair_id: "p", from_id: "1", to_id: "2" });
    await api.entities.NPCRelation.delete(relation.id);
    expect(await listTrash()).toHaveLength(0);

    const npc = await api.entities.NPC.create({ campaign_id: campaign.id, name: "Élise" });
    const other = await api.entities.NPCRelation.create({ campaign_id: campaign.id, pair_id: "q", from_id: npc.id, to_id: "9" });
    await withTrashGroup({ label: "Élise", kind: "NPC", campaignId: campaign.id }, async () => {
      await api.entities.NPCRelation.deleteMany({ id: { $in: [other.id] } });
      await api.entities.NPC.delete(npc.id);
    });
    const [entry] = await listTrash();
    expect(Object.keys(entry.rows).sort()).toEqual(["NPC", "NPCRelation"]);
  });

  it("noTrash : suppression sans copie", async () => {
    const campaign = await makeCampaign();
    await api.entities.Note.delete((await api.entities.Note.create({ campaign_id: campaign.id, title: "x" })).id, { noTrash: true });
    expect(await listTrash()).toHaveLength(0);
  });

  it("une campagne supprimée se restaure en bloc, sans PDF ni sondages", async () => {
    const campaign = await makeCampaign("Ombres");
    await api.entities.Scene.create({ campaign_id: campaign.id, title: "S" });
    await api.entities.NPC.create({ campaign_id: campaign.id, name: "N" });
    await api.entities.SessionPoll.create({ campaign_id: campaign.id, title: "sondage", owner_token: "secret" });
    await api.entities.CampaignDocument.create({ campaign_id: campaign.id, name: "pdf" });

    await deleteCampaignCascade(campaign.id);
    expect((await api.entities.Campaign.filter({})).items).toHaveLength(0);
    const entries = await listTrash();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ label: "Ombres", kind: "Campaign" });
    expect(Object.keys(entries[0].rows)).not.toContain("SessionPoll");
    expect(Object.keys(entries[0].rows)).not.toContain("CampaignDocument");

    await restoreTrash(entries[0].id);
    expect((await api.entities.Campaign.get(campaign.id)).name).toBe("Ombres");
    expect(await all("Scene", campaign.id)).toHaveLength(1);
    expect(await all("NPC", campaign.id)).toHaveLength(1);
    expect(await all("SessionPoll", campaign.id)).toHaveLength(0);
  });

  it("une erreur en cours de suppression de campagne ne laisse rien dans la corbeille", async () => {
    const campaign = await makeCampaign();
    await api.entities.Scene.create({ campaign_id: campaign.id, title: "S" });
    const original = api.entities.Scene.deleteMany;
    api.entities.Scene.deleteMany = async () => {
      throw new Error("panne simulée");
    };
    try {
      await expect(deleteCampaignCascade(campaign.id)).rejects.toThrow("panne simulée");
    } finally {
      api.entities.Scene.deleteMany = original;
    }
    expect(await listTrash()).toHaveLength(0);
    expect(await all("Scene", campaign.id)).toHaveLength(1);
  });

  it("supprimer une quête : une seule entrée, restaurable", async () => {
    const campaign = await makeCampaign();
    const quest = await api.entities.Quest.create({ campaign_id: campaign.id, title: "Quête B" });
    const act = await api.entities.Act.create({ campaign_id: campaign.id, quest_id: quest.id, title: "Acte" });
    await api.entities.Scene.create({ campaign_id: campaign.id, quest_id: quest.id, act_id: act.id, title: "Scène" });
    await deleteQuest(campaign.id, quest.id);
    const entries = await listTrash();
    expect(entries).toHaveLength(1);
    expect(entries[0].label).toBe("Quête B");
    await restoreTrash(entries[0].id);
    expect(await all("Quest", campaign.id)).toHaveLength(1);
    expect(await all("Scene", campaign.id)).toHaveLength(1);
  });

  it("refuse de restaurer un élément dont la campagne n'existe plus, et le garde", async () => {
    const campaign = await makeCampaign();
    const scene = await api.entities.Scene.create({ campaign_id: campaign.id, title: "S" });
    await api.entities.Scene.delete(scene.id);
    await deleteCampaignCascade(campaign.id);
    const entries = await listTrash();
    const sceneEntry = entries.find((entry) => entry.kind === "Scene");
    await expect(restoreTrash(sceneEntry.id)).rejects.toBeInstanceOf(MissingCampaignError);
    expect((await listTrash()).some((entry) => entry.id === sceneEntry.id)).toBe(true);
    // Une fois la campagne restaurée, la scène peut l'être.
    await restoreTrash(entries.find((entry) => entry.kind === "Campaign").id);
    await restoreTrash(sceneEntry.id);
    expect(await all("Scene", campaign.id)).toHaveLength(1);
  });

  it("la restauration n'écrase pas une ligne qui existe déjà", async () => {
    const campaign = await makeCampaign();
    const note = await api.entities.Note.create({ campaign_id: campaign.id, title: "avant" });
    await api.entities.Note.delete(note.id);
    await db.table("Note").put({ ...note, title: "après" });
    const [entry] = await listTrash();
    const { restored } = await restoreTrash(entry.id);
    expect(restored).toBe(0);
    expect((await api.entities.Note.get(note.id)).title).toBe("après");
  });
});

describe("corbeille : durée, purge, sauvegarde", () => {
  it("daysLeft compte les jours restants sur 30", () => {
    const now = Date.parse("2026-11-10T12:00:00Z");
    expect(daysLeft("2026-11-10T11:00:00Z", now)).toBe(TRASH_DAYS);
    expect(daysLeft("2026-10-12T12:00:00Z", now)).toBe(1);
    expect(daysLeft("2026-10-11T12:00:00Z", now)).toBe(0);
    expect(daysLeft("n'importe quoi", now)).toBe(0);
  });

  it("purge les entrées de plus de 30 jours seulement", async () => {
    const old = new Date(Date.now() - 31 * DAY).toISOString();
    const recent = new Date(Date.now() - 5 * DAY).toISOString();
    await db.table("Trash").bulkPut([
      { id: "vieux", label: "vieux", kind: "Note", campaign_id: "c", deleted_at: old, rows: { Note: [{ id: "n1" }] } },
      { id: "recent", label: "récent", kind: "Note", campaign_id: "c", deleted_at: recent, rows: { Note: [{ id: "n2" }] } },
    ]);
    expect(await purgeExpiredTrash()).toBe(1);
    expect((await listTrash()).map((entry) => entry.id)).toEqual(["recent"]);
  });

  it("supprimer définitivement et vider", async () => {
    const campaign = await makeCampaign();
    for (const title of ["a", "b", "c"]) {
      const note = await api.entities.Note.create({ campaign_id: campaign.id, title });
      await api.entities.Note.delete(note.id);
    }
    const entries = await listTrash();
    expect(entries).toHaveLength(3);
    await deleteTrashEntry(entries[0].id);
    expect(await listTrash()).toHaveLength(2);
    await emptyTrash();
    expect(await listTrash()).toHaveLength(0);
  });

  it("la corbeille n'est ni exportée ni touchée par une restauration de sauvegarde", async () => {
    const campaign = await makeCampaign();
    const note = await api.entities.Note.create({ campaign_id: campaign.id, title: "n" });
    const payload = await buildBackupPayload();
    await api.entities.Note.delete(note.id);
    expect(payload.data.Trash).toBeUndefined();
    await restoreFromPayload(payload);
    expect(await listTrash()).toHaveLength(1);
    expect(await all("Note", campaign.id)).toHaveLength(1);
  });
});
