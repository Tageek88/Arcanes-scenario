import { api } from "@/api/localClient";

/**
 * Enregistre un fichier joint (image ou PDF) et renvoie la pièce jointe à stocker sur la fiche.
 * @param {File} file
 * @returns {Promise<{ name: string, url: string, type: string }>}
 */
export async function uploadAttachment(file) {
  const res = await api.integrations.Core.UploadFile({ file });
  return { name: file.name, url: res.file_url, type: file.type };
}
