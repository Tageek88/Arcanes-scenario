import { describe, it, expect } from "vitest";
import { api } from "@/api/localClient";
import {
  ensureQuests, createQuest, deleteQuest, makeRecurring, stopRecurring, loadQuests, renameQuest, MAIN_QUEST_TITLE,
} from "@/lib/services/quests";
import { all, makeCampaign } from "./helpers";

// Campagne « ancienne » : des actes et des scènes sans quête, dont une scène sans acte.
async function oldCampaign() {
  const campaign = await makeCampaign();
  const c = campaign.id;
  const a1 = await api.entities.Act.create({ campaign_id: c, title: "A1", order: 1 });
  const a2 = await api.entities.Act.create({ campaign_id: c, title: "A2", order: 2 });
  const s1 = await api.entities.Scene.create({ campaign_id: c, act_id: a1.id, title: "S1", order: 1, npc_ids: ["n1"], location_ids: ["l1"], clue_ids: ["i1"], next_scene_ids: [] });
  const s2 = await api.entities.Scene.create({ campaign_id: c, act_id: a2.id, title: "S2", order: 1 });
  const s3 = await api.entities.Scene.create({ campaign_id: c, act_id: "", title: "S3", order: 1 });
  return { c, a1, a2, s1, s2, s3 };
}

describe("migration vers les quêtes (ensureQuests)", () => {
  it("crée « Quête principale » et y rattache actes et scènes, y compris sans acte", async () => {
    const { c } = await oldCampaign();
    expect(await ensureQuests(c)).toBe(true);
    const quests = await loadQuests(c);
    expect(quests).toHaveLength(1);
    expect(quests[0].title).toBe(MAIN_QUEST_TITLE);
    expect((await all("Act", c)).every((a) => a.quest_id === quests[0].id)).toBe(true);
    expect((await all("Scene", c)).every((s) => s.quest_id === quests[0].id)).toBe(true);
  });

  it("est répétable : un second appel n'écrit rien", async () => {
    const { c } = await oldCampaign();
    await ensureQuests(c);
    expect(await ensureQuests(c)).toBe(false);
    expect(await loadQuests(c)).toHaveLength(1);
  });

  it("deux chargements simultanés ne créent qu'une quête", async () => {
    const { c } = await oldCampaign();
    await Promise.all([ensureQuests(c), ensureQuests(c), ensureQuests(c)]);
    expect(await loadQuests(c)).toHaveLength(1);
  });

  it("ne fait rien pour une campagne vide", async () => {
    const campaign = await makeCampaign();
    expect(await ensureQuests(campaign.id)).toBe(false);
    expect(await loadQuests(campaign.id)).toHaveLength(0);
  });

  it("ne touche pas aux autres campagnes", async () => {
    const one = await oldCampaign();
    const other = await oldCampaign();
    await ensureQuests(one.c);
    expect(await loadQuests(other.c)).toHaveLength(0);
    expect((await all("Act", other.c)).every((a) => !a.quest_id)).toBe(true);
  });

  it("une scène d'une quête existante garde sa quête ; un acte orphelin est adopté par la première", async () => {
    const { c } = await oldCampaign();
    await ensureQuests(c);
    const [main] = await loadQuests(c);
    const second = await createQuest(c, "Intrigue");
    const stray = await api.entities.Act.create({ campaign_id: c, title: "Perdu", order: 9 });
    await ensureQuests(c);
    expect((await api.entities.Act.get(stray.id)).quest_id).toBe(main.id);
    expect((await loadQuests(c)).map((q) => q.id)).toEqual([main.id, second.id]);
  });
});

describe("quêtes : création, renommage, suppression", () => {
  it("createQuest numérote l'ordre et reçoit un titre par défaut", async () => {
    const campaign = await makeCampaign();
    const q1 = await createQuest(campaign.id, "Intrigue");
    const q2 = await createQuest(campaign.id, "  ");
    expect(q1.order).toBe(1);
    expect(q2.order).toBe(2);
    expect(q2.title).toBe(MAIN_QUEST_TITLE);
  });

  it("renameQuest refuse un titre vide", async () => {
    const campaign = await makeCampaign();
    const q = await createQuest(campaign.id, "Intrigue");
    await expect(renameQuest(q.id, "   ")).rejects.toThrow();
    await renameQuest(q.id, " Fin ");
    expect((await api.entities.Quest.get(q.id)).title).toBe("Fin");
  });

  it("deleteQuest supprime ses actes et scènes, pas ceux des autres quêtes", async () => {
    const { c } = await oldCampaign();
    await ensureQuests(c);
    const [main] = await loadQuests(c);
    const other = await createQuest(c, "Autre");
    const act = await api.entities.Act.create({ campaign_id: c, quest_id: other.id, title: "Acte B", order: 1 });
    await api.entities.Scene.create({ campaign_id: c, quest_id: other.id, act_id: act.id, title: "SB", order: 1 });
    const result = await deleteQuest(c, other.id);
    expect(result).toEqual({ scenes: 1, acts: 1 });
    expect((await all("Scene", c)).every((s) => s.quest_id === main.id)).toBe(true);
    expect(await all("Act", c)).toHaveLength(2);
    expect((await loadQuests(c)).map((q) => q.id)).toEqual([main.id]);
  });

  it("la dernière quête peut être supprimée, et aucune n'est recréée seule", async () => {
    const { c } = await oldCampaign();
    await ensureQuests(c);
    const [main] = await loadQuests(c);
    await deleteQuest(c, main.id);
    expect(await loadQuests(c)).toHaveLength(0);
    expect(await all("Act", c)).toHaveLength(0);
    expect(await all("Scene", c)).toHaveLength(0);
    expect(await ensureQuests(c)).toBe(false);
  });
});

