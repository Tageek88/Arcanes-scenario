import { describe, it, expect } from "vitest";
import { readNumber, parseBonus, buildRollRequest, formatRoll } from "@/lib/meta/rollRequest.js";
import { cleanDiceConfig, evaluateRoll, NO_CHARACTERISTIC_WARNING } from "@/lib/meta/dice.js";

// rng value that makes a die of `sides` land on `face`
const face = (n, sides) => (n - 1) / sides + 0.0001;
const seq = (...values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

const perStat = cleanDiceConfig({
  mode: "per_stat", rule: "add", outcome: "both", difficulty: 15,
  single: { count: 1, sides: 20 }, perStat: { Force: { count: 1, sides: 8 } },
  crit: { success: 8, failure: 1 },
});
const single = cleanDiceConfig({
  mode: "single", rule: "add", outcome: "both", difficulty: 15,
  single: { count: 1, sides: 20 }, crit: { success: 20, failure: 1 },
});
const sheet = {
  characteristics: { Force: { value: "14", fields: [] }, Agilité: { value: "9", fields: [] } },
  dice_override: {},
};

describe("readNumber / parseBonus", () => {
  it("reads signed numbers, spaces, decimal commas and the typographic minus", () => {
    expect(readNumber("+2")).toBe(2);
    expect(readNumber(" -1 ")).toBe(-1);
    expect(readNumber("− 3")).toBe(-3);
    expect(readNumber("2,5")).toBe(2.5);
    expect(readNumber("7")).toBe(7);
  });
  it("refuses what is not a number", () => {
    for (const text of ["", "  ", "d4", "+", "1d6", "2+2", "abc", null, undefined]) {
      expect(readNumber(text)).toBeNull();
    }
  });
  it("a bonus that is not a number counts as 0", () => {
    expect(parseBonus("d4")).toBe(0);
    expect(parseBonus("+4")).toBe(4);
  });
});

describe("buildRollRequest", () => {
  it("is null without setting, when disabled, or with nothing to roll", () => {
    expect(buildRollRequest({ setup: { dice: null, links: {} }, sheet, characteristic: "Force" })).toBeNull();
    expect(buildRollRequest({ setup: undefined, sheet, characteristic: "Force" })).toBeNull();
    const off = { ...perStat, enabled: false };
    expect(buildRollRequest({ setup: { dice: off, links: {} }, sheet, characteristic: "Force" })).toBeNull();
    expect(buildRollRequest({ setup: { dice: perStat, links: {} }, sheet, characteristic: "  " })).toBeNull();
    expect(buildRollRequest()).toBeNull();
  });

  it("rolls a characteristic with its model die and its value", () => {
    const request = buildRollRequest({ setup: { dice: perStat, links: {} }, sheet, characteristic: "Force" });
    expect(request.label).toBe("Force");
    expect(request.spec.die).toEqual({ count: 1, sides: 8 });
    expect(request.spec.source).toBe("model");
    expect(request.value).toBe(14);
    expect(request.bonus).toBe(0);
    expect(request.warnings).toEqual([]);
  });

  it("the die of the sheet wins over the model", () => {
    const own = { ...sheet, dice_override: { Force: { count: 2, sides: 6 } } };
    const request = buildRollRequest({ setup: { dice: perStat, links: {} }, sheet: own, characteristic: "Force" });
    expect(request.spec.die).toEqual({ count: 2, sides: 6 });
    expect(request.spec.source).toBe("override");
  });

  it("a skill rolls the characteristic written on the sheet first, then the one linked in the catalog", () => {
    const links = { escalade: "Force", discrétion: "Agilité" };
    const setup = { dice: perStat, links };
    const fromCatalog = buildRollRequest({ setup, sheet, skill: { name: "Escalade" } });
    expect(fromCatalog.characteristic).toBe("Force");
    expect(fromCatalog.value).toBe(14);
    expect(fromCatalog.label).toBe("Escalade");
    const fromSheet = buildRollRequest({ setup, sheet, skill: { name: "Escalade", characteristic: "Agilité" } });
    expect(fromSheet.characteristic).toBe("Agilité");
    expect(fromSheet.value).toBe(9);
  });

  it("a numeric modifier of the skill becomes the starting bonus, and says so", () => {
    const setup = { dice: perStat, links: { escalade: "Force" } };
    const plus = buildRollRequest({ setup, sheet, skill: { name: "Escalade", roll_modifier: "+2" } });
    expect(plus.bonus).toBe(2);
    expect(plus.notes).toEqual(["Modificateur de la compétence : +2 (repris dans le bonus)."]);
    const minus = buildRollRequest({ setup, sheet, skill: { name: "Escalade", roll_modifier: "-1" } });
    expect(minus.bonus).toBe(-1);
    const zero = buildRollRequest({ setup, sheet, skill: { name: "Escalade", roll_modifier: "0" } });
    expect(zero.bonus).toBe(0);
    expect(zero.notes).toEqual([]);
  });

  it("a modifier that is not a number is ignored, with a warning", () => {
    const setup = { dice: perStat, links: { escalade: "Force" } };
    const request = buildRollRequest({ setup, sheet, skill: { name: "Escalade", roll_modifier: "d4" } });
    expect(request.bonus).toBe(0);
    expect(request.warnings).toEqual(["Modificateur « d4 » non numérique : ignoré."]);
  });

  it("a skill without any linked characteristic still rolls, with the warning", () => {
    const request = buildRollRequest({ setup: { dice: perStat, links: {} }, sheet, skill: { name: "Libre" } });
    expect(request.characteristic).toBe("");
    expect(request.value).toBe(0);
    expect(request.spec.source).toBe("default");
    expect(request.spec.die).toEqual({ count: 1, sides: 20 });
    expect(request.warnings).toEqual([NO_CHARACTERISTIC_WARNING]);
  });

  it("a linked characteristic missing on the sheet rolls with value 0 and a warning", () => {
    const setup = { dice: single, links: { escalade: "Esprit" } };
    const request = buildRollRequest({ setup, sheet, skill: { name: "Escalade" } });
    expect(request.characteristic).toBe("Esprit");
    expect(request.value).toBe(0);
    expect(request.warnings).toEqual(["La caractéristique « Esprit » n'a pas de valeur sur cette fiche : valeur 0."]);
  });

  it("an empty value on the sheet is 0 without warning, and odd keys are not read as values", () => {
    const empty = { characteristics: { Force: { value: "", fields: [] } } };
    expect(buildRollRequest({ setup: { dice: single, links: {} }, sheet: empty, characteristic: "Force" }).warnings).toEqual([]);
    const proto = buildRollRequest({ setup: { dice: single, links: {} }, sheet: { characteristics: {} }, characteristic: "toString" });
    expect(proto.value).toBe(0);
    expect(proto.warnings.length).toBe(1);
  });
});

describe("catalog modifier", () => {
  const links = { escalade: "Force" };
  const modifiers = { escalade: "+1", libre: "-2" };
  const setup = { dice: perStat, links, modifiers };

  it("applies the modifier of the catalog when the sheet has none", () => {
    const request = buildRollRequest({ setup, sheet, skill: { name: "Escalade", roll_modifier: "" } });
    expect(request.bonus).toBe(1);
    expect(request.notes).toEqual(["Modificateur de la compétence : +1 (repris dans le bonus)."]);
    expect(buildRollRequest({ setup, sheet, skill: { name: " ESCALADE " } }).bonus).toBe(1);
  });
  it("the modifier of the sheet wins, even 0", () => {
    expect(buildRollRequest({ setup, sheet, skill: { name: "Escalade", roll_modifier: "3" } }).bonus).toBe(3);
    expect(buildRollRequest({ setup, sheet, skill: { name: "Escalade", roll_modifier: "0" } }).bonus).toBe(0);
  });
  it("a non numeric catalog modifier warns, and a setup without modifiers still works", () => {
    const odd = buildRollRequest({ setup: { dice: perStat, links, modifiers: { escalade: "d4" } }, sheet, skill: { name: "Escalade" } });
    expect(odd.bonus).toBe(0);
    expect(odd.warnings).toEqual(["Modificateur « d4 » non numérique : ignoré."]);
    expect(buildRollRequest({ setup: { dice: perStat, links }, sheet, skill: { name: "Escalade" } }).bonus).toBe(0);
  });
});

describe("formatRoll", () => {
  it("is null without result", () => {
    expect(formatRoll(null)).toBeNull();
  });

  it("add: dice, total with its parts, difficulty, verdict", () => {
    const result = evaluateRoll({
      config: single, die: { count: 1, sides: 20 }, value: 14, bonus: 2, rng: seq(face(10, 20)),
    });
    const shown = formatRoll(result);
    expect(shown.faces).toEqual([10]);
    expect(shown.big).toBe("26");
    expect(shown.bigLabel).toBe("total");
    expect(shown.lines).toEqual(["Dés (1d20) : 10", "Total : 10 + 14 + 2 = 26", "Difficulté : 15"]);
    expect(shown.verdict).toBe("success");
    expect(shown.verdictLabel).toBe("Réussite");
    expect(shown.critical).toBeNull();
    expect(shown.summary).toBe("total 26, Réussite");
  });

  it("add: several dice, negative bonus, zero value left out, failure and critical", () => {
    const config = cleanDiceConfig({ mode: "single", rule: "add", outcome: "both", difficulty: 15, crit: { success: 12, failure: 2 } });
    const result = evaluateRoll({
      config, die: { count: 2, sides: 6 }, value: 0, bonus: -1, rng: seq(face(1, 6), face(1, 6)),
    });
    const shown = formatRoll(result);
    expect(shown.lines[0]).toBe("Dés (2d6) : 1 + 1 = 2");
    expect(shown.lines[1]).toBe("Total : 2 − 1 = 1");
    expect(shown.verdict).toBe("failure");
    expect(shown.critical).toBe("failure");
    expect(shown.criticalLabel).toBe("Échec critique");
    expect(shown.summary).toBe("total 1, Échec, Échec critique");
  });

  it("add with the total only: no verdict, no difficulty line", () => {
    const config = cleanDiceConfig({ mode: "single", rule: "add", outcome: "total", difficulty: 15 });
    const shown = formatRoll(evaluateRoll({ config, die: { count: 1, sides: 20 }, value: 3, rng: seq(face(5, 20)) }));
    expect(shown.verdict).toBeNull();
    expect(shown.lines).toEqual(["Dés (1d20) : 5", "Total : 5 + 3 = 8"]);
  });

  it("add with success only hides the total but still shows the dice, and says when no difficulty is set", () => {
    const withDifficulty = cleanDiceConfig({ mode: "single", rule: "add", outcome: "success", difficulty: 10 });
    const a = formatRoll(evaluateRoll({ config: withDifficulty, die: { count: 1, sides: 20 }, value: 3, rng: seq(face(9, 20)) }));
    expect(a.big).toBeNull();
    expect(a.lines).toEqual(["Dés (1d20) : 9", "Difficulté : 10"]);
    expect(a.verdict).toBe("success");
    const without = cleanDiceConfig({ mode: "single", rule: "add", outcome: "success" });
    const b = formatRoll(evaluateRoll({ config: without, die: { count: 1, sides: 20 }, rng: seq(0.5) }));
    expect(b.verdict).toBeNull();
    expect(b.lines[1]).toBe("Aucune difficulté réglée : saisissez-en une pour voir la réussite.");
  });

  it("under: the rolled number is always shown, with the target", () => {
    const config = cleanDiceConfig({ mode: "single", rule: "under", outcome: "success", crit: { success: 5, failure: 96 } });
    const ok = formatRoll(evaluateRoll({ config, die: { count: 1, sides: 100 }, value: 60, rng: seq(face(3, 100)) }));
    expect(ok.big).toBe("3");
    expect(ok.bigLabel).toBe("jet");
    expect(ok.lines).toEqual(["Jet (1d100) : 3", "Cible : 60"]);
    expect(ok.verdict).toBe("success");
    expect(ok.critical).toBe("success");
    const bonus = formatRoll(evaluateRoll({ config, die: { count: 1, sides: 100 }, value: 60, bonus: 10, rng: seq(face(65, 100)) }));
    expect(bonus.lines[1]).toBe("Cible : 70 (valeur 60 + 10)");
    expect(bonus.verdict).toBe("success");
    const many = cleanDiceConfig({ mode: "single", rule: "under", outcome: "both" });
    const three = formatRoll(evaluateRoll({ config: many, die: { count: 3, sides: 6 }, value: 10, rng: seq(face(2, 6), face(3, 6), face(4, 6)) }));
    expect(three.lines[0]).toBe("Jet (3d6) : 2 + 3 + 4 = 9");
  });

  it("pool: the number of successes is always shown, even when only the success is asked", () => {
    const config = cleanDiceConfig({ mode: "single", rule: "pool", outcome: "success", difficulty: 5 });
    const shown = formatRoll(evaluateRoll({
      config, die: { count: 1, sides: 6 }, value: 4,
      rng: seq(face(6, 6), face(5, 6), face(4, 6), face(1, 6)),
    }));
    expect(shown.big).toBe("2");
    expect(shown.bigLabel).toBe("réussites");
    expect(shown.lines).toEqual(["Réserve de 4d6 : 6 · 5 · 4 · 1", "Un dé réussit à partir de 5"]);
    expect(shown.verdict).toBe("success");
    const one = formatRoll(evaluateRoll({ config, die: { count: 1, sides: 6 }, value: 1, rng: seq(face(5, 6)) }));
    expect(one.bigLabel).toBe("réussite");
    const none = formatRoll(evaluateRoll({ config, die: { count: 1, sides: 6 }, value: 2, rng: seq(face(1, 6), face(2, 6)) }));
    expect(none.big).toBe("0");
    expect(none.verdict).toBe("failure");
  });
});
