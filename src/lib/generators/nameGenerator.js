// === SECTION NAME GENERATOR ===
import { NAME_DATA } from "./nameData";
import { DEFAULT_UNIVERSE } from "@/lib/meta/universeMeta";


// === SECTION HELPER FUNCTIONS ===
const pick = (list) => list[Math.floor(Math.random() * list.length)];

// === SECTION MAIN FUNCTIONS ===
/** Indique si l'univers dispose d'un générateur de noms. */
export function canGenerateNames(universeId) {
  return Boolean(NAME_DATA[universeId || DEFAULT_UNIVERSE]);
}

// === SECTION CAN GENERATE NAMES FUNCTION ===
/**
 * Génère des noms cohérents avec un univers.
 * @param {{ universeId?: string, gender?: "male"|"female"|"neutral", withFamily?: boolean, count?: number }} options
 * @returns {string[]}
 */

export function generateNames({ universeId, gender = "neutral", withFamily = true, count = 1 }) {
  const data = NAME_DATA[universeId || DEFAULT_UNIVERSE];
  if (!data) return [];

  const names = new Set();
  const max = Math.min(count, 5);
  for (let i = 0; i < 50 && names.size < max; i++) {
    const kind = gender === "neutral" ? pick(["male", "female"]) : gender;
    const first = pick(data[kind] || data.male);
    names.add(withFamily ? `${first} ${pick(data.family)}` : first);
  }
  return [...names];
}

// === SECTION PLACE & ITEM GENERATORS ===
/** Génère des noms de lieux. */
export function generatePlaceNames({ universeId, placeType, count = 3 }) {
  const data = NAME_DATA[universeId];
  const places = data?.places || NAME_DATA.arcanes?.places;
  if (!places) return [];
  const results = [];
  for (let i = 0; i < count; i++) {
    const prefix = Math.random() > 0.5 ? pick(places.prefixes) + " " : "";
    const root = pick(places.roots);
    const suffix = Math.random() > 0.5 ? pick(places.suffixes) : "";
    let name = `${prefix}${root}${suffix}`;
    if (placeType) {
      name = `${name} (${placeType})`;
    }
    results.push(name);
  }
  return results;
}
/** Génère des noms d'objets/indices. */
export function generateItemNames({ universeId, count = 3 }) {
  const data = NAME_DATA[universeId];
  const items = data?.items || NAME_DATA.arcanes?.items;
  if (!items) return [];
  const results = [];
  for (let i = 0; i < count; i++) {
    const adj = pick(items.adjectives);
    const noun = pick(items.nouns);
    const origin = Math.random() > 0.7 ? " " + pick(items.origins) : "";
    results.push(`${noun} ${adj}${origin}`);
  }
  return results;
}

