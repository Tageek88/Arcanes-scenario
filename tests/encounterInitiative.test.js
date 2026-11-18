import { describe, expect, it } from "vitest";
import { presetDice } from "@/lib/meta/dice.js";
import { cleanEncounter, setInitiatives, sortCombatants } from "@/lib/meta/encounter.js";
import {
  INITIATIVE_AUTO,
  INITIATIVE_MANUAL,
  describeInitiativeRoll,
  findInitiativeStat,
  initiativeFromRoll,
  initiativeStat,
  rollCombatants,
  sheetOfCombatant,
} from "@/lib/meta/encounterInitiative.js";

const setupOf = (preset) => ({ dice: presetDice(preset), links: {}, modifiers: {}, parents: {} });
const sources = {
  npcs: [{ id: "n1", name: "Garde", characteristics: { Initiative: { value: "3" } } }],
  characters: [{ id: "c1", name: "Mira", characteristics: { Initiative: { value: "-1" } } }],
};
const guard = { id: "g", name: "Garde", initiative: null, source: { kind: "npc", id: "n1" } };
const mira = { id: "m", name: "Mira", initiative: null, source: { kind: "character", id: "c1" } };
const free = { id: "f", name: "Libre", initiative: null };
const half = () => 0.5;

describe("caractéristique d'initiative", () => {
  it("trouve « Initiative » sans tenir compte des accents ni de la casse", () => {
    expect(findInitiativeStat(["Force", "initiative"])).toBe("initiative");
    expect(findInitiativeStat(["Dextérité", " INITIATIVE "])).toBe(" INITIATIVE ");
    expect(findInitiativeStat(["Agilité", "Vigueur"])).toBe("");
    expect(findInitiativeStat(null)).toBe("");
  });
  it("suit le choix du MJ : automatique, saisie à la main, ou une caractéristique du modèle", () => {
    const names = ["Agilité", "Initiative"];
    expect(initiativeStat("", names)).toBe("Initiative");
    expect(initiativeStat(INITIATIVE_AUTO, names)).toBe("Initiative");
    expect(initiativeStat(INITIATIVE_MANUAL, names)).toBe("");
    expect(initiativeStat("Agilité", names)).toBe("Agilité");
    expect(initiativeStat("Disparue", names)).toBe("Initiative");
    expect(initiativeStat("", ["Agilité"])).toBe("");
  });
});

describe("rollCombatants", () => {
  it("lance d20 + valeur de la fiche : 11 + 3 = 14, 11 − 1 = 10", () => {
    const out = rollCombatants([guard, mira], sources, setupOf("d20-add"), "Initiative", half);
    expect(out.values).toEqual({ g: 14, m: 10 });
    expect(out.rolled).toBe(2);
    expect(out.lines[0]).toBe("Garde : 14 (11 + 3)");
    expect(out.lines[1]).toBe("Mira : 10 (11 − 1)");
  });
  it("un combattant sans fiche lance avec la valeur 0", () => {
    expect(rollCombatants([free], sources, setupOf("d20-add"), "Initiative", half).values).toEqual({ f: 11 });
  });
  it("ne lance rien sans caractéristique, sans réglage de dés ou avec un réglage désactivé", () => {
    expect(rollCombatants([guard], sources, setupOf("d20-add"), "", half).rolled).toBe(0);
    expect(rollCombatants([guard], sources, { dice: null }, "Initiative", half).rolled).toBe(0);
    expect(rollCombatants([guard], sources, { dice: { ...presetDice("d20-add"), enabled: false } }, "Initiative", half).rolled).toBe(0);
    expect(rollCombatants(null, sources, setupOf("d20-add"), "Initiative", half)).toEqual({ values: {}, lines: [], rolled: 0 });
  });
  it("réserve de dés : le nombre de réussites ; sous la valeur : la marge", () => {
    const pool = rollCombatants([{ ...guard }], { npcs: [{ id: "n1", name: "Garde", characteristics: { Initiative: { value: "2" } } }] }, setupOf("d6-pool"), "Initiative", () => 0.99);
    expect(pool.values.g).toBe(2);
    expect(pool.lines[0]).toContain("2 réussites");
    const under = rollCombatants([guard], sources, setupOf("3d6-under"), "Initiative", half);
    // 3d6 à 4 = 12 contre la cible 3 : marge 3 − 12
    expect(under.values.g).toBe(-9);
    expect(under.lines[0]).toContain("marge -9");
  });
  it("donne les mêmes valeurs pour le même tirage", () => {
    const first = rollCombatants([guard, mira], sources, setupOf("d20-add"), "Initiative", half);
    const second = rollCombatants([guard, mira], sources, setupOf("d20-add"), "Initiative", half);
    expect(first).toEqual(second);
  });
});

describe("résultats et fiches", () => {
  it("initiativeFromRoll rend null sans résultat", () => {
    expect(initiativeFromRoll(null)).toBeNull();
    expect(describeInitiativeRoll("X", null)).toBe("X : —");
  });
  it("retrouve la fiche d'un combattant d'après son lien", () => {
    expect(sheetOfCombatant(guard, sources).name).toBe("Garde");
    expect(sheetOfCombatant(mira, sources).name).toBe("Mira");
    expect(sheetOfCombatant(free, sources)).toBeNull();
    expect(sheetOfCombatant({ source: { kind: "npc", id: "zzz" } }, sources)).toBeNull();
    expect(sheetOfCombatant(guard, null)).toBeNull();
  });
});

describe("setInitiatives", () => {
  const encounter = cleanEncounter({ id: "e", campaign_id: "c", title: "T", combatants: [{ id: "a", name: "A" }, { id: "b", name: "B", initiative: 4 }] });
  it("range les initiatives dans les combattants, ignore un inconnu et ne modifie pas l'original", () => {
    const next = setInitiatives(encounter, { a: 15, b: 2, zzz: 9 });
    expect(next.combatants.map((item) => item.initiative)).toEqual([15, 2]);
    expect(encounter.combatants.map((item) => item.initiative)).toEqual([null, 4]);
    expect(sortCombatants(next.combatants).map((item) => item.id)).toEqual(["a", "b"]);
  });
  it("accepte des valeurs absentes ou vides", () => {
    expect(setInitiatives(encounter, null)).toEqual(encounter);
    expect(setInitiatives(encounter, {})).toEqual(encounter);
  });
});
