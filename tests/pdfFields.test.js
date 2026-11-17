import { describe, expect, it } from "vitest";
import {
  MAX_PDF_FIELDS,
  cleanFields,
  fieldRect,
  fieldsFor,
  fieldsFromAnnotations,
  fieldsOnPage,
  fieldsSummary,
  groupChecks,
  removePageFields,
  rotateFields,
  snapTarget,
} from "@/lib/meta/pdfFields.js";

// Page de 600 × 800 points ; l'axe vertical du PDF est inversé : (x1, y1) en bas à gauche.
const viewport = {
  width: 600,
  height: 800,
  convertToViewportPoint: (x, y) => [x, 800 - y],
};
// Anciennes versions de pdfjs : seulement la conversion d'un rectangle.
const legacyViewport = {
  width: 600,
  height: 800,
  convertToViewportRectangle: ([x1, y1, x2, y2]) => [x1, 800 - y1, x2, 800 - y2],
};
const widget = (over = {}) => ({ subtype: "Widget", fieldType: "Tx", fieldName: "nom", rect: [60, 700, 180, 720], ...over });
const check = (x, y, extra = {}) => ({ page: 0, type: "check", name: "c", x, y, w: 0.02, h: 0.015, ...extra });
const text = (extra = {}) => ({ page: 0, type: "text", name: "t", x: 0.1, y: 0.1, w: 0.2, h: 0.03, ...extra });

describe("fieldsFromAnnotations", () => {
  it("convertit un widget en fractions de la page, avec son nom", () => {
    const [field] = fieldsFromAnnotations([widget()], viewport, 1);
    expect(field).toMatchObject({ page: 1, type: "text", name: "nom" });
    expect(field.x).toBeCloseTo(0.1, 4);
    expect(field.y).toBeCloseTo(0.1, 4);
    expect(field.w).toBeCloseTo(0.2, 4);
    expect(field.h).toBeCloseTo(0.025, 4);
  });
  it("sait aussi lire un viewport d'une ancienne version de pdfjs", () => {
    const [field] = fieldsFromAnnotations([widget()], legacyViewport, 0);
    expect(field.x).toBeCloseTo(0.1, 4);
    expect(field.y).toBeCloseTo(0.1, 4);
  });
  it("garde les zones de saisie, les listes et les cases à cocher", () => {
    const list = [widget(), widget({ fieldType: "Ch" }), widget({ fieldType: "Btn", checkBox: true })];
    expect(fieldsFromAnnotations(list, viewport).map((field) => field.type)).toEqual(["text", "text", "check"]);
  });
  it("ignore les boutons, les boutons radio, les signatures et les annotations qui ne sont pas des champs", () => {
    const list = [
      widget({ fieldType: "Btn", pushButton: true }),
      widget({ fieldType: "Btn", radioButton: true }),
      widget({ fieldType: "Btn", checkBox: true, radioButton: true }),
      widget({ fieldType: "Sig" }),
      widget({ subtype: "Link" }),
      null,
      "x",
    ];
    expect(fieldsFromAnnotations(list, viewport)).toEqual([]);
  });
  it("ignore un champ minuscule ou sans rectangle", () => {
    expect(fieldsFromAnnotations([widget({ rect: [10, 10, 10.5, 10.5] }), widget({ rect: null }), widget({ rect: [1, 2] })], viewport)).toEqual([]);
  });
  it("note les zones de saisie sur plusieurs lignes", () => {
    const [field] = fieldsFromAnnotations([widget({ multiLine: true })], viewport);
    expect(field.long).toBe(true);
    expect(fieldsFromAnnotations([widget()], viewport)[0].long).toBeUndefined();
  });
  it("ne plante pas sans page exploitable", () => {
    expect(fieldsFromAnnotations([widget()], null)).toEqual([]);
    expect(fieldsFromAnnotations([widget()], { width: 0, height: 0 })).toEqual([]);
    expect(fieldsFromAnnotations([widget()], { width: 600, height: 800 })).toEqual([]);
    expect(fieldsFromAnnotations(null, viewport)).toEqual([]);
  });
});

describe("groupChecks", () => {
  it("regroupe une rangée de cases collées en un seul champ avec leur nombre", () => {
    const row = [check(0.1, 0.5), check(0.125, 0.5), check(0.15, 0.5), check(0.175, 0.5), check(0.2, 0.5)];
    const out = groupChecks(row);
    expect(out).toHaveLength(1);
    expect(out[0].count).toBe(5);
    expect(out[0].x).toBeCloseTo(0.1, 4);
    expect(out[0].w).toBeCloseTo(0.12, 4);
  });
  it("sépare deux rangées éloignées, ou sur deux lignes", () => {
    expect(groupChecks([check(0.1, 0.5), check(0.125, 0.5), check(0.6, 0.5), check(0.625, 0.5)])).toHaveLength(2);
    expect(groupChecks([check(0.1, 0.5), check(0.1, 0.55)])).toHaveLength(2);
  });
  it("ne regroupe pas des cases de pages différentes ni de tailles très différentes", () => {
    expect(groupChecks([check(0.1, 0.5), check(0.125, 0.5, { page: 1 })])).toHaveLength(2);
    expect(groupChecks([check(0.1, 0.5), check(0.125, 0.5, { w: 0.08, h: 0.06 })])).toHaveLength(2);
  });
  it("laisse les zones de saisie telles quelles et trie le résultat", () => {
    const out = groupChecks([check(0.5, 0.9), text({ y: 0.4 }), check(0.1, 0.2)]);
    expect(out.map((field) => field.type)).toEqual(["check", "text", "check"]);
    expect(out[1].count).toBeUndefined();
  });
  it("une case seule vaut une rangée d'une case", () => {
    expect(groupChecks([check(0.3, 0.3)])[0].count).toBe(1);
    expect(groupChecks(null)).toEqual([]);
  });
});

