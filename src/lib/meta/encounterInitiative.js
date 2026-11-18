// Initiative des rencontres lancée avec les dés du système : règles pures (aucun accès aux données ni au navigateur).
//
// Le jet part d'une caractéristique du modèle de fiche (par défaut celle qui s'appelle « Initiative », ce qu'a D&D 5 ; Metro n'en a pas :
// l'initiative reste alors à saisir à la main). Il utilise les dés et les réglages du système, comme le bouton de lancer des fiches
// (buildRollRequest / evaluateRoll), et donne un entier qu'on range dans `initiative` du combattant. Le MJ peut toujours la corriger.

import { evaluateRoll } from "@/lib/meta/dice";
import { buildRollRequest } from "@/lib/meta/rollRequest";

/** Choix « la caractéristique s'appelle Initiative » (sélecteur) et choix « saisie à la main ». */
export const INITIATIVE_AUTO = "__auto__";
export const INITIATIVE_MANUAL = "__manual__";

const plain = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

/** La caractéristique nommée « Initiative » (sans tenir compte des accents ni de la casse), ou "". */
export function findInitiativeStat(characteristics) {
  return (Array.isArray(characteristics) ? characteristics : []).find((name) => plain(name) === "initiative") || "";
}

/**
 * La caractéristique qui sert au jet, d'après le choix du MJ ("" ou INITIATIVE_AUTO : celle nommée « Initiative »,
 * INITIATIVE_MANUAL : aucune, un nom du modèle : celui-là). "" si rien ne convient : pas de bouton de lancer.
 */
export function initiativeStat(choice, characteristics) {
  const names = Array.isArray(characteristics) ? characteristics : [];
  if (choice === INITIATIVE_MANUAL) return "";
  if (choice && choice !== INITIATIVE_AUTO && names.includes(choice)) return choice;
  return findInitiativeStat(names);
}

/**
 * L'initiative qui sort d'un jet (`evaluateRoll`) : plus haut passe avant. « dé + valeur » et réserve de dés : le total (ou les réussites) ;
 * « sous la valeur » (plus bas est mieux) : la marge, cible moins jet.
 */
export function initiativeFromRoll(result) {
  if (!result) return null;
  const value = result.rule === "under" ? result.target - result.sum : result.total;
  return Number.isFinite(value) ? Math.round(value) : null;
}

const signed = (n) => (n < 0 ? `− ${Math.abs(n)}` : `+ ${n}`);

/** « Garde 1 : 14 (11 + 3) » : le résultat d'un jet, en une ligne lisible. */
export function describeInitiativeRoll(name, result) {
  const value = initiativeFromRoll(result);
  if (value === null) return `${name} : —`;
  if (result.rule === "pool") return `${name} : ${value} réussite${value > 1 ? "s" : ""} (${result.rolls.join(" · ")})`;
  const dice = result.rolls.join(" + ");
  if (result.rule === "under") return `${name} : marge ${value} (jet ${result.sum}, cible ${result.target})`;
  const parts = [dice];
  if (result.value !== 0) parts.push(signed(result.value));
  if (result.bonus !== 0) parts.push(signed(result.bonus));
  return `${name} : ${value} (${parts.join(" ")})`;
}

/** La fiche (PNJ ou personnage allégé) d'un combattant venu d'une fiche, ou null (combattant saisi à la main). */
export function sheetOfCombatant(combatant, sources) {
  const source = combatant?.source;
  if (!source) return null;
  const list = source.kind === "npc" ? sources?.npcs : sources?.characters;
  return (Array.isArray(list) ? list : []).find((item) => item.id === source.id) || null;
}

/**
 * Lance l'initiative de chaque combattant de `combatants` avec la caractéristique `characteristic`.
 * `setup` vient de useRollSetup ({ dice, links, parents, modifiers }), `sources` de useEncounterSources.
 * Un combattant sans fiche lance avec la valeur 0. Rien n'est lancé sans caractéristique ni réglage de dés.
 * @returns {{ values: Record<string, number>, lines: string[], rolled: number }} `values` : identifiant du combattant -> initiative
 */
export function rollCombatants(combatants, sources, setup, characteristic, rng = Math.random) {
  const values = {};
  const lines = [];
  if (!characteristic) return { values, lines, rolled: 0 };
  for (const combatant of Array.isArray(combatants) ? combatants : []) {
    const request = buildRollRequest({ setup, sheet: sheetOfCombatant(combatant, sources), characteristic });
    if (!request) continue;
    const result = evaluateRoll({ config: request.config, die: request.spec.die, value: request.value, bonus: request.bonus, rng });
    const value = initiativeFromRoll(result);
    if (value === null) continue;
    values[combatant.id] = value;
    lines.push(describeInitiativeRoll(combatant.name, result));
  }
  return { values, lines, rolled: Object.keys(values).length };
}
