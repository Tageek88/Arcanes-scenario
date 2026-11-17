// apply-pdf-fields-lot12.mjs : lot 12, import des champs d'un PDF éditable et aimantation des zones
// Usage, depuis la racine du projet :
//   node apply-pdf-fields-lot12.mjs --dry     (vérifie sans rien écrire)
//   node apply-pdf-fields-lot12.mjs           (applique)
// Rien n'est écrit tant que toutes les retouches de tous les fichiers ne s'appliquent pas : en cas de problème, le script l'indique et ne touche à rien.
// Les nouveaux fichiers ne sont jamais écrasés sans --force.
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dry = process.argv.includes("--dry");
const force = process.argv.includes("--force");

if (!fs.existsSync(path.join(root, "package.json")) || !fs.existsSync(path.join(root, "src"))) {
  console.error("Lancez ce script depuis la racine du projet (là où se trouve package.json).");
  process.exit(1);
}

// Retrouve un fichier du projet par son nom (une seule correspondance attendue sous src/).
function findInSrc(name) {
  const hits = fs.readdirSync(path.join(root, "src"), { recursive: true })
    .map(String)
    .filter((file) => path.basename(file) === name && !file.split(path.sep).includes("node_modules"));
  return hits.length === 1 ? path.join("src", hits[0]) : null;
}

