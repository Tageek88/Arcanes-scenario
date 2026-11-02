import { describe, it, expect } from "vitest";
import { searchAll, excerpt } from "@/lib/services/globalSearch";

const data = {
  acts: [{ id: "a1", title: "Acte premier", synopsis: "Le village brûle" }],
  scenes: [
    { id: "s1", title: "L'Auberge du Dragon", act_id: "a1", summary: "Rencontre avec le garde", gm_notes: "" },
    { id: "s2", title: "Embuscade", act_id: "a1", summary: "", gm_notes: "Le dragon attaque à l'aube" },
  ],
  npcs: [{ id: "n1", name: "Élise la Garde", role: "Capitaine", description: "" }],
  locations: [{ id: "l1", name: "Dragonnière", type: "Grotte", description: "" }],
  clues: [{ id: "c1", name: "Lettre", description: "signée par le dragon rouge" }],
  notes: [{ id: "x1", title: "Idées", content: "Penser au dragon" }],
  tables: [{ id: "t1", name: "Rencontres", category: "Monstres", description: "", entries: [{ text: "Un dragonnet" }] }],
};

describe("recherche globale", () => {
  it("terme vide : aucun résultat", () => {
    expect(searchAll(data, "")).toEqual([]);
    expect(searchAll(data, "   ")).toEqual([]);
  });

  it("ignore accents et majuscules, et groupe par type", () => {
    const groups = searchAll(data, "ELISE");
    expect(groups.map((g) => g.key)).toEqual(["npc"]);
    expect(groups[0].items[0].title).toBe("Élise la Garde");
  });

  it("le titre passe avant le contenu", () => {
    const scenes = searchAll(data, "dragon").find((g) => g.key === "scene");
    expect(scenes.items.map((i) => i.id)).toEqual(["s1", "s2"]);
    expect(scenes.items[1].snippet).toContain("dragon attaque");
  });

  it("tous les mots doivent correspondre", () => {
    expect(searchAll(data, "dragon rouge").map((g) => g.key)).toEqual(["clue"]);
    expect(searchAll(data, "dragon licorne")).toEqual([]);
  });

  it("cherche dans les entrées des tables et le détail", () => {
    expect(searchAll(data, "dragonnet").map((g) => g.key)).toEqual(["table"]);
    expect(searchAll(data, "capitaine")[0].items[0].id).toBe("n1");
  });

  it("limite par groupe mais garde le total", () => {
    const many = { scenes: Array.from({ length: 10 }, (_, i) => ({ id: `s${i}`, title: `Scène ${i}` })) };
    const [group] = searchAll(many, "scene", { limitPerGroup: 4 });
    expect(group.items).toHaveLength(4);
    expect(group.total).toBe(10);
  });

  it("supporte des données absentes ou malformées", () => {
    expect(searchAll({}, "x")).toEqual([]);
    expect(searchAll({ scenes: [{ id: "z", title: null }, { title: "sans id" }] }, "z")).toEqual([]);
  });

  it("extrait court avec points de suspension", () => {
    const long = "a".repeat(80) + " dragon " + "b".repeat(80);
    const out = excerpt(long, "dragon");
    expect(out.startsWith("…")).toBe(true);
    expect(out.endsWith("…")).toBe(true);
    expect(out).toContain("dragon");
    expect(excerpt("", "x")).toBe("");
  });
});
