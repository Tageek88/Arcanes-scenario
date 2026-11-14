// Pure rules of the game systems stored outside any campaign (no React, no Dexie).
//
// A game system is a reusable copy of the sheet model of a campaign: characteristics (with their links), dice rule,
// NPC and PC scales, checkbox tracks, text fields and sheet layouts. It never holds characters or campaign content.
//   GameSystem row: { id, name, description, data }       data = see cleanSystemData
//   Game system file: { app, kind: "game-system", format, name, description, data }

import { characteristicNamesOf, sanitizeScale } from "@/lib/generators/npcScale";
import { sanitizePcScale } from "@/lib/generators/pcScale";
import { cleanDiceConfig } from "@/lib/meta/dice";
import { cleanParents } from "@/lib/meta/statLinks";
import { cleanTracks } from "@/lib/meta/tracks";
import { cleanTextFields } from "@/lib/meta/textFields";
import { activeLayoutId, cleanLayouts } from "@/lib/meta/layouts";

export const SYSTEM_APP = "arcanes-scenario";
export const SYSTEM_KIND = "game-system";
export const SYSTEM_FORMAT = 1;
export const MAX_SYSTEM_FILE_BYTES = 500 * 1024;
export const MAX_SYSTEMS = 100;
export const MAX_SYSTEM_NAME_LENGTH = 80;
export const MAX_SYSTEM_DESCRIPTION_LENGTH = 500;
export const MAX_CHARACTERISTICS = 60;
export const MAX_CHARACTERISTIC_NAME_LENGTH = 80;
export const MAX_FIELD_NAMES = 20;
export const MAX_FIELD_NAME_LENGTH = 60;

const text = (value) => String(value ?? "").trim();
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

/** Characteristics cleaned: a name each (repeats removed, whatever the case), their extra field names, their valid links. */
export function cleanCharacteristics(raw) {
  const out = [];
  const seen = new Set();
  for (const item of Array.isArray(raw) ? raw : []) {
    if (out.length >= MAX_CHARACTERISTICS) break;
    const name = text(item?.name).slice(0, MAX_CHARACTERISTIC_NAME_LENGTH);
    const key = name.toLocaleLowerCase("fr");
    if (!name || key === "__proto__" || seen.has(key)) continue;
    seen.add(key);
    const fieldNames = (Array.isArray(item?.field_names) ? item.field_names : [])
      .map((value) => text(value).slice(0, MAX_FIELD_NAME_LENGTH))
      .filter(Boolean)
      .slice(0, MAX_FIELD_NAMES);
    const entry = { name, field_names: fieldNames };
    const parent = text(item?.parent);
    if (parent) entry.parent = parent;
    out.push(entry);
  }
  return cleanParents(out);
}

/**
 * The content of a system, cleaned and bounded, from a model row or a file (`pc_scale` or `pcScale` both read).
 * Always returns every key, so a copy into a campaign overwrites the whole model.
 */
export function cleanSystemData(raw) {
  const source = isObject(raw) ? raw : {};
  const characteristics = cleanCharacteristics(source.characteristics);
  const names = characteristicNamesOf(characteristics);
  const tracks = cleanTracks(source.tracks);
  const textFields = cleanTextFields(source.textFields);
  const layouts = cleanLayouts(source.layouts, { characteristics, tracks, textFields });
  return {
    characteristics,
    skillRollModifier: source.skillRollModifier === true,
    scale: sanitizeScale(source.scale, names),
    pc_scale: sanitizePcScale(source.pc_scale ?? source.pcScale, names),
    dice: cleanDiceConfig(source.dice),
    tracks,
    textFields,
    layouts,
    layoutId: activeLayoutId(layouts, source.layoutId),
  };
}

/** Name and description of a system, cleaned (a system always has a name). */
export function cleanSystemInfo(raw, fallbackName = "Système sans nom") {
  return {
    name: text(raw?.name).slice(0, MAX_SYSTEM_NAME_LENGTH) || fallbackName,
    description: text(raw?.description).slice(0, MAX_SYSTEM_DESCRIPTION_LENGTH),
  };
}

/** The fields of a GameSheetModel row that a system provides (everything but the campaign and the row identity). */
export const modelFieldsFromSystem = (system) => cleanSystemData(system?.data);

/** What a system holds, for the list: { stats, links, tracks, textFields, layouts, hasDice }. */
export function describeSystem(system) {
  const data = cleanSystemData(system?.data);
  return {
    stats: data.characteristics.length,
    links: data.characteristics.filter((item) => item.parent).length,
    tracks: data.tracks.length,
    textFields: data.textFields.length,
    layouts: data.layouts.length,
    hasDice: Boolean(data.dice),
  };
}

/** The file to hand to the user (JSON text) for a system row. */
export function exportSystemFile(system) {
  const info = cleanSystemInfo(system);
  return JSON.stringify(
    { app: SYSTEM_APP, kind: SYSTEM_KIND, format: SYSTEM_FORMAT, name: info.name, description: info.description, data: cleanSystemData(system?.data) },
    null,
    2
  );
}

/** A file name for a system: arcanes-systeme-<name>.json */
export const systemFileName = (name) =>
  `arcanes-systeme-${String(name || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "jeu"}.json`;

const countDropped = (raw, kept) => Math.max(0, (Array.isArray(raw) ? raw.length : 0) - kept);

/**
 * Reads the text of a game system file. Never throws: { ok, system: { name, description, data }, issues, error }.
 * `issues` lists what the cleaning dropped, so the user knows the import was not a perfect copy.
 */
export function parseSystemFile(content, size = String(content ?? "").length) {
  const fail = (error) => ({ ok: false, system: null, issues: [], error });
  if (size > MAX_SYSTEM_FILE_BYTES) return fail("Le fichier dépasse 500 Ko : ce n'est pas un système de jeu.");
  let parsed;
  try {
    parsed = JSON.parse(String(content ?? ""));
  } catch {
    return fail("Le fichier n'est pas un JSON valide.");
  }
  if (!isObject(parsed) || parsed.app !== SYSTEM_APP || parsed.kind !== SYSTEM_KIND) {
    return fail("Ce fichier n'est pas un système de jeu de cette application.");
  }
  if (!Number.isInteger(parsed.format) || parsed.format < 1) return fail("Le format du fichier est inconnu.");
  if (parsed.format > SYSTEM_FORMAT) return fail("Ce fichier vient d'une version plus récente de l'application.");
  if (!isObject(parsed.data)) return fail("Le fichier ne contient pas de système.");

  const data = cleanSystemData(parsed.data);
  if (data.characteristics.length === 0) return fail("Ce système ne contient aucune caractéristique.");

  const raw = parsed.data;
  const issues = [];
  const dropped = [
    ["caractéristique", "caractéristiques", "e", countDropped(raw.characteristics, data.characteristics.length)],
    ["case à cocher", "cases à cocher", "e", countDropped(raw.tracks, data.tracks.length)],
    ["champ de texte", "champs de texte", "", countDropped(raw.textFields, data.textFields.length)],
    ["mise en page", "mises en page", "e", countDropped(raw.layouts, data.layouts.length)],
  ];
  for (const [one, many, feminine, count] of dropped) {
    if (count > 0) issues.push(`${count} ${count > 1 ? many : one} ignoré${feminine}${count > 1 ? "s" : ""}`);
  }
  return { ok: true, system: { ...cleanSystemInfo(parsed, "Système importé"), data }, issues, error: "" };
}
