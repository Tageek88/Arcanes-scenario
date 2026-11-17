// Champs de formulaire d'un PDF éditable : règles pures (aucun accès aux données, au navigateur ni à pdfjs).
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
 * Selon la version de pdfjs, le viewport offre `convertToViewportPoint` (toutes) ou `convertToViewportRectangle` (anciennes).
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
 * Champs d'une page d'après ses annotations pdfjs (`page.getAnnotations()`). `viewport` est celui de la page à l'échelle 1 :
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

/** Champs nettoyés pour `pageCount` pages : type, page et rectangle valides, identifiants attribués, nombre borné. */
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
    const field = { id: `f${out.length + 1}`, page, type: item.type, name: text(item.name).slice(0, 80), ...rect };
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
 * du centre à moins de `maxDistance` (fraction de la page). `null` si aucun n'est assez près.
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

/** Les champs après `turns` quarts de tour (sens des aiguilles d'une montre) de la page `page`. */
export function rotateFields(fields, page, turns) {
  const count = ((Math.trunc(Number(turns)) || 0) % 4 + 4) % 4;
  return (Array.isArray(fields) ? fields : []).map((field) => {
    if (field.page !== page) return field;
    let { x, y, w, h } = field;
    for (let i = 0; i < count; i += 1) [x, y, w, h] = [1 - (y + h), x, h, w];
    return { ...field, x: round(x), y: round(y), w: round(w), h: round(h) };
  });
}

/** Les champs après le retrait de la page `page` : ceux de la page disparaissent, les pages suivantes remontent d'un rang. */
export function removePageFields(fields, page) {
  return (Array.isArray(fields) ? fields : []).filter((field) => field.page !== page).map((field) => (field.page > page ? { ...field, page: field.page - 1 } : field));
}

/** Résumé lisible : « 12 zones de saisie, 4 rangées de cases ». */
export function fieldsSummary(fields) {
  const list = Array.isArray(fields) ? fields : [];
  const texts = list.filter((field) => field.type === "text").length;
  const checks = list.filter((field) => field.type === "check").length;
  const parts = [];
  if (texts) parts.push(`${texts} zone${texts > 1 ? "s" : ""} de saisie`);
  if (checks) parts.push(`${checks} case${checks > 1 ? "s" : ""} ou rangée${checks > 1 ? "s" : ""} de cases`);
  return parts.join(", ");
}
