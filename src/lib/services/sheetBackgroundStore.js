import { db } from "@/api/localClient";
import { backgroundRejection, cleanPages } from "@/lib/meta/sheetBackground";
import { cleanFields } from "@/lib/meta/pdfFields";

// Fond de feuille d'une campagne : les pages (images) sont dans `SheetBackground`, une ligne par campagne, sous
// l'identifiant de la campagne. Comme les PDF de campagne, ce contenu est lourd : il n'entre pas dans la sauvegarde
// légère et se supprime avec la campagne.

const TABLE = "SheetBackground";

/** Pages du fond d'une campagne, ou [] s'il n'y en a pas. */
export async function loadSheetBackground(campaignId) {
  if (!campaignId) return [];
  const row = await db.table(TABLE).get(campaignId);
  return cleanPages(row?.pages);
}

/**
 * Pages et champs de formulaire du fond d'une campagne : { pages, fields }. Les champs viennent d'un PDF éditable ; un fond
 * enregistré avant leur lecture, ou une image, n'en a pas (liste vide).
 */
export async function loadSheetBackgroundData(campaignId) {
  if (!campaignId) return { pages: [], fields: [] };
  const row = await db.table(TABLE).get(campaignId);
  const pages = cleanPages(row?.pages);
  return { pages, fields: cleanFields(row?.fields, pages.length) };
}

/**
 * Enregistre le fond d'une campagne (remplace l'ancien) avec les champs de formulaire de son PDF (`fields`, vide par défaut).
 * Une liste de pages vide supprime le fond.
 */
export async function saveSheetBackground(campaignId, pages, fields = []) {
  if (!campaignId) throw new Error("Aucune campagne sélectionnée.");
  const cleaned = cleanPages(pages);
  if (cleaned.length === 0) {
    await removeSheetBackground(campaignId);
    return [];
  }
  const refusal = backgroundRejection(cleaned);
  if (refusal) throw new Error(refusal);
  await db.table(TABLE).put({ id: campaignId, campaign_id: campaignId, pages: cleaned, fields: cleanFields(fields, cleaned.length) });
  return cleaned;
}

/** Supprime le fond d'une campagne. */
export async function removeSheetBackground(campaignId) {
  if (!campaignId) return;
  await db.table(TABLE).delete(campaignId);
}
