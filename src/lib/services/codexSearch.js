// === SECTION RECHERCHE DU CODEX ===
// Recherche sur toute la fiche (PNJ, lieux, indices, personnages) et filtres cliquables.
// Fonctions pures, sans accès aux données : les libellés de lieux et les relations sont fournis par l'appelant.
//
// Syntaxe de la barre de recherche (les mots sont combinés par « et ») :
//   garde            texte libre : cherché dans toutes les rubriques de la fiche
//   "garde du corps" expression exacte entre guillemets (texte libre)
//   role:"Garde"     filtre exact sur une rubrique (ajouté par un clic sur une valeur partagée)
//   role:garde       filtre sur une rubrique : contient le mot
// Rubriques : lieu, role, niveau, genre, attitude, trait, competence, equipement, type.

import { NPC_GENDER_OPTIONS } from "@/lib/meta/codex";
import { NPC_ATTITUDE } from "@/lib/meta/sceneMeta";
import { pathOf } from "@/lib/services/locationTree";

export const SEARCH_KEYS = ["lieu", "role", "niveau", "genre", "attitude", "trait", "competence", "equipement", "type"];
const KEY_SET = new Set(SEARCH_KEYS);

export const normalizeSearch = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

const TOKEN = /(?:(\p{L}+):)?(?:"([^"]*)"|(\S+))/gu;

/** Découpe la recherche en mots, en gardant le texte d'origine de chacun (pour pouvoir en retirer un). */
function scan(term) {
  const parts = [];
  const source = String(term ?? "");
  TOKEN.lastIndex = 0;
  let match;
  while ((match = TOKEN.exec(source)) !== null) {
    const key = match[1] ? normalizeSearch(match[1]) : "";
    const quoted = match[2] !== undefined;
    const raw = quoted ? match[2] : match[3];
    let token = null;
    if (key && KEY_SET.has(key)) {
      const value = normalizeSearch(raw);
      if (value) token = { key, value, exact: quoted };
    } else {
      const value = normalizeSearch(match[1] ? `${match[1]}:${raw}` : raw);
      if (value) token = { key: "", value, exact: false };
    }
    parts.push({ raw: match[0], token });
  }
  return parts;
}

/** @returns {{ key: string, value: string, exact: boolean }[]} */
export const parseSearch = (term) => scan(term).flatMap((part) => (part.token ? [part.token] : []));

/** Texte d'un filtre exact, tel qu'il est écrit dans la barre de recherche. */
export const filterToken = (key, value) => `${key}:"${String(value ?? "").replace(/"/g, "").trim()}"`;

export const hasFilter = (term, key, value) => {
  const wanted = normalizeSearch(value);
  return parseSearch(term).some((token) => token.key === key && token.exact && token.value === wanted);
};

