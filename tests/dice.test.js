import { describe, it, expect } from "vitest";
import {
  cleanDie,
  describeDie,
  cleanDiceConfig,
  hasDiceConfig,
  cleanDiceOverride,
  setOverride,
  renameDiceCharacteristic,
  renameOverrideCharacteristic,
  presetDice,
  DICE_PRESETS,
  statValue,
  resolveRollSpec,
  evaluateRoll,
  NO_CHARACTERISTIC_WARNING,
  MAX_DICE_COUNT,
  MAX_DICE_SIDES,
} from "@/lib/meta/dice.js";

// Deterministic rng: returns the given values in [0, 1) one after another.
const seq = (...values) => {
  let i = 0;
  return () => values[i++ % values.length];
};
// rng value that makes a die of `sides` land on `face`
const face = (face, sides) => (face - 1) / sides + 0.0001;

describe("cleanDie", () => {
  it("accepts a valid die and rounds it", () => {
    expect(cleanDie({ count: "2", sides: 6.4 })).toEqual({ count: 2, sides: 6 });
  });
  it("bounds count and sides", () => {
    expect(cleanDie({ count: 999, sides: 99999 })).toEqual({
      count: MAX_DICE_COUNT,
      sides: MAX_DICE_SIDES,
    });
  });
  it("refuses unusable dice", () => {
    expect(cleanDie({ count: 0, sides: 6 })).toBeNull();
    expect(cleanDie({ count: 1, sides: 1 })).toBeNull();
    expect(cleanDie(null, "x")).toBe("x");
  });
  it("describes a die", () => {
    expect(describeDie({ count: 2, sides: 6 })).toBe("2d6");
  });
});

describe("cleanDiceConfig", () => {
  it("returns null without usable config (no roll button)", () => {
    expect(cleanDiceConfig(undefined)).toBeNull();
    expect(cleanDiceConfig({ mode: "single" })).toBeNull();
    expect(hasDiceConfig({ mode: "x", rule: "add" })).toBe(false);
  });
  it("keeps single and perStat so the mode can change without loss", () => {
    const cfg = cleanDiceConfig({
      mode: "per_stat",
      rule: "add",
      single: { count: 1, sides: 20 },
      perStat: { Force: { count: 1, sides: 8 }, Bad: { count: 0, sides: 4 } },
    });
    expect(cfg.single).toEqual({ count: 1, sides: 20 });
    expect(cfg.perStat).toEqual({ Force: { count: 1, sides: 8 } });
    const switched = cleanDiceConfig({ ...cfg, mode: "single" });
    expect(switched.perStat).toEqual({ Force: { count: 1, sides: 8 } });
  });
  it("defaults outcome and thresholds", () => {
    const cfg = cleanDiceConfig({ mode: "single", rule: "add" });
    expect(cfg.outcome).toBe("total");
    expect(cfg.crit).toEqual({ success: null, failure: null });
    expect(cfg.difficulty).toBeNull();
  });
});

describe("presets", () => {
  it("all presets are valid configs", () => {
    for (const p of DICE_PRESETS) expect(presetDice(p.id)).not.toBeNull();
    expect(presetDice("nope")).toBeNull();
  });
});

describe("overrides and renames", () => {
  it("sets and removes an override", () => {
    let o = setOverride({}, "Force", { count: 1, sides: 10 });
    expect(o).toEqual({ Force: { count: 1, sides: 10 } });
    o = setOverride(o, "Force", null);
    expect(o).toEqual({});
  });
  it("ignores invalid override entries", () => {
    expect(cleanDiceOverride({ A: { count: 0, sides: 6 }, B: { count: 1, sides: 6 } })).toEqual({
      B: { count: 1, sides: 6 },
    });
  });
  it("follows a renamed characteristic", () => {
    const cfg = { mode: "per_stat", rule: "add", perStat: { Force: { count: 1, sides: 8 } } };
    expect(renameDiceCharacteristic(cfg, "Force", "Puissance").perStat).toEqual({
      Puissance: { count: 1, sides: 8 },
    });
    expect(renameOverrideCharacteristic({ Force: { count: 1, sides: 8 } }, "Force", "P")).toEqual({
      P: { count: 1, sides: 8 },
    });
  });
});

describe("resolveRollSpec", () => {
  const single = { mode: "single", rule: "add", single: { count: 1, sides: 20 } };
  const perStat = {
    mode: "per_stat",
    rule: "add",
    perStat: { Force: { count: 1, sides: 8 } },
  };
  it("is null without config", () => {
    expect(resolveRollSpec({ config: null, characteristic: "Force" })).toBeNull();
  });
  it("uses the single die", () => {
    const s = resolveRollSpec({ config: single, characteristic: "Force" });
    expect(s.die).toEqual({ count: 1, sides: 20 });
    expect(s.source).toBe("model");
    expect(s.warning).toBeNull();
  });
  it("uses the per-stat die, then the sheet override first", () => {
    expect(resolveRollSpec({ config: perStat, characteristic: "Force" }).die.sides).toBe(8);
    const o = resolveRollSpec({
      config: perStat,
      override: { Force: { count: 2, sides: 4 } },
      characteristic: "Force",
    });
    expect(o.die).toEqual({ count: 2, sides: 4 });
    expect(o.source).toBe("override");
  });
  it("falls back to the default die with a warning when no characteristic is linked", () => {
    const s = resolveRollSpec({ config: perStat, characteristic: "" });
    expect(s.source).toBe("default");
    expect(s.warning).toBe(NO_CHARACTERISTIC_WARNING);
  });
  it("falls back to the default die for a stat missing in per_stat", () => {
    const s = resolveRollSpec({ config: perStat, characteristic: "Agilité" });
    expect(s.source).toBe("default");
    expect(s.warning).toBeNull();
  });
});

