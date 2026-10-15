// Types qu'on accepte d'ouvrir dans un nouvel onglet. HTML et SVG sont refusés :
// un fichier de ce type, ouvert depuis un blob, s'exécuterait dans l'origine de l'application
// et pourrait lire toutes les campagnes (cas d'une sauvegarde importée qui aurait été modifiée).
const OPENABLE_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
]);

const isHttpsUrl = (value) => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * Ouvre une pièce jointe dans un nouvel onglet.
 * @param {{ url?: string, type?: string }} file
 * @returns {boolean} false si le fichier a été refusé
 */
export const openAttachment = (file) => {
  const url = file?.url || "";
  if (!url.startsWith("data:")) {
    if (!isHttpsUrl(url)) return false;
    window.open(url, "_blank", "noopener,noreferrer");
    return true;
  }

  const [head, b64 = ""] = url.split(",");
  const mime = (head.match(/^data:([^;,]+)/)?.[1] || file.type || "").toLowerCase();
  if (!OPENABLE_TYPES.has(mime) || !head.includes(";base64")) return false;

  let bytes;
  try {
    bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  } catch {
    return false;
  }
  const blobUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
  window.open(blobUrl, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  return true;
};