const NEW_FILES = {
  "src/lib/meta/pdfFields.js": `// Champs de formulaire d'un PDF éditable : règles pures (aucun accès aux données, au navigateur ni à pdfjs).
//
// Un PDF éditable contient des « widgets » : un rectangle par zone de saisie ou par case à cocher. À l'import, on les lit et on les
// garde avec le fond (SheetBackground.fields) pour aimanter les zones de valeurs sur le dessin de la feuille.
//   champ : { id, page, type, name, x, y, w, h, long?, count? }
//     type   "text"  zone de saisie (texte ou liste)   |   "check"  case à cocher, ou rangée de cases voisines
//     x, y, w, h  fractions de la page (0 à 1), coin haut gauche pour x et y (comme les zones)
//     long   zone de saisie sur plusieurs lignes
//     count  nombre de cases d'une rangée (type "check")
// Les champs décrivent la mise en page de la feuille de l'éditeur : ils restent sur l'appareil, avec le fond, et ne sont pas exportés
// avec les systèmes de jeu.

import { clampRect } from "@/lib/meta/sheetZones";

export const MAX_PDF_FIELDS = 600;
export const MAX_CHECK_COUNT = 99;
export const FIELD_TYPES = ["text", "check"];
/** En dessous de cette taille (fraction de la page), un champ est ignoré : trait, doublon invisible ou cache. */
export const MIN_FIELD_SIZE = 0.004;
/** Distance maximale, en fraction de la page, entre une zone lâchée et le champ qui l'attire. */
export const SNAP_DISTANCE = 0.04;

const text = (value) => String(value ?? "").trim();
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const round = (value) => Math.round(value * 10000) / 10000;

/**
 * Rectangle PDF [x1, y1, x2, y2] converti dans le repère de la page affichée (rotation comprise), ou null.
 * Selon la version de pdfjs, le viewport offre \`convertToViewportPoint\` (toutes) ou \`convertToViewportRectangle\` (anciennes).
 */
function viewportRect(viewport, rect) {
  try {
    if (typeof viewport?.convertToViewportPoint === "function") {
      const [ax, ay] = viewport.convertToViewportPoint(rect[0], rect[1]);
      const [bx, by] = viewport.convertToViewportPoint(rect[2], rect[3]);
      return [ax, ay, bx, by];
    }
    if (typeof viewport?.convertToViewportRectangle === "function") return viewport.convertToViewportRectangle(rect);
  } catch {
    return null;
  }
  return null;
}

/**
 * Champs d'une page d'après ses annotations pdfjs (\`page.getAnnotations()\`). \`viewport\` est celui de la page à l'échelle 1 :
 * il donne la taille de la page et la conversion des coordonnées PDF, qui tient compte de la rotation de la page.
 * Gardés : zones de saisie (« Tx »), listes (« Ch ») et cases à cocher. Ignorés : boutons, boutons radio, signatures.
 */
export function fieldsFromAnnotations(annotations, viewport, page = 0) {
  const width = Number(viewport?.width) || 0;
  const height = Number(viewport?.height) || 0;
  if (!(width > 0) || !(height > 0) || !viewportRect(viewport, [0, 0, 1, 1])) return [];
  const out = [];
  for (const annotation of Array.isArray(annotations) ? annotations : []) {
    if (!isObject(annotation)) continue;
    if (annotation.subtype && annotation.subtype !== "Widget") continue;
    let type = null;
    if (annotation.fieldType === "Tx" || annotation.fieldType === "Ch") type = "text";
    else if (annotation.fieldType === "Btn" && annotation.checkBox && !annotation.radioButton && !annotation.pushButton) type = "check";
    if (!type || !Array.isArray(annotation.rect) || annotation.rect.length < 4) continue;
    const converted = viewportRect(viewport, annotation.rect);
    if (!converted) continue;
    const [x1, y1, x2, y2] = converted;
    const x = Math.min(x1, x2) / width;
    const y = Math.min(y1, y2) / height;
    const w = Math.abs(x2 - x1) / width;
    const h = Math.abs(y2 - y1) / height;
    if (![x, y, w, h].every(Number.isFinite) || w < MIN_FIELD_SIZE || h < MIN_FIELD_SIZE) continue;
    const field = { page, type, name: text(annotation.fieldName).slice(0, 80), x, y, w, h };
    if (type === "text" && annotation.multiLine) field.long = true;
    out.push(field);
  }
  return out;
}

const center = (field) => ({ x: field.x + field.w / 2, y: field.y + field.h / 2 });

/** Deux cases à cocher font-elles partie de la même rangée ? (même taille, même ligne, collées l'une à l'autre) */
function sameRow(a, b) {
  const ratioW = a.w / b.w;
  const ratioH = a.h / b.h;
  if (ratioW < 0.7 || ratioW > 1.43 || ratioH < 0.7 || ratioH > 1.43) return false;
  if (Math.abs(center(a).y - center(b).y) > 0.5 * Math.max(a.h, b.h)) return false;
  const gap = Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w);
  return gap <= 1.2 * Math.max(a.w, b.w);
}

/**
 * Regroupe les cases à cocher voisines d'une même ligne en UN champ « check » portant leur nombre : une piste de 5 cases devient
 * un rectangle avec count = 5. Les zones de saisie restent telles quelles. Les cases en colonne ne sont pas regroupées.
 * Résultat trié par page, puis de haut en bas et de gauche à droite.
 */
export function groupChecks(fields) {
  const list = (Array.isArray(fields) ? fields : []).filter(isObject);
  const texts = list.filter((field) => field.type !== "check");
  const checks = list.filter((field) => field.type === "check");
  const parent = checks.map((_, index) => index);
  const find = (index) => {
    let root = index;
    while (parent[root] !== root) root = parent[root];
    parent[index] = root;
    return root;
  };
  for (let i = 0; i < checks.length; i += 1) {
    for (let j = i + 1; j < checks.length; j += 1) {
      if (checks[i].page === checks[j].page && sameRow(checks[i], checks[j])) parent[find(j)] = find(i);
    }
  }
  const groups = new Map();
  checks.forEach((field, index) => {
    const root = find(index);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(field);
  });
  const merged = [...groups.values()].map((members) => {
    const sorted = [...members].sort((a, b) => a.x - b.x);
    const left = Math.min(...members.map((field) => field.x));
    const top = Math.min(...members.map((field) => field.y));
    const right = Math.max(...members.map((field) => field.x + field.w));
    const bottom = Math.max(...members.map((field) => field.y + field.h));
    return { page: sorted[0].page, type: "check", name: sorted[0].name || "", x: left, y: top, w: right - left, h: bottom - top, count: members.length };
  });
  return [...texts, ...merged].sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x);
}

/** Champs nettoyés pour \`pageCount\` pages : type, page et rectangle valides, identifiants attribués, nombre borné. */
export function cleanFields(raw, pageCount = 1) {
  const pages = Math.max(1, Math.trunc(Number(pageCount)) || 1);
  const out = [];
  for (const item of Array.isArray(raw) ? raw : []) {
    if (out.length >= MAX_PDF_FIELDS) break;
    if (!isObject(item) || !FIELD_TYPES.includes(item.type)) continue;
    const page = Math.trunc(Number(item.page));
    if (!Number.isFinite(page) || page < 0 || page >= pages) continue;
    if (![item.x, item.y, item.w, item.h].every((value) => Number.isFinite(Number(value)))) continue;
    const rect = clampRect(item);
    const field = { id: \`f\${out.length + 1}\`, page, type: item.type, name: text(item.name).slice(0, 80), ...rect };
    if (item.type === "text" && item.long === true) field.long = true;
    if (item.type === "check") field.count = Math.min(MAX_CHECK_COUNT, Math.max(1, Math.trunc(Number(item.count)) || 1));
    out.push(field);
  }
  return out;
}

/** Les champs d'une page qui conviennent à une zone : une piste cherche des cases, tout le reste cherche une zone de saisie. */
export function fieldsFor(fields, page, zoneKind) {
  const type = zoneKind === "track" ? "check" : "text";
  return (Array.isArray(fields) ? fields : []).filter((field) => field.page === page && field.type === type);
}

/** Les champs d'une page. */
export const fieldsOnPage = (fields, page) => (Array.isArray(fields) ? fields : []).filter((field) => field.page === page);

/**
 * Le champ qui attire un rectangle lâché : celui qui contient son centre (le plus petit si plusieurs), sinon le plus proche
 * du centre à moins de \`maxDistance\` (fraction de la page). \`null\` si aucun n'est assez près.
 */
export function snapTarget(candidates, rect, maxDistance = SNAP_DISTANCE) {
  const here = center(rect || {});
  if (!Number.isFinite(here.x) || !Number.isFinite(here.y)) return null;
  let inside = null;
  let nearest = null;
  let best = Infinity;
  for (const field of Array.isArray(candidates) ? candidates : []) {
    const dx = Math.max(field.x - here.x, 0, here.x - (field.x + field.w));
    const dy = Math.max(field.y - here.y, 0, here.y - (field.y + field.h));
    if (dx === 0 && dy === 0) {
      if (!inside || field.w * field.h < inside.w * inside.h) inside = field;
      continue;
    }
    const distance = Math.hypot(dx, dy);
    if (distance < best) {
      best = distance;
      nearest = field;
    }
  }
  if (inside) return inside;
  return nearest && best <= maxDistance ? nearest : null;
}

/** Le rectangle d'un champ, tel qu'une zone le prend. */
export const fieldRect = (field) => ({ x: round(field.x), y: round(field.y), w: round(field.w), h: round(field.h) });

/** Les champs après \`turns\` quarts de tour (sens des aiguilles d'une montre) de la page \`page\`. */
export function rotateFields(fields, page, turns) {
  const count = ((Math.trunc(Number(turns)) || 0) % 4 + 4) % 4;
  return (Array.isArray(fields) ? fields : []).map((field) => {
    if (field.page !== page) return field;
    let { x, y, w, h } = field;
    for (let i = 0; i < count; i += 1) [x, y, w, h] = [1 - (y + h), x, h, w];
    return { ...field, x: round(x), y: round(y), w: round(w), h: round(h) };
  });
}

/** Les champs après le retrait de la page \`page\` : ceux de la page disparaissent, les pages suivantes remontent d'un rang. */
export function removePageFields(fields, page) {
  return (Array.isArray(fields) ? fields : []).filter((field) => field.page !== page).map((field) => (field.page > page ? { ...field, page: field.page - 1 } : field));
}

/** Résumé lisible : « 12 zones de saisie, 4 rangées de cases ». */
export function fieldsSummary(fields) {
  const list = Array.isArray(fields) ? fields : [];
  const texts = list.filter((field) => field.type === "text").length;
  const checks = list.filter((field) => field.type === "check").length;
  const parts = [];
  if (texts) parts.push(\`\${texts} zone\${texts > 1 ? "s" : ""} de saisie\`);
  if (checks) parts.push(\`\${checks} case\${checks > 1 ? "s" : ""} ou rangée\${checks > 1 ? "s" : ""} de cases\`);
  return parts.join(", ");
}
`,
  "tests/pdfFields.test.js": `import { describe, expect, it } from "vitest";
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
`,
  "tests/sheetBackgroundFields.test.js": `import { describe, expect, it } from "vitest";
import { db } from "@/api/localClient";
import { loadSheetBackground, loadSheetBackgroundData, saveSheetBackground } from "@/lib/services/sheetBackgroundStore";
import { makeCampaign } from "./helpers";

const URL_OK = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
const page = (id) => ({ id, width: 1654, height: 2339, url: URL_OK });
const field = (over = {}) => ({ page: 0, type: "text", name: "charactername", x: 0.1, y: 0.1, w: 0.2, h: 0.03, ...over });

describe("champs du PDF (service)", () => {
  it("enregistre puis relit les champs avec les pages", async () => {
    const campaign = await makeCampaign();
    await saveSheetBackground(campaign.id, [page("a")], [field(), field({ type: "check", name: "ds1", count: 3, y: 0.5 })]);
    const data = await loadSheetBackgroundData(campaign.id);
    expect(data.pages.map((item) => item.id)).toEqual(["a"]);
    expect(data.fields.map((item) => item.name)).toEqual(["charactername", "ds1"]);
    expect(data.fields[1].count).toBe(3);
    expect((await loadSheetBackground(campaign.id)).map((item) => item.id)).toEqual(["a"]);
  });

  it("remplacer le fond sans champs efface les anciens champs", async () => {
    const campaign = await makeCampaign();
    await saveSheetBackground(campaign.id, [page("a")], [field()]);
    await saveSheetBackground(campaign.id, [page("b")]);
    expect((await loadSheetBackgroundData(campaign.id)).fields).toEqual([]);
  });

  it("ne garde pas les champs d'une page qui n'existe pas", async () => {
    const campaign = await makeCampaign();
    await saveSheetBackground(campaign.id, [page("a")], [field(), field({ page: 1, name: "ailleurs" })]);
    expect((await loadSheetBackgroundData(campaign.id)).fields.map((item) => item.name)).toEqual(["charactername"]);
  });

  it("un fond enregistré avant les champs se lit avec une liste vide", async () => {
    const campaign = await makeCampaign();
    await db.table("SheetBackground").put({ id: campaign.id, campaign_id: campaign.id, pages: [page("a")] });
    const data = await loadSheetBackgroundData(campaign.id);
    expect(data.pages).toHaveLength(1);
    expect(data.fields).toEqual([]);
    expect(await loadSheetBackgroundData("")).toEqual({ pages: [], fields: [] });
  });
});
`,
};

