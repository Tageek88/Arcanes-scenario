// === SECTION RENCONTRES : ENREGISTREMENT ===
// Rencontres d'une campagne (table `Encounter`). Les règles sont dans `lib/meta/encounter.js` (fonctions pures).
// Les écritures sont silencieuses : l'écran des rencontres garde son propre état, et les autres écrans n'ont pas
// à se recharger à chaque point de vie. La sauvegarde automatique, elle, suit quand même (crochets Dexie).
import { api, db } from "@/api/localClient";
import { cleanEncounter, cleanTitle } from "@/lib/meta/encounter";

const ENTITY = "Encounter";
const LIMIT = 500;

/** Rencontres d'une campagne, les plus anciennes d'abord, déjà nettoyées. */
export async function listEncounters(campaignId) {
  if (!campaignId) return [];
  const res = await api.entities[ENTITY].filter({ campaign_id: campaignId }, { sort: "created_date", limit: LIMIT });
  return res.items.map(cleanEncounter);
}

/** Crée une rencontre vide (round 1, aucun combattant). */
export async function createEncounter(campaignId, title) {
  if (!campaignId) throw new Error("Campagne introuvable.");
  const row = await api.entities[ENTITY].create(
    { campaign_id: campaignId, title: cleanTitle(title), round: 1, active_id: null, combatants: [] },
    { silent: true }
  );
  return cleanEncounter(row);
}

/**
 * Applique `change` (une fonction pure de `lib/meta/encounter.js` : rencontre propre -> rencontre) à la rencontre enregistrée.
 * La ligne est relue dans la même transaction que l'écriture : deux changements simultanés s'additionnent
 * (deux « -1 PV » donnent -2) au lieu de s'écraser. Seuls titre, round, combattant actif et combattants sont écrits.
 * @param {string} id
 * @param {(encounter: any) => any} change
 */
export function updateEncounter(id, change) {
  return db.transaction("rw", [ENTITY], async () => {
    const row = await api.entities[ENTITY].get(id);
    const next = cleanEncounter(change(cleanEncounter(row)));
    await api.entities[ENTITY].update(
      id,
      { title: next.title, round: next.round, active_id: next.active_id, combatants: next.combatants },
      { silent: true }
    );
    return next;
  });
}

/** Supprime une rencontre (copiée dans la corbeille pendant 30 jours). */
export async function deleteEncounter(id) {
  await api.entities[ENTITY].delete(id, { silent: true });
}
