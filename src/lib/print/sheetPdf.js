import { rgb } from "pdf-lib";
import { isLongZone, zoneBoxes, zoneText, zonesOnPage } from "@/lib/meta/sheetZones";

// Pages de feuille du PDF : le fond de la campagne en pleine page, les valeurs de la fiche posées aux zones choisies.

export const SHEET_PAGE_WIDTH = 595.28;
const INK = rgb(0.07, 0.09, 0.15);
const MIN_FONT = 4;

/** Taille de police réduite si le texte dépasse `maxWidth` (jamais sous MIN_FONT). */
export function fitFontSize(font, text, size, maxWidth) {
  const width = font.widthOfTextAtSize(text, size);
  if (!(width > maxWidth) || !(maxWidth > 0)) return size;
  return Math.max(MIN_FONT, (size * maxWidth) / width);
}

function drawZone(page, font, zone, character, model, helpers) {
  const { width, height } = page.getSize();
  const left = zone.x * width;
  const top = height - zone.y * height;
  const zoneWidth = zone.w * width;
  const zoneHeight = zone.h * height;
  const fontSize = (zone.size / 100) * height;

  if (zone.kind === "track") {
    const { count, checked } = zoneBoxes(zone, model.tracks, character);
    const box = fontSize;
    const gap = box * 0.25;
    let x = left;
    let y = top - box;
    for (let index = 0; index < count; index += 1) {
      if (x > left && x + box > left + zoneWidth + 0.01) {
        x = left;
        y -= box + gap;
      }
      page.drawRectangle({ x, y, width: box, height: box, borderWidth: 0.75, borderColor: INK, ...(index < checked ? { color: INK } : {}) });
      x += box + gap;
    }
    return;
  }

  const isLong = isLongZone(zone, model.longIds);
  let value = helpers.clean(zoneText(zone, character, model.zones));
  if (!value) return;
  if (!isLong) value = value.replace(/\s*\n\s*/g, " ");
  if (isLong) {
    const lineHeight = fontSize * 1.15;
    helpers.wrap(value, font, fontSize, zoneWidth).forEach((line, index) => {
      if ((index + 1) * lineHeight > zoneHeight + fontSize * 0.3) return;
      if (line) page.drawText(line, { x: left, y: top - fontSize * 0.9 - index * lineHeight, size: fontSize, font, color: INK });
    });
    return;
  }
  const fitted = fitFontSize(font, value, fontSize, zoneWidth);
  const textWidth = font.widthOfTextAtSize(value, fitted);
  const x = zone.kind === "stat" ? left + (zoneWidth - textWidth) / 2 : left;
  page.drawText(value, { x, y: top - zoneHeight / 2 - fitted * 0.35, size: fitted, font, color: INK });
}

/**
 * Ajoute au document une page par page de fond (à la proportion de l'image) avec les valeurs de `character`.
 * `sheet` = { pages, zones } ; `model` = { tracks, textFields } ; `helpers` = { embed(document, url), clean(text), wrap(text, font, size, width) }.
 */
export async function drawSheetPages(document, font, sheet, character, model, helpers) {
  const context = { zones: sheet.zones || [], tracks: model.tracks || [], longIds: new Set((model.textFields || []).filter((field) => field.long).map((field) => field.id)) };
  for (const [pageIndex, background] of sheet.pages.entries()) {
    const width = SHEET_PAGE_WIDTH;
    const height = (width * background.height) / background.width;
    const page = document.addPage([width, height]);
    page.drawImage(await helpers.embed(document, background.url), { x: 0, y: 0, width, height });
    for (const zone of zonesOnPage(sheet.zones, pageIndex)) drawZone(page, font, zone, character, context, helpers);
  }
}