const EDITS = {
  "sheetImport.js": [
    {
      find: `} from "@/lib/meta/sheetBackground";`,
      replace: `} from "@/lib/meta/sheetBackground";
import { fieldsFromAnnotations, groupChecks } from "@/lib/meta/pdfFields";`,
    },
    {
      find: `async function renderPdf(file) {`,
      replace: `// Les champs de formulaire d'un PDF éditable (zones de saisie, cases à cocher) : leur lecture ne doit jamais empêcher l'import.
async function readFields(page, viewport, index) {
  try {
    return fieldsFromAnnotations(await page.getAnnotations({ intent: "display" }), viewport, index);
  } catch (error) {
    console.warn("Champs du PDF illisibles :", error);
    return [];
  }
}

async function renderPdf(file) {`,
    },
    {
      find: `    const pages = [];
    for (let number = 1; number <= count; number += 1) {`,
      replace: `    const pages = [];
    const found = [];
    for (let number = 1; number <= count; number += 1) {`,
    },
    {
      find: `      const base = page.getViewport({ scale: 1 });`,
      replace: `      const base = page.getViewport({ scale: 1 });
      found.push(...(await readFields(page, base, number - 1)));`,
    },
    {
      find: `    return { pages, truncated: document_.numPages > count };`,
      replace: `    return { pages, truncated: document_.numPages > count, fields: groupChecks(found) };`,
    },
    {
      find: `    return { pages: [toPage(canvas)], truncated: false };`,
      replace: `    return { pages: [toPage(canvas)], truncated: false, fields: [] };`,
    },
    {
      find: ` * @returns {Promise<{ pages: { id: string, width: number, height: number, url: string }[], truncated: boolean }>}`,
      replace: ` * Un PDF éditable fournit aussi ses champs de formulaire (voir lib/meta/pdfFields) : zones de saisie et rangées de cases.
 * @returns {Promise<{ pages: { id: string, width: number, height: number, url: string }[], truncated: boolean, fields: object[] }>}`,
    },
  ],
  "sheetBackgroundStore.js": [
    {
      find: `import { backgroundRejection, cleanPages } from "@/lib/meta/sheetBackground";`,
      replace: `import { backgroundRejection, cleanPages } from "@/lib/meta/sheetBackground";
import { cleanFields } from "@/lib/meta/pdfFields";`,
    },
    {
      find: `/** Enregistre le fond d'une campagne (remplace l'ancien). Une liste vide supprime le fond. */
export async function saveSheetBackground(campaignId, pages) {`,
      replace: `/**
 * Pages et champs de formulaire du fond d'une campagne : { pages, fields }. Les champs viennent d'un PDF éditable ; un fond
 * enregistré avant leur lecture, ou une image, n'en a pas (liste vide).
 */
export async function loadSheetBackgroundData(campaignId) {
  if (!campaignId) return { pages: [], fields: [] };
  const row = await db.table(TABLE).get(campaignId);
  const pages = cleanPages(row?.pages);
  return { pages, fields: cleanFields(row?.fields, pages.length) };
}

/**
 * Enregistre le fond d'une campagne (remplace l'ancien) avec les champs de formulaire de son PDF (\`fields\`, vide par défaut).
 * Une liste de pages vide supprime le fond.
 */
export async function saveSheetBackground(campaignId, pages, fields = []) {`,
    },
    {
      find: `  await db.table(TABLE).put({ id: campaignId, campaign_id: campaignId, pages: cleaned });`,
      replace: `  await db.table(TABLE).put({ id: campaignId, campaign_id: campaignId, pages: cleaned, fields: cleanFields(fields, cleaned.length) });`,
    },
  ],
  "SheetBackgroundDialog.jsx": [
    {
      find: `import { loadSheetBackground, removeSheetBackground, saveSheetBackground } from "@/lib/services/sheetBackgroundStore";`,
      replace: `import { loadSheetBackgroundData, removeSheetBackground, saveSheetBackground } from "@/lib/services/sheetBackgroundStore";
import { fieldsSummary, removePageFields, rotateFields } from "@/lib/meta/pdfFields";`,
    },
    {
      find: `  const [pages, setPages] = useState([]);`,
      replace: `  const [pages, setPages] = useState([]);
  const [fields, setFields] = useState([]);`,
    },
    {
      find: `    loadSheetBackground(campaignId)
      .then((loaded) => {
        if (!cancelled) setPages(loaded);
      })`,
      replace: `    loadSheetBackgroundData(campaignId)
      .then((loaded) => {
        if (cancelled) return;
        setPages(loaded.pages);
        setFields(loaded.fields);
      })`,
    },
    {
      find: `    setPages(result.pages);
    setChanged(true);
    if (result.truncated) toast({ title: "PDF long", description: \`Seules les \${MAX_BACKGROUND_PAGES} premières pages sont gardées.\` });`,
      replace: `    setPages(result.pages);
    setFields(result.fields || []);
    setChanged(true);
    if (result.truncated) toast({ title: "PDF long", description: \`Seules les \${MAX_BACKGROUND_PAGES} premières pages sont gardées.\` });
    if (result.fields?.length) toast({ title: "Champs du PDF repérés", description: \`\${fieldsSummary(result.fields)} : ils serviront à aimanter les zones.\` });`,
    },
    {
      find: `    setPages((current) => current.map((page, i) => (i === index ? rotated : page)));`,
      replace: `    setPages((current) => current.map((page, i) => (i === index ? rotated : page)));
    setFields((current) => rotateFields(current, index, 1));`,
    },
    {
      find: `    setPages((current) => current.filter((_, i) => i !== index));`,
      replace: `    setPages((current) => current.filter((_, i) => i !== index));
    setFields((current) => removePageFields(current, index));`,
    },
    {
      find: `    const saved = await guard(() => saveSheetBackground(campaignId, pages));`,
      replace: `    const saved = await guard(() => saveSheetBackground(campaignId, pages, fields));`,
    },
    {
      find: `      setPages([]);
      setChanged(false);
      toast({ title: "Fond retiré" });`,
      replace: `      setPages([]);
      setFields([]);
      setChanged(false);
      toast({ title: "Fond retiré" });`,
    },
    {
      find: `          Les droits de la feuille appartiennent à son éditeur : importez votre propre exemplaire.`,
      replace: `          Les droits de la feuille appartiennent à son éditeur : importez votre propre exemplaire.
          Avec un PDF éditable (à champs de formulaire), les zones de saisie et les cases sont repérées pour aimanter les valeurs au placement.`,
    },
    {
      find: `          {pages.length > 0 && <span className="text-xs text-muted-foreground">{pages.length} page{pages.length > 1 ? "s" : ""} · {backgroundSizeLabel(pages)}</span>}`,
      replace: `          {pages.length > 0 && <span className="text-xs text-muted-foreground">{pages.length} page{pages.length > 1 ? "s" : ""} · {backgroundSizeLabel(pages)}</span>}
          {fields.length > 0 && <span className="text-xs text-muted-foreground">{fieldsSummary(fields)}</span>}`,
    },
  ],
  "SheetZonesDialog.jsx": [
    {
      find: `import { loadSheetBackground } from "@/lib/services/sheetBackgroundStore";`,
      replace: `import { loadSheetBackgroundData } from "@/lib/services/sheetBackgroundStore";
import { fieldRect, fieldsFor, fieldsOnPage, fieldsSummary, snapTarget } from "@/lib/meta/pdfFields";`,
    },
    {
      find: `  const [changed, setChanged] = useState(false);`,
      replace: `  const [changed, setChanged] = useState(false);
  const [fields, setFields] = useState([]);
  const [showFields, setShowFields] = useState(true);
  const [magnet, setMagnet] = useState(true);`,
    },
    {
      find: `    loadSheetBackground(campaignId)
      .then((loaded) => {
        if (!cancelled) setPages(loaded);
      })`,
      replace: `    loadSheetBackgroundData(campaignId)
      .then((loaded) => {
        if (cancelled) return;
        setPages(loaded.pages);
        setFields(loaded.fields);
      })`,
    },
    {
      find: `        if (!cancelled) setPages([]);`,
      replace: `        if (cancelled) return;
        setPages([]);
        setFields([]);`,
    },
    {
      find: `  const labelOf = (zone) => items.find((item) => item.key === zoneKey(zone))?.label || zone.ref;`,
      replace: `  const labelOf = (zone) => items.find((item) => item.key === zoneKey(zone))?.label || zone.ref;
  // Champs du PDF affichés : ceux qui conviennent à la zone choisie (cases pour une piste, zones de saisie pour le reste).
  const shownFields = showFields ? (selected ? fieldsFor(fields, pageIndex, selected.kind) : fieldsOnPage(fields, pageIndex)) : [];`,
    },
    {
      find: `  const startDrag = (event, zone, mode, rect) => {`,
      replace: `  // Un clic sur un champ du PDF pose la zone choisie exactement dessus.
  const snapToField = (field) => {
    if (!selected) return;
    edit(updateZone(draft, selected.id, { page: field.page, ...fieldRect(field) }));
  };

  const startDrag = (event, zone, mode, rect) => {`,
    },
    {
      find: `  const endDrag = () => {
    drag.current = null;
  };`,
      replace: `  const endDrag = () => {
    const state = drag.current;
    drag.current = null;
    if (!state || state.mode !== "move" || !magnet) return;
    // Une zone déplacée puis lâchée sur (ou près d') un champ du PDF s'y colle.
    const zone = draft.find((entry) => entry.id === state.id);
    if (!zone || (zone.x === state.origin.x && zone.y === state.origin.y)) return;
    const target = snapTarget(fieldsFor(fields, zone.page, zone.kind), zone);
    if (target) edit(updateZone(draft, zone.id, fieldRect(target)));
  };`,
    },
    {
      find: `              {selected && (
                <div className="mb-2 flex flex-wrap items-center gap-2 rounded-md bg-secondary/50 p-2 text-sm">`,
      replace: `              {fields.length > 0 ? (
                <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={showFields} onChange={(event) => setShowFields(event.target.checked)} />
                    Champs du PDF{fieldsOnPage(fields, pageIndex).length ? \` (\${fieldsSummary(fieldsOnPage(fields, pageIndex))})\` : ""}
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={magnet} onChange={(event) => setMagnet(event.target.checked)} />
                    Aimanter les zones
                  </label>
                  <span>Choisissez une zone, puis cliquez sur un champ pour la poser dessus.</span>
                </div>
              ) : (
                <p className="mb-2 text-xs text-muted-foreground">Astuce : importez un PDF éditable (à champs de formulaire) pour aimanter les zones sur ses champs.</p>
              )}
              {selected && (
                <div className="mb-2 flex flex-wrap items-center gap-2 rounded-md bg-secondary/50 p-2 text-sm">`,
    },
    {
      find: `                  {({ px, rect }) =>
                    zonesOnPage(draft, pageIndex).map((zone) => (`,
      replace: `                  {({ px, rect }) => [
                    ...shownFields.map((field) => (
                      <button
                        key={\`field-\${field.id}\`}
                        type="button"
                        title={\`\${field.name || "Champ du PDF"}\${field.count > 1 ? \` · \${field.count} cases\` : ""}\`}
                        aria-label={\`Champ du PDF \${field.name || ""}\${field.count > 1 ? \`, \${field.count} cases\` : ""} : poser la zone choisie dessus\`}
                        onClick={() => snapToField(field)}
                        className={cn(
                          "absolute rounded-sm border border-dashed bg-sky-500/10",
                          selected ? "cursor-pointer border-sky-600 hover:bg-sky-500/25" : "pointer-events-none border-sky-400/60"
                        )}
                        style={{ left: \`\${field.x * 100}%\`, top: \`\${field.y * 100}%\`, width: \`\${field.w * 100}%\`, height: \`\${field.h * 100}%\` }}
                      />
                    )),
                    ...zonesOnPage(draft, pageIndex).map((zone) => (`,
    },
    {
      find: `                    ))
                  }
                </SheetPageCanvas>`,
      replace: `                    )),
                  ]}
                </SheetPageCanvas>`,
    },
  ],
};

