import {
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

/** Une page tournée de `turns` quarts de tour dans le sens des aiguilles d'une montre (la page garde son identifiant). */
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
