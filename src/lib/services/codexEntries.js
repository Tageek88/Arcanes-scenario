import { api } from "@/api/localClient";
import { addSheetItemsToCatalog } from "@/lib/services/gameCatalog";

/**
 * Crée ou met à jour une fiche du Codex (PNJ, lieu ou indice).
 * @param {string} entity nom de l'entité (NPC, Location, Clue)
 * @param {string | undefined} id identifiant de la fiche à modifier ; absent pour une création
 * @param {object} payload champs à enregistrer
 * Pour un PNJ, les compétences et équipements de sa fiche qui manquent au catalogue du système de jeu y sont ajoutés
 * (un échec ne fait pas échouer l'enregistrement du PNJ).
 * @returns {Promise<any | null>} la fiche créée, ou null s'il s'agissait d'une modification
 */
export async function saveCodexEntry(entity, id, payload) {
  let created = null;
  if (id) await api.entities[entity].update(id, payload);
  else created = await api.entities[entity].create(payload);
  if (entity === "NPC") {
    try {
      await addSheetItemsToCatalog(payload.campaign_id, { skills: payload.skills, equipment: payload.equipment });
    } catch (error) {
      console.warn("Catalogue du système de jeu non mis à jour :", error);
    }
  }
  return created;
}
