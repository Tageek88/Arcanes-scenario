import { describe, it, expect } from "vitest";
import { api } from "@/api/localClient";
import {
  JOURNAL_LIMITS,
  cleanJournal,
  emptyJournal,
  hasJournal,
  journalEntries,
  journalExcerpt,
  scenesToMarkPlayed,
} from "@/lib/meta/sessionJournal";
import { listCampaignSessions, saveSessionJournal } from "@/lib/services/sessionJournal";
import { makeCampaign } from "./helpers";

describe("journal de séance : règles", () => {
  it("cleanJournal accepte n'importe quoi et borne les textes", () => {
    expect(cleanJournal(null)).toEqual(emptyJournal());
    expect(cleanJournal("texte")).toEqual(emptyJournal());
    const long = cleanJournal({ summary: "a".repeat(JOURNAL_LIMITS.summary + 50), next: 12 });
    expect(long.summary).toHaveLength(JOURNAL_LIMITS.summary);
    expect(long.next).toBe("");
  });

  it("cleanJournal retire les doublons et les identifiants invalides", () => {
    const clean = cleanJournal({ scene_ids: ["a", "a", "", 3, "b"], npc_ids: "pas une liste", clue_ids: ["c"] });
    expect(clean.scene_ids).toEqual(["a", "b"]);
    expect(clean.npc_ids).toEqual([]);
    expect(clean.clue_ids).toEqual(["c"]);
  });

  it("hasJournal : au moins un texte ou un lien", () => {
    expect(hasJournal(null)).toBe(false);
    expect(hasJournal({ journal: emptyJournal() })).toBe(false);
    expect(hasJournal({ journal: { summary: "   " } })).toBe(false);
    expect(hasJournal({ journal: { summary: "Début" } })).toBe(true);
    expect(hasJournal({ journal: { npc_ids: ["n"] } })).toBe(true);
  });

  it("journalExcerpt : une ligne, coupée proprement", () => {
    expect(journalExcerpt({ journal: { summary: "Un\n\n deux   trois" } })).toBe("Un deux trois");
    expect(journalExcerpt({ journal: { summary: "x".repeat(300) } }, 20)).toBe(`${"x".repeat(20)}…`);
    expect(journalExcerpt({})).toBe("");
  });

  it("journalEntries : jouées ou commencées, les plus récentes d'abord", () => {
    const sessions = [
      { id: "1", date: "2026-10-01", status: "planifiee" },
      { id: "2", date: "2026-10-05", status: "jouee" },
      { id: "3", date: "2026-10-20", status: "planifiee", journal: { summary: "Notes prises d'avance" } },
      { id: "4", date: "2026-10-20", time: "21:00", status: "jouee" },
    ];
    expect(journalEntries(sessions).map((s) => s.id)).toEqual(["4", "3", "2"]);
    expect(journalEntries(null)).toEqual([]);
  });

  it("scenesToMarkPlayed : seulement les scènes cochées encore en brouillon", () => {
    const scenes = [
      { id: "a", status: "brouillon" },
      { id: "b", status: "joue" },
      { id: "c", status: "clef" },
      { id: "d" },
      { id: "e", status: "brouillon" },
    ];
    expect(scenesToMarkPlayed(["a", "b", "c", "d"], scenes).map((s) => s.id)).toEqual(["a", "d"]);
    expect(scenesToMarkPlayed([], scenes)).toEqual([]);
  });
});

describe("journal de séance : enregistrement", () => {
  it("enregistre le journal sans toucher aux autres champs de la séance", async () => {
    const campaign = await makeCampaign();
    const session = await api.entities.GameSession.create({
      campaign_id: campaign.id,
      title: "Séance 1",
      date: "2026-11-01",
      time: "20:00",
      status: "jouee",
      notes: "préparation",
    });
    await saveSessionJournal(session.id, { summary: "Tout a brûlé", scene_ids: ["s1", "s1"], npc_ids: ["n1"] });
    const saved = await api.entities.GameSession.get(session.id);
    expect(saved).toMatchObject({ title: "Séance 1", date: "2026-11-01", time: "20:00", status: "jouee", notes: "préparation" });
    expect(saved.journal).toEqual({ summary: "Tout a brûlé", scene_ids: ["s1"], npc_ids: ["n1"], clue_ids: [], next: "" });
  });

  it("modifier la séance (calendrier) ne perd pas le journal", async () => {
    const campaign = await makeCampaign();
    const session = await api.entities.GameSession.create({ campaign_id: campaign.id, title: "S", date: "2026-11-01" });
    await saveSessionJournal(session.id, { summary: "À garder" });
    // Le formulaire du calendrier n'envoie jamais `journal`.
    await api.entities.GameSession.update(session.id, { title: "S renommée", date: "2026-11-02", status: "jouee" });
    expect((await api.entities.GameSession.get(session.id)).journal.summary).toBe("À garder");
  });

  it("passe en « joué » les scènes demandées, et elles seulement", async () => {
    const campaign = await makeCampaign();
    const a = await api.entities.Scene.create({ campaign_id: campaign.id, title: "A", status: "brouillon" });
    const b = await api.entities.Scene.create({ campaign_id: campaign.id, title: "B", status: "brouillon" });
    const session = await api.entities.GameSession.create({ campaign_id: campaign.id, title: "S", date: "2026-11-01" });
    await saveSessionJournal(session.id, { scene_ids: [a.id, b.id] }, { markPlayedIds: [a.id] });
    expect((await api.entities.Scene.get(a.id)).status).toBe("joue");
    expect((await api.entities.Scene.get(b.id)).status).toBe("brouillon");
  });

  it("séance inconnue : erreur, rien d'écrit", async () => {
    await expect(saveSessionJournal("", { summary: "x" })).rejects.toThrow();
    await expect(saveSessionJournal("absente", { summary: "x" })).rejects.toMatchObject({ status: 404 });
  });

  it("listCampaignSessions : celles de la campagne seulement, les plus récentes d'abord", async () => {
    const a = await makeCampaign("A");
    const b = await makeCampaign("B");
    await api.entities.GameSession.create({ campaign_id: a.id, title: "vieille", date: "2026-10-01" });
    await api.entities.GameSession.create({ campaign_id: a.id, title: "récente", date: "2026-11-01" });
    await api.entities.GameSession.create({ campaign_id: b.id, title: "autre", date: "2026-11-02" });
    expect((await listCampaignSessions(a.id)).map((s) => s.title)).toEqual(["récente", "vieille"]);
    expect(await listCampaignSessions("")).toEqual([]);
  });
});
