// apply-sheet-only-lot5d.mjs : lot 5d : avec une feuille, seule elle s'imprime (plus de double impression) ; nom, notes, compétences, équipement et inventaire placables sur la feuille ; correction de l'erreur de lint de editablePdf.js.
// Usage, depuis la racine du projet :
//   node apply-sheet-only-lot5d.mjs --dry     (vérifie sans rien écrire)
//   node apply-sheet-only-lot5d.mjs           (applique)
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

// Ce lot s'appuie sur le lot 5c (impression avec feuille).
if (!fs.existsSync(path.join(root, "src/lib/print/sheetPdf.js"))) {
  console.error("Appliquez d'abord le lot 5c (fichier absent : src/lib/print/sheetPdf.js).");
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
  "tests/sheetZonesInfo.test.js": `import { describe, expect, it } from "vitest";
import { cleanZones, infoText, isLongZone, newZoneFor, placeableItems, zoneText } from "@/lib/meta/sheetZones.js";

const SHEET = {
  name: " Ivan ",
  notes: "Ancien du métro\\nBlessé",
  skills: [{ name: "Tir", fields: [{ name: "Niveau", value: "2" }] }, { name: "Furtivité", fields: [] }],
  equipment: [{ name: "Kalash", type: "Arme", fields: [{ name: "Dégâts", value: "3" }] }, { name: "Masque", type: "", fields: [] }],
  inventory: [{ id: "i1", name: "Filtre" }, { id: "i2", name: "Eau" }],
};
const zone = (ref, over = {}) => ({ id: \`z-\${ref}\`, kind: "info", ref, page: 0, x: 0.1, y: 0.1, w: 0.2, h: 0.1, size: 1.6, ...over });

describe("informations de la fiche placées sur la feuille", () => {
  it("propose le nom, les notes et les trois listes, avant les éléments du modèle", () => {
    const items = placeableItems({ characteristics: [{ name: "Vigueur" }] });
    expect(items.slice(0, 5).map((item) => item.ref)).toEqual(["name", "notes", "skills", "equipment", "inventory"]);
    expect(items[5].ref).toBe("Vigueur");
  });
  it("garde les zones d'information et refuse une information inconnue", () => {
    const out = cleanZones([zone("name"), zone("skills"), zone("poids")], {});
    expect(out.map((item) => item.ref)).toEqual(["name", "skills"]);
  });
  it("lit le nom et les notes", () => {
    expect(infoText("name", SHEET)).toBe("Ivan");
    expect(infoText("notes", SHEET)).toBe("Ancien du métro\\nBlessé");
  });
  it("écrit une ligne par compétence, équipement ou objet", () => {
    expect(infoText("skills", SHEET)).toBe("Tir (Niveau 2)\\nFurtivité");
    expect(infoText("equipment", SHEET)).toBe("Kalash (Arme, Dégâts 3)\\nMasque");
    expect(infoText("inventory", SHEET)).toBe("- Filtre\\n- Eau");
  });
  it("rend du texte vide pour une fiche vide ou une information inconnue", () => {
    expect(infoText("skills", {})).toBe("");
    expect(infoText("inventory", null)).toBe("");
    expect(infoText("autre", SHEET)).toBe("");
    expect(zoneText(zone("name"), null)).toBe("");
  });
  it("passe par zoneText", () => {
    expect(zoneText(zone("name"), SHEET)).toBe("Ivan");
  });
  it("sait quelles zones passent à la ligne", () => {
    expect(isLongZone(zone("name"), new Set())).toBe(false);
    expect(isLongZone(zone("skills"), new Set())).toBe(true);
    expect(isLongZone({ kind: "text", ref: "f" }, new Set(["f"]))).toBe(true);
    expect(isLongZone({ kind: "stat", ref: "f" }, new Set(["f"]))).toBe(false);
  });
  it("crée une grande zone pour une liste et une petite pour le nom", () => {
    const [name, notes] = placeableItems({});
    expect(newZoneFor(name).h).toBeLessThan(0.05);
    expect(newZoneFor(notes).h).toBeGreaterThan(0.1);
  });
});
`,
};

