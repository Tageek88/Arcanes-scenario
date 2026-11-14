// apply-background-lot5a.mjs : lot 5a, fond de feuille : importer un PDF ou une image (converti en pages d'image avec pdfjs-dist), le tourner, l'enregistrer par campagne (table SheetBackground, db.version(11)).
// Usage, depuis la racine du projet :
//   node apply-background-lot5a.mjs --dry     (vérifie sans rien écrire)
//   node apply-background-lot5a.mjs           (applique)
// Rien n'est écrit tant que toutes les retouches de tous les fichiers ne s'appliquent pas : en cas de problème, le script l'indique et ne touche à rien.
// Les nouveaux fichiers ne sont jamais écrasés sans --force.
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dry = process.argv.includes("--dry");
const force = process.argv.includes("--force");

if (!fs.existsSync(path.join(root, "package.json")) || !fs.existsSync(path.join(root, "src"))) {
  console.error("Lancez ce script depuis la racine du projet (là où se trouve package.json).");
  process.exit(1);
}

// Ce lot s'appuie sur le lot 4 (systèmes de jeu) et sur pdfjs-dist, que le script n'installe pas.
if (!fs.existsSync(path.join(root, "src/lib/meta/gameSystem.js"))) {
  console.error("Appliquez d'abord le lot 4 (fichier absent : src/lib/meta/gameSystem.js).");
  process.exit(1);
}
if (!fs.existsSync(path.join(root, "node_modules/pdfjs-dist/package.json"))) {
  console.error("Installez d'abord pdfjs-dist : npm install --save-dev pdfjs-dist");
  process.exit(1);
}

// Retrouve un fichier du projet par son nom (une seule correspondance attendue sous src/).
function findInSrc(name) {
  const hits = fs.readdirSync(path.join(root, "src"), { recursive: true })
    .map(String)
    .filter((file) => path.basename(file) === name && !file.split(path.sep).includes("node_modules"));
  return hits.length === 1 ? path.join("src", hits[0]) : null;
}

