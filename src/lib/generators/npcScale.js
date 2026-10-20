// === SECTION NPC SCALE ===
// Barème d'équilibrage des PNJ : des niveaux (faible, standard, élite…) avec, pour chacun, une plage de valeurs
// par caractéristique et, en option, un nombre de compétences. Le MJ le saisit, ou le dérive des fiches existantes.
// Fonctions pures : aucun accès à la base ni à l'interface.
//
// Forme d'un barème :
//   { levels: [{ name: "Faible", ranges: { Force: { min: 6, max: 10 } }, skills: { min: 1, max: 2 } }, ...] }

export const DEFAULT_LEVEL_NAMES = ["Faible", "Standard", "Élite"];
export const MAX_LEVELS = 8;
export const MAX_LEVEL_NAME_LENGTH = 40;
export const MAX_SKILLS_PER_LEVEL = 20;
export const MAX_IMPORT_LENGTH = 200000;
export const SCALE_FORMAT = "arcanes-npc-scale";
export const SCALE_VERSION = 1;

// === SECTION HELPER FUNCTIONS ===
const hasText = (value) => typeof value === "string" && value.trim() !== "";
const normalizeText = (text) => String(text).trim().toLocaleLowerCase("fr");
const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

/** Nombre lu dans une valeur de fiche ("12", "12,5"), ou null si ce n'en est pas un. */
export function parseValue(raw) {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const number = Number(raw.trim().replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

function cleanRange(range) {
  if (!isPlainObject(range)) return null;
  const min = parseValue(range.min);
  const max = parseValue(range.max);
  if (min === null || max === null) return null;
  return { min: Math.round(Math.min(min, max)), max: Math.round(Math.max(min, max)) };
}

function cleanSkills(skills) {
  if (!isPlainObject(skills)) return null;
  const min = parseValue(skills.min);
  const max = parseValue(skills.max);
  if (min === null || max === null) return null;
  const clamp = (n) => Math.min(MAX_SKILLS_PER_LEVEL, Math.max(0, Math.round(n)));
  return { min: clamp(Math.min(min, max)), max: clamp(Math.max(min, max)) };
}

/** Quantile avec interpolation linéaire, sur une liste triée non vide. */
function quantile(sorted, q) {
  const position = q * (sorted.length - 1);
  const low = Math.floor(position);
  const high = Math.ceil(position);
  return sorted[low] + (sorted[high] - sorted[low]) * (position - low);
}

const findLevel = (scale, name) =>
  hasText(name) ? scale?.levels?.find((level) => normalizeText(level.name) === normalizeText(name)) : undefined;

// === SECTION SCALE BUILDING ===
/**
 * Nettoie un barème saisi ou importé : niveaux sans nom ou en double ignorés, plages en entiers remises dans l'ordre,
 * limites respectées. Ne lève jamais d'erreur. Avec `characteristicNames`, les plages d'autres caractéristiques sont retirées.
 * @param {unknown} input
 * @param {string[]} [characteristicNames]
 */
export function sanitizeScale(input, characteristicNames) {
  const levels = [];
  const seen = new Set();
  const allowed = Array.isArray(characteristicNames) ? new Set(characteristicNames) : null;
  const source = isPlainObject(input) && Array.isArray(input.levels) ? input.levels : [];
  for (const raw of source) {
    if (!isPlainObject(raw) || !hasText(raw.name)) continue;
    const name = raw.name.replace(/\s+/g, " ").trim();
    const key = normalizeText(name);
    if (name.length > MAX_LEVEL_NAME_LENGTH || seen.has(key)) continue;
    seen.add(key);
    const ranges = {};
    if (isPlainObject(raw.ranges)) {
      for (const [characteristic, range] of Object.entries(raw.ranges)) {
        if (characteristic === "__proto__" || (allowed && !allowed.has(characteristic))) continue;
        const cleaned = cleanRange(range);
        if (cleaned) ranges[characteristic] = cleaned;
      }
    }
    const level = { name, ranges };
    const skills = cleanSkills(raw.skills);
    if (skills) level.skills = skills;
    levels.push(level);
    if (levels.length >= MAX_LEVELS) break;
  }
  return { levels };
}

/** Barème vide, avec les niveaux par défaut, prêt à être rempli par le MJ. */
export const emptyScale = (levelNames = DEFAULT_LEVEL_NAMES) =>
  sanitizeScale({ levels: levelNames.map((name) => ({ name, ranges: {} })) });

/** Vrai si le barème contient au moins une plage exploitable. */
export const hasScale = (scale) => Boolean(scale?.levels?.some((level) => Object.keys(level.ranges || {}).length > 0));

/** Noms des niveaux, dans l'ordre du barème. */
export const levelNames = (scale) => (scale?.levels || []).map((level) => level.name);

/**
 * Dérive un barème des fiches existantes : pour chaque caractéristique, les valeurs observées sont réparties en
 * tranches égales, une par niveau (de la plus basse à la plus haute). Les valeurs non numériques sont ignorées.
 * @param {{ characteristics?: Record<string, { value?: unknown }>, skills?: unknown[] }[]} characters
 * @param {string[]} characteristicNames
 * @param {string[]} [names] noms des niveaux, du plus faible au plus fort
 * @returns {{ scale: object, report: { characters: number, sampleSizes: Record<string, number>, withoutData: string[] } }}
 */
export function deriveScale(characters, characteristicNames, names = DEFAULT_LEVEL_NAMES) {
  const people = Array.isArray(characters) ? characters : [];
  const usable = (names || []).filter(hasText);
  const levelNamesUsed = (usable.length ? usable : DEFAULT_LEVEL_NAMES).slice(0, MAX_LEVELS);
  const levelCount = levelNamesUsed.length;
  const levels = levelNamesUsed.map((name) => ({ name, ranges: {} }));
  const sampleSizes = {};
  const withoutData = [];

  for (const characteristic of characteristicNames || []) {
    if (characteristic === "__proto__") continue;
    const values = people
      .map((person) => parseValue(person?.characteristics?.[characteristic]?.value))
      .filter((value) => value !== null)
      .sort((a, b) => a - b);
    sampleSizes[characteristic] = values.length;
    if (!values.length) {
      withoutData.push(characteristic);
      continue;
    }
    levels.forEach((level, index) => {
      level.ranges[characteristic] = {
        min: quantile(values, index / levelCount),
        max: quantile(values, (index + 1) / levelCount),
      };
    });
  }

  const counts = people.filter((person) => Array.isArray(person?.skills)).map((person) => person.skills.length).sort((a, b) => a - b);
  if (counts.some((count) => count > 0)) {
    levels.forEach((level, index) => {
      level.skills = { min: quantile(counts, index / levelCount), max: quantile(counts, (index + 1) / levelCount) };
    });
  }

  return {
    scale: sanitizeScale({ levels }, characteristicNames),
    report: { characters: people.length, sampleSizes, withoutData },
  };
}

// === SECTION SCALE USE ===
/** Plages d'un niveau au format attendu par `generateNpc` ({ name, min, max }), dans l'ordre des caractéristiques. */
export function rangesForLevel(scale, levelName, characteristicNames) {
  const level = findLevel(scale, levelName);
  if (!level) return [];
  const names = characteristicNames || Object.keys(level.ranges);
  return names.filter((name) => level.ranges[name]).map((name) => ({ name, ...level.ranges[name] }));
}

/** Nombre de compétences d'un niveau ([min, max]), ou undefined s'il n'est pas défini. */
export function skillCountForLevel(scale, levelName) {
  const skills = findLevel(scale, levelName)?.skills;
  return skills ? [skills.min, skills.max] : undefined;
}

// === SECTION BALANCE CHECK ===
const MESSAGES = {
  no_level: () => "Aucun niveau n'est choisi : l'équilibrage ne peut pas être contrôlé.",
  unknown_level: ({ level }) => `Le niveau « ${level} » n'existe pas dans le barème.`,
  missing_value: ({ field }) => `${field} : aucune valeur.`,
  not_numeric: ({ field, value }) => `${field} : « ${value} » n'est pas un nombre, la valeur n'est pas contrôlée.`,
  below_range: ({ field, value, min, max, level }) => `${field} : ${value} est sous la plage du niveau ${level} (${min} à ${max}).`,
  above_range: ({ field, value, min, max, level }) => `${field} : ${value} dépasse la plage du niveau ${level} (${min} à ${max}).`,
  no_range: ({ field, level }) => `${field} : le barème ne définit pas de plage pour le niveau ${level}.`,
  unknown_characteristic: ({ field }) => `${field} n'existe pas dans le modèle de fiche.`,
  skills_low: ({ count, min, max, level }) => `${count} compétence(s) : en dessous de ce qui est attendu pour le niveau ${level} (${min} à ${max}).`,
  skills_high: ({ count, min, max, level }) => `${count} compétence(s) : au-dessus de ce qui est attendu pour le niveau ${level} (${min} à ${max}).`,
  duplicate_skills: ({ skill }) => `La compétence « ${skill} » apparaît plusieurs fois.`,
  better_level: ({ level, suggestedLevel }) => `Les valeurs correspondent mieux au niveau ${suggestedLevel} qu'au niveau ${level}.`,
};

const makeIssue = (code, severity, params = {}) => ({ code, severity, ...params, message: MESSAGES[code](params) });

/**
 * Contrôle la cohérence d'un PNJ avec le barème. Ne bloque jamais : renvoie des avertissements (`warning`) et
 * des remarques (`info`) à afficher.
 * @param {{ level?: string, characteristics?: Record<string, { value?: unknown }>, skills?: { name?: string }[] }} npc
 * @param {{ levels: object[] }} scale
 * @param {string[]} characteristicNames caractéristiques du modèle de fiche
 * @returns {{ ok: boolean, issues: object[], suggestedLevel?: string }}
 */
export function checkNpc(npc, scale, characteristicNames) {
  const issues = [];
  const names = characteristicNames || [];
  const characteristics = isPlainObject(npc?.characteristics) ? npc.characteristics : {};
  const levelName = hasText(npc?.level) ? npc.level.trim() : "";
  const level = findLevel(scale, levelName);
  const hasLevels = Boolean(scale?.levels?.length);

  if (hasLevels) {
    if (!levelName) issues.push(makeIssue("no_level", "info"));
    else if (!level) issues.push(makeIssue("unknown_level", "warning", { level: levelName }));
  }

  const numeric = {};
  for (const field of names) {
    const raw = characteristics[field]?.value;
    const empty = raw === undefined || raw === null || String(raw).trim() === "";
    if (empty) {
      issues.push(makeIssue("missing_value", "warning", { field }));
      continue;
    }
    const value = parseValue(raw);
    if (value === null) {
      issues.push(makeIssue("not_numeric", "info", { field, value: String(raw) }));
      continue;
    }
    numeric[field] = value;
    if (!level) continue;
    const range = level.ranges[field];
    if (!range) issues.push(makeIssue("no_range", "info", { field, level: level.name }));
    else if (value < range.min) issues.push(makeIssue("below_range", "warning", { field, value, ...range, level: level.name }));
    else if (value > range.max) issues.push(makeIssue("above_range", "warning", { field, value, ...range, level: level.name }));
  }

  for (const field of Object.keys(characteristics)) {
    if (!names.includes(field)) issues.push(makeIssue("unknown_characteristic", "info", { field }));
  }

  const skills = Array.isArray(npc?.skills) ? npc.skills : [];
  const seenSkills = new Set();
  for (const skill of skills) {
    if (!hasText(skill?.name)) continue;
    const key = normalizeText(skill.name);
    if (seenSkills.has(key)) {
      if (!issues.some((issue) => issue.code === "duplicate_skills" && normalizeText(issue.skill) === key)) {
        issues.push(makeIssue("duplicate_skills", "warning", { skill: skill.name }));
      }
    }
    seenSkills.add(key);
  }
  if (level?.skills) {
    const count = skills.filter((skill) => hasText(skill?.name)).length;
    if (count < level.skills.min) issues.push(makeIssue("skills_low", "warning", { count, ...level.skills, level: level.name }));
    else if (count > level.skills.max) issues.push(makeIssue("skills_high", "warning", { count, ...level.skills, level: level.name }));
  }

  // Niveau qui irait mieux : celui dont les plages contiennent le plus de valeurs.
  let suggestedLevel;
  if (level && scale.levels.length > 1) {
    const fit = (candidate) => Object.entries(numeric).filter(([field, value]) => {
      const range = candidate.ranges[field];
      return range && value >= range.min && value <= range.max;
    }).length;
    const current = fit(level);
    let best = level;
    let bestScore = current;
    for (const candidate of scale.levels) {
      const score = fit(candidate);
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }
    if (best !== level) {
      suggestedLevel = best.name;
      issues.push(makeIssue("better_level", "warning", { level: level.name, suggestedLevel }));
    }
  }

  const result = { ok: !issues.some((issue) => issue.severity === "warning"), issues };
  if (suggestedLevel) result.suggestedLevel = suggestedLevel;
  return result;
}

// === SECTION IMPORT / EXPORT ===
/** Barème au format JSON d'échange, lisible et réimportable. */
export function exportScale(scale) {
  return JSON.stringify({ format: SCALE_FORMAT, version: SCALE_VERSION, levels: sanitizeScale(scale).levels }, null, 2);
}

/**
 * Lit un barème exporté. Ne lève jamais d'erreur.
 * @param {string} text
 * @param {string[]} [characteristicNames] si fourni, les plages d'autres caractéristiques sont ignorées et signalées
 * @returns {{ ok: true, scale: object, ignoredCharacteristics: string[], missingCharacteristics: string[] }
 *   | { ok: false, error: "too_large" | "invalid_json" | "wrong_format" | "empty" }}
 */
export function parseScaleJson(text, characteristicNames) {
  if (typeof text !== "string" || text.length > MAX_IMPORT_LENGTH) return { ok: false, error: "too_large" };
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "invalid_json" };
  }
  if (!isPlainObject(data) || data.format !== SCALE_FORMAT || data.version !== SCALE_VERSION || !Array.isArray(data.levels)) {
    return { ok: false, error: "wrong_format" };
  }
  const full = sanitizeScale(data);
  if (!full.levels.length) return { ok: false, error: "empty" };
  if (!Array.isArray(characteristicNames)) return { ok: true, scale: full, ignoredCharacteristics: [], missingCharacteristics: [] };

  const used = new Set(full.levels.flatMap((level) => Object.keys(level.ranges)));
  const ignoredCharacteristics = [...used].filter((name) => !characteristicNames.includes(name));
  const missingCharacteristics = characteristicNames.filter((name) => !used.has(name));
  return { ok: true, scale: sanitizeScale(full, characteristicNames), ignoredCharacteristics, missingCharacteristics };
}
