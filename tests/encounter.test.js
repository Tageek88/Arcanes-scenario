import { describe, it, expect } from "vitest";
import {
  DEFAULT_COMBATANT_NAME,
  DEFAULT_ENCOUNTER_TITLE,
  ENCOUNTER_LIMITS,
  activeCombatant,
  addCombatant,
  adjustHp,
  cleanCombatant,
  cleanEncounter,
  isDown,
  nextTurn,
  removeCombatant,
  renameEncounter,
  resetEncounter,
  setActive,
  sortCombatants,
  updateCombatant,
} from "@/lib/meta/encounter";

const fighter = (id, initiative, hpMax = 10) => ({ id, name: id.toUpperCase(), initiative, hp: hpMax, hp_max: hpMax });
const encounter = (list, extra = {}) => cleanEncounter({ id: "e", campaign_id: "c", title: "Embuscade", combatants: list, ...extra });
const ids = (list) => list.map((combatant) => combatant.id);

describe("rencontre : nettoyage", () => {
  it("cleanCombatant exige un identifiant et accepte n'importe quoi d'autre", () => {
    expect(cleanCombatant(null)).toBeNull();
    expect(cleanCombatant("texte")).toBeNull();
    expect(cleanCombatant({ name: "Sans id" })).toBeNull();
    expect(cleanCombatant({ id: "" })).toBeNull();
    expect(cleanCombatant({ id: "a" })).toEqual({ id: "a", name: DEFAULT_COMBATANT_NAME, initiative: null, hp: null, hp_max: null });
  });

  it("cleanCombatant lit les nombres écrits en texte et borne les valeurs", () => {
    expect(cleanCombatant({ id: "a", name: "  Gobelin  ", initiative: "12", hp_max: "7" })).toEqual({
      id: "a", name: "Gobelin", initiative: 12, hp: 7, hp_max: 7,
    });
    expect(cleanCombatant({ id: "a", hp: 50, hp_max: 10 }).hp).toBe(10);
    expect(cleanCombatant({ id: "a", hp: -4, hp_max: 10 }).hp).toBe(0);
    expect(cleanCombatant({ id: "a", initiative: "abc" }).initiative).toBeNull();
    expect(cleanCombatant({ id: "a", initiative: 5000 }).initiative).toBe(ENCOUNTER_LIMITS.initiative);
    expect(cleanCombatant({ id: "a", initiative: 3.9 }).initiative).toBe(3);
    expect(cleanCombatant({ id: "a", name: "x".repeat(500) }).name).toHaveLength(ENCOUNTER_LIMITS.name);
  });

  it("des PV max à 0 ou vides veulent dire : PV non suivis", () => {
    for (const hpMax of [0, "0", "", null, undefined, -3]) {
      const clean = cleanCombatant({ id: "a", hp: 4, hp_max: hpMax });
      expect(clean.hp_max).toBeNull();
      expect(clean.hp).toBeNull();
    }
    expect(isDown(cleanCombatant({ id: "a" }))).toBe(false);
  });

  it("cleanEncounter : valeurs par défaut, doublons retirés, limite, combattant actif inconnu", () => {
    expect(cleanEncounter(null)).toEqual({ id: "", campaign_id: "", title: DEFAULT_ENCOUNTER_TITLE, round: 1, combatants: [], active_id: null });
    expect(cleanEncounter({ title: "   ", round: 0 })).toMatchObject({ title: DEFAULT_ENCOUNTER_TITLE, round: 1 });
    expect(cleanEncounter({ round: "4" }).round).toBe(4);
    const clean = cleanEncounter({ combatants: [fighter("a", 1), { name: "sans id" }, fighter("a", 9), fighter("b", 2)], active_id: "b" });
    expect(ids(clean.combatants)).toEqual(["a", "b"]);
    expect(clean.active_id).toBe("b");
    expect(cleanEncounter({ combatants: [fighter("a", 1)], active_id: "zzz" }).active_id).toBeNull();
    expect(cleanEncounter({ combatants: "pas une liste" }).combatants).toEqual([]);
    const many = Array.from({ length: ENCOUNTER_LIMITS.combatants + 10 }, (_, index) => fighter(`f${index}`, index));
    expect(cleanEncounter({ combatants: many }).combatants).toHaveLength(ENCOUNTER_LIMITS.combatants);
  });
});

