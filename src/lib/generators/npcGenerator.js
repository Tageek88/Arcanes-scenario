// === SECTION NPC GENERATOR ===
// Compose la fiche d'un PNJ à partir des tables de l'univers (et de celles du MJ).
// Fonction pure : aucun accès à la base ni à l'interface. Les valeurs de caractéristiques viennent des plages
// fournies par l'appelant (le barème, voir le lot suivant) ; sans plages, la fiche ne contient pas de caractéristiques.

import { createRng, newSeed } from "./random";
import { resolveTables } from "./generatorTables";
import { generateNames } from "./nameGenerator";

export const NPC_ATTITUDES = ["allie", "neutre", "hostile"];
export const NPC_GENDERS = ["male", "female", "neutral"];
const ATTITUDE_WEIGHTS = { allie: 0.25, neutre: 0.5, hostile: 0.25 };
const MAX_TRAITS = 5;

// === SECTION HELPER FUNCTIONS ===
const hasText = (value) => typeof value === "string" && value.trim() !== "";

function pickAttitude(rng) {
  const roll = rng.next();
  if (roll < ATTITUDE_WEIGHTS.allie) return "allie";
  if (roll < ATTITUDE_WEIGHTS.allie + ATTITUDE_WEIGHTS.neutre) return "neutre";
  return "hostile";
}

function pickGender(requested, tables, rng) {
  if (NPC_GENDERS.includes(requested)) return requested;
  const kinds = ["male", "female"];
  if (tables.neutral.length) kinds.push("neutral");
  return rng.pick(kinds);
}

/** Plages valides { name, min, max } : entiers, bornes remises dans l'ordre, entrées invalides ignorées. */
function cleanRanges(ranges) {
  if (!Array.isArray(ranges)) return [];
  const result = [];
  for (const range of ranges) {
    if (!range || !hasText(range.name)) continue;
    const min = Number(range.min);
    const max = Number(range.max);
    if (!Number.isFinite(min) || !Number.isFinite(max)) continue;
    result.push({ name: range.name, min: Math.round(Math.min(min, max)), max: Math.round(Math.max(min, max)) });
  }
  return result;
}

/** Entier borné, avec repli si la valeur n'est pas un nombre. */
const toCount = (value, fallback) => (Number.isFinite(Number(value)) ? Math.round(Number(value)) : fallback);

/** Texte de présentation à partir des éléments choisis (une ligne par rubrique renseignée). */
export function composeDescription({ role, traits, motivation, appearance }) {
  const lines = [];
  if (hasText(role)) lines.push(role);
  if (traits?.length) lines.push(`Caractère : ${traits.join(", ")}.`);
  if (hasText(motivation)) lines.push(`Motivation : ${motivation}.`);
  if (hasText(appearance)) lines.push(`Signe distinctif : ${appearance}.`);
  return lines.join("\n");
}

// === SECTION MAIN FUNCTION ===
/**
 * Génère un PNJ.
 * @param {{
 *   universeId?: string,
 *   generatorData?: unknown,
 *   seed?: number | string,
 *   gender?: "male"|"female"|"neutral"|"random",
 *   withFamily?: boolean,
 *   level?: string,
 *   levels?: string[],
 *   traitCount?: number | [number, number],
 *   ranges?: { name: string, min: number, max: number }[],
 *   fieldNames?: Record<string, string[]>,
 *   skillPool?: { name: string, roll_modifier?: string }[],
 *   skillCount?: number | [number, number],
 *   keep?: Partial<{ name: string, gender: string, role: string, level: string, attitude: string,
 *     traits: string[], motivation: string, appearance: string,
 *     characteristics: Record<string, unknown>, skills: unknown[] }>,
 * }} options `keep` : rubriques à conserver telles quelles (verrous du MJ), non régénérées.
 * @returns {{ seed: number | string, npc: object, warnings: string[] }}
 */
