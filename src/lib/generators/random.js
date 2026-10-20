// === SECTION SEEDED RANDOM ===
// Générateur pseudo-aléatoire à graine (mulberry32) : une même graine donne toujours la même suite de tirages.
// Sans graine, on utilise Math.random. Les fonctions de génération reçoivent un `rng` pour rester testables.

/** Transforme une graine (nombre ou texte) en entier non signé de 32 bits (FNV-1a). */
function hashSeed(seed) {
  const text = String(seed);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(initial) {
  let state = initial >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Crée un générateur aléatoire.
 * @param {number | string} [seed] graine ; absente, le générateur n'est pas reproductible
 * @returns {{
 *   next: () => number,
 *   int: (min: number, max: number) => number,
 *   pick: <T>(list: T[]) => T | undefined,
 *   chance: (probability: number) => boolean,
 *   shuffle: <T>(list: T[]) => T[],
 * }}
 */
export function createRng(seed) {
  const next = seed === undefined || seed === null ? Math.random : mulberry32(hashSeed(seed));
  return {
    /** Nombre dans [0, 1). */
    next,
    /** Entier dans [min, max], bornes comprises. */
    int: (min, max) => {
      const low = Math.ceil(Math.min(min, max));
      const high = Math.floor(Math.max(min, max));
      return low + Math.floor(next() * (high - low + 1));
    },
    /** Un élément de la liste, ou undefined si elle est vide. */
    pick: (list) => (list && list.length ? list[Math.floor(next() * list.length)] : undefined),
    /** Vrai avec la probabilité donnée (0 à 1). */
    chance: (probability) => next() < probability,
    /** Copie mélangée de la liste (la liste d'origine n'est pas modifiée). */
    shuffle: (list) => {
      const copy = [...list];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
}

/** Graine entière aléatoire, à afficher ou à enregistrer pour rejouer un tirage. */
export const newSeed = () => Math.floor(Math.random() * 4294967296);
