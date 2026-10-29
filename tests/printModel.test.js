import { describe, it, expect } from "vitest";
import { buildPrintModel, buildTrees, countableIds, scopeToQuests, selectableIds } from "@/lib/print/printModel";

const quests = [{ id: "q1", title: "Principale", order: 1 }, { id: "q2", title: "Intrigue", order: 2 }, { id: "q3", title: "Fin", order: 3 }];
const acts = [
  { id: "a1", quest_id: "q1", title: "A1", order: 1 },
  { id: "a2", quest_id: "q2", title: "A2", order: 1 },
  { id: "a0", title: "Ancien", order: 3 },
];
const scenes = [
  { id: "s1", quest_id: "q1", act_id: "a1", title: "S1", order: 1 },
  { id: "s2", quest_id: "q2", act_id: "a2", title: "S2", order: 1, next_scene_ids: ["s3"] },
  { id: "s3", quest_id: "q2", act_id: "", title: "S3", order: 2 },
  { id: "s4", act_id: "a0", title: "Vieille", order: 1 },
  { id: "s5", title: "Orpheline", order: 1 },
  { id: "s6", quest_id: "q3", act_id: "", title: "S6", order: 1 },
];
const data = { campaign: { name: "C" }, quests, acts, scenes, npcs: [], locations: [], clues: [], notes: [], relations: [], characters: [] };
const options = { secrets: true, cluesWithScenes: true, images: false };
const model = (view, ids) => buildPrintModel(view, { scenes: new Set(ids) }, options);

describe("impression par quête", () => {
  it("une seule quête : pas de niveau « Quête » dans l'arbre", () => {
    const view = scopeToQuests(data, ["q2"]);
    const trees = buildTrees(view);
    expect(selectableIds(trees.scenes).sort()).toEqual(["s2", "s3"]);
    expect(trees.scenes.every((node) => node.hint !== "Quête")).toBe(true);
    const m = model(view, ["s2", "s3"]);
    expect(m.blocks).toHaveLength(1);
    expect(m.blocks[0].questTitle).toBe("Intrigue");
  });

  it("deux quêtes : un bloc par quête, numérotation continue, lignes sans quête dans la première", () => {
    const view = scopeToQuests(data, ["q1", "q2"]);
    const trees = buildTrees(view);
    expect(trees.scenes).toHaveLength(2);
    expect(trees.scenes[0].hint).toBe("Quête");
    const ids = selectableIds(trees.scenes);
    expect(ids.sort()).toEqual(["s1", "s2", "s3", "s4", "s5"]);
    expect(countableIds(trees.scenes).sort()).toEqual(ids.sort());
    const m = model(view, ids);
    expect(m.blocks.map((b) => b.questTitle)).toEqual(["Principale", "Intrigue"]);
    const numbers = m.blocks.flatMap((b) => b.groups.flatMap((g) => g.scenes.map((s) => s.number)));
    expect(numbers).toEqual([1, 2, 3, 4, 5]);
  });

  it("une quête non choisie n'apparaît nulle part", () => {
    const view = scopeToQuests(data, ["q1", "q2"]);
    const m = model(view, selectableIds(buildTrees(view).scenes));
    expect(JSON.stringify(m)).not.toContain("S6");
  });

  it("sans aucune quête connue, tout est imprimé tel quel", () => {
    const view = scopeToQuests({ ...data, quests: [] }, ["q1"]);
    expect(view.scenes).toHaveLength(6);
  });

  it("une campagne à une seule quête n'écrit pas de titre de quête", () => {
    const view = scopeToQuests({ ...data, quests: [quests[0]] }, ["q1"]);
    const m = model(view, selectableIds(buildTrees(view).scenes));
    expect(m.blocks[0].questTitle).toBe("");
  });
});

describe("impression des inventaires", () => {
  const campaign = { id: "c1", name: "C", inventory: [{ id: "i0", name: "Corde", quantity: 2 }] };
  const characters = [{ id: "h1", name: "Hero", inventory: [{ id: "i1", name: "Torche", quantity: 3, notes: "Humide", fields: [{ name: "Durée", value: "1 h" }] }] }];
  const npcs = [
    { id: "n1", name: "Mira", inventory: [{ id: "i2", name: "Clé", quantity: 1 }] },
    { id: "n2", name: "Vide", inventory: [] },
  ];
  const full = { ...data, campaign, characters, npcs };

  it("propose la réserve, les personnages et les PNJ qui ont des objets", () => {
    const tree = buildTrees(full).inventories;
    expect(tree.map((n) => n.id)).toEqual(["campaign:c1", "character:h1", "npc:n1"]);
  });

  it("imprime chaque propriétaire choisi avec ses objets", () => {
    const m = buildPrintModel(full, { inventories: new Set(["campaign:c1", "character:h1"]) }, options);
    const block = m.blocks.find((b) => b.kind === "inventories");
    expect(block.owners.map((o) => [o.name, o.items])).toEqual([
      ["Sans propriétaire", ["Corde × 2"]],
      ["Hero", ["Torche × 3 (Humide · Durée : 1 h)"]],
    ]);
  });

  it("n'ajoute aucun bloc sans sélection, et la fiche de PNJ reprend l'inventaire", () => {
    expect(buildPrintModel(full, {}, options).blocks).toEqual([]);
    const m = buildPrintModel(full, { npcs: new Set(["n1"]) }, options);
    expect(m.blocks[0].groups[0].npcs[0].sheet.inventory).toEqual(["Clé"]);
  });
});
