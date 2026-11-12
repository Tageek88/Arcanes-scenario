import { describe, expect, it } from "vitest";
import {
  MAX_TRACKS,
  MAX_TRACK_BOXES,
  checkedCount,
  cleanChecks,
  cleanTracks,
  draftToTracks,
  newTrackId,
  nextCheckedValue,
  setChecked,
  trackRows,
  tracksToDraft,
} from "@/lib/meta/tracks.js";

const STRESS = { id: "t1", name: "Stress", count: 5 };
const RAD = { id: "t2", name: "Radiations", count: 10 };

describe("cleanTracks", () => {
  it("keeps a valid track and reads a typed box count", () => {
    expect(cleanTracks([{ id: "t1", name: " Stress ", count: "5" }])).toEqual([STRESS]);
  });

  it("drops tracks without name, id or a usable box count, and repeated ids", () => {
    const raw = [
      { id: "a", name: "", count: 3 },
      { id: "", name: "Sans id", count: 3 },
      { id: "b", name: "Zéro", count: 0 },
      { id: "c", name: "Texte", count: "abc" },
      { id: "d", name: "Bon", count: 2 },
      { id: "d", name: "Doublon", count: 2 },
      null,
    ];
    expect(cleanTracks(raw)).toEqual([{ id: "d", name: "Bon", count: 2 }]);
  });

  it("bounds the number of boxes and of tracks, and tolerates a non-array", () => {
    expect(cleanTracks([{ id: "x", name: "Long", count: 999 }])[0].count).toBe(MAX_TRACK_BOXES);
    const many = Array.from({ length: MAX_TRACKS + 5 }, (_, i) => ({ id: `i${i}`, name: `P${i}`, count: 1 }));
    expect(cleanTracks(many)).toHaveLength(MAX_TRACKS);
    expect(cleanTracks(null)).toEqual([]);
  });

  it("round-trips through the editor draft", () => {
    expect(tracksToDraft([STRESS])).toEqual([{ id: "t1", name: "Stress", count: "5" }]);
    expect(draftToTracks([{ id: "t1", name: "Stress", count: "5" }, { id: "t9", name: "", count: "3" }])).toEqual([STRESS]);
  });

  it("makes distinct identifiers", () => {
    expect(newTrackId()).not.toBe(newTrackId());
  });
});

describe("clicking boxes", () => {
  it("ticks up to the clicked box, and unticks the last ticked box", () => {
    expect(nextCheckedValue(0, 2)).toBe(3);
    expect(nextCheckedValue(3, 4)).toBe(5);
    expect(nextCheckedValue(3, 1)).toBe(2);
    expect(nextCheckedValue(3, 2)).toBe(2);
    expect(nextCheckedValue(1, 0)).toBe(0);
  });

  it("bounds the ticked boxes shown", () => {
    expect(checkedCount(3, 5)).toBe(3);
    expect(checkedCount(9, 5)).toBe(5);
    expect(checkedCount(-2, 5)).toBe(0);
    expect(checkedCount("x", 5)).toBe(0);
    expect(checkedCount(undefined, 5)).toBe(0);
  });
});

describe("cleanChecks", () => {
  it("keeps known tracks only, bounded by their box count, without zeros", () => {
    const raw = { t1: 9, t2: "4", t3: 2, t4: 0, "": 1 };
    expect(cleanChecks(raw, [STRESS, RAD])).toEqual({ t1: 5, t2: 4 });
  });

  it("keeps any id when no model is given, and tolerates non-objects", () => {
    expect(cleanChecks({ whatever: 3, bad: "no" })).toEqual({ whatever: 3 });
    expect(cleanChecks(null, [STRESS])).toEqual({});
    expect(cleanChecks([1, 2], [STRESS])).toEqual({});
  });

  it("keeps the ticked boxes when a track is renamed (same id)", () => {
    const renamed = [{ ...STRESS, name: "Tension" }];
    expect(cleanChecks({ t1: 3 }, renamed)).toEqual({ t1: 3 });
  });
});

describe("setChecked", () => {
  it("sets a value and removes the entry at zero, without touching the input", () => {
    const before = { t1: 2 };
    expect(setChecked(before, "t2", 4)).toEqual({ t1: 2, t2: 4 });
    expect(setChecked(before, "t1", 0)).toEqual({});
    expect(before).toEqual({ t1: 2 });
    expect(setChecked(undefined, "t1", 1)).toEqual({ t1: 1 });
  });
});

describe("trackRows", () => {
  it("lists the model tracks with the boxes ticked on the sheet", () => {
    expect(trackRows([STRESS, RAD], { t1: 2, gone: 7 })).toEqual([
      { ...STRESS, checked: 2 },
      { ...RAD, checked: 0 },
    ]);
    expect(trackRows(undefined, { t1: 2 })).toEqual([]);
  });
});
