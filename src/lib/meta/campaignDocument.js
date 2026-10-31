// PDF de campagne : règles pures (taille, type, nom). Aucun accès aux données.

export const MAX_PDF_BYTES = 50 * 1024 * 1024;
export const MAX_PDF_MB = 50;

const isPdfName = (name) => /\.pdf$/i.test(String(name || ""));

/**
 * Raison de refus d'un fichier, ou "" s'il convient.
 * @param {{ name?: string, type?: string, size?: number } | null | undefined} file
 */
export function pdfRejection(file) {
  if (!file) return "Aucun fichier.";
  const isPdf = file.type === "application/pdf" || (!file.type && isPdfName(file.name));
  if (!isPdf) return "PDF uniquement.";
  if (!(file.size > 0)) return "Le fichier est vide.";
  if (file.size > MAX_PDF_BYTES) return `Le fichier dépasse ${MAX_PDF_MB} Mo.`;
  return "";
}

/** Nom proposé pour un PDF : le nom du fichier sans « .pdf ». */
export function defaultDocumentName(fileName) {
  const base = String(fileName || "").replace(/\.pdf$/i, "").trim();
  return base || "Document";
}

/** Taille lisible : « 850 Ko », « 12,4 Mo ». */
export function formatSize(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} o`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} Ko`;
  return `${(size / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}

/** Informations d'un PDF telles qu'on les enregistre (le contenu du fichier est ailleurs). */
export function cleanDocumentInfo(input) {
  const name = String(input?.name ?? "").trim();
  return { name: name || "Document", comment: String(input?.comment ?? "").trim() };
}

/** Du plus récent au plus ancien. */
export const sortDocuments = (documents) =>
  [...documents].sort((a, b) => String(b.created_date || "").localeCompare(String(a.created_date || "")));