describe("statValue", () => {
  it("reads values", () => {
    expect(statValue({ value: "14" })).toBe(14);
    expect(statValue(" 3,5 ")).toBe(3.5);
    expect(statValue({ value: "abc" })).toBe(0);
    expect(statValue(undefined)).toBe(0);
  });
});

describe("evaluateRoll", () => {
  it("add: total = dice + value + bonus, success against difficulty", () => {
    const config = {
      mode: "single", rule: "add", outcome: "both", difficulty: 15,
      crit: { success: 20, failure: 1 },
    };
    const r = evaluateRoll({
      config, die: { count: 1, sides: 20 }, value: 4, bonus: 2, rng: seq(face(10, 20)),
    });
    expect(r.rolls).toEqual([10]);
    expect(r.total).toBe(16);
    expect(r.success).toBe(true);
    expect(r.critical).toBeNull();
    expect(r.showTotal).toBe(true);
  });
  it("add: difficulty given at roll time overrides the model's", () => {
    const config = { mode: "single", rule: "add", outcome: "both", difficulty: 15 };
    const r = evaluateRoll({
      config, die: { count: 1, sides: 20 }, value: 0, difficulty: 18, rng: seq(face(10, 20)),
    });
    expect(r.success).toBe(false);
  });
  it("add: natural 20 and 1 are critical", () => {
    const config = {
      mode: "single", rule: "add", outcome: "both", difficulty: 10,
      crit: { success: 20, failure: 1 },
    };
    const die = { count: 1, sides: 20 };
    expect(evaluateRoll({ config, die, rng: seq(face(20, 20)) }).critical).toBe("success");
    expect(evaluateRoll({ config, die, rng: seq(face(1, 20)) }).critical).toBe("failure");
  });
  it("add with outcome total hides success", () => {
    const config = { mode: "single", rule: "add", outcome: "total", difficulty: 10 };
    const r = evaluateRoll({ config, die: { count: 1, sides: 20 }, rng: seq(face(15, 20)) });
    expect(r.success).toBeNull();
    expect(r.showTotal).toBe(true);
  });
  it("add without difficulty gives no success", () => {
    const config = { mode: "single", rule: "add", outcome: "both" };
    const r = evaluateRoll({ config, die: { count: 1, sides: 20 }, rng: seq(0.5) });
    expect(r.success).toBeNull();
  });
  it("under: success when the roll stays under the value; bonus moves the target", () => {
    const config = {
      mode: "single", rule: "under", outcome: "success",
      crit: { success: 5, failure: 96 },
    };
    const die = { count: 1, sides: 100 };
    const ok = evaluateRoll({ config, die, value: 60, rng: seq(face(60, 100)) });
    expect(ok.success).toBe(true);
    expect(ok.showTotal).toBe(false);
    const ko = evaluateRoll({ config, die, value: 60, rng: seq(face(61, 100)) });
    expect(ko.success).toBe(false);
    const withBonus = evaluateRoll({ config, die, value: 60, bonus: 10, rng: seq(face(65, 100)) });
    expect(withBonus.target).toBe(70);
    expect(withBonus.success).toBe(true);
    expect(evaluateRoll({ config, die, value: 60, rng: seq(face(3, 100)) }).critical).toBe("success");
    expect(evaluateRoll({ config, die, value: 60, rng: seq(face(98, 100)) }).critical).toBe("failure");
  });
  it("pool: the value gives the number of dice, successes counted at the threshold", () => {
    const config = { mode: "single", rule: "pool", outcome: "success", difficulty: 5 };
    const r = evaluateRoll({
      config, die: { count: 1, sides: 6 }, value: 4,
      rng: seq(face(6, 6), face(5, 6), face(4, 6), face(1, 6)),
    });
    expect(r.die.count).toBe(4);
    expect(r.rolls).toEqual([6, 5, 4, 1]);
    expect(r.total).toBe(2);
    expect(r.success).toBe(true);
    expect(r.critical).toBeNull();
  });
  it("pool: bonus adds dice, at least one die is rolled", () => {
    const config = { mode: "single", rule: "pool", outcome: "both", difficulty: 5 };
    const die = { count: 1, sides: 6 };
    expect(evaluateRoll({ config, die, value: 2, bonus: 1, rng: seq(0.1) }).die.count).toBe(3);
    expect(evaluateRoll({ config, die, value: 0, rng: seq(0.1) }).die.count).toBe(1);
  });
  it("rolls stay inside the die", () => {
    const config = { mode: "single", rule: "add" };
    const r = evaluateRoll({ config, die: { count: 3, sides: 6 }, rng: seq(0.999999, 0) });
    for (const x of r.rolls) {
      expect(x).toBeGreaterThanOrEqual(1);
      expect(x).toBeLessThanOrEqual(6);
    }
  });
  it("returns null without config", () => {
    expect(evaluateRoll({ config: null })).toBeNull();
  });
});
