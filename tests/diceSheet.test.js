import { describe, it, expect } from "vitest";
import { npcSheetPayload } from "@/lib/meta/codex.js";
import { cleanDiceOverride } from "@/lib/meta/dice.js";
import { startOverride, updateOverrideDie, clearOverride } from "@/lib/meta/diceDraft.js";

describe("npcSheetPayload and the dice", () => {
  const base = { skills: [{ name: "Escalade", roll_modifier: "", fields: [] }] };
  it("keeps the linked characteristic of a skill, only when there is one", () => {
    const linked = npcSheetPayload({ skills: [{ name: " Escalade ", characteristic: " Force " }] });
    expect(linked.skills[0].characteristic).toBe("Force");
    const plain = npcSheetPayload(base);
    expect("characteristic" in plain.skills[0]).toBe(false);
    expect("characteristic" in npcSheetPayload({ skills: [{ name: "X", characteristic: "  " }] }).skills[0]).toBe(false);
  });
  it("does not write dice_override when the form does not carry it (the saved value is kept)", () => {
    expect("dice_override" in npcSheetPayload(base)).toBe(false);
  });
  it("cleans the die override of the form (typed text, incomplete dice dropped)", () => {
    const payload = npcSheetPayload({
      ...base,
      dice_override: {
        Force: { count: "1", sides: "8" },
        Agilité: { count: "", sides: "6" },
        Esprit: { count: 2, sides: 4 },
      },
    });
    expect(payload.dice_override).toEqual({ Force: { count: 1, sides: 8 }, Esprit: { count: 2, sides: 4 } });
  });
  it("an emptied override clears the saved one", () => {
    expect(npcSheetPayload({ ...base, dice_override: {} }).dice_override).toEqual({});
  });
});

describe("override editing helpers", () => {
  it("starts from the model's die, edits it and goes back to the model", () => {
    let override = startOverride(undefined, "Force", { count: 2, sides: 6 });
    expect(override).toEqual({ Force: { count: "2", sides: "6" } });
    override = updateOverrideDie(override, "Force", "sides", "10");
    expect(cleanDiceOverride(override)).toEqual({ Force: { count: 2, sides: 10 } });
    override = updateOverrideDie(override, "Force", "count", "");
    expect(cleanDiceOverride(override)).toEqual({});
    expect(clearOverride(override, "Force")).toEqual({});
  });
  it("keeps the other characteristics and never changes its input", () => {
    const before = { Agilité: { count: 1, sides: 12 } };
    const after = startOverride(before, "Force", null);
    expect(after).toEqual({ Agilité: { count: 1, sides: 12 }, Force: { count: "1", sides: "20" } });
    expect(before).toEqual({ Agilité: { count: 1, sides: 12 } });
    expect(clearOverride(after, "Force")).toEqual(before);
    expect(clearOverride(null, "Force")).toEqual({});
  });
});
