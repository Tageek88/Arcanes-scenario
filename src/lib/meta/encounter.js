// === SECTION RENCONTRE ===
// Suivi d'une rencontre (initiative, points de vie, tour de jeu, round) : une ligne de la table `Encounter`.
// Fonctions pures, sans accès aux données : chaque changement prend une rencontre propre (`cleanEncounter`) et en renvoie une nouvelle.
//
// Un combattant : { id, name, initiative, hp, hp_max }. `initiative` vaut null tant qu'elle n'est pas saisie (il passe en dernier).
// `hp_max` vaut null quand les PV ne sont pas suivis (alors `hp` vaut null aussi). Un combattant à 0 PV est « à terre » :
// il reste dans l'ordre et garde son tour (l'interface le grise), il n'est jamais retiré ni sauté.

export const ENCOUNTER_LIMITS = {
  title: 80,
  name: 80,
  combatants: 60,
  hp: 9999,
  initiative: 999,
  round: 9999,
};

export const DEFAULT_ENCOUNTER_TITLE = "Rencontre";
export const DEFAULT_COMBATANT_NAME = "Combattant";

const MIN_INITIATIVE = -99;

// Entier borné ; null pour une valeur vide ou qui n'est pas un nombre.
const toInt = (value, min, max) => {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const number = Math.trunc(Number(value));
  if (!Number.isFinite(number)) return null;
  return Math.min(max, Math.max(min, number));
};

const text = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/** Titre propre : borné, « Rencontre » s'il est vide. */
export const cleanTitle = (value) => text(value, ENCOUNTER_LIMITS.title) || DEFAULT_ENCOUNTER_TITLE;

/**
 * Combattant propre, ou null s'il n'a pas d'identifiant. Accepte n'importe quelle valeur.
 * PV max à 0 ou vide = PV non suivis ; PV courants bornés entre 0 et le max (le max s'il manque).
 */
export function cleanCombatant(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  if (typeof source.id !== "string" || !source.id) return null;
  let hpMax = toInt(source.hp_max, 0, ENCOUNTER_LIMITS.hp);
  if (hpMax === 0) hpMax = null;
  const hp = hpMax === null ? null : (toInt(source.hp, 0, hpMax) ?? hpMax);
  return {
    id: source.id,
    name: text(source.name, ENCOUNTER_LIMITS.name) || DEFAULT_COMBATANT_NAME,
    initiative: toInt(source.initiative, MIN_INITIATIVE, ENCOUNTER_LIMITS.initiative),
    hp,
    hp_max: hpMax,
  };
}

/**
 * Rencontre propre : combattants valides sans doublon (60 au plus), round d'au moins 1,
 * combattant actif remis à null s'il n'existe plus. Accepte n'importe quelle valeur.
 */
export function cleanEncounter(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const seen = new Set();
  const combatants = [];
  for (const item of Array.isArray(source.combatants) ? source.combatants : []) {
    if (combatants.length >= ENCOUNTER_LIMITS.combatants) break;
    const combatant = cleanCombatant(item);
    if (!combatant || seen.has(combatant.id)) continue;
    seen.add(combatant.id);
    combatants.push(combatant);
  }
  return {
    id: typeof source.id === "string" ? source.id : "",
    campaign_id: typeof source.campaign_id === "string" ? source.campaign_id : "",
    title: cleanTitle(source.title),
    round: toInt(source.round, 1, ENCOUNTER_LIMITS.round) ?? 1,
    combatants,
    active_id: seen.has(source.active_id) ? source.active_id : null,
  };
}

/** Ordre de jeu : initiative décroissante, sans initiative en dernier, égalités dans l'ordre d'ajout. Ne modifie pas la liste. */
export function sortCombatants(list) {
  return (Array.isArray(list) ? list : [])
    .map((combatant, index) => ({ combatant, index }))
    .sort((a, b) => {
      const first = a.combatant.initiative;
      const second = b.combatant.initiative;
      if (first === null && second === null) return a.index - b.index;
      if (first === null) return 1;
      if (second === null) return -1;
      return second - first || a.index - b.index;
    })
    .map(({ combatant }) => combatant);
}

