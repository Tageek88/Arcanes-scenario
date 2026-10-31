// Pièces jointes : lecture, enregistrement et partage d'un fichier stocké en URL `data:` (images et PDF).
// Les types sont limités à ceux qu'on accepte d'ouvrir : HTML et SVG s'exécuteraient dans l'origine de l'application.

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif"]);
const PDF_TYPE = "application/pdf";

const EXTENSIONS = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "application/pdf": "pdf",
};

/**
 * Type et contenu d'une pièce jointe `data:` en base64, ou null si le fichier n'est pas lisible ici
 * (URL distante, type refusé, base64 invalide).
 * @param {{ url?: string, type?: string } | null | undefined} file
 * @returns {{ mime: string, base64: string } | null}
 */
export function readAttachment(file) {
  const url = file?.url || "";
  if (!url.startsWith("data:")) return null;
  const comma = url.indexOf(",");
  if (comma < 0) return null;
  const head = url.slice(0, comma);
  const mime = (head.match(/^data:([^;,]+)/)?.[1] || file?.type || "").toLowerCase();
  if (!head.includes(";base64") || !(IMAGE_TYPES.has(mime) || mime === PDF_TYPE)) return null;
  const base64 = url.slice(comma + 1);
  try {
    atob(base64.slice(0, 64).padEnd(Math.ceil(Math.min(base64.length, 64) / 4) * 4, "="));
  } catch {
    return null;
  }
  return { mime, base64 };
}

/** "image" | "pdf" | "" : ce que la visionneuse sait afficher pour ce fichier. */
export function viewKind(file) {
  const read = readAttachment(file);
  if (!read) return "";
  return read.mime === PDF_TYPE ? "pdf" : "image";
}

/** Nom de fichier utilisable partout, avec l'extension qui correspond au type. */
export function attachmentFileName(file, mime) {
  const ext = EXTENSIONS[mime] || "";
  // Caractères interdits dans un nom de fichier (et caractères de contrôle) remplacés par un tiret.
  const forbidden = '\\/:*?"<>|';
  const base =
    [...String(file?.name || "piece-jointe")]
      .map((char) => (char.charCodeAt(0) < 32 || forbidden.includes(char) ? "-" : char))
      .join("")
      .trim() || "piece-jointe";
  return ext && !base.toLowerCase().endsWith(`.${ext}`) ? `${base}.${ext}` : base;
}

/** Blob d'une pièce jointe lisible, ou null. */
export function attachmentBlob(file) {
  const read = readAttachment(file);
  if (!read) return null;
  try {
    const binary = atob(read.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i); // plus rapide que Uint8Array.from pour un gros PDF
    return new Blob([bytes], { type: read.mime });
  } catch {
    return null;
  }
}

/** Enregistre la pièce jointe sur l'appareil (téléchargement du navigateur ou de l'application de bureau). */
export function downloadAttachment(file) {
  const blob = attachmentBlob(file);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = attachmentFileName(file, blob.type);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return true;
}

/**
 * Partage la pièce jointe : feuille de partage Android, sinon partage du navigateur s'il accepte les fichiers.
 * @returns {Promise<"shared" | "cancelled" | "unsupported">}
 */
export async function shareAttachment(file) {
  const read = readAttachment(file);
  if (!read) return "unsupported";
  const name = attachmentFileName(file, read.mime);
  const { isNativeApp, shareBase64File } = await import("@/lib/save/nativeShare");
  if (isNativeApp()) return (await shareBase64File(read.base64, name, name)) ? "shared" : "cancelled";

  const blob = attachmentBlob(file);
  const shareable = blob && new File([blob], name, { type: read.mime });
  if (shareable && navigator.canShare?.({ files: [shareable] })) {
    try {
      await navigator.share({ files: [shareable], title: name });
      return "shared";
    } catch (error) {
      if (error?.name === "AbortError") return "cancelled";
      throw error;
    }
  }
  return "unsupported";
}

/** Copie une image dans le presse-papiers (PNG seulement, c'est ce que les navigateurs acceptent). */
export async function copyAttachmentImage(file) {
  const read = readAttachment(file);
  if (!read || read.mime !== "image/png" || !navigator.clipboard?.write || typeof ClipboardItem === "undefined") return false;
  await navigator.clipboard.write([new ClipboardItem({ "image/png": attachmentBlob(file) })]);
  return true;
}