describe("rencontre : ordre et points de vie", () => {
  it("sortCombatants : initiative décroissante, sans initiative en dernier, égalités dans l'ordre d'ajout", () => {
    const list = [fighter("a", 10), fighter("b", null), fighter("c", 15), fighter("d", 10), fighter("e", -2)];
    expect(ids(sortCombatants(list))).toEqual(["c", "a", "d", "e", "b"]);
    expect(ids(list)).toEqual(["a", "b", "c", "d", "e"]);
    expect(sortCombatants(null)).toEqual([]);
  });

  it("adjustHp reste entre 0 et le maximum", () => {
    const start = encounter([fighter("a", 1, 10)]);
    const hurt = adjustHp(start, "a", -3);
    expect(hurt.combatants[0].hp).toBe(7);
    expect(adjustHp(hurt, "a", -50).combatants[0].hp).toBe(0);
    expect(adjustHp(hurt, "a", 50).combatants[0].hp).toBe(10);
    expect(start.combatants[0].hp).toBe(10);
  });

  it("adjustHp ne fait rien sans PV suivis, pour un inconnu ou un pas invalide", () => {
    const start = encounter([{ id: "a", name: "A" }, fighter("b", 1)]);
    expect(adjustHp(start, "a", -1)).toBe(start);
    expect(adjustHp(start, "zzz", -1)).toBe(start);
    expect(adjustHp(start, "b", "abc")).toBe(start);
  });

  it("un combattant à 0 PV est à terre, et le redevient vivant dès qu'il récupère des PV", () => {
    const down = adjustHp(encounter([fighter("a", 1, 4)]), "a", -4);
    expect(isDown(down.combatants[0])).toBe(true);
    expect(isDown(adjustHp(down, "a", 1).combatants[0])).toBe(false);
  });

  it("updateCombatant : changer le PV max garde les PV courants, bornés au nouveau maximum", () => {
    const start = encounter([{ ...fighter("a", 1, 10), hp: 6 }]);
    expect(updateCombatant(start, "a", { hp_max: 20 }).combatants[0]).toMatchObject({ hp: 6, hp_max: 20 });
    expect(updateCombatant(start, "a", { hp_max: 4 }).combatants[0]).toMatchObject({ hp: 4, hp_max: 4 });
    expect(updateCombatant(start, "a", { hp_max: "" }).combatants[0]).toMatchObject({ hp: null, hp_max: null });
  });

  it("updateCombatant : donner un PV max à un combattant sans PV suivis le met à ce maximum", () => {
    const start = encounter([{ id: "a", name: "A", initiative: 3 }]);
    expect(updateCombatant(start, "a", { hp_max: "12" }).combatants[0]).toMatchObject({ hp: 12, hp_max: 12, initiative: 3 });
  });

  it("updateCombatant : l'identifiant ne change pas et un autre combattant n'est pas touché", () => {
    const start = encounter([fighter("a", 1), fighter("b", 2)]);
    const next = updateCombatant(start, "a", { id: "zzz", initiative: 8, name: "Nouveau" });
    expect(next.combatants[0]).toMatchObject({ id: "a", initiative: 8, name: "Nouveau" });
    expect(next.combatants[1]).toBe(start.combatants[1]);
  });
});

