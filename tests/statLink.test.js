import { describe, expect, it } from "vitest";
import { evaluateRoll, presetDice } from "@/lib/meta/dice.js";
import { buildRollRequest } from "@/lib/meta/rollRequest.js";
import { cleanParents, keysToParents, linkedStatValue, parentChoices, parentsToKeys, statParentMap } from "@/lib/meta/statLinks.js";

// Metro 2033 : 4 caractéristiques principales, 3 secondaires rattachées à chacune.
const MODEL = [
  { name: "Vigueur" },
  { name: "Endurance", parent: "Vigueur" },
  { name: "Tir", parent: "Agilité" },
  { name: "Agilité" },
];
const values = { Vigueur: { value: "3" }, Endurance: { value: "2" }, Agilité: { value: "4" } };

describe("cleanParents", () => {
  it("garde un lien valide et retire ceux qui ne le sont pas", () => {
    const raw = [
      { name: "A", parent: "B" },
      { name: "B" },
      { name: "C", parent: "Inconnue" },
      { name: "D", parent: "D" },
      { name: "E", parent: "" },
    ];
    const clean = cleanParents(raw);
    expect(clean[0].parent).toBe("B");
    expect(Object.hasOwn(clean[1], "parent")).toBe(false);
    expect(Object.hasOwn(clean[2], "parent")).toBe(false);
    expect(Object.hasOwn(clean[3], "parent")).toBe(false);
    expect(Object.hasOwn(clean[4], "parent")).toBe(false);
  });

  it("refuse le lien qui fermerait une boucle", () => {
    const clean = cleanParents([{ name: "A", parent: "B" }, { name: "B", parent: "C" }, { name: "C", parent: "A" }]);
    expect(clean.map((item) => item.parent)).toEqual(["B", "C", undefined]);
  });

  it("tolère une valeur qui n'est pas une liste", () => {
    expect(cleanParents(null)).toEqual([]);
  });
});

describe("statParentMap", () => {
  it("donne { secondaire: principale }", () => {
    const map = statParentMap(MODEL);
    expect(map.Endurance).toBe("Vigueur");
    expect(map.Tir).toBe("Agilité");
    expect(map.Vigueur).toBe(undefined);
  });
});

describe("linkedStatValue", () => {
  const parents = statParentMap(MODEL);

  it("ajoute la valeur de la principale à celle de la secondaire (2 + 3 = 5)", () => {
    const linked = linkedStatValue("Endurance", values, parents);
    expect(linked.total).toBe(5);
    expect(linked.parts).toEqual([{ name: "Endurance", value: 2 }, { name: "Vigueur", value: 3 }]);
  });

  it("une caractéristique sans lien garde sa seule valeur", () => {
    expect(linkedStatValue("Vigueur", values, parents)).toEqual({ total: 3, parts: [{ name: "Vigueur", value: 3 }] });
  });

  it("compte 0 pour une valeur absente, et accepte l'absence de liens", () => {
    expect(linkedStatValue("Tir", values, parents).total).toBe(4);
    expect(linkedStatValue("Endurance", values, undefined).total).toBe(2);
    expect(linkedStatValue("", values, parents)).toEqual({ total: 0, parts: [] });
  });

  it("remonte une chaîne de plusieurs niveaux, sans jamais compter deux fois la même", () => {
    const chain = { C: "B", B: "A" };
    expect(linkedStatValue("C", { A: { value: 1 }, B: { value: 2 }, C: { value: 4 } }, chain).total).toBe(7);
    const loop = { A: "B", B: "A" };
    expect(linkedStatValue("A", { A: { value: 1 }, B: { value: 2 } }, loop).total).toBe(3);
  });
});

describe("éditeur du modèle", () => {
  it("passe des noms aux clés d'édition et inversement", () => {
    const items = MODEL.map((item, index) => ({ ...item, _key: `k${index}` }));
    const keyed = parentsToKeys(items);
    expect(keyed[1].parent).toBe("k0");
    expect(keyed[0].parent).toBe(undefined);
    const renamed = keyed.map((item) => (item._key === "k0" ? { ...item, name: "Force" } : item));
    expect(keysToParents(renamed)[1].parent).toBe("Force");
  });

  it("retire le lien quand la caractéristique liée a disparu", () => {
    const items = [{ _key: "k1", name: "Endurance", parent: "k0" }];
    expect(Object.hasOwn(keysToParents(items)[0], "parent")).toBe(false);
  });

  it("ne propose ni la caractéristique elle-même, ni celles qui en dépendent", () => {
    const items = [
      { _key: "a", name: "A" },
      { _key: "b", name: "B", parent: "a" },
      { _key: "c", name: "C", parent: "b" },
      { _key: "d", name: "D" },
      { _key: "e", name: "" },
    ];
    expect(parentChoices(items, "a").map((item) => item.name)).toEqual(["D"]);
    expect(parentChoices(items, "c").map((item) => item.name)).toEqual(["A", "B", "D"]);
  });
});

describe("lancer d'une caractéristique liée", () => {
  const setup = { dice: presetDice("d6-pool"), links: {}, modifiers: {}, parents: statParentMap(MODEL) };
  const sheet = { characteristics: values };

  it("lance 5 dés pour Endurance 2 liée à Vigueur 3", () => {
    const request = buildRollRequest({ setup, sheet, characteristic: "Endurance" });
    expect(request.value).toBe(5);
    expect(request.notes.join(" ")).toContain("Endurance 2 + Vigueur 3 = 5");
    const result = evaluateRoll({ config: request.config, die: request.spec.die, value: request.value, bonus: request.bonus, rng: () => 0.99 });
    expect(result.die.count).toBe(5);
    expect(result.rolls).toHaveLength(5);
    expect(result.total).toBe(5);
  });

  it("une compétence liée à Endurance lance avec la même valeur", () => {
    const request = buildRollRequest({ setup, sheet, skill: { name: "Course", characteristic: "Endurance" } });
    expect(request.value).toBe(5);
  });

  it("une caractéristique principale ou un réglage sans liens ne change rien", () => {
    expect(buildRollRequest({ setup, sheet, characteristic: "Vigueur" }).value).toBe(3);
    expect(buildRollRequest({ setup: { ...setup, parents: undefined }, sheet, characteristic: "Endurance" }).value).toBe(2);
    expect(buildRollRequest({ setup, sheet, characteristic: "Vigueur" }).notes).toEqual([]);
  });

  it("ajoute aussi la valeur liée au total d'un jet « dé + valeur »", () => {
    const addSetup = { ...setup, dice: presetDice("2d6-add") };
    const request = buildRollRequest({ setup: addSetup, sheet, characteristic: "Endurance" });
    const result = evaluateRoll({ config: request.config, die: request.spec.die, value: request.value, bonus: request.bonus, rng: () => 0 });
    expect(result.total).toBe(2 + 5);
  });
});
