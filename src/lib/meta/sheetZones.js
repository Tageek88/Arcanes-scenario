// Zones des valeurs sur le fond de feuille : règles pures (aucun accès aux données ni au navigateur).
//
// Une zone place UNE valeur de la fiche sur une page du fond. Le modèle (GameSheetModel) garde :
//   zones: [{ id, kind, ref, field?, page, x, y, w, h, size }]
//     kind  "stat"  la valeur d'une caractéristique (`ref` = son nom), ou d'un de ses champs (`field` = nom du champ)
//           "text"  un champ de texte (`ref` = son identifiant)
//           "track" une piste de cases à cocher (`ref` = son identifiant)
//     page  numéro de la page du fond, à partir de 0
//     x, y, w, h  position et taille en fractions de la page (0 à 1), coin haut gauche pour x et y
//     size  taille du texte, ou des cases, en pourcentage de la hauteur de la page
// Les zones sont des positions, pas de l'artwork : elles voyagent avec un système de jeu, le fond reste sur l'appareil.

import { MAX_BACKGROUND_PAGES } from "@/lib/meta/sheetBackground";
import { checkedCount } from "@/lib/meta/tracks";

export const MAX_ZONES = 150;
export const ZONE_KINDS = ["stat", "text", "track"];
export const MIN_ZONE_SIZE = 0.01;
export const MIN_TEXT_SIZE = 0.6;
export const MAX_TEXT_SIZE = 6;
export const DEFAULT_TEXT_SIZE = 1.6;