let failures = 0;
const done = [];
const writes = [];

for (const [file, content] of Object.entries(NEW_FILES)) {
  const target = path.join(root, file);
  if (fs.existsSync(target) && !force) {
    console.error("EXISTE DÉJÀ : " + file + " (relancez avec --force pour l'écraser)");
    failures += 1;
    continue;
  }
  writes.push({ target, text: content });
  done.push("créé      " + file);
}

for (const [name, edits] of Object.entries(EDITS)) {
  const file = findInSrc(name);
  if (!file) {
    console.error("INTROUVABLE (ou plusieurs) sous src/ : " + name);
    failures += 1;
    continue;
  }
  const original = fs.readFileSync(path.join(root, file), "utf8");
  const crlf = original.includes("\r\n");
  let text = crlf ? original.replace(/\r\n/g, "\n") : original;
  let ok = true;
  edits.forEach((edit, index) => {
    const expected = edit.count ?? 1;
    const found = text.split(edit.find).length - 1;
    if (found !== expected) {
      console.error(file + " : retouche " + (index + 1) + " non appliquée (" + found + " occurrence(s) trouvée(s), " + expected + " attendue(s)) :");
      console.error("    " + edit.find.split("\n")[0].trim());
      ok = false;
      return;
    }
    text = text.split(edit.find).join(edit.replace);
  });
  if (!ok) {
    console.error(file + " : laissé INTACT.");
    failures += 1;
    continue;
  }
  writes.push({ target: path.join(root, file), text: crlf ? text.replace(/\n/g, "\r\n") : text });
  done.push("modifié   " + file + " (" + edits.length + " retouche" + (edits.length > 1 ? "s" : "") + ")");
}

if (failures > 0) {
  console.error("\n" + failures + " problème(s) : RIEN n'a été écrit.");
  process.exit(1);
}
if (!dry) {
  for (const { target, text } of writes) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text, "utf8");
  }
}
console.log((dry ? "[--dry : rien n'a été écrit]\n" : "") + done.join("\n"));
console.log("\nTerminé. Ensuite : npm run check; npm run lint; npm test; npm run build");
