import { describe, expect, it } from "vitest";
import { sheetForPrint } from "@/lib/meta/sheetZones.js";

const MODEL = { characteristics: [{ name: "Vigueur", field_names: [] }], tracks: [{ id: "t1", name: "Stress", count: 5 }], textFields: [] };
const zone = (over = {}) => ({ id: "z1", kind: "stat", ref: "Vigueur", page: 0, x: 0.1, y: 0.1, w: 0.1, h: 0.05, size: 2, ...over });
const PAGES = [{ id: "p1", width: 100, height: 200, url: "data:image/png;base64,AAAA" }];

describe("sheetForPrint", () => {
  it("rend null sans zones ou sans fond", () => {
    expect(sheetForPrint({ ...MODEL, zones: [] }, PAGES)).toBeNull();
    expect(sheetForPrint({ ...MODEL, zones: [zone()] }, [])).toBeNull();
    expect(sheetForPrint(null, PAGES)).toBeNull();
    expect(sheetForPrint({ ...MODEL, zones: [zone()] })).toBeNull();
  });
  it("garde les zones des pages qui existent", () => {
    const out = sheetForPrint({ ...MODEL, zones: [zone(), zone({ id: "z2", kind: "track", ref: "t1", page: 2 })] }, PAGES);
    expect(out.zones.map((item) => item.id)).toEqual(["z1"]);
    expect(out.pages).toEqual(PAGES);
  });
  it("dit si la feuille couvre tout le modèle", () => {
    const all = [zone(), zone({ id: "z2", kind: "track", ref: "t1" })];
    expect(sheetForPrint({ ...MODEL, zones: all }, PAGES).covers).toBe(true);
    expect(sheetForPrint({ ...MODEL, zones: [zone()] }, PAGES).covers).toBe(false);
  });
  it("ne couvre pas tout si une zone est sur une page absente", () => {
    const all = [zone(), zone({ id: "z2", kind: "track", ref: "t1", page: 3 })];
    expect(sheetForPrint({ ...MODEL, zones: all }, PAGES).covers).toBe(false);
  });
});