const text = (value) => String(value ?? "").trim();
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const randomId = (prefix) => {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}${random.replace(/-/g, "").slice(0, 12)}`;
};

export const newZoneId = () => randomId("z");

const fraction = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : fallback;
};
const round = (value) => Math.round(value * 10000) / 10000;

/** Taille de texte bornée (défaut si la valeur est absente ou illisible). */
export function clampTextSize(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return DEFAULT_TEXT_SIZE;
  return round(Math.min(MAX_TEXT_SIZE, Math.max(MIN_TEXT_SIZE, number)));
}

/** Rectangle ramené dans la page : tailles d'au moins MIN_ZONE_SIZE, jamais au-delà des bords. */
export function clampRect(rect) {
  const w = Math.min(1, Math.max(MIN_ZONE_SIZE, fraction(rect?.w, MIN_ZONE_SIZE)));
  const h = Math.min(1, Math.max(MIN_ZONE_SIZE, fraction(rect?.h, MIN_ZONE_SIZE)));
  const x = Math.min(1 - w, fraction(rect?.x, 0));
  const y = Math.min(1 - h, fraction(rect?.y, 0));
  return { x: round(x), y: round(y), w: round(w), h: round(h) };
}

/** Identité d'une valeur à placer : un même élément n'a qu'une zone. */
export const zoneKey = (zone) => `${zone?.kind}|${zone?.ref}|${zone?.field || ""}`;

/**
 * Tout ce qui peut être placé sur la feuille (`model` = { characteristics, tracks, textFields }) :
 * [{ key, kind, ref, field?, label }] dans l'ordre du modèle : caractéristiques (et leurs champs), textes, pistes.
 */
export function placeableItems(model = {}) {
  const items = [];
  for (const stat of model.characteristics || []) {
    const name = text(stat?.name);
    if (!name) continue;
    items.push({ key: zoneKey({ kind: "stat", ref: name }), kind: "stat", ref: name, label: name });
    for (const fieldName of stat.field_names || []) {
      const field = text(fieldName);
      if (field) items.push({ key: zoneKey({ kind: "stat", ref: name, field }), kind: "stat", ref: name, field, label: `${name} · ${field}` });
    }
  }
  for (const field of model.textFields || []) {
    const id = text(field?.id);
    if (id) items.push({ key: zoneKey({ kind: "text", ref: id }), kind: "text", ref: id, label: text(field.name) || "Texte", long: field.long === true });
  }
  for (const track of model.tracks || []) {
    const id = text(track?.id);
    if (id) items.push({ key: zoneKey({ kind: "track", ref: id }), kind: "track", ref: id, label: text(track.name) || "Cases", count: Number(track.count) || 0 });
  }
  return items;
}

/**
 * Zones nettoyées contre le modèle (`context` = { characteristics, tracks, textFields }) : une zone dont l'élément n'existe plus,
 * ou qui répète un élément déjà placé, est retirée ; positions et tailles sont ramenées dans la page ; le nombre est borné.
 */
export function cleanZones(raw, context = {}) {
  const known = new Map(placeableItems(context).map((item) => [item.key, item]));
  const out = [];
  const seenKeys = new Set();
  const seenIds = new Set();
  for (const item of Array.isArray(raw) ? raw : []) {
    if (out.length >= MAX_ZONES) break;
    if (!isObject(item)) continue;
    const kind = text(item.kind);
    const ref = text(item.ref);
    const field = kind === "stat" ? text(item.field) : "";
    if (!ZONE_KINDS.includes(kind) || !ref || ref === "__proto__") continue;
    const key = zoneKey({ kind, ref, field });
    if (!known.has(key) || seenKeys.has(key)) continue;
    let id = text(item.id);
    if (!id || id === "__proto__" || seenIds.has(id)) id = newZoneId();
    const pageNumber = Math.trunc(Number(item.page));
    const page = Number.isFinite(pageNumber) ? Math.min(MAX_BACKGROUND_PAGES - 1, Math.max(0, pageNumber)) : 0;
    seenKeys.add(key);
    seenIds.add(id);
    const zone = { id, kind, ref, page, ...clampRect(item), size: clampTextSize(item.size) };
    if (field) zone.field = field;
    out.push(zone);
  }
  return out;
}

/** Les zones après le renommage de caractéristiques (`renames` : ancien nom → nouveau nom). */
export function renameZoneStats(zones, renames) {
  if (!(renames instanceof Map) || renames.size === 0) return Array.isArray(zones) ? zones : [];
  return (Array.isArray(zones) ? zones : []).map((zone) =>
    zone?.kind === "stat" && renames.has(zone.ref) ? { ...zone, ref: renames.get(zone.ref) } : zone
  );
}

/** Une zone neuve pour un élément (`item` vient de placeableItems), posée au milieu de la page `page`. */
export function newZoneFor(item, page = 0) {
  const base = item.kind === "track" ? { w: 0.24, h: 0.03 } : item.kind === "text" && item.long ? { w: 0.4, h: 0.12 } : item.kind === "text" ? { w: 0.25, h: 0.03 } : { w: 0.08, h: 0.03 };
  const rect = clampRect({ ...base, x: 0.5 - base.w / 2, y: 0.5 - base.h / 2 });
  const zone = { id: newZoneId(), kind: item.kind, ref: item.ref, page, ...rect, size: DEFAULT_TEXT_SIZE };
  if (item.field) zone.field = item.field;
  return zone;
}

/** Les éléments du modèle qui n'ont pas encore de zone. */
export function unplacedItems(model, zones) {
  const used = new Set((Array.isArray(zones) ? zones : []).map(zoneKey));
  return placeableItems(model).filter((item) => !used.has(item.key));
}

/** Les zones d'une page, avec leur place dans la liste complète. */
export function zonesOnPage(zones, page) {
  return (Array.isArray(zones) ? zones : []).filter((zone) => zone.page === page);
}

/** La zone `id` déplacée de (dx, dy) fractions de page, sans sortir de la page. */
export function moveZone(zone, dx, dy) {
  return { ...zone, ...clampRect({ ...zone, x: zone.x + (Number(dx) || 0), y: zone.y + (Number(dy) || 0) }) };
}

/** La zone agrandie ou réduite de (dw, dh) fractions de page à partir de son coin bas droit, sans sortir de la page. */
export function resizeZone(zone, dw, dh) {
  const w = Math.min(zone.w + (Number(dw) || 0), 1 - zone.x);
  const h = Math.min(zone.h + (Number(dh) || 0), 1 - zone.y);
  return { ...zone, ...clampRect({ ...zone, w, h }) };
}

/** Une liste de zones dont la zone `id` est remplacée par `change(zone)` (la même liste si `id` est inconnu). */
export function updateZone(zones, id, change) {
  return (Array.isArray(zones) ? zones : []).map((zone) => (zone.id === id ? { ...zone, ...change } : zone));
}

/** Position du pointeur en fractions de la page, d'après le rectangle affiché de la page (hors bords : ramenée dans la page). */
export function pointerFraction(clientX, clientY, rect) {
  const width = Number(rect?.width) || 0;
  const height = Number(rect?.height) || 0;
  if (!(width > 0) || !(height > 0)) return { x: 0, y: 0 };
  return { x: fraction((clientX - rect.left) / width, 0), y: fraction((clientY - rect.top) / height, 0) };
}

/** Texte affiché par une zone « stat » ou « text » pour un personnage ou un PNJ ("" si rien n'est saisi). */
export function zoneText(zone, sheet) {
  if (zone?.kind === "text") {
    const texts = isObject(sheet?.texts) ? sheet.texts : {};
    return Object.hasOwn(texts, zone.ref) ? text(texts[zone.ref]) : "";
  }
  if (zone?.kind === "stat") {
    const characteristics = isObject(sheet?.characteristics) ? sheet.characteristics : {};
    const values = Object.hasOwn(characteristics, zone.ref) && isObject(characteristics[zone.ref]) ? characteristics[zone.ref] : {};
    if (!zone.field) return text(values.value);
    const found = (Array.isArray(values.fields) ? values.fields : []).find((field) => text(field?.name) === zone.field);
    return text(found?.value);
  }
  return "";
}

/** Les cases d'une zone « track » : { count, checked } d'après les cases cochées de la fiche. */
export function zoneBoxes(zone, tracks, sheet) {
  const track = (Array.isArray(tracks) ? tracks : []).find((item) => item.id === zone?.ref);
  if (!track) return { count: 0, checked: 0 };
  const checks = isObject(sheet?.checks) ? sheet.checks : {};
  return { count: track.count, checked: checkedCount(checks[track.id], track.count) };
}

/**
 * La feuille à imprimer pour un modèle et les pages du fond : { pages, zones, covers }, ou null s'il n'y a rien à poser
 * (aucune zone, aucun fond, ou aucune zone sur une page existante). `covers` : toutes les valeurs du modèle sont placées
 * sur la feuille, l'impression peut donc se passer de la liste des caractéristiques, des textes et des cases.
 */
export function sheetForPrint(model, pages) {
  const zones = Array.isArray(model?.zones) ? model.zones : [];
  const list = Array.isArray(pages) ? pages : [];
  if (zones.length === 0 || list.length === 0) return null;
  const onPages = zones.filter((zone) => zone.page < list.length);
  if (onPages.length === 0) return null;
  return { pages: list, zones: onPages, covers: onPages.length === zones.length && unplacedItems(model, zones).length === 0 };
}

/** Résumé pour l'éditeur : « 12 valeurs placées sur 34 ». */
export function zonesSummary(model, zones) {
  const total = placeableItems(model).length;
  const placed = total - unplacedItems(model, zones).length;
  return { placed, total };
}
