// Association des zones de valeurs aux champs d'un PDF éditable : règles pures (aucun accès aux données ni au navigateur).
//
// Deux aides pour « Placer les valeurs » quand le fond vient d'un PDF à champs de formulaire (voir pdfFields.js) :
//   - snapAllZones : chaque zone déjà posée se colle sur le champ le plus proche (un champ ne sert qu'à une zone) ;
//   - placeByFieldNames : les éléments pas encore placés prennent le champ dont le nom ressemble au leur.
// Elles ne font que proposer : le résultat reste modifiable, et rien n'est enregistré avant « Enregistrer le placement ».

import { SNAP_DISTANCE, fieldRect } from "@/lib/meta/pdfFields";
import { newZoneFor, unplacedItems } from "@/lib/meta/sheetZones";

/** Nom comparable : sans accents, en minuscules, sans espace ni ponctuation. */
export const normalizeName = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const fieldType = (kind) => (kind === "track" ? "check" : "text");
const isZoneOnField = (zone, field) => ["x", "y", "w", "h"].every((key) => Math.abs(zone[key] - fieldRect(field)[key]) < 0.0001);

/** Distance entre le centre d'un rectangle et un champ (0 si le centre est dans le champ), en fractions de page. */
function distanceToField(rect, field) {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const dx = Math.max(field.x - cx, 0, cx - (field.x + field.w));
  const dy = Math.max(field.y - cy, 0, cy - (field.y + field.h));
  return Math.hypot(dx, dy);
}

/**
 * Colle chaque zone sur le champ du PDF le plus proche (même page, sorte qui convient : cases pour une piste, saisie pour le
 * reste), à moins de `maxDistance`. Un champ ne reçoit qu'une zone : les paires les plus proches passent d'abord. Pour une piste,
 * une rangée qui a le même nombre de cases (`tracks` = [{ id, count }]) est préférée.
 * @returns {{ zones: object[], snapped: number, unmatched: number }} `snapped` compte aussi les zones déjà pile sur leur champ.
 */
export function snapAllZones(zones, fields, { maxDistance = SNAP_DISTANCE, tracks = [] } = {}) {
  const list = Array.isArray(zones) ? zones : [];
  const available = Array.isArray(fields) ? fields : [];
  const pairs = [];
  list.forEach((zone, zoneIndex) => {
    const track = zone.kind === "track" ? (Array.isArray(tracks) ? tracks : []).find((item) => item.id === zone.ref) : null;
    available.forEach((field, fieldIndex) => {
      if (field.page !== zone.page || field.type !== fieldType(zone.kind)) return;
      const distance = distanceToField(zone, field);
      if (distance > maxDistance) return;
      const mismatch = track && Number(track.count) > 0 && (field.count || 1) !== Number(track.count) ? 0.02 : 0;
      pairs.push({ zoneIndex, fieldIndex, score: distance + mismatch + field.w * field.h * 0.01 });
    });
  });
  pairs.sort((a, b) => a.score - b.score);
  const takenZones = new Set();
  const takenFields = new Set();
  const next = list.map((zone) => zone);
  for (const pair of pairs) {
    if (takenZones.has(pair.zoneIndex) || takenFields.has(pair.fieldIndex)) continue;
    takenZones.add(pair.zoneIndex);
    takenFields.add(pair.fieldIndex);
    next[pair.zoneIndex] = { ...list[pair.zoneIndex], ...fieldRect(available[pair.fieldIndex]) };
  }
  return { zones: next, snapped: takenZones.size, unmatched: list.length - takenZones.size };
}

/** Note de ressemblance entre le nom d'un champ et le libellé d'un élément : 3 identiques, entre 1 et 2 si l'un contient l'autre, sinon 0. */
export function nameScore(fieldName, label) {
  const a = normalizeName(fieldName);
  const b = normalizeName(label);
  if (!a || !b) return 0;
  if (a === b) return 3;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= 3 && long.includes(short) ? 1 + short.length / long.length : 0;
}

/**
 * Pose une zone, sur le champ du PDF dont le nom ressemble au sien, pour chaque élément du modèle pas encore placé
 * (`model` = { characteristics, tracks, textFields }). Un champ ne sert qu'une fois ; les meilleures ressemblances passent d'abord.
 * @returns {{ zones: object[], added: number, labels: string[] }}
 */
export function placeByFieldNames(model, zones, fields) {
  const current = Array.isArray(zones) ? zones : [];
  const available = Array.isArray(fields) ? fields : [];
  const items = unplacedItems(model, current);
  const pairs = [];
  items.forEach((item, itemIndex) => {
    available.forEach((field, fieldIndex) => {
      if (field.type !== fieldType(item.kind)) return;
      const score = nameScore(field.name, item.label);
      if (score > 0) pairs.push({ itemIndex, fieldIndex, score });
    });
  });
  pairs.sort((a, b) => b.score - a.score || a.itemIndex - b.itemIndex || a.fieldIndex - b.fieldIndex);
  const takenItems = new Set();
  const takenFields = new Set();
  // Un champ déjà occupé par une zone n'est pas repris.
  available.forEach((field, index) => {
    if (current.some((zone) => zone.page === field.page && isZoneOnField(zone, field))) takenFields.add(index);
  });
  const created = [];
  for (const pair of pairs) {
    if (takenItems.has(pair.itemIndex) || takenFields.has(pair.fieldIndex)) continue;
    takenItems.add(pair.itemIndex);
    takenFields.add(pair.fieldIndex);
    const field = available[pair.fieldIndex];
    created.push({ item: items[pair.itemIndex], zone: { ...newZoneFor(items[pair.itemIndex], field.page), ...fieldRect(field) } });
  }
  return { zones: [...current, ...created.map((entry) => entry.zone)], added: created.length, labels: created.map((entry) => entry.item.label) };
}