describe("scènes récurrentes (copies indépendantes)", () => {
  async function setup() {
    const { c, s1 } = await oldCampaign();
    await ensureQuests(c);
    const [main] = await loadQuests(c);
    const second = await createQuest(c, "Intrigue");
    const source = await api.entities.Scene.get(s1.id);
    return { c, main, second, source };
  }

  it("makeRecurring crée une copie par autre quête, avec les mêmes liens et le statut « brouillon »", async () => {
    const { c, second, source } = await setup();
    await api.entities.Scene.update(source.id, { status: "joue", gm_notes: "secret" });
    const result = await makeRecurring(await api.entities.Scene.get(source.id));
    expect(result.copies).toBe(1);
    const copy = (await all("Scene", c)).find((s) => s.quest_id === second.id);
    expect(copy).toMatchObject({ title: "S1", npc_ids: ["n1"], location_ids: ["l1"], clue_ids: ["i1"], status: "brouillon", gm_notes: "secret", act_id: "" });
    expect(copy.recurring_group).toBe(result.group);
    expect((await api.entities.Scene.get(source.id)).recurring_group).toBe(result.group);
  });

  it("makeRecurring est répétable sans doublon", async () => {
    const { source } = await setup();
    await makeRecurring(source);
    const again = await makeRecurring(await api.entities.Scene.get(source.id));
    expect(again.copies).toBe(0);
  });

  it("une copie est placée dans le premier acte de la quête s'il y en a un", async () => {
    const { c, second, source } = await setup();
    const act = await api.entities.Act.create({ campaign_id: c, quest_id: second.id, title: "Acte B", order: 1 });
    await makeRecurring(source);
    expect((await all("Scene", c)).find((s) => s.quest_id === second.id).act_id).toBe(act.id);
  });

  it("une nouvelle quête reçoit une copie de chaque groupe récurrent", async () => {
    const { c, source } = await setup();
    await makeRecurring(source);
    const third = await createQuest(c, "Épilogue");
    const copies = (await all("Scene", c)).filter((s) => s.quest_id === third.id);
    expect(copies).toHaveLength(1);
    expect(copies[0].title).toBe("S1");
  });

  it("les « scènes suivantes » d'une copie ne pointent jamais vers une autre quête", async () => {
    const { c, main, second } = await setup();
    const a = await api.entities.Scene.create({ campaign_id: c, quest_id: main.id, title: "A", order: 5, next_scene_ids: [] });
    const b = await api.entities.Scene.create({ campaign_id: c, quest_id: main.id, title: "B", order: 6, next_scene_ids: [] });
    const outside = await api.entities.Scene.create({ campaign_id: c, quest_id: main.id, title: "Hors groupe", order: 7 });
    await api.entities.Scene.update(a.id, { next_scene_ids: [b.id, outside.id] });
    await makeRecurring(await api.entities.Scene.get(a.id));
    const copyOfA = (await all("Scene", c)).find((s) => s.quest_id === second.id && s.title === "A");
    expect(copyOfA.next_scene_ids).toEqual([]);
  });

  it("à la création d'une quête, les copies d'un même envoi gardent leurs liens entre elles", async () => {
    const { c, main } = await setup();
    const a = await api.entities.Scene.create({ campaign_id: c, quest_id: main.id, title: "A", order: 5, next_scene_ids: [] });
    const b = await api.entities.Scene.create({ campaign_id: c, quest_id: main.id, title: "B", order: 6, next_scene_ids: [] });
    const outside = await api.entities.Scene.create({ campaign_id: c, quest_id: main.id, title: "Hors groupe", order: 7 });
    await api.entities.Scene.update(a.id, { next_scene_ids: [b.id, outside.id] });
    await makeRecurring(await api.entities.Scene.get(a.id));
    await makeRecurring(await api.entities.Scene.get(b.id));
    const third = await createQuest(c, "Épilogue");
    const copies = (await all("Scene", c)).filter((s) => s.quest_id === third.id);
    const copyOfA = copies.find((s) => s.title === "A");
    const copyOfB = copies.find((s) => s.title === "B");
    expect(copyOfA.next_scene_ids).toEqual([copyOfB.id]);
  });

  it("les copies sont indépendantes : supprimer l'originale garde les autres", async () => {
    const { c, source } = await setup();
    await makeRecurring(source);
    await api.entities.Scene.delete(source.id);
    expect((await all("Scene", c)).filter((s) => s.recurring_group)).toHaveLength(1);
  });

  it("stopRecurring retire une scène de son groupe sans toucher aux autres", async () => {
    const { c, source } = await setup();
    await makeRecurring(source);
    await stopRecurring(await api.entities.Scene.get(source.id));
    const groups = (await all("Scene", c)).filter((s) => s.recurring_group);
    expect(groups).toHaveLength(1);
    expect((await api.entities.Scene.get(source.id)).recurring_group).toBe("");
  });
});
