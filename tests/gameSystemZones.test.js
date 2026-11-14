import { describe, expect, it } from "vitest";
import { cleanSystemData, describeSystem, exportSystemFile, parseSystemFile } from "@/lib/meta/gameSystem.js";

const DATA = {
  characteristics: [{ name: "Vigueur", field_names: ["Maximum"] }, { name: "Agilité", field_names: [] }],
  tracks: [{ id: "t1", name: "Stress", count: 5 }],
  textFields: [{ id: "x1", name: "Nom", long: false }],
  zones: [
    { id: "z1", kind: "stat", ref: "Vigueur", page: 0, x: 0.1, y: 0.1, w: 0.1, h: 0.05, size: 2 },
    { id: "z2", kind: "stat", ref: "Vigueur", field: "Maximum", page: 0, x: 0.2, y: 0.1, w: 0.1, h: 0.05, size: 2 },
    { id: "z3", kind: "track", ref: "t1", page: 1, x: 0.1, y: 0.3, w: 0.2, h: 0.03, size: 1.6 },
    { id: "z4", kind: "text", ref: "x1", page: 0, x: 0.1, y: 0.5, w: 0.3, h: 0.03, size: 1.6 },
  ],
};

describe("zones dans un système de jeu", () => {
  it("garde les zones valides", () => {
    expect(cleanSystemData(DATA).zones.map((zone) => zone.id)).toEqual(["z1", "z2", "z3", "z4"]);
  });
  it("retire les zones dont l'élément n'est plus dans le système", () => {
    const out = cleanSystemData({ ...DATA, tracks: [], textFields: [] });
    expect(out.zones.map((zone) => zone.id)).toEqual(["z1", "z2"]);
  });
  it("a une liste vide quand rien n'est placé", () => {
    expect(cleanSystemData({ characteristics: DATA.characteristics }).zones).toEqual([]);
  });
  it("se compte dans le résumé du système", () => {
    expect(describeSystem({ data: DATA }).zones).toBe(4);
  });
  it("voyage dans le fichier exporté", () => {
    const file = exportSystemFile({ name: "Metro", description: "", data: DATA });
    const back = parseSystemFile(file);
    expect(back.ok).toBe(true);
    expect(back.system.data.zones).toHaveLength(4);
    expect(back.issues).toEqual([]);
  });
  it("signale les zones ignorées à l'import", () => {
    const file = JSON.stringify({ app: "arcanes-scenario", kind: "game-system", format: 1, name: "X", data: { ...DATA, tracks: [] } });
    const back = parseSystemFile(file);
    expect(back.ok).toBe(true);
    expect(back.issues.some((issue) => issue.includes("zone"))).toBe(true);
  });
});