describe("cleanFields", () => {
  it("attribue des identifiants et garde les champs valides", () => {
    const out = cleanFields([text(), check(0.1, 0.5, { count: 3 })], 1);
    expect(out.map((field) => field.id)).toEqual(["f1", "f2"]);
    expect(out[1].count).toBe(3);
    expect(out[0].count).toBeUndefined();
  });
  it("retire un type inconnu, une page absente et un rectangle illisible", () => {
    const raw = [text({ type: "radio" }), text({ page: 3 }), text({ page: -1 }), text({ x: "abc" }), null, 4];
    expect(cleanFields(raw, 2)).toEqual([]);
  });
  it("ramène le rectangle dans la page et borne le nombre de cases et de champs", () => {
    const [out] = cleanFields([check(0.95, 0.95, { w: 0.2, h: 0.2, count: 500 })], 1);
    expect(out.x + out.w).toBeLessThanOrEqual(1);
    expect(out.count).toBe(99);
    const many = Array.from({ length: MAX_PDF_FIELDS + 10 }, (_, i) => text({ y: (i % 90) / 100 }));
    expect(cleanFields(many, 1)).toHaveLength(MAX_PDF_FIELDS);
    expect(cleanFields("n'importe quoi", 1)).toEqual([]);
  });
});

describe("aimantation", () => {
  const fields = cleanFields([text({ x: 0.1, y: 0.1, w: 0.2, h: 0.03 }), text({ x: 0.5, y: 0.1, w: 0.2, h: 0.03, name: "b" }), check(0.1, 0.5, { count: 2 }), text({ page: 1 })], 2);
  it("choisit les champs de la page selon la sorte de zone", () => {
    expect(fieldsFor(fields, 0, "stat")).toHaveLength(2);
    expect(fieldsFor(fields, 0, "track")).toHaveLength(1);
    expect(fieldsFor(fields, 1, "text")).toHaveLength(1);
    expect(fieldsOnPage(fields, 0)).toHaveLength(3);
  });
  it("attire une zone dont le centre est dans un champ", () => {
    const target = snapTarget(fieldsFor(fields, 0, "stat"), { x: 0.12, y: 0.09, w: 0.08, h: 0.03 });
    expect(target.name).toBe("t");
    expect(fieldRect(target)).toEqual({ x: 0.1, y: 0.1, w: 0.2, h: 0.03 });
  });
  it("attire le champ le plus proche s'il est assez près, sinon rien", () => {
    const stats = fieldsFor(fields, 0, "stat");
    expect(snapTarget(stats, { x: 0.32, y: 0.12, w: 0.02, h: 0.02 }).name).toBe("t");
    expect(snapTarget(stats, { x: 0.8, y: 0.9, w: 0.02, h: 0.02 })).toBeNull();
    expect(snapTarget([], { x: 0, y: 0, w: 0.1, h: 0.1 })).toBeNull();
    expect(snapTarget(stats, null)).toBeNull();
  });
  it("préfère le plus petit champ quand plusieurs contiennent le centre", () => {
    const nested = [
      { id: "a", page: 0, type: "text", name: "grand", x: 0.1, y: 0.1, w: 0.5, h: 0.2 },
      { id: "b", page: 0, type: "text", name: "petit", x: 0.2, y: 0.15, w: 0.1, h: 0.03 },
    ];
    expect(snapTarget(nested, { x: 0.22, y: 0.14, w: 0.06, h: 0.02 }).name).toBe("petit");
  });
});

describe("pages tournées et retirées", () => {
  const one = [{ id: "f1", page: 0, type: "text", name: "a", x: 0.1, y: 0.2, w: 0.3, h: 0.05 }];
  it("un quart de tour amène le champ à sa nouvelle place", () => {
    const [turned] = rotateFields(one, 0, 1);
    expect(turned).toMatchObject({ x: 0.75, y: 0.1, w: 0.05, h: 0.3 });
  });
  it("quatre quarts de tour ramènent le champ, une autre page n'est pas touchée", () => {
    expect(rotateFields(one, 0, 4)[0]).toMatchObject({ x: 0.1, y: 0.2, w: 0.3, h: 0.05 });
    expect(rotateFields(one, 1, 1)).toEqual(one);
    expect(rotateFields(one, 0, 0)).toEqual(one);
  });
  it("retirer une page supprime ses champs et fait remonter les suivantes", () => {
    const list = [{ ...one[0], page: 0 }, { ...one[0], id: "f2", page: 1 }, { ...one[0], id: "f3", page: 2 }];
    expect(removePageFields(list, 1).map((field) => field.page)).toEqual([0, 1]);
    expect(removePageFields(list, 1).map((field) => field.id)).toEqual(["f1", "f3"]);
  });
});

describe("résumé", () => {
  it("compte les zones de saisie et les cases", () => {
    expect(fieldsSummary([text(), text(), check(0.1, 0.1)])).toBe("2 zones de saisie, 1 case ou rangée de cases");
    expect(fieldsSummary([])).toBe("");
  });
});
