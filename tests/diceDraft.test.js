import { describe, it, expect } from "vitest";
import {
  emptyDiceDraft,
  diceToDraft,
  draftToDice,
  updateDiceDraft,
  updateSingleDie,
  updateStatDie,
  applyPresetToDraft,
} from "@/lib/meta/diceDraft.js";
import {
  cleanDiceConfig,
  hasDiceConfig,
  resolveRollSpec,
  evaluateRoll,
} from "@/lib/meta/dice.js";

const stats = [
  { _key: "c1", name: "Force" },
  { _key: "c2", name: "Agilité" },
  { _key: "c3", name: "" },
];

describe("enabled flag", () => {
  it("is on by default and can be switched off without losing the values", () => {
    const on = cleanDiceConfig({ mode: "per_stat", rule: "add", perStat: { Force: { count: 1, sides: 8 } } });
    expect(on.enabled).toBe(true);
    const off = cleanDiceConfig({ ...on, enabled: false });
    expect(off.enabled).toBe(false);
    expect(off.perStat).toEqual({ Force: { count: 1, sides: 8 } });
  });
  it("a disabled setting hides the roll everywhere", () => {
    const off = { mode: "single", rule: "add", enabled: false };
    expect(hasDiceConfig(off)).toBe(false);
    expect(resolveRollSpec({ config: off, characteristic: "Force" })).toBeNull();
    expect(evaluateRoll({ config: off, die: { count: 1, sides: 20 } })).toBeNull();
    expect(hasDiceConfig({ mode: "single", rule: "add" })).toBe(true);
  });
});

describe("diceToDraft / draftToDice", () => {
  it("nothing configured gives a disabled, untouched draft that saves as null", () => {
    const draft = diceToDraft(null, stats);
    expect(draft).toEqual(emptyDiceDraft());
    expect(draft.enabled).toBe(false);
    expect(draft.used).toBe(false);
    expect(draftToDice(draft, stats)).toBeNull();
  });
  it("round trip keeps every setting, with the dice of each characteristic", () => {
    const config = {
      mode: "per_stat", rule: "under", outcome: "both", difficulty: 12,
      single: { count: 2, sides: 6 },
      perStat: { Force: { count: 1, sides: 8 }, Agilité: { count: 1, sides: 12 } },
      crit: { success: 3, failure: 18 },
    };
    const draft = diceToDraft(config, stats);
    expect(draft.perStat).toEqual({
      c1: { count: "1", sides: "8" },
      c2: { count: "1", sides: "12" },
    });
    expect(draft.critSuccess).toBe("3");
    expect(draft.difficulty).toBe("12");
    expect(draftToDice(draft, stats)).toEqual(cleanDiceConfig(config));
  });
  it("a renamed characteristic keeps its die (the key is stable)", () => {
    const draft = diceToDraft(
      { mode: "per_stat", rule: "add", perStat: { Force: { count: 1, sides: 8 } } },
      stats
    );
    const renamed = [{ _key: "c1", name: "Puissance" }, stats[1], stats[2]];
    expect(draftToDice(draft, renamed).perStat).toEqual({ Puissance: { count: 1, sides: 8 } });
  });
  it("dice of removed or unnamed characteristics are dropped", () => {
    const draft = diceToDraft(
      { mode: "per_stat", rule: "add", perStat: { Force: { count: 1, sides: 8 }, Ancienne: { count: 1, sides: 6 } } },
      stats
    );
    expect(Object.keys(draft.perStat)).toEqual(["c1"]);
    const withUnnamed = updateStatDie(draft, "c3", "sides", "10");
    expect(draftToDice(withUnnamed, stats).perStat).toEqual({ Force: { count: 1, sides: 8 } });
    expect(draftToDice(draft, [{ _key: "c1", name: "Force" }]).perStat).toEqual({ Force: { count: 1, sides: 8 } });
    expect(draftToDice(draft, []).perStat).toEqual({});
  });
  it("incomplete dice are not saved for a characteristic", () => {
    let draft = updateDiceDraft(emptyDiceDraft(), { enabled: true, mode: "per_stat" });
    draft = updateStatDie(draft, "c1", "sides", "8");
    expect(draftToDice(draft, stats).perStat).toEqual({});
    draft = updateStatDie(draft, "c1", "count", "1");
    expect(draftToDice(draft, stats).perStat).toEqual({ Force: { count: 1, sides: 8 } });
  });
  it("switching the mode never loses the other mode's values", () => {
    let draft = diceToDraft(
      { mode: "single", rule: "add", single: { count: 1, sides: 20 }, perStat: { Force: { count: 1, sides: 8 } } },
      stats
    );
    draft = updateDiceDraft(draft, { mode: "per_stat" });
    const saved = draftToDice(draft, stats);
    expect(saved.mode).toBe("per_stat");
    expect(saved.single).toEqual({ count: 1, sides: 20 });
    expect(saved.perStat).toEqual({ Force: { count: 1, sides: 8 } });
  });
  it("a disabled but touched draft is kept, so nothing typed is lost", () => {
    let draft = updateSingleDie(emptyDiceDraft(), "sides", "100");
    expect(draft.enabled).toBe(false);
    expect(draft.used).toBe(true);
    const saved = draftToDice(draft, stats);
    expect(saved.enabled).toBe(false);
    expect(saved.single).toEqual({ count: 1, sides: 100 });
    expect(hasDiceConfig(saved)).toBe(false);
    // and it comes back disabled with the same values
    expect(diceToDraft(saved, stats).single).toEqual({ count: "1", sides: "100" });
    draft = updateDiceDraft(diceToDraft(saved, stats), { enabled: true });
    expect(hasDiceConfig(draftToDice(draft, stats))).toBe(true);
  });
  it("empty thresholds and difficulty are saved as no value", () => {
    const draft = updateDiceDraft(emptyDiceDraft(), { enabled: true });
    const saved = draftToDice(draft, stats);
    expect(saved.crit).toEqual({ success: null, failure: null });
    expect(saved.difficulty).toBeNull();
    expect(saved.outcome).toBe("total");
  });
  it("an unusable single die falls back to the default die", () => {
    let draft = updateDiceDraft(emptyDiceDraft(), { enabled: true });
    draft = updateSingleDie(updateSingleDie(draft, "count", ""), "sides", "");
    expect(draftToDice(draft, stats).single).toEqual({ count: 1, sides: 20 });
  });
});

describe("applyPresetToDraft", () => {
  it("enables the setting and keeps the dice already typed per characteristic", () => {
    let draft = updateStatDie(emptyDiceDraft(), "c1", "sides", "8");
    draft = updateStatDie(draft, "c1", "count", "1");
    const next = applyPresetToDraft(draft, "d100-under");
    expect(next.enabled).toBe(true);
    expect(next.used).toBe(true);
    expect(next.rule).toBe("under");
    expect(next.single).toEqual({ count: "1", sides: "100" });
    expect(next.perStat).toEqual({ c1: { count: "1", sides: "8" } });
  });
  it("an unknown preset changes nothing", () => {
    const draft = emptyDiceDraft();
    expect(applyPresetToDraft(draft, "nope")).toBe(draft);
  });
});
