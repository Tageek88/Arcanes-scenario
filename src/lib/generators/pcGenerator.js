// === SECTION PC GENERATOR ===
// Compose un personnage joueur : nom, caractéristiques, compétences, équipement.
// Fonction pure : aucun accès à la base ni à l'interface. Les valeurs viennent des plages du barème des PJ
// fournies par l'appelant ; le même tirage de graine donne toujours le même personnage.

import { createRng, newSeed } from "./random";
import { resolveTables } from "./generatorTables";
import { generateNames } from "./nameGenerator";

const GENDERS = ["male", "female", "neutral"];

/** Rubriques d'une fiche de PJ que le MJ peut verrouiller pour les garder lors d'un nouveau tirage. */
export const PC_LOCKABLE_FIELDS = ["name", "characteristics", "skills", "equipment"];

const hasText = (value) => typeof value === "string" && value.trim() !== "";
const toCount = (value, fallback) => (Number.isFinite(Number(value)) ? Math.round(Number(value)) : fallback);
const asRange = (value) => (Array.isArray(value) ? value : [value, value]);

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

/** Liste sans doublon de nom (casse ignorée) ni entrée sans nom. */
function uniqueByName(list) {
  const seen = new Set();
  return (Array.isArray(list) ? list : []).filter((item) => {
    if (!item || !hasText(item.name)) return false;
    const key = item.name.trim().toLocaleLowerCase("fr");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Génère un personnage joueur.
 * @param {{
 *   universeId?: string, generatorData?: unknown, seed?: number | string,
 *   gender?: "male"|"female"|"neutral"|"random", withFamily?: boolean,
 *   ranges?: { name: string, min: number, max: number }[], fieldNames?: Record<string, string[]>,
 *   skillPool?: { name: string, roll_modifier?: string }[], skillCount?: number | [number, number],
 *   equipmentPool?: { name: string, type?: string, fieldNames?: string[] }[], equipmentCount?: number | [number, number],
 *   keep?: Partial<{ name: string, characteristics: Record<string, unknown>, skills: unknown[], equipment: unknown[] }>,
 * }} options `keep` : rubriques à conserver telles quelles (verrous du MJ), non régénérées.
 * @returns {{ seed: number | string, pc: { name: string, characteristics: object, skills: object[], equipment: object[] }, warnings: string[] }}
 */
export function generatePc({
  universeId,
  generatorData,
  seed,
  gender = "random",
  withFamily = true,
  ranges,
  fieldNames,
  skillPool,
  skillCount = [2, 4],
  equipmentPool,
  equipmentCount = [1, 3],
  keep = {},
}) {
  const usedSeed = seed === undefined || seed === null ? newSeed() : seed;
  const rng = createRng(usedSeed);
  const tables = resolveTables(universeId, generatorData);
  const warnings = [];

  // Chaque rubrique est tirée dans un ordre fixe, y compris verrouillée : deux tirages de même graine restent
  // comparables rubrique par rubrique quand le MJ verrouille ou déverrouille un champ.
  const kinds = ["male", "female", ...(tables.neutral.length ? ["neutral"] : [])];
  const nameGender = GENDERS.includes(gender) ? gender : rng.pick(kinds);
  const drawnName = generateNames({ gender: nameGender, withFamily, count: 1, tables, rng })[0] || "";
  const name = hasText(keep.name) ? keep.name : drawnName;
  if (!name) warnings.push("names");

  const drawnCharacteristics = {};
  for (const range of cleanRanges(ranges)) {
    const optional = Array.isArray(fieldNames?.[range.name]) ? fieldNames[range.name] : [];
    drawnCharacteristics[range.name] = {
      value: String(rng.int(range.min, range.max)),
      fields: optional.filter(hasText).map((fieldName) => ({ name: fieldName, value: "" })),
    };
  }
  const characteristics =
    keep.characteristics && typeof keep.characteristics === "object" ? keep.characteristics : drawnCharacteristics;

  const [minSkills, maxSkills] = asRange(skillCount);
  const skillsWanted = Math.max(0, rng.int(toCount(minSkills, 2), toCount(maxSkills, 4)));
  const drawnSkills = rng
    .shuffle(uniqueByName(skillPool))
    .slice(0, skillsWanted)
    .map((skill) => ({ name: skill.name, roll_modifier: skill.roll_modifier || "", fields: [] }));
  const skills = Array.isArray(keep.skills) ? keep.skills : drawnSkills;

  const [minItems, maxItems] = asRange(equipmentCount);
  const itemsWanted = Math.max(0, rng.int(toCount(minItems, 1), toCount(maxItems, 3)));
  const drawnEquipment = rng
    .shuffle(uniqueByName(equipmentPool))
    .slice(0, itemsWanted)
    .map((item) => ({
      name: item.name,
      type: item.type || "",
      fields: (Array.isArray(item.fieldNames) ? item.fieldNames : []).filter(hasText).map((fieldName) => ({ name: fieldName, value: "" })),
    }));
  const equipment = Array.isArray(keep.equipment) ? keep.equipment : drawnEquipment;

  return { seed: usedSeed, pc: { name, characteristics, skills, equipment }, warnings };
}
