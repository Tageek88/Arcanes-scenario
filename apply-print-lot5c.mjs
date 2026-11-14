// apply-print-lot5c.mjs : lot 5c, impression et PDF : la feuille (fond + valeurs placées) sur les pages imprimées et dans le PDF, « œ » correctement écrit dans le PDF.
// Usage, depuis la racine du projet :
//   node apply-print-lot5c.mjs --dry     (vérifie sans rien écrire)
//   node apply-print-lot5c.mjs           (applique)
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

// Ce lot s'appuie sur le lot 5b (zones des valeurs).
if (!fs.existsSync(path.join(root, "src/lib/meta/sheetZones.js"))) {
  console.error("Appliquez d'abord le lot 5b (fichier absent : src/lib/meta/sheetZones.js).");
  process.exit(1);
}

// Retrouve un fichier du projet par son nom (une seule correspondance attendue sous src/).
function findInSrc(name) {
  const hits = ["src", "tests"].flatMap((dir) =>
    fs.existsSync(path.join(root, dir))
      ? fs.readdirSync(path.join(root, dir), { recursive: true })
          .map(String)
          .filter((file) => path.basename(file) === name && !file.split(path.sep).includes("node_modules"))
          .map((file) => path.join(dir, file))
      : []
  );
  return hits.length === 1 ? hits[0] : null;
}

const NEW_FILES = {
  "src/lib/print/sheetPdf.js": `import { rgb } from "pdf-lib";
import { zoneBoxes, zoneText, zonesOnPage } from "@/lib/meta/sheetZones";

// Pages de feuille du PDF : le fond de la campagne en pleine page, les valeurs de la fiche posées aux zones choisies.

export const SHEET_PAGE_WIDTH = 595.28;
const INK = rgb(0.07, 0.09, 0.15);
const MIN_FONT = 4;

/** Taille de police réduite si le texte dépasse \`maxWidth\` (jamais sous MIN_FONT). */
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

  const isLong = zone.kind === "text" && model.longIds.has(zone.ref);
  let value = helpers.clean(zoneText(zone, character));
  if (!value) return;
  if (!isLong) value = value.replace(/\\s*\\n\\s*/g, " ");
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
 * Ajoute au document une page par page de fond (à la proportion de l'image) avec les valeurs de \`character\`.
 * \`sheet\` = { pages, zones } ; \`model\` = { tracks, textFields } ; \`helpers\` = { embed(document, url), clean(text), wrap(text, font, size, width) }.
 */
export async function drawSheetPages(document, font, sheet, character, model, helpers) {
  const context = { tracks: model.tracks || [], longIds: new Set((model.textFields || []).filter((field) => field.long).map((field) => field.id)) };
  for (const [pageIndex, background] of sheet.pages.entries()) {
    const width = SHEET_PAGE_WIDTH;
    const height = (width * background.height) / background.width;
    const page = document.addPage([width, height]);
    page.drawImage(await helpers.embed(document, background.url), { x: 0, y: 0, width, height });
    for (const zone of zonesOnPage(sheet.zones, pageIndex)) drawZone(page, font, zone, character, context, helpers);
  }
}
`,
  "src/components/print/SheetPrintPages.jsx": `import React, { useMemo } from "react";
import SheetZoneContent from "@/components/game/SheetZoneContent";
import { zonesOnPage } from "@/lib/meta/sheetZones";

// Taille maximale d'une page de feuille imprimée : la zone utile d'une page A4 (marges de 15 mm).
const MAX_WIDTH_MM = 180;
const MAX_HEIGHT_MM = 260;
const EXACT = { WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" };

/**
 * Les pages du fond de la campagne avec les valeurs d'une fiche, pour l'impression : tailles en millimètres, une page de feuille
 * par page de papier. \`sheet\` = { pages, zones } ; \`tracks\` et \`textFields\` viennent du modèle.
 */
export default function SheetPrintPages({ sheet, character, tracks, textFields }) {
  const longIds = useMemo(() => new Set((textFields || []).filter((field) => field.long).map((field) => field.id)), [textFields]);
  if (!sheet?.pages?.length) return null;
  return (
    <>
      {sheet.pages.map((page, pageIndex) => {
        const widthMm = Math.min(MAX_WIDTH_MM, (MAX_HEIGHT_MM * page.width) / page.height);
        const heightMm = (widthMm * page.height) / page.width;
        const mm = (size) => (heightMm * Number(size || 0)) / 100;
        return (
          <div
            key={page.id}
            style={{ position: "relative", width: \`\${widthMm}mm\`, height: \`\${heightMm}mm\`, breakInside: "avoid", breakAfter: "page", pageBreakAfter: "always", ...EXACT }}
          >
            <img src={page.url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", ...EXACT }} />
            {zonesOnPage(sheet.zones, pageIndex).map((zone) => (
              <div key={zone.id} style={{ position: "absolute", left: \`\${zone.x * 100}%\`, top: \`\${zone.y * 100}%\`, width: \`\${zone.w * 100}%\`, height: \`\${zone.h * 100}%\` }}>
                <SheetZoneContent zone={zone} sheet={character} tracks={tracks} longIds={longIds} px={mm} unit="mm" />
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}
`,
  "tests/sheetZonesPrint.test.js": `import { describe, expect, it } from "vitest";
import { sheetForPrint } from "@/lib/meta/sheetZones.js";

const MODEL = { characteristics: [{ name: "Vigueur", field_names: [] }], tracks: [{ id: "t1", name: "Stress", count: 5 }], textFields: [] };
const zone = (over = {}) => ({ id: "z1", kind: "stat", ref: "Vigueur", page: 0, x: 0.1, y: 0.1, w: 0.1, h: 0.05, size: 2, ...over });
const PAGES = [{ id: "p1", width: 100, height: 200, url: "data:image/png;base64,AAAA" }];

describe("sheetForPrint", () => {
  it("rend null sans zones ou sans fond", () => {
    expect(sheetForPrint({ ...MODEL, zones: [] }, PAGES)).toBeNull();
    expect(sheetForPrint({ ...MODEL, zones: [zone()] }, [])).toBeNull();
    expect(sheetForPrint(null, PAGES)).toBeNull();
    expect(sheetForPrint({ ...MODEL, zones: [zone()] })).toBeNull();
  });
  it("garde les zones des pages qui existent", () => {
    const out = sheetForPrint({ ...MODEL, zones: [zone(), zone({ id: "z2", kind: "track", ref: "t1", page: 2 })] }, PAGES);
    expect(out.zones.map((item) => item.id)).toEqual(["z1"]);
    expect(out.pages).toEqual(PAGES);
  });
  it("dit si la feuille couvre tout le modèle", () => {
    const all = [zone(), zone({ id: "z2", kind: "track", ref: "t1" })];
    expect(sheetForPrint({ ...MODEL, zones: all }, PAGES).covers).toBe(true);
    expect(sheetForPrint({ ...MODEL, zones: [zone()] }, PAGES).covers).toBe(false);
  });
  it("ne couvre pas tout si une zone est sur une page absente", () => {
    const all = [zone(), zone({ id: "z2", kind: "track", ref: "t1", page: 3 })];
    expect(sheetForPrint({ ...MODEL, zones: all }, PAGES).covers).toBe(false);
  });
});
`,
};

