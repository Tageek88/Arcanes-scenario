import { describe, expect, it } from "vitest";
import { nameScore, normalizeName, placeByFieldNames, snapAllZones } from "@/lib/meta/pdfFieldMatch.js";

const MODEL = {
  characteristics: [{ name: "Force", field_names: ["Maximum"] }, { name: "Agilité", field_names: [] }],
  tracks: [{ id: "t1", name: "Stress", count: 3 }],
  textFields: [{ id: "f1", name: "Alignement", long: false }],
};
const field = (over = {}) => ({ id: "f", page: 0, type: "text", name: "x", x: 0.1, y: 0.1, w: 0.2, h: 0.03, ...over });
const zone = (over = {}) => ({ id: "z1", kind: "stat", ref: "Force", page: 0, x: 0.12, y: 0.11, w: 0.08, h: 0.02, size: 2, ...over });

describe("noms de champs", () => {
  it("compare sans accents, casse ni ponctuation", () => {
    expect(normalizeName(" Agilité · Max. ")).toBe("agilitemax");
    expect(normalizeName(null)).toBe("");
  });
  it("note les noms identiques plus haut que les noms qui se contiennent", () => {
    expect(nameScore("Force", "force")).toBe(3);
    expect(nameScore("Force_total", "Force")).toBeGreaterThan(1);
    expect(nameScore("Force_total", "Force")).toBeLessThan(2);
    expect(nameScore("de", "Force")).toBe(0);
    expect(nameScore("", "Force")).toBe(0);
  });
});

describe("snapAllZones", () => {
  it("colle chaque zone sur le champ le plus proche", () => {
    const fields = [field({ id: "a", x: 0.1, y: 0.1 }), field({ id: "b", x: 0.5, y: 0.5 })];
    const zones = [zone({ id: "z1", x: 0.12, y: 0.11 }), zone({ id: "z2", kind: "text", ref: "f1", x: 0.52, y: 0.52 })];
    const out = snapAllZones(zones, fields);
    expect(out.snapped).toBe(2);
    expect(out.unmatched).toBe(0);
    expect(out.zones[0]).toMatchObject({ x: 0.1, y: 0.1, w: 0.2, h: 0.03 });
    expect(out.zones[1]).toMatchObject({ x: 0.5, y: 0.5 });
    expect(out.zones[0].size).toBe(2);
  });
  it("un champ ne sert qu'à une zone : la plus proche gagne", () => {
    const fields = [field({ id: "a", x: 0.1, y: 0.1 })];
    const out = snapAllZones([zone({ id: "z1", x: 0.3, y: 0.1 }), zone({ id: "z2", ref: "Agilité", x: 0.12, y: 0.11 })], fields, { maxDistance: 0.3 });
    expect(out.snapped).toBe(1);
    expect(out.zones[1]).toMatchObject({ x: 0.1, y: 0.1 });
    expect(out.zones[0].x).toBe(0.3);
    expect(out.unmatched).toBe(1);
  });
  it("laisse une zone trop loin de tout champ, ou sur une autre page", () => {
    const out = snapAllZones([zone({ x: 0.8, y: 0.8 }), zone({ id: "z2", ref: "Agilité", page: 1 })], [field()]);
    expect(out.snapped).toBe(0);
    expect(out.unmatched).toBe(2);
    expect(out.zones[0].x).toBe(0.8);
  });
  it("une piste cherche des cases, et préfère la rangée du bon nombre de cases", () => {
    const fields = [
      field({ id: "a", type: "check", count: 5, x: 0.1, y: 0.5, w: 0.1, h: 0.02 }),
      field({ id: "b", type: "check", count: 3, x: 0.1, y: 0.52, w: 0.06, h: 0.02 }),
      field({ id: "c", type: "text", x: 0.1, y: 0.51, w: 0.3, h: 0.03 }),
    ];
    const track = { id: "z9", kind: "track", ref: "t1", page: 0, x: 0.1, y: 0.505, w: 0.1, h: 0.02, size: 2 };
    const out = snapAllZones([track], fields, { tracks: MODEL.tracks });
    expect(out.zones[0]).toMatchObject({ x: 0.1, y: 0.52, w: 0.06 });
  });
  it("accepte des listes absentes", () => {
    expect(snapAllZones(null, null)).toEqual({ zones: [], snapped: 0, unmatched: 0 });
  });
});

describe("placeByFieldNames", () => {
  const fields = [
    field({ id: "a", name: "force", x: 0.1, y: 0.1 }),
    field({ id: "b", name: "Alignement", x: 0.1, y: 0.3 }),
    field({ id: "c", name: "stress", type: "check", count: 3, x: 0.1, y: 0.5, w: 0.06, h: 0.02 }),
    field({ id: "d", name: "xyz", x: 0.6, y: 0.6 }),
  ];
  it("pose les éléments non placés sur les champs de même nom", () => {
    const out = placeByFieldNames(MODEL, [], fields);
    expect(out.added).toBe(3);
    expect(out.labels.slice().sort()).toEqual(["Alignement", "Force", "Stress"]);
    const stat = out.zones.find((item) => item.ref === "Force");
    expect(stat).toMatchObject({ kind: "stat", page: 0, x: 0.1, y: 0.1, w: 0.2, h: 0.03 });
    expect(out.zones.find((item) => item.kind === "track").ref).toBe("t1");
  });
  it("ne touche pas aux éléments déjà placés ni aux champs déjà pris", () => {
    const placed = [zone({ x: 0.1, y: 0.1, w: 0.2, h: 0.03 })];
    const out = placeByFieldNames(MODEL, placed, fields);
    expect(out.zones[0]).toEqual(placed[0]);
    expect(out.labels.includes("Force")).toBe(false);
    expect(out.added).toBe(2);
  });
  it("ne pose rien sans ressemblance de nom, et accepte des listes absentes", () => {
    expect(placeByFieldNames(MODEL, [], [field({ name: "zzz" })]).added).toBe(0);
    expect(placeByFieldNames(MODEL, null, null)).toEqual({ zones: [], added: 0, labels: [] });
  });
  it("un champ de saisie ne sert pas à une piste, ni l'inverse", () => {
    const out = placeByFieldNames(MODEL, [], [field({ name: "Stress" }), field({ name: "Force", type: "check", count: 1 })]);
    expect(out.added).toBe(0);
  });
});
