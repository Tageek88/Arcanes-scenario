import { describe, expect, it } from "vitest";
import {
  DEFAULT_TEXT_SIZE,
  MAX_TEXT_SIZE,
  MAX_ZONES,
  MIN_TEXT_SIZE,
  cleanZones,
  clampRect,
  clampTextSize,
  moveZone,
  newZoneFor,
  placeableItems,
  pointerFraction,
  renameZoneStats,
  resizeZone,
  unplacedItems,
  updateZone,
  zoneBoxes,
  zoneKey,
  zoneText,
  zonesOnPage,
  zonesSummary,
} from "@/lib/meta/sheetZones.js";

const MODEL = {
  characteristics: [
    { name: "Vigueur", field_names: ["Maximum"] },
    { name: "Agilité", field_names: [] },
  ],
  tracks: [{ id: "t1", name: "Stress", count: 5 }],
  textFields: [
    { id: "f1", name: "Nom", long: false },
    { id: "f2", name: "Notes", long: true },
  ],
};

const zone = (over = {}) => ({ id: "z1", kind: "stat", ref: "Vigueur", page: 0, x: 0.1, y: 0.1, w: 0.1, h: 0.05, size: 2, ...over });

describe("placeableItems", () => {
  it("liste les caractéristiques, leurs champs, les textes et les pistes dans l'ordre du modèle", () => {
    expect(placeableItems(MODEL).map((item) => item.label)).toEqual(["Vigueur", "Vigueur · Maximum", "Agilité", "Nom", "Notes", "Stress"]);
  });
  it("sait si un texte est long et combien une piste a de cases", () => {
    const items = placeableItems(MODEL);
    expect(items.find((item) => item.ref === "f2").long).toBe(true);
    expect(items.find((item) => item.ref === "t1").count).toBe(5);
  });
  it("accepte un modèle vide", () => {
    expect(placeableItems()).toEqual([]);
    expect(placeableItems({ characteristics: [{ name: "  " }] })).toEqual([]);
  });
});

describe("cleanZones", () => {
  it("garde une zone valide telle quelle", () => {
    expect(cleanZones([zone()], MODEL)).toEqual([zone()]);
  });
  it("retire les zones dont l'élément n'existe plus", () => {
    const raw = [zone({ ref: "Inconnue" }), zone({ id: "z2", kind: "text", ref: "zz" }), zone({ id: "z3", field: "Absent" })];
    expect(cleanZones(raw, MODEL)).toEqual([]);
  });
  it("retire les éléments répétés (une zone par élément)", () => {
    const out = cleanZones([zone(), zone({ id: "z2" })], MODEL);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("z1");
  });
  it("garde le champ d'une caractéristique et l'ignore pour les autres sortes", () => {
    const out = cleanZones([zone({ id: "a", field: "Maximum" }), zone({ id: "b", kind: "text", ref: "f1", field: "x" })], MODEL);
    expect(out.find((item) => item.id === "a").field).toBe("Maximum");
    expect(out.find((item) => item.id === "b").field).toBeUndefined();
  });
  it("redonne un identifiant à une zone qui n'en a pas ou qui répète un identifiant", () => {
    const out = cleanZones([zone({ id: "" }), zone({ id: "z1", kind: "text", ref: "f1" })], MODEL);
    expect(out[0].id).toBeTruthy();
    expect(out[1].id).not.toBe(out[0].id);
  });
  it("ramène positions, tailles et page dans les limites", () => {
    const [out] = cleanZones([zone({ x: 2, y: -1, w: 5, h: 0, page: 99, size: 100 })], MODEL);
    expect(out.w).toBe(1);
    expect(out.x).toBe(0);
    expect(out.y).toBe(0);
    expect(out.h).toBeGreaterThan(0);
    expect(out.page).toBe(3);
    expect(out.size).toBe(MAX_TEXT_SIZE);
  });
  it("ignore les entrées qui ne sont pas des objets", () => {
    expect(cleanZones([null, 4, "x", []], MODEL)).toEqual([]);
    expect(cleanZones("n'importe quoi", MODEL)).toEqual([]);
  });
  it("borne le nombre de zones", () => {
    const big = { characteristics: Array.from({ length: MAX_ZONES + 20 }, (_, i) => ({ name: `S${i}` })) };
    const raw = big.characteristics.map((item, i) => zone({ id: `z${i}`, ref: item.name }));
    expect(cleanZones(raw, big)).toHaveLength(MAX_ZONES);
  });
  it("refuse __proto__", () => {
    expect(cleanZones([zone({ ref: "__proto__" })], { characteristics: [{ name: "__proto__" }] })).toEqual([]);
  });
});