/** Ajoute le filtre à la recherche, ou le retire s'il y est déjà. */
export function toggleFilter(term, key, value) {
  const clean = String(value ?? "").replace(/"/g, "").trim();
  if (!clean) return String(term ?? "");
  const wanted = normalizeSearch(clean);
  const parts = scan(term);
  const present = parts.some((part) => part.token && part.token.key === key && part.token.exact && part.token.value === wanted);
  if (present) {
    return parts
      .filter((part) => !(part.token && part.token.key === key && part.token.exact && part.token.value === wanted))
      .map((part) => part.raw)
      .join(" ");
  }
  return [...parts.map((part) => part.raw), filterToken(key, clean)].join(" ");
}

/** Libellés complets (« Pays › Ville › Rue ») des lieux, et chemins cumulés de chacun (le lieu et ses parents). */
export function buildLocationIndex(locations = []) {
  const labels = new Map();
  const paths = new Map();
  for (const location of locations) {
    const chain = pathOf(locations, location.id).map((item) => item.name);
    labels.set(location.id, chain.join(" › "));
    paths.set(location.id, chain.map((_, index) => chain.slice(0, index + 1).join(" › ")));
  }
  return { labels, paths };
}

const list = (value) => (Array.isArray(value) ? value : []);
const fieldsText = (fields) =>
  list(fields)
    .map((field) => `${field?.name ?? ""} ${field?.value ?? ""}`.trim())
    .filter(Boolean);
const characteristicsText = (characteristics) =>
  Object.entries(characteristics && typeof characteristics === "object" ? characteristics : {}).map(
    ([name, entry]) => [name, entry?.value, ...fieldsText(entry?.fields)].filter((part) => part !== undefined && part !== "").join(" ")
  );
const skillsText = (skills) =>
  list(skills).flatMap((skill) => [skill?.name, skill?.roll_modifier, ...fieldsText(skill?.fields)]);
const equipmentText = (equipment) =>
  list(equipment).flatMap((item) => [item?.name, item?.type, ...fieldsText(item?.fields)]);

/**
 * Index de recherche d'un élément : tout le texte de la fiche, et les valeurs de chaque rubrique filtrable.
 * @param {"npc" | "location" | "clue" | "character"} kind
 * @param {Record<string, any>} entry
 * @param {{ locationLabels?: Map<string, string>, locationPaths?: Map<string, string[]>,
 *   relations?: { label?: string, targetName?: string }[] }} [context]
 * @returns {{ all: string, fields: Record<string, string[]> }}
 */
export function buildSearchEntry(kind, entry, context = {}) {
  const locationLabel = context.locationLabels?.get(kind === "location" ? entry.id : entry.location_id) || "";
  const locationPaths = context.locationPaths?.get(kind === "location" ? entry.id : entry.location_id) || [];
  const fields = {};
  const parts = [entry.name, entry.comment, locationLabel];
  const addField = (key, values) => {
    fields[key] = values.map(normalizeSearch).filter(Boolean);
  };

  if (kind === "npc") {
    const gender = NPC_GENDER_OPTIONS.find((option) => option.id === entry.gender)?.label || "";
    const attitude = NPC_ATTITUDE[entry.attitude]?.label || "";
    parts.push(
      entry.role, entry.description, gender, attitude, entry.level,
      ...list(entry.traits), entry.motivation, entry.appearance,
      ...characteristicsText(entry.characteristics), ...skillsText(entry.skills), ...equipmentText(entry.equipment),
      ...list(entry.inventory).map((item) => item?.name),
      ...list(context.relations).map((relation) => `${relation.label ?? ""} ${relation.targetName ?? ""}`)
    );
    addField("role", [entry.role]);
    addField("niveau", [entry.level]);
    addField("genre", [gender]);
    addField("attitude", [attitude]);
    addField("trait", list(entry.traits));
    addField("competence", list(entry.skills).map((skill) => skill?.name));
    addField("equipement", list(entry.equipment).map((item) => item?.name));
    addField("type", list(entry.equipment).map((item) => item?.type));
    addField("lieu", locationPaths);
  } else if (kind === "location") {
    parts.push(entry.type, entry.description);
    addField("type", [entry.type]);
    addField("lieu", locationPaths);
  } else if (kind === "clue") {
    const isInfo = entry.clue_type === "info";
    const state = isInfo
      ? `${entry.known ? "connue" : "inconnue"} ${entry.used ? "utilisée" : "non utilisée"}`
      : entry.discovered ? "découvert" : "caché";
    parts.push(entry.description, isInfo ? "info" : "indice", state);
    addField("type", [isInfo ? "info" : "indice"]);
    addField("lieu", locationPaths);
  } else {
    parts.push(
      entry.notes, ...characteristicsText(entry.characteristics), ...skillsText(entry.skills), ...equipmentText(entry.equipment),
      ...list(entry.inventory).map((item) => item?.name)
    );
    addField("competence", list(entry.skills).map((skill) => skill?.name));
    addField("equipement", list(entry.equipment).map((item) => item?.name));
    addField("type", list(entry.equipment).map((item) => item?.type));
  }
  parts.push(...list(entry.attachments).map((file) => file?.name));
  return { all: normalizeSearch(parts.filter((part) => part !== undefined && part !== null && part !== "").join(" \n ")), fields };
}

/** Vrai si l'élément répond à tous les mots de la recherche (une recherche vide les accepte tous). */
export function matchesSearch(tokens, searchEntry) {
  return tokens.every((token) => {
    if (!token.key) return searchEntry.all.includes(token.value);
    const values = searchEntry.fields[token.key] || [];
    return token.exact ? values.includes(token.value) : values.some((value) => value.includes(token.value));
  });
}
