// === SECTION NAME GENERATOR ===
import { NAME_DATA } from "./nameData";
import { createRng } from "./random";
import { hasNameData, resolveTables, uniqueList } from "./generatorTables";

// === SECTION HELPER FUNCTIONS ===
const MAX_NAMES = 20;
const GIVEN_KINDS = ["male", "female", "neutral"];

// Choisit la liste de prénoms à utiliser selon le genre demandé et les listes disponibles.
// "neutral" sans liste de prénoms neutres garde l'ancien comportement : au hasard entre masculin et féminin.
function chooseKind(gender, tables, rng) {
  const available = GIVEN_KINDS.filter((kind) => tables[kind]?.length);
  if (GIVEN_KINDS.includes(gender) && available.includes(gender)) return gender;
  const mixed = gender === "neutral" ? available.filter((kind) => kind !== "neutral") : available;
  return rng.pick(mixed.length ? mixed : available);
}

// === SECTION MAIN FUNCTIONS ===
/** Indique si l'univers (ou les tables du MJ) permet de générer des noms. */
export function canGenerateNames(universeId, generatorData) {
  return hasNameData(resolveTables(universeId, generatorData));
}

/**
 * Génère des noms cohérents avec un univers.
 * `gender` : "male", "female", "neutral" (liste de prénoms neutres du MJ, sinon au hasard) ou "random" (au hasard).
 * @param {{
 *   universeId?: string,
 *   gender?: "male"|"female"|"neutral"|"random",
 *   withFamily?: boolean,
 *   count?: number,
 *   generatorData?: unknown,
 *   tables?: Record<string, string[]>,
 *   rng?: ReturnType<typeof createRng>,
 * }} options
 * @returns {string[]}
 */
export function generateNames({
  universeId,
  gender = "neutral",
  withFamily = true,
  count = 1,
  generatorData,
  tables = resolveTables(universeId, generatorData),
  rng = createRng(),
}) {
  if (!hasNameData(tables)) return [];

  const names = new Set();
  const max = Math.min(Math.max(1, count), MAX_NAMES);
  for (let i = 0; i < max * 10 && names.size < max; i++) {
    const first = rng.pick(tables[chooseKind(gender, tables, rng)]);
    const family = withFamily ? rng.pick(tables.family) : "";
    names.add(family ? `${first} ${family}` : first);
  }
  return [...names];
}

// === SECTION PLACE & ITEM GENERATORS ===
/** Génère des noms de lieux. */
export function generatePlaceNames({ universeId, placeType, count = 3, rng = createRng() }) {
  const data = NAME_DATA[universeId];
  const places = data?.places || NAME_DATA.arcanes?.places;
  if (!places) return [];
  const prefixes = uniqueList(places.prefixes);
  const roots = uniqueList(places.roots);
  const suffixes = uniqueList(places.suffixes);
  const results = [];
  for (let i = 0; i < count; i++) {
    const prefix = rng.chance(0.5) ? rng.pick(prefixes) + " " : "";
    const root = rng.pick(roots);
    const suffix = rng.chance(0.5) ? rng.pick(suffixes) : "";
    let name = `${prefix}${root}${suffix}`;
    if (placeType) {
      name = `${name} (${placeType})`;
    }
    results.push(name);
  }
  return results;
}

/** Génère des noms d'objets/indices. */
export function generateItemNames({ universeId, count = 3, rng = createRng() }) {
  const data = NAME_DATA[universeId];
  const items = data?.items || NAME_DATA.arcanes?.items;
  if (!items) return [];
  const adjectives = uniqueList(items.adjectives);
  const nouns = uniqueList(items.nouns);
  const origins = uniqueList(items.origins);
  const results = [];
  for (let i = 0; i < count; i++) {
    const adj = rng.pick(adjectives);
    const noun = rng.pick(nouns);
    const origin = rng.chance(0.3) ? " " + rng.pick(origins) : "";
    results.push(`${noun} ${adj}${origin}`);
  }
  return results;
}
