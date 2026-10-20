// === SECTION GENERATOR TABLES ===
// Les listes utilisées par les générateurs : celles intégrées à l'application pour l'univers de la campagne,
// complétées ou remplacées par celles du MJ (champ `generator_data` de la campagne).
//
// Forme des données du MJ :
//   { roles: { mode: "add" | "replace", items: ["Aubergiste", ...] }, traits: { ... }, ... }
// - "add" (défaut) : les éléments s'ajoutent à ceux de l'application ;
// - "replace" : seuls les éléments du MJ sont utilisés (une liste vide est ignorée, pour ne rien désactiver par erreur).

import { NAME_DATA } from "./nameData";
import { COMMON_DATA, ROLE_DATA } from "./npcData";
import { DEFAULT_UNIVERSE } from "@/lib/meta/universeMeta";

/** Listes gérées, avec leur libellé pour l'éditeur. */
export const LIST_DEFS = [
  { key: "male", label: "Prénoms masculins" },
  { key: "female", label: "Prénoms féminins" },
  { key: "neutral", label: "Prénoms neutres" },
  { key: "family", label: "Noms de famille" },
  { key: "roles", label: "Rôles" },
  { key: "traits", label: "Traits de caractère" },
  { key: "motivations", label: "Motivations" },
  { key: "appearances", label: "Signes distinctifs" },
];

export const LIST_KEYS = LIST_DEFS.map((def) => def.key);

export const MAX_ITEMS_PER_LIST = 500;
export const MAX_ITEM_LENGTH = 80;

const normalizeKey = (text) =>
  String(text).normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("fr");

/** Retire les doublons (sans tenir compte de la casse ni des accents), en gardant le premier. */
export function uniqueList(list) {
  const seen = new Set();
  const result = [];
  for (const item of list || []) {
    if (typeof item !== "string") continue;
    const key = normalizeKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

/**
 * Nettoie les tables saisies par le MJ : clés inconnues ignorées, éléments en texte,
 * espaces réduits, doublons retirés, longueurs limitées. Ne lève jamais d'erreur.
 * @param {unknown} input
 * @returns {Record<string, { mode: "add" | "replace", items: string[] }>}
 */
export function sanitizeGeneratorData(input) {
  const result = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return result;
  for (const key of LIST_KEYS) {
    const entry = input[key];
    if (!entry || typeof entry !== "object" || !Array.isArray(entry.items)) continue;
    const cleaned = uniqueList(
      entry.items
        .filter((item) => typeof item === "string")
        .map((item) => item.replace(/\s+/g, " ").trim())
        .filter((item) => item.length > 0 && item.length <= MAX_ITEM_LENGTH)
    ).slice(0, MAX_ITEMS_PER_LIST);
    result[key] = { mode: entry.mode === "replace" ? "replace" : "add", items: cleaned };
  }
  return result;
}

/** Listes intégrées à l'application pour un univers (vides si l'univers n'a pas de données). */
export function builtinTables(universeId) {
  const id = universeId || DEFAULT_UNIVERSE;
  const names = NAME_DATA[id];
  return {
    male: uniqueList(names?.male),
    female: uniqueList(names?.female),
    neutral: [],
    family: uniqueList(names?.family),
    roles: uniqueList(ROLE_DATA[id]),
    traits: uniqueList(COMMON_DATA.traits),
    motivations: uniqueList(COMMON_DATA.motivations),
    appearances: uniqueList(COMMON_DATA.appearances),
  };
}

/**
 * Listes finales d'un univers, avec celles du MJ.
 * @param {string} [universeId]
 * @param {unknown} [generatorData] champ `generator_data` de la campagne
 * @returns {Record<string, string[]>}
 */
export function resolveTables(universeId, generatorData) {
  const base = builtinTables(universeId);
  const custom = sanitizeGeneratorData(generatorData);
  const tables = {};
  for (const key of LIST_KEYS) {
    const entry = custom[key];
    if (!entry || entry.items.length === 0) tables[key] = base[key];
    else if (entry.mode === "replace") tables[key] = entry.items;
    else tables[key] = uniqueList([...base[key], ...entry.items]);
  }
  return tables;
}

/** Vrai s'il existe au moins un prénom (masculin, féminin ou neutre). */
export const hasNameData = (tables) =>
  Boolean(tables) && ["male", "female", "neutral"].some((key) => tables[key]?.length > 0);

/** Clés des listes vides (pour avertir le MJ de ce qu'il peut compléter). */
export const emptyLists = (tables) => LIST_KEYS.filter((key) => !tables?.[key]?.length);
