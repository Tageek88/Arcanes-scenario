import { api } from "@/api/localClient";
import { loadRelations } from "@/lib/services/npcRelations";
import { loadSheetBackground } from "@/lib/services/sheetBackgroundStore";

const LIMIT = 5000;

/**
 * Charge tout le contenu d'une campagne nécessaire à l'impression et à l'export PDF.
 * Le résultat est le modèle de données attendu par `buildTrees` et `buildPrintModel`.
 * @param {string} campaignId
 */
export async function loadPrintData(campaignId) {
  const list = (entity) => api.entities[entity].filter({ campaign_id: campaignId }, { limit: LIMIT });
  const [campaign, quests, acts, scenes, npcs, locations, clues, notes, tables, sessions, characters, models, relations, sheetPages] =
    await Promise.all([
      api.entities.Campaign.get(campaignId).catch(() => null),
      list("Quest"),
      list("Act"),
      list("Scene"),
      list("NPC"),
      list("Location"),
      list("Clue"),
      list("Note"),
      list("RollTable"),
      list("GameSession"),
      list("GameCharacter"),
      api.entities.GameSheetModel.filter({ campaign_id: campaignId }, { limit: 1 }),
      loadRelations(campaignId),
      // Fond de la feuille de personnage : sans lui (ou en cas d'erreur), l'impression reste celle par liste.
      loadSheetBackground(campaignId).catch(() => []),
    ]);
  return {
    campaign,
    quests: quests.items,
    acts: acts.items,
    scenes: scenes.items,
    npcs: npcs.items,
    locations: locations.items,
    clues: clues.items,
    notes: notes.items,
    tables: tables.items,
    sessions: sessions.items,
    characters: characters.items,
    gameSheetModel: models.items[0] || null,
    relations,
    sheetPages,
  };
}