describe("tailles et rectangles", () => {
  it("borne la taille du texte", () => {
    expect(clampTextSize(0)).toBe(MIN_TEXT_SIZE);
    expect(clampTextSize(50)).toBe(MAX_TEXT_SIZE);
    expect(clampTextSize("abc")).toBe(DEFAULT_TEXT_SIZE);
    expect(clampTextSize(2.5)).toBe(2.5);
  });
  it("garde un rectangle dans la page", () => {
    expect(clampRect({ x: 0.95, y: 0.95, w: 0.2, h: 0.2 })).toEqual({ x: 0.8, y: 0.8, w: 0.2, h: 0.2 });
    expect(clampRect({ x: 0.1, y: 0.1, w: 0, h: 0 }).w).toBeGreaterThan(0);
  });
  it("déplace sans sortir de la page", () => {
    expect(moveZone(zone(), 0.2, 0.1)).toMatchObject({ x: 0.3, y: 0.2 });
    expect(moveZone(zone(), 5, 5)).toMatchObject({ x: 0.9, y: 0.95 });
    expect(moveZone(zone(), -5, -5)).toMatchObject({ x: 0, y: 0 });
  });
  it("redimensionne sans sortir de la page ni passer sous le minimum", () => {
    expect(resizeZone(zone(), 0.1, 0.05)).toMatchObject({ w: 0.2, h: 0.1 });
    expect(resizeZone(zone(), 5, 5)).toMatchObject({ w: 0.9, h: 0.9 });
    expect(resizeZone(zone(), -5, -5).w).toBeGreaterThan(0);
  });
  it("convertit la position du pointeur en fractions de la page", () => {
    const rect = { left: 100, top: 50, width: 200, height: 400 };
    expect(pointerFraction(200, 250, rect)).toEqual({ x: 0.5, y: 0.5 });
    expect(pointerFraction(0, 0, rect)).toEqual({ x: 0, y: 0 });
    expect(pointerFraction(1000, 1000, rect)).toEqual({ x: 1, y: 1 });
    expect(pointerFraction(10, 10, { left: 0, top: 0, width: 0, height: 0 })).toEqual({ x: 0, y: 0 });
  });
});

describe("liste de zones", () => {
  it("crée une zone au milieu de la page pour un élément", () => {
    const item = placeableItems(MODEL).find((entry) => entry.ref === "f2");
    const created = newZoneFor(item, 1);
    expect(created).toMatchObject({ kind: "text", ref: "f2", page: 1, size: DEFAULT_TEXT_SIZE });
    expect(created.x + created.w).toBeLessThanOrEqual(1);
    expect(created.h).toBeGreaterThan(0.05);
    expect(newZoneFor(placeableItems(MODEL)[1]).field).toBe("Maximum");
  });
  it("reconnaît les éléments pas encore placés", () => {
    expect(unplacedItems(MODEL, [zone()]).map((item) => item.label)).toEqual(["Vigueur · Maximum", "Agilité", "Nom", "Notes", "Stress"]);
    expect(unplacedItems(MODEL, [])).toHaveLength(6);
  });
  it("résume le nombre de valeurs placées", () => {
    expect(zonesSummary(MODEL, [zone(), zone({ id: "z2", kind: "track", ref: "t1" })])).toEqual({ placed: 2, total: 6 });
  });
  it("filtre par page et modifie une zone par identifiant", () => {
    const zones = [zone(), zone({ id: "z2", kind: "text", ref: "f1", page: 1 })];
    expect(zonesOnPage(zones, 1).map((item) => item.id)).toEqual(["z2"]);
    expect(updateZone(zones, "z2", { size: 3 })[1].size).toBe(3);
    expect(updateZone(zones, "inconnue", { size: 3 })).toEqual(zones);
  });
  it("suit le renommage d'une caractéristique", () => {
    const zones = [zone(), zone({ id: "z2", kind: "text", ref: "Vigueur" })];
    const out = renameZoneStats(zones, new Map([["Vigueur", "Force"]]));
    expect(out[0].ref).toBe("Force");
    expect(out[1].ref).toBe("Vigueur");
    expect(renameZoneStats(zones, new Map())).toBe(zones);
  });
  it("donne une clé stable à une zone", () => {
    expect(zoneKey(zone({ field: "Maximum" }))).toBe("stat|Vigueur|Maximum");
  });
});

describe("valeurs affichées", () => {
  const sheet = {
    characteristics: { Vigueur: { value: " 4 ", fields: [{ name: "Maximum", value: "5" }] } },
    texts: { f1: "Ivan" },
    checks: { t1: 3 },
  };
  it("lit la valeur d'une caractéristique ou d'un de ses champs", () => {
    expect(zoneText(zone(), sheet)).toBe("4");
    expect(zoneText(zone({ field: "Maximum" }), sheet)).toBe("5");
    expect(zoneText(zone({ field: "Autre" }), sheet)).toBe("");
    expect(zoneText(zone({ ref: "Agilité" }), sheet)).toBe("");
  });
  it("lit un champ de texte", () => {
    expect(zoneText(zone({ kind: "text", ref: "f1" }), sheet)).toBe("Ivan");
    expect(zoneText(zone({ kind: "text", ref: "f2" }), sheet)).toBe("");
  });
  it("ne plante pas sur une fiche vide ou un nom comme __proto__", () => {
    expect(zoneText(zone(), null)).toBe("");
    expect(zoneText(zone({ ref: "__proto__" }), sheet)).toBe("");
    expect(zoneText(zone({ kind: "track" }), sheet)).toBe("");
  });
  it("compte les cases d'une piste", () => {
    const track = zone({ kind: "track", ref: "t1" });
    expect(zoneBoxes(track, MODEL.tracks, sheet)).toEqual({ count: 5, checked: 3 });
    expect(zoneBoxes(track, MODEL.tracks, {})).toEqual({ count: 5, checked: 0 });
    expect(zoneBoxes(zone({ kind: "track", ref: "zz" }), MODEL.tracks, sheet)).toEqual({ count: 0, checked: 0 });
  });
});
