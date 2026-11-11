import { describe, it, expect } from "vitest";
import { buildPrintModel, buildTrees, scopeToQuests } from "@/lib/print/printModel";

const options = { secrets: true, cluesWithScenes: true, images: false };
const quests = [{ id: "q1", title: "Principale", order: 1 }, { id: "q2", title: "Intrigue", order: 2 }];
const acts = [
  { id: "a1", quest_id: "q1", title: "A1", order: 1 },
  { id: "a2", quest_id: "q2", title: "A2", order: 1 },
];
const scenes = [
  { id: "s1", quest_id: "q1", act_id: "a1", title: "Arrivée", order: 1 },
  { id: "s2", quest_id: "q2", act_id: "a2", title: "Le bal", order: 1 },
];
const sessions = [
  {
    id: "x1", title: "Séance 1", date: "2026-10-01", time: "20:00", status: "jouee",
    journal: { summary: "Les héros arrivent.", scene_ids: ["s1", "s2", "absente"], npc_ids: ["n1", "n-absent"], clue_ids: ["c1"], next: "Retrouver la clé." },
  },
  { id: "x2", title: "Séance 2", date: "2026-10-15", time: "20:00", status: "planifiee" },
  { id: "x3", title: "Séance 3", date: "2026-10-22", time: "20:00", status: "planifiee", journal: { summary: "Début de séance." } },
  { id: "x4", title: "Séance 0", date: "2026-09-20", time: "20:00", status: "jouee" },
];
const data = {
  campaign: { name: "C" },
  quests,
  acts,
  scenes,
  npcs: [{ id: "n1", name: "Mira" }],
  locations: [],
  clues: [{ id: "c1", name: "Lettre", clue_type: "indice" }],
  notes: [],
  sessions,
  relations: [],
  characters: [],
};
const journalBlock = (model) => model.blocks.find((block) => block.kind === "journals");

describe("impression du journal de séance", () => {
  it("propose les séances jouées ou commencées, la plus récente d'abord", () => {
    expect(buildTrees(data).journals.map((node) => node.id)).toEqual(["x3", "x1", "x4"]);
  });

  it("reprend résumé, scènes (même d'une autre quête), PNJ, indices et suite, sans les éléments supprimés", () => {
    const view = scopeToQuests(data, ["q1"]);
    const block = journalBlock(buildPrintModel(view, { journals: new Set(["x1"]) }, options));
    expect(block.journals).toHaveLength(1);
    const entry = block.journals[0];
    expect(entry.title).toBe("Séance 1");
    expect(entry.summary).toBe("Les héros arrivent.");
    expect(entry.scenes).toEqual(["Arrivée", "Le bal"]);
    expect(entry.npcs).toEqual(["Mira"]);
    expect(entry.clues).toEqual(["Lettre"]);
    expect(entry.next).toBe("Retrouver la clé.");
  });

  it("imprime dans l'ordre de l'écran (plus récente d'abord)", () => {
    const block = journalBlock(buildPrintModel(data, { journals: new Set(["x4", "x1", "x3"]) }, options));
    expect(block.journals.map((entry) => entry.title)).toEqual(["Séance 3", "Séance 1", "Séance 0"]);
  });

  it("n'ajoute aucun bloc sans sélection ni pour une séance sans journal ni jouée", () => {
    expect(buildPrintModel(data, {}, options).blocks).toEqual([]);
    expect(journalBlock(buildPrintModel(data, { journals: new Set(["x2"]) }, options))).toBeUndefined();
  });

  it("ne change pas l'impression des sessions", () => {
    const model = buildPrintModel(data, { sessions: new Set(["x1"]) }, options);
    expect(model.blocks.map((block) => block.kind)).toEqual(["sessions"]);
  });
});
