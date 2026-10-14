import { api } from "@/api/localClient";

/**
 * Crée ou met à jour une fiche du Codex (PNJ, lieu ou indice).
 * @param {string} entity nom de l'entité (NPC, Location, Clue)
 * @param {string | undefined} id identifiant de la fiche à modifier ; absent pour une création
 * @param {object} payload champs à enregistrer
 * @returns {Promise<any | null>} la fiche créée, ou null s'il s'agissait d'une modification
 */
export async function saveCodexEntry(entity, id, payload) {
  if (id) {
    await api.entities[entity].update(id, payload);
    return null;
  }
  return api.entities[entity].create(payload);
}