const EDITS = {
  "sheetZones.js": [
    {
      find: `import { checkedCount } from "@/lib/meta/tracks";`,
      replace: `import { checkedCount } from "@/lib/meta/tracks";
import { cleanInventory, inventoryPrintLine } from "@/lib/meta/inventory";`,
    },
    {
      find: `export const ZONE_KINDS = ["stat", "text", "track"];`,
      replace: `export const ZONE_KINDS = ["stat", "text", "track", "info"];

// Informations propres à chaque fiche (hors modèle) qu'on peut aussi placer : \`long\` = texte sur plusieurs lignes.
export const INFO_ITEMS = [
  { ref: "name", label: "Nom du personnage", long: false },
  { ref: "notes", label: "Notes du personnage", long: true },
  { ref: "skills", label: "Compétences (liste)", long: true },
  { ref: "equipment", label: "Équipement (liste)", long: true },
  { ref: "inventory", label: "Inventaire (liste)", long: true },
];`,
    },
    {
      find: `  const items = [];
  for (const stat of model.characteristics || []) {`,
      replace: `  const items = INFO_ITEMS.map((info) => ({ key: zoneKey({ kind: "info", ref: info.ref }), kind: "info", ref: info.ref, label: info.label, long: info.long }));
  for (const stat of model.characteristics || []) {`,
    },
    {
      find: `  const base = item.kind === "track" ? { w: 0.24, h: 0.03 } : item.kind === "text" && item.long ? { w: 0.4, h: 0.12 } : item.kind === "text" ? { w: 0.25, h: 0.03 } : { w: 0.08, h: 0.03 };`,
      replace: `  const wide = item.kind === "text" || item.kind === "info";
  const base = item.kind === "track" ? { w: 0.24, h: 0.03 } : wide && item.long ? { w: 0.4, h: 0.15 } : wide ? { w: 0.25, h: 0.03 } : { w: 0.08, h: 0.03 };`,
    },
    {
      find: `/** Texte affiché par une zone « stat » ou « text » pour un personnage ou un PNJ ("" si rien n'est saisi). */`,
      replace: `const fieldsText = (fields) =>
  (Array.isArray(fields) ? fields : [])
    .filter((field) => text(field?.name) || text(field?.value))
    .map((field) => (text(field.name) && text(field.value) ? \`\${text(field.name)} \${text(field.value)}\` : text(field.name) || text(field.value)))
    .join(", ");
const itemLine = (item, extra = "") => {
  const detail = [extra, fieldsText(item?.fields)].filter(Boolean).join(", ");
  return detail ? \`\${text(item?.name)} (\${detail})\` : text(item?.name);
};

/** Texte d'une information de la fiche : nom, notes, ou liste (une ligne par compétence, objet d'équipement ou d'inventaire). */
export function infoText(ref, sheet) {
  if (ref === "name") return text(sheet?.name);
  if (ref === "notes") return String(sheet?.notes ?? "").trim();
  const list = Array.isArray(sheet?.[ref]) ? sheet[ref] : [];
  if (ref === "skills") return list.map((skill) => itemLine(skill)).filter(Boolean).join("\\n");
  if (ref === "equipment") return list.map((item) => itemLine(item, text(item?.type))).filter(Boolean).join("\\n");
  if (ref === "inventory") return cleanInventory(sheet?.inventory).map((item) => text(inventoryPrintLine(item))).filter(Boolean).map((line) => \`- \${line}\`).join("\\n");
  return "";
}

/** La zone s'écrit-elle sur plusieurs lignes ? (champ de texte long, notes et listes) */
export const isLongZone = (zone, longIds) => (zone?.kind === "text" ? Boolean(longIds?.has(zone.ref)) : zone?.kind === "info" ? zone.ref !== "name" : false);

/** Texte affiché par une zone « stat », « text » ou « info » pour un personnage ou un PNJ ("" si rien n'est saisi). */`,
    },
    {
      find: `export function zoneText(zone, sheet) {`,
      replace: `export function zoneText(zone, sheet) {
  if (zone?.kind === "info") return infoText(zone.ref, sheet);`,
    },
    {
      find: `  return { pages: list, zones: onPages, covers: onPages.length === zones.length && unplacedItems(model, zones).length === 0 };`,
      replace: `  return { pages: list, zones: onPages };`,
    },
    {
      find: ` * La feuille à imprimer pour un modèle et les pages du fond : { pages, zones, covers }, ou null s'il n'y a rien à poser
 * (aucune zone, aucun fond, ou aucune zone sur une page existante). \`covers\` : toutes les valeurs du modèle sont placées
 * sur la feuille, l'impression peut donc se passer de la liste des caractéristiques, des textes et des cases.`,
      replace: ` * La feuille à imprimer pour un modèle et les pages du fond : { pages, zones }, ou null s'il n'y a rien à poser
 * (aucune zone, aucun fond, ou aucune zone sur une page existante). Avec une feuille, seule elle s'imprime.`,
    },
  ],
  "SheetZoneContent.jsx": [
    {
      find: `import { zoneBoxes, zoneText } from "@/lib/meta/sheetZones";`,
      replace: `import { isLongZone, zoneBoxes, zoneText } from "@/lib/meta/sheetZones";`,
    },
    {
      find: `  const isLong = zone.kind === "text" && longIds?.has(zone.ref);`,
      replace: `  const isLong = isLongZone(zone, longIds);`,
    },
  ],
  "sheetPdf.js": [
    {
      find: `import { zoneBoxes, zoneText, zonesOnPage } from "@/lib/meta/sheetZones";`,
      replace: `import { isLongZone, zoneBoxes, zoneText, zonesOnPage } from "@/lib/meta/sheetZones";`,
    },
    {
      find: `  const isLong = zone.kind === "text" && model.longIds.has(zone.ref);`,
      replace: `  const isLong = isLongZone(zone, model.longIds);`,
    },
  ],
  "editablePdf.js": [
    {
      find: `        // eslint-disable-next-line no-control-regex
        // Les lettres de l'encodage WinAnsi hors Latin-1 (œ, Œ, š, ž, Ÿ, €, ™…) s'impriment bien : seul le reste devient « ? ».`,
      replace: `        // Les lettres de l'encodage WinAnsi hors Latin-1 (œ, Œ, š, ž, Ÿ, €, ™…) s'impriment bien : seul le reste devient « ? ».
        // eslint-disable-next-line no-control-regex`,
    },
    {
      find: `                drawHeading("Fiches de personnages");
                for (const [characterIndex, { character, characteristics, skillRollModifier, tracks = [], textFields = [], sheet = null }] of block.characters.entries()) {
                    if (characterIndex > 0) addPage();
                    if (sheet) {
                        // La page de travail encore vierge laisse la place aux pages de la feuille.
                        if (page && cursorY === PAGE_HEIGHT - MARGIN && document.getPageCount() > 1) document.removePage(document.getPageCount() - 1);
                        await drawSheetPages(document, regular, sheet, character, { tracks, textFields }, { embed: embedImage, clean: safeFieldText, wrap: wrapText });
                        addPage();
                    }
                    drawHeading(character.name, 2);
                    if (!sheet?.covers) drawHeading("Caractéristiques", 3);
                    if (!sheet?.covers) drawCharacteristics(`,
      replace: `                if (!block.characters[0]?.sheet) drawHeading("Fiches de personnages");
                // Une page de feuille (fond + valeurs) remplace la fiche en liste : seule elle est imprimée.
                let sheetDrawn = false;
                for (const [characterIndex, { character, characteristics, skillRollModifier, tracks = [], textFields = [], sheet = null }] of block.characters.entries()) {
                    if (sheet) {
                        // La page de travail encore vierge laisse la place aux pages de la feuille.
                        if (!sheetDrawn && page && cursorY === PAGE_HEIGHT - MARGIN && document.getPageCount() > 1) document.removePage(document.getPageCount() - 1);
                        await drawSheetPages(document, regular, sheet, character, { tracks, textFields }, { embed: embedImage, clean: safeFieldText, wrap: wrapText });
                        sheetDrawn = true;
                        continue;
                    }
                    if (characterIndex > 0 || sheetDrawn) addPage();
                    sheetDrawn = false;
                    drawHeading(character.name, 2);
                    drawHeading("Caractéristiques", 3);
                    drawCharacteristics(`,
    },
    {
      find: `sheet?.covers ? [] : textRows(`,
      replace: `textRows(`,
    },
    {
      find: `sheet?.covers ? [] : trackRows(`,
      replace: `trackRows(`,
    },
  ],
  "PrintSheet.jsx": [
    {
      find: `                        <article className="prt-character" key={character.id}>
                            <h3 className="prt-group">{character.name}</h3>`,
      replace: `                        <article className="prt-character" key={character.id}>
                            {!sheet && <h3 className="prt-group">{character.name}</h3>}`,
    },
    {
      find: `    // Quand la feuille couvre tout le modèle, ses pages remplacent la liste des caractéristiques, des textes et des cases.
    const covered = sheet?.covers === true;
    const trackLines = covered ? [] : trackRows(tracks, character.checks);
    const textLines = covered ? [] : textRows(textFields, character.texts).filter((row) => row.value);`,
      replace: `    // Avec une feuille, l'impression se limite à ses pages (fond + valeurs) : pas de seconde version en liste.
    if (sheet) return <SheetPrintPages sheet={sheet} character={character} tracks={tracks} textFields={textFields} />;
    const trackLines = trackRows(tracks, character.checks);
    const textLines = textRows(textFields, character.texts).filter((row) => row.value);`,
    },
    {
      find: `            {sheet && <SheetPrintPages sheet={sheet} character={character} tracks={tracks} textFields={textFields} />}
`,
      replace: ``,
    },
    {
      find: `{stats.length > 0 && !covered && (`,
      replace: `{stats.length > 0 && (`,
    },
    {
      find: `                <header className="prt-header">
                    <h1>{character.name}</h1>
                    <p>{campaignName} · Fiche de personnage</p>
                </header>`,
      replace: `                {!sheet && (
                    <header className="prt-header">
                        <h1>{character.name}</h1>
                        <p>{campaignName} · Fiche de personnage</p>
                    </header>
                )}`,
    },
  ],
  "sheetZones.test.js": [
    {
      find: `expect(newZoneFor(placeableItems(MODEL)[1]).field).toBe("Maximum");`,
      replace: `expect(newZoneFor(placeableItems(MODEL).find((entry) => entry.field)).field).toBe("Maximum");`,
    },
    {
      find: `toEqual(["Vigueur", "Vigueur · Maximum", "Agilité", "Nom", "Notes", "Stress"]);`,
      replace: `toEqual(["Nom du personnage", "Notes du personnage", "Compétences (liste)", "Équipement (liste)", "Inventaire (liste)", "Vigueur", "Vigueur · Maximum", "Agilité", "Nom", "Notes", "Stress"]);`,
    },
    {
      find: `    expect(placeableItems()).toEqual([]);
    expect(placeableItems({ characteristics: [{ name: "  " }] })).toEqual([]);`,
      replace: `    expect(placeableItems().map((item) => item.kind)).toEqual(["info", "info", "info", "info", "info"]);
    expect(placeableItems({ characteristics: [{ name: "  " }] })).toHaveLength(5);`,
    },
    {
      find: `toEqual(["Vigueur · Maximum", "Agilité", "Nom", "Notes", "Stress"]);`,
      replace: `toEqual(["Nom du personnage", "Notes du personnage", "Compétences (liste)", "Équipement (liste)", "Inventaire (liste)", "Vigueur · Maximum", "Agilité", "Nom", "Notes", "Stress"]);`,
    },
    {
      find: `expect(unplacedItems(MODEL, [])).toHaveLength(6);`,
      replace: `expect(unplacedItems(MODEL, [])).toHaveLength(11);`,
    },
    {
      find: `toEqual({ placed: 2, total: 6 });`,
      replace: `toEqual({ placed: 2, total: 11 });`,
    },
  ],
  "sheetZonesPrint.test.js": [
    {
      find: `  it("dit si la feuille couvre tout le modèle", () => {
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
      replace: `});`,
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