export function generateNpc({
  universeId,
  generatorData,
  seed,
  gender = "random",
  withFamily = true,
  level,
  levels,
  traitCount = [2, 3],
  ranges,
  fieldNames,
  skillPool,
  skillCount = [2, 4],
  keep = {},
}) {
  const usedSeed = seed === undefined || seed === null ? newSeed() : seed;
  const rng = createRng(usedSeed);
  const tables = resolveTables(universeId, generatorData);
  const warnings = [];

  // Chaque rubrique est tirée dans un ordre fixe, y compris verrouillée, pour que deux tirages de même graine
  // restent comparables rubrique par rubrique quand le MJ verrouille ou déverrouille un champ.
  const drawnGender = pickGender(gender, tables, rng);
  const npcGender = NPC_GENDERS.includes(keep.gender) ? keep.gender : drawnGender;

  const drawnName = generateNames({ gender: npcGender, withFamily, count: 1, tables, rng })[0] || "";
  const name = hasText(keep.name) ? keep.name : drawnName;
  if (!name) warnings.push("names");

  const drawnRole = rng.pick(tables.roles) || "";
  const role = hasText(keep.role) ? keep.role : drawnRole;
  if (!role) warnings.push("roles");

  const drawnLevel = rng.pick((levels || []).filter(hasText)) || "";
  const npcLevel = hasText(keep.level) ? keep.level : hasText(level) ? level : drawnLevel;

  const [minTraits, maxTraits] = Array.isArray(traitCount) ? traitCount : [traitCount, traitCount];
  const wanted = Math.min(MAX_TRAITS, Math.max(0, rng.int(toCount(minTraits, 2), toCount(maxTraits, 3))));
  const drawnTraits = rng.shuffle(tables.traits).slice(0, wanted);
  const traits = Array.isArray(keep.traits) ? keep.traits.filter(hasText) : drawnTraits;
  if (wanted > 0 && !traits.length) warnings.push("traits");

  const drawnMotivation = rng.pick(tables.motivations) || "";
  const motivation = hasText(keep.motivation) ? keep.motivation : drawnMotivation;
  if (!motivation) warnings.push("motivations");

  const drawnAppearance = rng.pick(tables.appearances) || "";
  const appearance = hasText(keep.appearance) ? keep.appearance : drawnAppearance;
  if (!appearance) warnings.push("appearances");

  const drawnAttitude = pickAttitude(rng);
  const attitude = NPC_ATTITUDES.includes(keep.attitude) ? keep.attitude : drawnAttitude;

  const drawnCharacteristics = {};
  for (const range of cleanRanges(ranges)) {
    // Même forme que les fiches de personnage : la valeur, plus les champs facultatifs proposés par le modèle (vides).
    const optional = Array.isArray(fieldNames?.[range.name]) ? fieldNames[range.name] : [];
    drawnCharacteristics[range.name] = {
      value: String(rng.int(range.min, range.max)),
      fields: optional.filter(hasText).map((name) => ({ name, value: "" })),
    };
  }
  const characteristics =
    keep.characteristics && typeof keep.characteristics === "object" ? keep.characteristics : drawnCharacteristics;

  const pool = (Array.isArray(skillPool) ? skillPool : []).filter((skill) => skill && hasText(skill.name));
  const [minSkills, maxSkills] = Array.isArray(skillCount) ? skillCount : [skillCount, skillCount];
  const skillsWanted = Math.max(0, rng.int(toCount(minSkills, 2), toCount(maxSkills, 4)));
  const drawnSkills = rng
    .shuffle(pool)
    .slice(0, skillsWanted)
    .map((skill) => ({ name: skill.name, roll_modifier: skill.roll_modifier || "", fields: [] }));
  const skills = Array.isArray(keep.skills) ? keep.skills : drawnSkills;

  const npc = {
    name,
    gender: npcGender,
    role,
    level: npcLevel,
    attitude,
    traits,
    motivation,
    appearance,
    characteristics,
    skills,
  };
  return { seed: usedSeed, npc, warnings };
}
