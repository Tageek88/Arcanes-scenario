// Fond de feuille : règles pures (aucun accès aux données, au navigateur ni à pdfjs).
//
// Le fond d'une campagne est une ou plusieurs pages d'IMAGE (le PDF d'une feuille de personnage est converti en images à
// l'import), rangées dans `SheetBackground` sous l'identifiant de la campagne : { id, campaign_id, pages }.
//   page : { id, width, height, url }   `url` est une URL `data:image/…;base64,…`, `width` et `height` sont en pixels.

export const MAX_BACKGROUND_PAGES = 4;
export const MAX_SOURCE_BYTES = 30 * 1024 * 1024;
export const MAX_BACKGROUND_BYTES = 12 * 1024 * 1024;
export const MAX_PAGE_PIXELS = 8000;
/** Grand côté d'une page en pixels : une feuille A4 à 200 points par pouce (1654 × 2339). */
export const PAGE_LONG_SIDE = 2339;
export const JPEG_QUALITY = 0.85;
export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const SOURCE_ACCEPT = "application/pdf,.pdf,image/png,image/jpeg,image/webp";

const IMAGE_URL = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const isPdfName = (name) => /\.pdf$/i.test(String(name || ""));
const isImageName = (name) => /\.(?:png|jpe?g|webp)$/i.test(String(name || ""));

/** Vrai si le fichier est un PDF (par son type, ou par son nom quand le type est vide). */
export const isPdfFile = (file) => file?.type === "application/pdf" || (!file?.type && isPdfName(file?.name));

/** Vrai si le fichier est une image acceptée (PNG, JPEG ou WebP). */
export const isImageFile = (file) => ACCEPTED_IMAGE_TYPES.includes(file?.type) || (!file?.type && isImageName(file?.name));

/** Raison de refus d'un fichier choisi pour servir de fond, ou "" s'il convient. */
export function sourceRejection(file) {
  if (!file) return "Aucun fichier.";
  if (!isPdfFile(file) && !isImageFile(file)) return "PDF, PNG, JPEG ou WebP uniquement.";
  if (!(file.size > 0)) return "Le fichier est vide.";
  if (file.size > MAX_SOURCE_BYTES) return `Le fichier dépasse ${Math.round(MAX_SOURCE_BYTES / (1024 * 1024))} Mo.`;
  return "";
}

/**
 * Échelle qui amène le grand côté à `longSide` pixels. Sans `allowUpscale` (une image), elle ne dépasse jamais 1 :
 * une petite image n'est pas agrandie. Pour un PDF (dimensions en points), l'agrandissement est voulu.
 */
export function fitScale(width, height, longSide = PAGE_LONG_SIDE, allowUpscale = false) {
  const largest = Math.max(Number(width) || 0, Number(height) || 0);
  if (!(largest > 0)) return 1;
  const scale = longSide / largest;
  return allowUpscale ? scale : Math.min(1, scale);
}

/** Nombre de quarts de tour ramené entre 0 et 3 (les valeurs négatives tournent dans l'autre sens). */
export function normalizeTurns(turns) {
  const n = Math.trunc(Number(turns));
  return Number.isFinite(n) ? ((n % 4) + 4) % 4 : 0;
}

/** Dimensions d'une page après `turns` quarts de tour : largeur et hauteur s'échangent quand le nombre est impair. */
export function rotatedSize(page, turns) {
  const width = Number(page?.width) || 0;
  const height = Number(page?.height) || 0;
  return normalizeTurns(turns) % 2 === 1 ? { width: height, height: width } : { width, height };
}

/** Taille approchée, en octets, du contenu d'une URL `data:` en base64. */
export function dataUrlBytes(url) {
  const comma = String(url || "").indexOf(",");
  return comma < 0 ? 0 : Math.floor(((String(url).length - comma - 1) * 3) / 4);
}

/** Un identifiant de page. */
export function newPageId() {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `p${random.replace(/-/g, "").slice(0, 12)}`;
}

const dimension = (value) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= 1 && n <= MAX_PAGE_PIXELS ? n : null;
};

/** Pages nettoyées : une page sans URL d'image valide ou sans dimensions utilisables est retirée ; le nombre est borné. */
export function cleanPages(raw) {
  const out = [];
  const seen = new Set();
  for (const item of Array.isArray(raw) ? raw : []) {
    if (out.length >= MAX_BACKGROUND_PAGES) break;
    const width = dimension(item?.width);
    const height = dimension(item?.height);
    const url = typeof item?.url === "string" ? item.url : "";
    if (!width || !height || !IMAGE_URL.test(url)) continue;
    let id = String(item?.id ?? "").trim();
    if (!id || id === "__proto__" || seen.has(id)) id = newPageId();
    seen.add(id);
    out.push({ id, width, height, url });
  }
  return out;
}

/** Raison de refus d'un fond trop lourd, ou "". */
export function backgroundRejection(pages) {
  const total = (Array.isArray(pages) ? pages : []).reduce((sum, page) => sum + dataUrlBytes(page?.url), 0);
  return total > MAX_BACKGROUND_BYTES ? `Le fond dépasse ${Math.round(MAX_BACKGROUND_BYTES / (1024 * 1024))} Mo : importez une feuille plus légère.` : "";
}

/** Poids lisible d'un fond : « 850 Ko », « 3,2 Mo ». */
export function backgroundSizeLabel(pages) {
  const bytes = (Array.isArray(pages) ? pages : []).reduce((sum, page) => sum + dataUrlBytes(page?.url), 0);
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}