const NEW_FILES = {
  "src/lib/meta/sheetBackground.js": `// Fond de feuille : règles pures (aucun accès aux données, au navigateur ni à pdfjs).
//
// Le fond d'une campagne est une ou plusieurs pages d'IMAGE (le PDF d'une feuille de personnage est converti en images à
// l'import), rangées dans \`SheetBackground\` sous l'identifiant de la campagne : { id, campaign_id, pages }.
//   page : { id, width, height, url }   \`url\` est une URL \`data:image/…;base64,…\`, \`width\` et \`height\` sont en pixels.

export const MAX_BACKGROUND_PAGES = 4;
export const MAX_SOURCE_BYTES = 30 * 1024 * 1024;
export const MAX_BACKGROUND_BYTES = 12 * 1024 * 1024;
export const MAX_PAGE_PIXELS = 8000;
/** Grand côté d'une page en pixels : une feuille A4 à 200 points par pouce (1654 × 2339). */
export const PAGE_LONG_SIDE = 2339;
export const JPEG_QUALITY = 0.85;
export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const SOURCE_ACCEPT = "application/pdf,.pdf,image/png,image/jpeg,image/webp";

const IMAGE_URL = /^data:image\\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const isPdfName = (name) => /\\.pdf$/i.test(String(name || ""));
const isImageName = (name) => /\\.(?:png|jpe?g|webp)$/i.test(String(name || ""));

/** Vrai si le fichier est un PDF (par son type, ou par son nom quand le type est vide). */
export const isPdfFile = (file) => file?.type === "application/pdf" || (!file?.type && isPdfName(file?.name));

/** Vrai si le fichier est une image acceptée (PNG, JPEG ou WebP). */
export const isImageFile = (file) => ACCEPTED_IMAGE_TYPES.includes(file?.type) || (!file?.type && isImageName(file?.name));

/** Raison de refus d'un fichier choisi pour servir de fond, ou "" s'il convient. */
export function sourceRejection(file) {
  if (!file) return "Aucun fichier.";
  if (!isPdfFile(file) && !isImageFile(file)) return "PDF, PNG, JPEG ou WebP uniquement.";
  if (!(file.size > 0)) return "Le fichier est vide.";
  if (file.size > MAX_SOURCE_BYTES) return \`Le fichier dépasse \${Math.round(MAX_SOURCE_BYTES / (1024 * 1024))} Mo.\`;
  return "";
}

/**
 * Échelle qui amène le grand côté à \`longSide\` pixels. Sans \`allowUpscale\` (une image), elle ne dépasse jamais 1 :
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

/** Dimensions d'une page après \`turns\` quarts de tour : largeur et hauteur s'échangent quand le nombre est impair. */
export function rotatedSize(page, turns) {
  const width = Number(page?.width) || 0;
  const height = Number(page?.height) || 0;
  return normalizeTurns(turns) % 2 === 1 ? { width: height, height: width } : { width, height };
}

/** Taille approchée, en octets, du contenu d'une URL \`data:\` en base64. */
export function dataUrlBytes(url) {
  const comma = String(url || "").indexOf(",");
  return comma < 0 ? 0 : Math.floor(((String(url).length - comma - 1) * 3) / 4);
}

/** Un identifiant de page. */
export function newPageId() {
  const random = globalThis.crypto?.randomUUID?.() || \`\${Date.now().toString(36)}\${Math.random().toString(36).slice(2, 8)}\`;
  return \`p\${random.replace(/-/g, "").slice(0, 12)}\`;
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
  return total > MAX_BACKGROUND_BYTES ? \`Le fond dépasse \${Math.round(MAX_BACKGROUND_BYTES / (1024 * 1024))} Mo : importez une feuille plus légère.\` : "";
}

/** Poids lisible d'un fond : « 850 Ko », « 3,2 Mo ». */
export function backgroundSizeLabel(pages) {
  const bytes = (Array.isArray(pages) ? pages : []).reduce((sum, page) => sum + dataUrlBytes(page?.url), 0);
  if (bytes < 1024 * 1024) return \`\${Math.max(1, Math.round(bytes / 1024))} Ko\`;
  return \`\${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo\`;
}
`,
  "src/lib/services/sheetBackgroundStore.js": `import { db } from "@/api/localClient";
import { backgroundRejection, cleanPages } from "@/lib/meta/sheetBackground";

// Fond de feuille d'une campagne : les pages (images) sont dans \`SheetBackground\`, une ligne par campagne, sous
// l'identifiant de la campagne. Comme les PDF de campagne, ce contenu est lourd : il n'entre pas dans la sauvegarde
// légère et se supprime avec la campagne.

const TABLE = "SheetBackground";

/** Pages du fond d'une campagne, ou [] s'il n'y en a pas. */
export async function loadSheetBackground(campaignId) {
  if (!campaignId) return [];
  const row = await db.table(TABLE).get(campaignId);
  return cleanPages(row?.pages);
}

/** Enregistre le fond d'une campagne (remplace l'ancien). Une liste vide supprime le fond. */
export async function saveSheetBackground(campaignId, pages) {
  if (!campaignId) throw new Error("Aucune campagne sélectionnée.");
  const cleaned = cleanPages(pages);
  if (cleaned.length === 0) {
    await removeSheetBackground(campaignId);
    return [];
  }
  const refusal = backgroundRejection(cleaned);
  if (refusal) throw new Error(refusal);
  await db.table(TABLE).put({ id: campaignId, campaign_id: campaignId, pages: cleaned });
  return cleaned;
}

/** Supprime le fond d'une campagne. */
export async function removeSheetBackground(campaignId) {
  if (!campaignId) return;
  await db.table(TABLE).delete(campaignId);
}
`,
  "src/lib/services/sheetImport.js": `import {
  JPEG_QUALITY,
  MAX_BACKGROUND_PAGES,
  PAGE_LONG_SIDE,
  fitScale,
  isPdfFile,
  newPageId,
  normalizeTurns,
  rotatedSize,
  sourceRejection,
} from "@/lib/meta/sheetBackground";

// Conversion d'une feuille (PDF ou image) en pages d'image pour servir de fond. Code de navigateur : il ne tourne pas
// dans les tests. pdfjs-dist n'est chargé qu'au moment d'importer un PDF.

const toPage = (canvas) => ({
  id: newPageId(),
  width: canvas.width,
  height: canvas.height,
  url: canvas.toDataURL("image/jpeg", JPEG_QUALITY),
});

function newCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext("2d");
  // Fond blanc : un PDF ou un PNG transparent serait noir une fois en JPEG.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  return { canvas, context };
}

async function renderPdf(file) {
  const [pdfjs, worker] = await Promise.all([import("pdfjs-dist"), import("pdfjs-dist/build/pdf.worker.min.mjs?url")]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const document_ = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  try {
    const count = Math.min(document_.numPages, MAX_BACKGROUND_PAGES);
    const pages = [];
    for (let number = 1; number <= count; number += 1) {
      const page = await document_.getPage(number);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: fitScale(base.width, base.height, PAGE_LONG_SIDE, true) });
      const { canvas, context } = newCanvas(viewport.width, viewport.height);
      await page.render({ canvasContext: context, viewport }).promise;
      pages.push(toPage(canvas));
      page.cleanup();
    }
    return { pages, truncated: document_.numPages > count };
  } finally {
    await document_.destroy();
  }
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("L'image n'a pas pu être lue."));
    image.src = source;
  });
}

async function renderImageFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const scale = fitScale(image.naturalWidth, image.naturalHeight, PAGE_LONG_SIDE, false);
    const { canvas, context } = newCanvas(image.naturalWidth * scale, image.naturalHeight * scale);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return { pages: [toPage(canvas)], truncated: false };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Convertit un fichier choisi par l'utilisateur en pages d'image (les 4 premières pages d'un PDF).
 * @returns {Promise<{ pages: { id: string, width: number, height: number, url: string }[], truncated: boolean }>}
 */
export async function importSheetFile(file) {
  const refusal = sourceRejection(file);
  if (refusal) throw new Error(refusal);
  try {
    return await (isPdfFile(file) ? renderPdf(file) : renderImageFile(file));
  } catch (error) {
    console.error("Conversion de la feuille impossible :", error);
    throw new Error(isPdfFile(file) ? "Ce PDF n'a pas pu être lu (fichier protégé ou abîmé ?)." : error?.message || "Le fichier n'a pas pu être lu.");
  }
}

/** Une page tournée de \`turns\` quarts de tour dans le sens des aiguilles d'une montre (la page garde son identifiant). */
export async function rotatePage(page, turns) {
  const count = normalizeTurns(turns);
  if (count === 0) return page;
  const image = await loadImage(page.url);
  const size = rotatedSize({ width: image.naturalWidth, height: image.naturalHeight }, count);
  const { canvas, context } = newCanvas(size.width, size.height);
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((count * Math.PI) / 2);
  context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
  return { ...toPage(canvas), id: page.id };
}
`,
  "src/components/game/SheetBackgroundDialog.jsx": `import React, { useEffect, useRef, useState } from "react";
import { RotateCw, Trash2, Upload } from "lucide-react";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { MAX_BACKGROUND_PAGES, SOURCE_ACCEPT, backgroundSizeLabel } from "@/lib/meta/sheetBackground";
import { importSheetFile, rotatePage } from "@/lib/services/sheetImport";
import { loadSheetBackground, removeSheetBackground, saveSheetBackground } from "@/lib/services/sheetBackgroundStore";

/**
 * Fond de la feuille de personnage d'une campagne : importer un PDF ou une image (convertis en pages d'image), tourner une
 * page, retirer une page ou tout le fond. Le fond reste sur cet appareil ; il n'est pas inclus dans les systèmes exportés.
 */
export default function SheetBackgroundDialog({ open, onOpenChange, campaignId }) {
  const { toast } = useToast();
  const fileRef = useRef(null);
  const [pages, setPages] = useState([]);
  const [changed, setChanged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setChanged(false);
    setConfirmRemove(false);
    setLoading(true);
    loadSheetBackground(campaignId)
      .then((loaded) => {
        if (!cancelled) setPages(loaded);
      })
      .catch((error) => {
        console.error("Lecture du fond de feuille impossible :", error);
        if (!cancelled) toast({ variant: "destructive", title: "Lecture impossible", description: "Le fond n'a pas pu être chargé." });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, campaignId]);

  const guard = async (task) => {
    setBusy(true);
    try {
      return await task();
    } catch (error) {
      toast({ variant: "destructive", title: "Action impossible", description: error?.message || "Une erreur est survenue." });
      return undefined;
    } finally {
      setBusy(false);
    }
  };

  const chooseFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const result = await guard(() => importSheetFile(file));
    if (!result) return;
    setPages(result.pages);
    setChanged(true);
    if (result.truncated) toast({ title: "PDF long", description: \`Seules les \${MAX_BACKGROUND_PAGES} premières pages sont gardées.\` });
  };

  const rotate = async (index) => {
    const rotated = await guard(() => rotatePage(pages[index], 1));
    if (!rotated) return;
    setPages((current) => current.map((page, i) => (i === index ? rotated : page)));
    setChanged(true);
  };

  const removePage = (index) => {
    setPages((current) => current.filter((_, i) => i !== index));
    setChanged(true);
  };

  const save = async () => {
    const saved = await guard(() => saveSheetBackground(campaignId, pages));
    if (!saved) return;
    setPages(saved);
    setChanged(false);
    toast({ title: saved.length ? "Fond enregistré" : "Fond retiré" });
  };

  const removeAll = async () => {
    if (!confirmRemove) {
      setConfirmRemove(true);
      return;
    }
    setConfirmRemove(false);
    await guard(async () => {
      await removeSheetBackground(campaignId);
      setPages([]);
      setChanged(false);
      toast({ title: "Fond retiré" });
    });
  };

  const footer = (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" onClick={() => onOpenChange(false)}>Fermer</Button>
      <Button onClick={save} disabled={busy || !changed}>Enregistrer le fond</Button>
    </div>
  );

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Fond de feuille"
      description="Importez la feuille de personnage de votre jeu (PDF ou image) pour qu'elle serve de fond à la fiche."
      footer={footer}
    >
      <div className="stack-y-4 py-1">
        <p className="text-xs text-muted-foreground">
          Le PDF est converti en images ({MAX_BACKGROUND_PAGES} pages au plus) et reste sur cet appareil ; il n'est pas inclus dans les systèmes exportés.
          Les droits de la feuille appartiennent à son éditeur : importez votre propre exemplaire.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" disabled={busy || !campaignId} onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> {pages.length ? "Remplacer le fond" : "Importer une feuille"}
          </Button>
          <input ref={fileRef} type="file" accept={SOURCE_ACCEPT} className="hidden" onChange={chooseFile} />
          {pages.length > 0 && <span className="text-xs text-muted-foreground">{pages.length} page{pages.length > 1 ? "s" : ""} · {backgroundSizeLabel(pages)}</span>}
          {busy && <span className="text-xs text-muted-foreground">Traitement…</span>}
        </div>

        {loading && pages.length === 0 && <p className="text-sm text-muted-foreground">Chargement…</p>}
        {!loading && pages.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">Aucun fond pour cette campagne.</p>
        )}

        <ul className="stack-y-3">
          {pages.map((page, index) => (
            <li key={page.id} className="stack-y-2 rounded-lg border border-border p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Page {index + 1} · {page.width} × {page.height} px</span>
                <div className="flex items-center">
                  <Button size="icon" variant="ghost" aria-label={\`Tourner la page \${index + 1} d'un quart de tour\`} disabled={busy} onClick={() => rotate(index)}>
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" aria-label={\`Retirer la page \${index + 1}\`} disabled={busy} onClick={() => removePage(index)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
              <img src={page.url} alt={\`Page \${index + 1} du fond de feuille\`} className="mx-auto max-h-96 w-auto max-w-full rounded border border-border bg-white" />
            </li>
          ))}
        </ul>

        {pages.length > 0 && !changed && (
          <div>
            {confirmRemove ? (
              <div className="stack-y-2 rounded-md bg-secondary/50 p-2">
                <p className="text-xs">Retirer tout le fond de cette campagne ? Le fichier d'origine n'est pas conservé.</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" disabled={busy} onClick={removeAll}>Retirer le fond</Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(false)}>Annuler</Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="ghost" disabled={busy} onClick={removeAll}>Retirer tout le fond</Button>
            )}
          </div>
        )}
      </div>
    </ResponsiveDialog>
  );
}
`,
  "tests/sheetBackground.test.js": `import { describe, expect, it } from "vitest";
import {
  MAX_BACKGROUND_BYTES,
  MAX_BACKGROUND_PAGES,
  MAX_SOURCE_BYTES,
  PAGE_LONG_SIDE,
  backgroundRejection,
  backgroundSizeLabel,
  cleanPages,
  dataUrlBytes,
  fitScale,
  isImageFile,
  isPdfFile,
  normalizeTurns,
  rotatedSize,
  sourceRejection,
} from "@/lib/meta/sheetBackground.js";

const URL_OK = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
const page = (extra = {}) => ({ id: "p1", width: 1654, height: 2339, url: URL_OK, ...extra });

describe("fichier source", () => {
  it("accepte un PDF et les images PNG, JPEG, WebP, par le type ou par le nom", () => {
    expect(isPdfFile({ type: "application/pdf" })).toBe(true);
    expect(isPdfFile({ type: "", name: "Feuille.PDF" })).toBe(true);
    expect(isPdfFile({ type: "image/png", name: "a.pdf" })).toBe(false);
    expect(isImageFile({ type: "image/webp" })).toBe(true);
    expect(isImageFile({ type: "", name: "scan.JPG" })).toBe(true);
    expect(isImageFile({ type: "text/plain", name: "a.txt" })).toBe(false);
  });

  it("refuse l'absence de fichier, un autre type, un fichier vide et un fichier trop gros", () => {
    expect(sourceRejection(null)).not.toBe("");
    expect(sourceRejection({ type: "text/plain", name: "a.txt", size: 10 })).toContain("PDF");
    expect(sourceRejection({ type: "application/pdf", size: 0 })).toContain("vide");
    expect(sourceRejection({ type: "application/pdf", size: MAX_SOURCE_BYTES + 1 })).toContain("Mo");
    expect(sourceRejection({ type: "application/pdf", size: 1000 })).toBe("");
    expect(sourceRejection({ type: "image/png", size: 1000 })).toBe("");
  });
});

describe("échelle et rotation", () => {
  it("un PDF A4 en points est agrandi pour atteindre le grand côté voulu", () => {
    const scale = fitScale(595, 842, PAGE_LONG_SIDE, true);
    expect(Math.round(842 * scale)).toBe(PAGE_LONG_SIDE);
  });

  it("une image n'est jamais agrandie, mais réduite si elle est trop grande", () => {
    expect(fitScale(800, 600)).toBe(1);
    expect(fitScale(4678, 3308)).toBeCloseTo(0.5, 2);
    expect(fitScale(0, 0)).toBe(1);
  });

  it("les quarts de tour se ramènent entre 0 et 3, dans les deux sens", () => {
    expect([0, 1, 4, 5, -1, -4, "2", "x", null].map(normalizeTurns)).toEqual([0, 1, 0, 1, 3, 0, 2, 0, 0]);
  });

  it("largeur et hauteur s'échangent pour un nombre impair de quarts de tour", () => {
    expect(rotatedSize({ width: 100, height: 200 }, 1)).toEqual({ width: 200, height: 100 });
    expect(rotatedSize({ width: 100, height: 200 }, 2)).toEqual({ width: 100, height: 200 });
    expect(rotatedSize({ width: 100, height: 200 }, 3)).toEqual({ width: 200, height: 100 });
  });
});

describe("cleanPages", () => {
  it("garde une page valide à l'identique", () => {
    expect(cleanPages([page()])).toEqual([page()]);
  });

  it("retire une page sans image valide ou sans dimensions utilisables", () => {
    const bad = [
      page({ url: "https://exemple.org/a.png" }),
      page({ url: "data:text/html;base64,AAAA" }),
      page({ url: "data:image/svg+xml;base64,AAAA" }),
      page({ width: 0 }),
      page({ height: 9000 }),
      page({ width: "x" }),
      null,
    ];
    expect(cleanPages(bad)).toEqual([]);
  });

  it("donne un nouvel identifiant à une page sans identifiant ou en double, et borne le nombre", () => {
    const out = cleanPages([page({ id: "" }), page(), page()]);
    expect(new Set(out.map((item) => item.id)).size).toBe(3);
    const many = Array.from({ length: MAX_BACKGROUND_PAGES + 3 }, (_, i) => page({ id: \`p\${i}\` }));
    expect(cleanPages(many)).toHaveLength(MAX_BACKGROUND_PAGES);
    expect(cleanPages(null)).toEqual([]);
  });
});

describe("poids du fond", () => {
  it("estime la taille d'une URL data: en octets", () => {
    expect(dataUrlBytes("data:image/png;base64,AAAA")).toBe(3);
    expect(dataUrlBytes("sans virgule")).toBe(0);
  });

  it("refuse un fond trop lourd, accepte un fond léger", () => {
    const heavy = { url: \`data:image/jpeg;base64,\${"A".repeat(Math.ceil((MAX_BACKGROUND_BYTES * 4) / 3) + 8)}\` };
    expect(backgroundRejection([heavy])).toContain("Mo");
    expect(backgroundRejection([page()])).toBe("");
    expect(backgroundRejection(null)).toBe("");
  });

  it("affiche un poids lisible", () => {
    expect(backgroundSizeLabel([page()])).toBe("1 Ko");
    expect(backgroundSizeLabel([{ url: \`data:image/png;base64,\${"A".repeat(4 * 1024 * 1024)}\` }])).toBe("3,0 Mo");
  });
});
`,
  "tests/sheetBackgroundService.test.js": `import { describe, expect, it } from "vitest";
import { db } from "@/api/localClient";
import { deleteCampaignCascade } from "@/lib/services/campaignDelete";
import { loadSheetBackground, removeSheetBackground, saveSheetBackground } from "@/lib/services/sheetBackgroundStore";
import { MAX_BACKGROUND_BYTES } from "@/lib/meta/sheetBackground";
import { makeCampaign } from "./helpers";

const URL_OK = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
const page = (id, extra = {}) => ({ id, width: 1654, height: 2339, url: URL_OK, ...extra });

describe("fond de feuille (service)", () => {
  it("enregistre puis relit les pages d'une campagne", async () => {
    const campaign = await makeCampaign();
    expect(await loadSheetBackground(campaign.id)).toEqual([]);
    await saveSheetBackground(campaign.id, [page("a"), page("b")]);
    const loaded = await loadSheetBackground(campaign.id);
    expect(loaded.map((item) => item.id)).toEqual(["a", "b"]);
    expect(loaded[0].url).toBe(URL_OK);
    expect(await db.table("SheetBackground").count()).toBe(1);
  });

  it("un nouvel enregistrement remplace l'ancien fond, et une liste vide le supprime", async () => {
    const campaign = await makeCampaign();
    await saveSheetBackground(campaign.id, [page("a"), page("b")]);
    await saveSheetBackground(campaign.id, [page("c")]);
    expect((await loadSheetBackground(campaign.id)).map((item) => item.id)).toEqual(["c"]);
    expect(await saveSheetBackground(campaign.id, [])).toEqual([]);
    expect(await db.table("SheetBackground").count()).toBe(0);
  });

  it("n'enregistre pas de page invalide", async () => {
    const campaign = await makeCampaign();
    await saveSheetBackground(campaign.id, [page("a", { url: "https://exemple.org/a.png" })]);
    expect(await loadSheetBackground(campaign.id)).toEqual([]);
  });

  it("refuse un fond trop lourd et une campagne absente", async () => {
    const campaign = await makeCampaign();
    const heavy = page("a", { url: \`data:image/jpeg;base64,\${"A".repeat(Math.ceil((MAX_BACKGROUND_BYTES * 4) / 3) + 8)}\` });
    await expect(saveSheetBackground(campaign.id, [heavy])).rejects.toThrow("Mo");
    await expect(saveSheetBackground("", [page("a")])).rejects.toThrow("campagne");
  });

  it("chaque campagne a son fond, et removeSheetBackground ne touche que la sienne", async () => {
    const one = await makeCampaign("Une");
    const two = await makeCampaign("Deux");
    await saveSheetBackground(one.id, [page("a")]);
    await saveSheetBackground(two.id, [page("b")]);
    await removeSheetBackground(one.id);
    expect(await loadSheetBackground(one.id)).toEqual([]);
    expect((await loadSheetBackground(two.id)).map((item) => item.id)).toEqual(["b"]);
  });

  it("supprimer la campagne supprime son fond", async () => {
    const campaign = await makeCampaign();
    await saveSheetBackground(campaign.id, [page("a")]);
    await deleteCampaignCascade(campaign.id);
    expect(await db.table("SheetBackground").count()).toBe(0);
  });
});
`,
};

