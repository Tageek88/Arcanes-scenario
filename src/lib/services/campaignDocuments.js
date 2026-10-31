import { api, db } from "@/api/localClient";
import { withDataBatch } from "@/lib/context/dataEvents";
import { cleanDocumentInfo, defaultDocumentName, pdfRejection, sortDocuments } from "@/lib/meta/campaignDocument";
import { uploadAttachment } from "@/lib/services/attachments";

// PDF de campagne. Les informations (nom, commentaire, taille) sont dans `CampaignDocument`, le contenu du fichier
// (URL `data:`) dans `CampaignDocumentFile`, sous le même identifiant. La liste ne lit jamais les fichiers.

const FILES = "CampaignDocumentFile";
const LIMIT = 1000;

/** Informations des PDF d'une campagne, du plus récent au plus ancien. */
export async function listCampaignDocuments(campaignId) {
  const { items } = await api.entities.CampaignDocument.filter({ campaign_id: campaignId }, { limit: LIMIT });
  return sortDocuments(items);
}

/**
 * Ajoute un PDF à une campagne.
 * @param {string} campaignId
 * @param {File} file
 * @returns {Promise<any>} les informations enregistrées
 */
export async function addCampaignDocument(campaignId, file) {
  const refusal = pdfRejection(file);
  if (!campaignId) throw new Error("Aucune campagne sélectionnée.");
  if (refusal) throw new Error(refusal);
  const uploaded = await uploadAttachment(file); // lecture du fichier avant d'ouvrir la transaction
  return db.transaction("rw", ["CampaignDocument", FILES], async () => {
    const info = await api.entities.CampaignDocument.create(
      {
        campaign_id: campaignId,
        name: defaultDocumentName(file.name),
        comment: "",
        file_name: file.name,
        type: "application/pdf",
        size: file.size,
      }
    );
    await db.table(FILES).put({ id: info.id, campaign_id: campaignId, url: uploaded.url });
    return info;
  });
}

/** Fichier d'un PDF, prêt pour la visionneuse ({ name, type, url }), ou null s'il manque. */
export async function loadDocumentFile(documentId, info) {
  const row = await db.table(FILES).get(documentId);
  if (!row?.url) return null;
  return { name: info?.file_name || info?.name || "document.pdf", type: "application/pdf", url: row.url };
}

/** Change le nom et le commentaire d'un PDF. */
export const updateCampaignDocument = (documentId, input) =>
  api.entities.CampaignDocument.update(documentId, cleanDocumentInfo(input));

/** Supprime un PDF et son fichier, ensemble. */
export async function deleteCampaignDocument(documentId) {
  await withDataBatch(() =>
    db.transaction("rw", ["CampaignDocument", FILES], async () => {
      await db.table(FILES).delete(documentId);
      await api.entities.CampaignDocument.delete(documentId);
    })
  );
}
