// === SECTION SCALE DRAFT ===
// Passage entre le barème enregistré et le brouillon de l'éditeur de modèle.
// Dans le brouillon, les plages sont rangées par clé stable de caractéristique (`_key`) et saisies en texte :
// renommer une caractéristique pendant l'édition ne perd donc pas ses plages.

const text = (value) => (value === undefined || value === null ? "" : String(value));

/**
 * Brouillon à partir d'un barème.
 * @param {{ levels?: any[] } | undefined} scale
 * @param {{ _key: string, name: string }[]} items caractéristiques du brouillon
 */
export function scaleToDraft(scale, items) {
  return (scale?.levels || []).map((level) => {
    const ranges = {};
    for (const item of items) {
      const range = level.ranges?.[item.name];
      if (range) ranges[item._key] = { min: text(range.min), max: text(range.max) };
    }
    return {
      name: text(level.name),
      ranges,
      skills: level.skills ? { min: text(level.skills.min), max: text(level.skills.max) } : { min: "", max: "" },
    };
  });
}

/**
 * Barème (à nettoyer ensuite avec `sanitizeScale`) à partir du brouillon : les noms de caractéristiques sont ceux
 * du brouillon, sans espaces autour ; les plages à moitié saisies sont abandonnées par le nettoyage.
 */
export function draftToScale(levels, items) {
  return {
    levels: (levels || []).map((level) => {
      const ranges = {};
      for (const item of items) {
        const name = text(item.name).trim();
        const range = level.ranges?.[item._key];
        if (name && range) ranges[name] = { min: range.min, max: range.max };
      }
      const skills = level.skills && (text(level.skills.min).trim() || text(level.skills.max).trim()) ? level.skills : undefined;
      return { name: level.name, ranges, ...(skills ? { skills } : {}) };
    }),
  };
}

/** Noms de niveaux en double (sans tenir compte de la casse) ou vides : le nettoyage les ignorerait. */
export function levelNameProblems(levels) {
  const seen = new Set();
  let duplicates = false;
  let empty = false;
  for (const level of levels || []) {
    const key = text(level.name).trim().toLocaleLowerCase("fr");
    if (!key) empty = true;
    else if (seen.has(key)) duplicates = true;
    seen.add(key);
  }
  return { duplicates, empty };
}