const EDITS = {
  "dbConfig.js": [
    {
      find: `export const TABLES = [...VERSION_9_TABLES, "GameSystem"];`,
      replace: `const VERSION_10_TABLES = [...VERSION_9_TABLES, "GameSystem"];
// Fond de feuille de personnage (pages d'image, une ligne par campagne ; voir \`lib/meta/sheetBackground.js\`).
export const TABLES = [...VERSION_10_TABLES, "SheetBackground"];`,
    },
    {
      find: `export const FILE_TABLES = ["CampaignDocumentFile"];`,
      replace: `export const FILE_TABLES = ["CampaignDocumentFile", "SheetBackground"];`,
    },
    {
      find: `db.version(10).stores(Object.fromEntries(TABLES.map((t) => [t, t === "GameSystem" ? "id, name" : "id, campaign_id"])));`,
      replace: `db.version(10).stores(Object.fromEntries(VERSION_10_TABLES.map((t) => [t, t === "GameSystem" ? "id, name" : "id, campaign_id"])));
// La version 11 ajoute le fond de feuille (un fichier lourd : voir FILE_TABLES).
db.version(11).stores(Object.fromEntries(TABLES.map((t) => [t, t === "GameSystem" ? "id, name" : "id, campaign_id"])));`,
    },
  ],
  "Jeu.jsx": [
    {
      find: `import { Copy, Library, Pencil, Plus, Printer, Search, Shield, Trash2, UserRound } from "lucide-react";`,
      replace: `import { Copy, FileImage, Library, Pencil, Plus, Printer, Search, Shield, Trash2, UserRound } from "lucide-react";`,
    },
    {
      find: `import GameSystemsDialog from "@/components/game/GameSystemsDialog";`,
      replace: `import GameSystemsDialog from "@/components/game/GameSystemsDialog";
import SheetBackgroundDialog from "@/components/game/SheetBackgroundDialog";`,
    },
    {
      find: `  const [systemsOpen, setSystemsOpen] = useState(false);`,
      replace: `  const [systemsOpen, setSystemsOpen] = useState(false);
  const [backgroundOpen, setBackgroundOpen] = useState(false);`,
    },
    {
      find: `              <Library className="h-4 w-4" /> Systèmes
            </Button>
          )}`,
      replace: `              <Library className="h-4 w-4" /> Systèmes
            </Button>
          )}
          {campaignId && (
            <Button variant="outline" onClick={() => setBackgroundOpen(true)}>
              <FileImage className="h-4 w-4" /> Fond de feuille
            </Button>
          )}`,
    },
    {
      find: `      <GameSystemsDialog open={systemsOpen} onOpenChange={setSystemsOpen} campaignId={campaignId} hasModel={Boolean(modelId)} />`,
      replace: `      <GameSystemsDialog open={systemsOpen} onOpenChange={setSystemsOpen} campaignId={campaignId} hasModel={Boolean(modelId)} />
      <SheetBackgroundDialog open={backgroundOpen} onOpenChange={setBackgroundOpen} campaignId={campaignId} />`,
    },
  ],
};

