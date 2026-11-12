import { describe, expect, it } from "vitest";
import { evaluateRoll, presetDice } from "@/lib/meta/dice.js";
import { buildRollRequest } from "@/lib/meta/rollRequest.js";

// Metro 2033 : Endurance (compétence) est liée à Vigueur (caractéristique) ; les deux valeurs s'additionnent.
const sheet = { characteristics: { Vigueur: { value: "3" } } };
const setupOf = (presetId) => ({ dice: presetDice(presetId), links: {}, modifiers: {} });
const skill = (extra = {}) => ({ name: "Endurance", characteristic: "Vigueur", ...extra });

describe("valeur d'une compétence liée à une caractéristique", () => {
  it("ajoute la valeur de la compétence à celle de sa caractéristique (2 + 3 = 5 dés)", () => {
    const request = buildRollRequest({ setup: setupOf("d6-pool"), sheet, skill: skill({ value: "2" }) });
    expect(request.value).toBe(5);
    expect(request.notes.join(" ")).toContain("Vigueur 3 + Endurance 2 = 5");
    const result = evaluateRoll({ config: request.config, die: request.spec.die, value: request.value, bonus: request.bonus, rng: () => 0.99 });
    expect(result.die.count).toBe(5);
    expect(result.rolls).toHaveLength(5);
    expect(result.total).toBe(5);
  });

  it("ajoute aussi la valeur au total d'un jet « dé + valeur »", () => {
    const request = buildRollRequest({ setup: setupOf("2d6-add"), sheet, skill: skill({ value: "2" }) });
    const result = evaluateRoll({ config: request.config, die: request.spec.die, value: request.value, bonus: request.bonus, rng: () => 0 });
    expect(result.sum).toBe(2);
    expect(result.total).toBe(7);
  });

  it("sans valeur de compétence, seule la caractéristique compte, sans note", () => {
    const request = buildRollRequest({ setup: setupOf("d6-pool"), sheet, skill: skill() });
    expect(request.value).toBe(3);
    expect(request.notes).toEqual([]);
  });

  it("ignore une valeur nulle ou vide", () => {
    expect(buildRollRequest({ setup: setupOf("d6-pool"), sheet, skill: skill({ value: "0" }) }).value).toBe(3);
    expect(buildRollRequest({ setup: setupOf("d6-pool"), sheet, skill: skill({ value: "" }) }).value).toBe(3);
  });

  it("signale une valeur non numérique et ne l'ajoute pas", () => {
    const request = buildRollRequest({ setup: setupOf("d6-pool"), sheet, skill: skill({ value: "beaucoup" }) });
    expect(request.value).toBe(3);
    expect(request.warnings.join(" ")).toContain("non numérique");
  });

  it("une compétence sans caractéristique lance avec sa seule valeur (et l'avertissement habituel)", () => {
    const request = buildRollRequest({ setup: setupOf("d6-pool"), sheet, skill: { name: "Libre", value: "2" } });
    expect(request.value).toBe(2);
    expect(request.warnings).toHaveLength(1);
  });

  it("le jet d'une caractéristique seule ne change pas", () => {
    const request = buildRollRequest({ setup: setupOf("d6-pool"), sheet, characteristic: "Vigueur" });
    expect(request.value).toBe(3);
  });

  it("accepte une valeur à virgule ou signée", () => {
    expect(buildRollRequest({ setup: setupOf("d6-pool"), sheet, skill: skill({ value: "+2" }) }).value).toBe(5);
    expect(buildRollRequest({ setup: setupOf("d6-pool"), sheet, skill: skill({ value: "-1" }) }).value).toBe(2);
  });
});
