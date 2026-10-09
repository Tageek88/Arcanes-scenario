import { NAME_DATA } from "./nameData";
import { DEFAULT_UNIVERSE } from "./universeMeta";

const pick = (list) => list[Math.floor(Math.random() * list.length)];

/** Indique si l'univers dispose d'un générateur de noms. */
export function canGenerateNames(universeId) {
  return Boolean(NAME_DATA[universeId || DEFAULT_UNIVERSE]);
}

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