let failures = 0;
const done = [];
const writes = [];

for (const [file, content] of Object.entries(NEW_FILES)) {
  const target = path.join(root, file);
  if (fs.existsSync(target) && !force) {
    console.error("EXISTE DÉJÀ : " + file + " (relancez avec --force pour l'écraser)");
    failures += 1;
    continue;
  }
  writes.push({ target, text: content });
  done.push("créé      " + file);
}

for (const [name, edits] of Object.entries(EDITS)) {
  const file = findInSrc(name);
  if (!file) {
    console.error("INTROUVABLE (ou plusieurs) sous src/ : " + name);
    failures += 1;
    continue;
  }
  const original = fs.readFileSync(path.join(root, file), "utf8");
  const crlf = original.includes("\r\n");
  let text = crlf ? original.replace(/\r\n/g, "\n") : original;
  let ok = true;
  edits.forEach((edit, index) => {
    const expected = edit.count ?? 1;
    const found = text.split(edit.find).length - 1;
    if (found !== expected) {
      console.error(file + " : retouche " + (index + 1) + " non appliquée (" + found + " occurrence(s) trouvée(s), " + expected + " attendue(s)) :");
      console.error("    " + edit.find.split("\n")[0].trim());
      ok = false;
      return;
    }
    text = text.split(edit.find).join(edit.replace);
  });
  if (!ok) {
    console.error(file + " : laissé INTACT.");
    failures += 1;
    continue;
  }
  writes.push({ target: path.join(root, file), text: crlf ? text.replace(/\n/g, "\r\n") : text });
  done.push("modifié   " + file + " (" + edits.length + " retouche" + (edits.length > 1 ? "s" : "") + ")");
}

if (failures > 0) {
  console.error("\n" + failures + " problème(s) : RIEN n'a été écrit.");
  process.exit(1);
}
if (!dry) {
  for (const { target, text } of writes) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text, "utf8");
  }
}
console.log((dry ? "[--dry : rien n'a été écrit]\n" : "") + done.join("\n"));
console.log("\nTerminé. Ensuite : npm run check; npm run lint; npm test; npm run build");