/** À terre : PV suivis et tombés à 0. */
export const isDown = (combatant) => combatant?.hp_max != null && combatant.hp <= 0;

/** Le combattant dont c'est le tour, ou null. */
export const activeCombatant = (encounter) => encounter.combatants.find((combatant) => combatant.id === encounter.active_id) || null;

/** Ajoute un combattant (`raw.id` obligatoire). Sans effet au-delà de la limite ou si l'identifiant existe déjà. */
export function addCombatant(encounter, raw) {
  if (encounter.combatants.length >= ENCOUNTER_LIMITS.combatants) return encounter;
  const combatant = cleanCombatant(raw);
  if (!combatant || encounter.combatants.some((item) => item.id === combatant.id)) return encounter;
  return { ...encounter, combatants: [...encounter.combatants, combatant] };
}

/**
 * Modifie des champs d'un combattant (name, initiative, hp, hp_max), puis le nettoie.
 * Si le PV max change, les PV courants restent, bornés au nouveau max ; sans PV max auparavant, ils valent le nouveau max.
 */
export function updateCombatant(encounter, id, patch) {
  return {
    ...encounter,
    combatants: encounter.combatants.map((combatant) => (combatant.id === id ? cleanCombatant({ ...combatant, ...patch, id }) : combatant)),
  };
}

/** Retire des PV (delta négatif) ou en rend (delta positif), entre 0 et le PV max. Sans effet si les PV ne sont pas suivis. */
export function adjustHp(encounter, id, delta) {
  const combatant = encounter.combatants.find((item) => item.id === id);
  if (!combatant || combatant.hp_max === null) return encounter;
  const step = toInt(delta, -ENCOUNTER_LIMITS.hp, ENCOUNTER_LIMITS.hp);
  if (step === null) return encounter;
  return updateCombatant(encounter, id, { hp: combatant.hp + step });
}

/**
 * Retire un combattant. Si c'était le tour de celui-ci, la main passe au suivant dans l'ordre de jeu
 * (le premier s'il était le dernier, sans changer de round) ; plus personne : pas de combattant actif.
 */
export function removeCombatant(encounter, id) {
  const order = sortCombatants(encounter.combatants);
  const index = order.findIndex((combatant) => combatant.id === id);
  if (index === -1) return encounter;
  const remaining = order.filter((combatant) => combatant.id !== id);
  let activeId = encounter.active_id;
  if (activeId === id) activeId = remaining.length > 0 ? remaining[index % remaining.length].id : null;
  return { ...encounter, combatants: encounter.combatants.filter((combatant) => combatant.id !== id), active_id: activeId };
}

/** Donne la main à un combattant (sans effet s'il n'existe pas). */
export function setActive(encounter, id) {
  if (!encounter.combatants.some((combatant) => combatant.id === id)) return encounter;
  return { ...encounter, active_id: id };
}

/**
 * Tour suivant : le premier de l'ordre de jeu quand personne n'a encore la main (le round ne change pas), sinon le suivant ;
 * après le dernier, retour au premier et round + 1. Les combattants à terre gardent leur tour.
 */
export function nextTurn(encounter) {
  const order = sortCombatants(encounter.combatants);
  if (order.length === 0) return encounter;
  const index = order.findIndex((combatant) => combatant.id === encounter.active_id);
  if (index === -1) return { ...encounter, active_id: order[0].id };
  const next = (index + 1) % order.length;
  return {
    ...encounter,
    active_id: order[next].id,
    round: next === 0 ? Math.min(encounter.round + 1, ENCOUNTER_LIMITS.round) : encounter.round,
  };
}

/** Retour au round 1, personne n'a la main. Combattants, initiatives et PV ne changent pas. */
export const resetEncounter = (encounter) => ({ ...encounter, round: 1, active_id: null });

export const renameEncounter = (encounter, title) => ({ ...encounter, title: cleanTitle(title) });