const EDITS = {
  "sheetZones.js": [
    {
      find: `/** Résumé pour l'éditeur : « 12 valeurs placées sur 34 ». */`,
      replace: `/**
 * La feuille à imprimer pour un modèle et les pages du fond : { pages, zones, covers }, ou null s'il n'y a rien à poser
 * (aucune zone, aucun fond, ou aucune zone sur une page existante). \`covers\` : toutes les valeurs du modèle sont placées
 * sur la feuille, l'impression peut donc se passer de la liste des caractéristiques, des textes et des cases.
 */
export function sheetForPrint(model, pages) {
  const zones = Array.isArray(model?.zones) ? model.zones : [];
  const list = Array.isArray(pages) ? pages : [];
  if (zones.length === 0 || list.length === 0) return null;
  const onPages = zones.filter((zone) => zone.page < list.length);
  if (onPages.length === 0) return null;
  return { pages: list, zones: onPages, covers: onPages.length === zones.length && unplacedItems(model, zones).length === 0 };
}

/** Résumé pour l'éditeur : « 12 valeurs placées sur 34 ». */`,
    },
  ],
  "SheetZoneContent.jsx": [
    {
      find: `export default function SheetZoneContent({ zone, sheet, tracks, longIds, px, preview, onToggle }) {
  const fontSize = px(zone.size);`,
      replace: `export default function SheetZoneContent({ zone, sheet, tracks, longIds, px, preview, onToggle, unit = "px" }) {
  const fontSize = px(zone.size);
  const css = (value) => \`\${value}\${unit}\`;
  const exact = { WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" };`,
    },
    {
      find: `    const box = Math.max(4, fontSize);`,
      replace: `    const box = unit === "px" ? Math.max(4, fontSize) : fontSize;`,
    },
    {
      find: `style={{ gap: box * 0.25 }}>`,
      replace: `style={{ gap: css(box * 0.25) }}>`,
    },
    {
      find: `          const style = { width: box, height: box, border: \`1px solid \${INK}\`, background: on ? INK : "transparent", borderRadius: 2 };`,
      replace: `          const style = { width: css(box), height: css(box), border: \`1px solid \${INK}\`, background: on ? INK : "transparent", borderRadius: 2, ...exact };`,
    },
    {
      find: `        fontSize,
        lineHeight: 1.15,`,
      replace: `        fontSize: css(fontSize),
        lineHeight: 1.15,`,
    },
  ],
  "editablePdf.js": [
    {
      find: `import { textRows } from "@/lib/meta/textFields";`,
      replace: `import { textRows } from "@/lib/meta/textFields";
import { drawSheetPages } from "@/lib/print/sheetPdf";`,
    },
    {
      find: `        .replace(/[^\\u0000-\\u00FF]/g, "?");`,
      replace: `        // Les lettres de l'encodage WinAnsi hors Latin-1 (œ, Œ, š, ž, Ÿ, €, ™…) s'impriment bien : seul le reste devient « ? ».
        .replace(/[^\\u0000-\\u00FF\\u0152\\u0153\\u0160\\u0161\\u0178\\u017D\\u017E\\u0192\\u02C6\\u02DC\\u2020\\u2021\\u2030\\u2039\\u203A\\u20AC\\u2122]/g, "?");`,
    },
    {
      find: `                for (const [characterIndex, { character, characteristics, skillRollModifier, tracks = [], textFields = [] }] of block.characters.entries()) {
                    if (characterIndex > 0) addPage();
                    drawHeading(character.name, 2);
                    drawHeading("Caractéristiques", 3);
                    drawCharacteristics(
                        characteristics.map((definition) => {
                            const values = character.characteristics?.[definition.name] || {};
                            const rows = [["Valeur", values.value]];
                            (values.fields || []).forEach((field) => {
                                if (field.name || field.value) rows.push([field.name, field.value]);
                            });
                            return { name: definition.name, rows };
                        })
                    );
                    const textLines = textRows(textFields, character.texts);
                    if (textLines.length) {`,
      replace: `                for (const [characterIndex, { character, characteristics, skillRollModifier, tracks = [], textFields = [], sheet = null }] of block.characters.entries()) {
                    if (characterIndex > 0) addPage();
                    if (sheet) {
                        // La page de travail encore vierge laisse la place aux pages de la feuille.
                        if (page && cursorY === PAGE_HEIGHT - MARGIN && document.getPageCount() > 1) document.removePage(document.getPageCount() - 1);
                        await drawSheetPages(document, regular, sheet, character, { tracks, textFields }, { embed: embedImage, clean: safeFieldText, wrap: wrapText });
                        addPage();
                    }
                    drawHeading(character.name, 2);
                    if (!sheet?.covers) drawHeading("Caractéristiques", 3);
                    if (!sheet?.covers) drawCharacteristics(
                        characteristics.map((definition) => {
                            const values = character.characteristics?.[definition.name] || {};
                            const rows = [["Valeur", values.value]];
                            (values.fields || []).forEach((field) => {
                                if (field.name || field.value) rows.push([field.name, field.value]);
                            });
                            return { name: definition.name, rows };
                        })
                    );
                    const textLines = sheet?.covers ? [] : textRows(textFields, character.texts);
                    if (textLines.length) {`,
    },
    {
      find: `                    const trackLines = trackRows(tracks, character.checks);
                    if (trackLines.length) {
                        drawHeading("Cases à cocher", 3);`,
      replace: `                    const trackLines = sheet?.covers ? [] : trackRows(tracks, character.checks);
                    if (trackLines.length) {
                        drawHeading("Cases à cocher", 3);`,
    },
  ],
  "PrintSheet.jsx": [
    {
      find: `import { textRows } from "@/lib/meta/textFields";`,
      replace: `import { textRows } from "@/lib/meta/textFields";
import SheetPrintPages from "@/components/print/SheetPrintPages";`,
    },
    {
      find: `                    {block.characters.map(({ character, characteristics, skillRollModifier, tracks, textFields }) => (`,
      replace: `                    {block.characters.map(({ character, characteristics, skillRollModifier, tracks, textFields, sheet }) => (`,
    },
    {
      find: `                                tracks={tracks}
                                textFields={textFields}
                            />
                        </article>`,
      replace: `                                tracks={tracks}
                                textFields={textFields}
                                sheet={sheet}
                            />
                        </article>`,
    },
    {
      find: `function CharacterContent({ character, characteristics, skillRollModifier, tracks = [], textFields = [] }) {
    const trackLines = trackRows(tracks, character.checks);
    const textLines = textRows(textFields, character.texts).filter((row) => row.value);`,
      replace: `function CharacterContent({ character, characteristics, skillRollModifier, tracks = [], textFields = [], sheet = null }) {
    // Quand la feuille couvre tout le modèle, ses pages remplacent la liste des caractéristiques, des textes et des cases.
    const covered = sheet?.covers === true;
    const trackLines = covered ? [] : trackRows(tracks, character.checks);
    const textLines = covered ? [] : textRows(textFields, character.texts).filter((row) => row.value);`,
    },
    {
      find: `    return (
        <>
            {stats.length > 0 && (`,
      replace: `    return (
        <>
            {sheet && <SheetPrintPages sheet={sheet} character={character} tracks={tracks} textFields={textFields} />}
            {stats.length > 0 && !covered && (`,
    },
    {
      find: `        const { character, campaignName, characteristics, skillRollModifier, tracks, textFields } = model;`,
      replace: `        const { character, campaignName, characteristics, skillRollModifier, tracks, textFields, sheet } = model;`,
    },
    {
      find: `                    tracks={tracks}
                    textFields={textFields}
                />
            </div>`,
      replace: `                    tracks={tracks}
                    textFields={textFields}
                    sheet={sheet}
                />
            </div>`,
    },
  ],
  "printModel.js": [
    {
      find: `import { textRows } from "@/lib/meta/textFields";`,
      replace: `import { textRows } from "@/lib/meta/textFields";
import { sheetForPrint } from "@/lib/meta/sheetZones";`,
    },
    {
      find: `relations, characters = [], gameSheetModel } = data;`,
      replace: `relations, characters = [], gameSheetModel, sheetPages } = data;`,
    },
    {
      find: `    const selectedCharacters = characters
        .filter((character) => characterIds.has(character.id))`,
      replace: `    // Feuille de la campagne (fond + zones) : posée sous les valeurs de chaque fiche quand le placement est fait.
    const printSheet = sheetForPrint(gameSheetModel, sheetPages);
    const selectedCharacters = characters
        .filter((character) => characterIds.has(character.id))`,
    },
    {
      find: `            ...(gameSheetModel?.textFields?.length ? { textFields: gameSheetModel.textFields } : {}),
        }));`,
      replace: `            ...(gameSheetModel?.textFields?.length ? { textFields: gameSheetModel.textFields } : {}),
            ...(printSheet ? { sheet: printSheet } : {}),
        }));`,
    },
  ],
  "loadPrintData.js": [
    {
      find: `import { loadRelations } from "@/lib/services/npcRelations";`,
      replace: `import { loadRelations } from "@/lib/services/npcRelations";
import { loadSheetBackground } from "@/lib/services/sheetBackgroundStore";`,
    },
    {
      find: `  const [campaign, quests, acts, scenes, npcs, locations, clues, notes, tables, sessions, characters, models, relations] =`,
      replace: `  const [campaign, quests, acts, scenes, npcs, locations, clues, notes, tables, sessions, characters, models, relations, sheetPages] =`,
    },
    {
      find: `      loadRelations(campaignId),
    ]);`,
      replace: `      loadRelations(campaignId),
      // Fond de la feuille de personnage : sans lui (ou en cas d'erreur), l'impression reste celle par liste.
      loadSheetBackground(campaignId).catch(() => []),
    ]);`,
    },
    {
      find: `    relations,
  };`,
      replace: `    relations,
    sheetPages,
  };`,
    },
  ],
  "Jeu.jsx": [
    {
      find: `import SheetZonesDialog from "@/components/game/SheetZonesDialog";`,
      replace: `import SheetZonesDialog from "@/components/game/SheetZonesDialog";
import { loadSheetBackground } from "@/lib/services/sheetBackgroundStore";
import { sheetForPrint } from "@/lib/meta/sheetZones";`,
    },
    {
      find: `  const [characterToPrint, setCharacterToPrint] = useState(null);`,
      replace: `  const [characterToPrint, setCharacterToPrint] = useState(null);
  // Pages du fond de feuille chargées pour l'impression d'une fiche (vide s'il n'y a pas de placement).
  const [printPages, setPrintPages] = useState([]);`,
    },
    {
      find: `    const print = async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
      if (!cancelled) window.print();
    };
    print();
    const done = () => setCharacterToPrint(null);`,
      replace: `    const print = async () => {
      let delay = 80;
      if (model.zones.length > 0) {
        const pages = await loadSheetBackground(campaignId).catch(() => []);
        if (cancelled) return;
        setPrintPages(pages);
        // Les grandes images ont besoin d'un instant pour s'afficher avant l'impression.
        if (pages.length > 0) delay = 400;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      if (!cancelled) window.print();
    };
    print();
    const done = () => {
      setCharacterToPrint(null);
      setPrintPages([]);
    };`,
    },
    {
      find: `            textFields: model.textFields,
          }}`,
      replace: `            textFields: model.textFields,
            sheet: sheetForPrint(model, printPages),
          }}`,
    },
    {
      find: `  }, [characterToPrint]);`,
      replace: `    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterToPrint]);`,
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