describe("rencontre : ajout, retrait, tours", () => {
  it("addCombatant : ajoute à la suite, ignore un doublon et la limite", () => {
    const start = encounter([fighter("a", 1)]);
    const added = addCombatant(start, { id: "b", name: "Mira", initiative: "14", hp_max: "9" });
    expect(added.combatants[1]).toEqual({ id: "b", name: "Mira", initiative: 14, hp: 9, hp_max: 9 });
    expect(addCombatant(added, { id: "b", name: "Autre" })).toBe(added);
    expect(addCombatant(start, { name: "sans id" })).toBe(start);
    const many = Array.from({ length: ENCOUNTER_LIMITS.combatants }, (_, index) => fighter(`f${index}`, index));
    const full = encounter(many);
    expect(addCombatant(full, { id: "de-trop", name: "X" })).toBe(full);
  });

  it("nextTurn : personne n'a la main -> le premier de l'ordre, sans changer de round", () => {
    const start = encounter([fighter("a", 5), fighter("b", 20), fighter("c", 12)]);
    const first = nextTurn(start);
    expect(first.active_id).toBe("b");
    expect(first.round).toBe(1);
  });

  it("nextTurn : suit l'ordre d'initiative et change de round après le dernier", () => {
    let current = encounter([fighter("a", 5), fighter("b", 20), fighter("c", 12)]);
    const seen = [];
    for (let step = 0; step < 7; step += 1) {
      current = nextTurn(current);
      seen.push(`${current.active_id}${current.round}`);
    }
    expect(seen).toEqual(["b1", "c1", "a1", "b2", "c2", "a2", "b3"]);
  });

  it("nextTurn : un combattant à terre garde son tour", () => {
    const start = adjustHp(encounter([fighter("a", 5, 3), fighter("b", 20)]), "a", -10);
    expect(isDown(start.combatants[0])).toBe(true);
    const second = nextTurn(nextTurn(start));
    expect(second.active_id).toBe("a");
  });

  it("nextTurn : un seul combattant, à chaque tour un nouveau round ; personne, rien ne change", () => {
    const alone = nextTurn(nextTurn(encounter([fighter("a", 5)])));
    expect(alone).toMatchObject({ active_id: "a", round: 2 });
    const empty = encounter([]);
    expect(nextTurn(empty)).toBe(empty);
  });

  it("nextTurn : une initiative modifiée en cours de route garde la main au combattant actif, puis suit le nouvel ordre", () => {
    let current = nextTurn(encounter([fighter("a", 5), fighter("b", 20), fighter("c", 12)]));
    expect(current.active_id).toBe("b");
    // b passe en dernier (ordre : c, a, b) : il garde la main, et le tour suivant revient au premier avec un nouveau round.
    current = updateCombatant(current, "b", { initiative: 1 });
    expect(current.active_id).toBe("b");
    expect(nextTurn(current)).toMatchObject({ active_id: "c", round: 2 });
  });

  it("removeCombatant : retirer celui qui joue donne la main au suivant, sans changer de round", () => {
    const start = setActive(encounter([fighter("a", 5), fighter("b", 20), fighter("c", 12)]), "c");
    const next = removeCombatant(start, "c");
    expect(next.active_id).toBe("a");
    expect(next.round).toBe(1);
    expect(ids(next.combatants)).toEqual(["a", "b"]);
  });

  it("removeCombatant : retirer le dernier de l'ordre redonne la main au premier ; retirer un autre garde l'actif", () => {
    const start = setActive(encounter([fighter("a", 5), fighter("b", 20), fighter("c", 12)]), "a");
    expect(removeCombatant(start, "a").active_id).toBe("b");
    expect(removeCombatant(start, "b").active_id).toBe("a");
    expect(removeCombatant(start, "zzz")).toBe(start);
  });

  it("removeCombatant : le dernier combattant retiré, plus personne n'a la main", () => {
    const start = setActive(encounter([fighter("a", 5)]), "a");
    expect(removeCombatant(start, "a")).toMatchObject({ combatants: [], active_id: null });
  });

  it("setActive ignore un combattant inconnu ; activeCombatant le retrouve", () => {
    const start = encounter([fighter("a", 5), fighter("b", 6)]);
    expect(setActive(start, "zzz")).toBe(start);
    expect(activeCombatant(start)).toBeNull();
    expect(activeCombatant(setActive(start, "b")).name).toBe("B");
  });

  it("resetEncounter : round 1 et personne n'a la main, le reste ne change pas", () => {
    const played = nextTurn(nextTurn(nextTurn(encounter([fighter("a", 5), fighter("b", 6)]))));
    expect(played.round).toBe(2);
    const reset = resetEncounter(played);
    expect(reset).toMatchObject({ round: 1, active_id: null });
    expect(reset.combatants).toEqual(played.combatants);
  });

  it("renameEncounter : un titre vide redevient « Rencontre »", () => {
    const start = encounter([]);
    expect(renameEncounter(start, "  Pont des brumes ").title).toBe("Pont des brumes");
    expect(renameEncounter(start, "   ").title).toBe(DEFAULT_ENCOUNTER_TITLE);
  });
});
