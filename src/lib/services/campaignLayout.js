import { api } from "@/api/localClient";

/**
 * Disposition de l'arborescence d'une campagne (champ `acts_as_rows` de la ligne Campaign).
 * Faux (défaut) : actes en colonnes, scènes de haut en bas. Vrai : actes en lignes de haut en bas, scènes de gauche à droite.
 * Pas de nouvelle `db.version` : Dexie fusionne la ligne.
 */
export const actsAsRows = (campaign) => campaign?.acts_as_rows === true;

export async function saveActsAsRows(campaignId, value) {
  if (!campaignId) throw new Error("Aucune campagne sélectionnée.");
  await api.entities.Campaign.update(campaignId, { acts_as_rows: value === true });
  return value === true;
}
