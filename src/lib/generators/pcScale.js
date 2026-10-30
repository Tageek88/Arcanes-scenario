// === SECTION PC SCALE ===
// Barème des personnages joueurs : un seul profil (pas de niveaux) avec une plage par caractéristique et, en option,
// un nombre de compétences et d'équipements. Il est séparé du barème des PNJ. Fonctions pures.
//
// Forme : { ranges: { Force: { min: 8, max: 14 } }, skills: { min: 2, max: 4 } | null, equipment: { min: 1, max: 3 } | null }

import { parseValue, MAX_SKILLS_PER_LEVEL } from "./npcScale";

export const MAX_EQUIPMENT_PER_PC = 30;

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

function cleanRange(range) {
  if (!isPlainObject(range)) return null;
  const min = parseValue(range.min);
  const max = parseValue(range.max);
  if (min === null || max === null) return null;
  return { min: Math.round(Math.min(min, max)), max: Math.round(Math.max(min, max)) };
}

function cleanCount(range, limit) {
  const cleaned = cleanRange(range);
  if (!cleaned) return null;
  const clamp = (n) => Math.min(limit, Math.max(0, n));
  return { min: clamp(cleaned.min), max: clamp(cleaned.max) };
}

export const emptyPcScale = () => ({ ranges: {}, skills: null, equipment: null });

/**
 * Nettoie un barème de PJ saisi ou enregistré : plages en entiers remises dans l'ordre, entrées à moitié saisies
 * abandonnées, limites respectées. Ne lève jamais d'erreur. Avec `characteristicNames`, les plages d'autres
 * caractéristiques sont retirées.
 * @param {unknown} input
 * @param {string[]} [characteristicNames]
 */
export function sanitizePcScale(input, characteristicNames) {
  const scale = emptyPcScale();
  if (!isPlainObject(input)) return scale;
  const allowed = Array.isArray(characteristicNames) ? new Set(characteristicNames) : null;
  if (isPlainObject(input.ranges)) {
    for (const [name, range] of Object.entries(input.ranges)) {
      if (name === "__proto__" || (allowed && !allowed.has(name))) continue;
      const cleaned = cleanRange(range);
      if (cleaned) scale.ranges[name] = cleaned;
    }
  }
  scale.skills = cleanCount(input.skills, MAX_SKILLS_PER_LEVEL);
  scale.equipment = cleanCount(input.equipment, MAX_EQUIPMENT_PER_PC);
  return scale;
}

/** Vrai si au moins une plage de caractéristique est définie. */
export const hasPcScale = (scale) => Object.keys(scale?.ranges || {}).length > 0;

/** Plages au format attendu par le générateur ({ name, min, max }), dans l'ordre des caractéristiques du modèle. */
export function pcRanges(scale, characteristicNames) {
  const ranges = scale?.ranges || {};
  const names = characteristicNames || Object.keys(ranges);
  return names.filter((name) => ranges[name]).map((name) => ({ name, ...ranges[name] }));
}

/** Nombre de compétences attendu ([min, max]), ou undefined s'il n'est pas défini. */
export const pcSkillCount = (scale) => (scale?.skills ? [scale.skills.min, scale.skills.max] : undefined);

/** Nombre d'équipements attendu ([min, max]), ou undefined s'il n'est pas défini. */
export const pcEquipmentCount = (scale) => (scale?.equipment ? [scale.equipment.min, scale.equipment.max] : undefined);

// === SECTION BALANCE CHECK ===
const MESSAGES = {
  below_range: ({ field, value, min, max }) => `${field} : ${value} est sous la plage prévue pour un personnage joueur (${min} à ${max}).`,
  above_range: ({ field, value, min, max }) => `${field} : ${value} dépasse la plage prévue pour un personnage joueur (${min} à ${max}).`,
  not_numeric: ({ field, value }) => `${field} : « ${value} » n'est pas un nombre, la valeur n'est pas contrôlée.`,
  missing_value: ({ field }) => `${field} : aucune valeur.`,
  skills_low: ({ count, min, max }) => `${count} compétence(s) : en dessous de ce qui est prévu (${min} à ${max}).`,
  skills_high: ({ count, min, max }) => `${count} compétence(s) : au-dessus de ce qui est prévu (${min} à ${max}).`,
  equipment_low: ({ count, min, max }) => `${count} équipement(s) : en dessous de ce qui est prévu (${min} à ${max}).`,
  equipment_high: ({ count, min, max }) => `${count} équipement(s) : au-dessus de ce qui est prévu (${min} à ${max}).`,
};

const makeIssue = (code, params) => ({ code, severity: "warning", ...params, message: MESSAGES[code](params) });

/**
 * Contrôle un personnage avec le barème des PJ. Ne bloque jamais : renvoie des avertissements à afficher.
 * Sans plage pour une caractéristique, rien n'est contrôlé pour elle.
 * @returns {{ ok: boolean, issues: object[] }}
 */
export function checkPc(pc, scale, characteristicNames) {
  const issues = [];
  const characteristics = isPlainObject(pc?.characteristics) ? pc.characteristics : {};
  for (const field of characteristicNames || []) {
    const range = scale?.ranges?.[field];
    if (!range) continue;
    const raw = characteristics[field]?.value;
    if (raw === undefined || raw === null || String(raw).trim() === "") {
      issues.push(makeIssue("missing_value", { field }));
      continue;
    }
    const value = parseValue(raw);
    if (value === null) issues.push(makeIssue("not_numeric", { field, value: String(raw) }));
    else if (value < range.min) issues.push(makeIssue("below_range", { field, value, ...range }));
    else if (value > range.max) issues.push(makeIssue("above_range", { field, value, ...range }));
  }
  const named = (list) => (Array.isArray(list) ? list : []).filter((item) => typeof item?.name === "string" && item.name.trim()).length;
  for (const [key, list] of [["skills", pc?.skills], ["equipment", pc?.equipment]]) {
    const range = scale?.[key];
    if (!range) continue;
    const count = named(list);
    if (count < range.min) issues.push(makeIssue(`${key}_low`, { count, ...range }));
    else if (count > range.max) issues.push(makeIssue(`${key}_high`, { count, ...range }));
  }
  return { ok: issues.length === 0, issues };
}

// === SECTION MODEL LINK ===
/**
 * Barème de PJ avec des caractéristiques renommées : `renames` associe l'ancien nom au nouveau (même règle que
 * `renameScaleCharacteristics` pour les PNJ : une plage déjà portée par le nouveau nom est conservée).
 */
export function renamePcScaleCharacteristics(scale, renames) {
  const source = sanitizePcScale(scale);
  if (!renames || renames.size === 0) return source;
  const ranges = {};
  for (const [name, range] of Object.entries(source.ranges)) {
    const target = renames.get(name) ?? name;
    if (target === "__proto__" || (target !== name && source.ranges[target] && !renames.has(target))) continue;
    if (!(target in ranges)) ranges[target] = range;
  }
  return { ...source, ranges };
}
