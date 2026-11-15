// apply-equipment-dedupe-lot6c.mjs : lot 6c : la zone « équipement » de la feuille ne répète plus les armes et les protections quand leurs propres zones sont placées (plus de double impression).
// Usage, depuis la racine du projet :
//   node apply-equipment-dedupe-lot6c.mjs --dry     (vérifie sans rien écrire)
//   node apply-equipment-dedupe-lot6c.mjs           (applique)
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

// Ce lot modifie les zones de la feuille (sheetZones.js).
if (!fs.existsSync(path.join(root, "src/lib/meta/sheetZones.js"))) {
  console.error("Fichier introuvable : src/lib/meta/sheetZones.js.");
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
  "tests/sheetZonesPlaced.test.js": `import { describe, expect, it } from "vitest";
import { infoText, placedLists, zoneText } from "@/lib/meta/sheetZones.js";

const SHEET = {
  equipment: [
    { name: "Kalash", type: "Arme", fields: [] },
    { name: "Gilet", type: "Protection", fields: [] },
    { name: "Corde", type: "Outil", fields: [] },
  ],
};
const info = (ref) => ({ id: ref, kind: "info", ref });

describe("équipement sans doublon", () => {
  it("détecte les listes placées à part", () => {
    expect(placedLists([info("weapons")])).toEqual({ weapons: true, protections: false });
    expect(placedLists(null)).toEqual({ weapons: false, protections: false });
  });
  it("garde tout l'équipement si aucune liste n'est placée", () => {
    expect(infoText("equipment", SHEET).split("\\n")).toHaveLength(3);
  });
  it("retire les armes de l'équipement quand la zone armes existe", () => {
    expect(infoText("equipment", SHEET, placedLists([info("weapons")]))).toBe("Gilet (Protection)\\nCorde (Outil)");
  });
  it("retire aussi les protections quand leur zone existe", () => {
    expect(infoText("equipment", SHEET, placedLists([info("weapons"), info("protections")]))).toBe("Corde (Outil)");
  });
  it("zoneText applique le filtre à la zone équipement seulement", () => {
    const zones = [info("equipment"), info("weapons")];
    expect(zoneText(zones[0], SHEET, zones).includes("Kalash")).toBe(false);
    expect(zoneText(zones[1], SHEET, zones)).toBe("Kalash");
    expect(zoneText(zones[0], SHEET)).toContain("Kalash");
  });
});
`,
};

const EDITS = {
  "sheetZones.js": [
    {
      find: `/** Texte d'une information de la fiche : nom, notes, ou liste (une ligne par compétence, objet d'équipement ou d'inventaire). */
export function infoText(ref, sheet) {`,
      replace: `/**
 * Les listes de la feuille déjà posées à part : { weapons, protections } (true si une zone « armes » ou « protections » existe).
 * Elles servent à ne pas répéter ces objets dans la zone « équipement ».
 */
export function placedLists(zones) {
  const refs = new Set((Array.isArray(zones) ? zones : []).filter((zone) => zone?.kind === "info").map((zone) => zone.ref));
  return { weapons: refs.has("weapons"), protections: refs.has("protections") };
}

/**
 * Texte d'une information de la fiche : nom, notes, ou liste (une ligne par compétence, objet d'équipement ou d'inventaire).
 * \`placed\` (voir placedLists) retire de la liste « équipement » les armes et les protections qui ont leur propre zone.
 */
export function infoText(ref, sheet, placed) {`,
    },
    {
      find: `  if (ref === "equipment") return list.map((item) => itemLine(item, text(item?.type))).filter(Boolean).join("\\n");`,
      replace: `  if (ref === "equipment") {
    const kept = list.filter((item) => {
      const kind = equipmentKind(item);
      return !((kind === "weapon" && placed?.weapons) || (kind === "protection" && placed?.protections));
    });
    return kept.map((item) => itemLine(item, text(item?.type))).filter(Boolean).join("\\n");
  }`,
    },
    {
      find: `/** Texte affiché par une zone « stat », « text » ou « info » pour un personnage ou un PNJ ("" si rien n'est saisi). */
export function zoneText(zone, sheet) {
  if (zone?.kind === "info") return infoText(zone.ref, sheet);`,
      replace: `/**
 * Texte affiché par une zone « stat », « text » ou « info » pour un personnage ou un PNJ ("" si rien n'est saisi).
 * \`zones\` = toutes les zones de la feuille : la zone « équipement » ne répète pas ce qui est déjà dans « armes » ou « protections ».
 */
export function zoneText(zone, sheet, zones) {
  if (zone?.kind === "info") return infoText(zone.ref, sheet, zone.ref === "equipment" ? placedLists(zones) : undefined);`,
    },
  ],
  "SheetZoneContent.jsx": [
    {
      find: `export default function SheetZoneContent({ zone, sheet, tracks, longIds, px, preview, onToggle, unit = "px" }) {`,
      replace: `export default function SheetZoneContent({ zone, zones, sheet, tracks, longIds, px, preview, onToggle, unit = "px" }) {`,
    },
    {
      find: `zoneText(zone, sheet);`,
      replace: `zoneText(zone, sheet, zones);`,
    },
  ],
  "SheetPrintPages.jsx": [
    {
      find: `<SheetZoneContent zone={zone} sheet={character}`,
      replace: `<SheetZoneContent zone={zone} zones={sheet.zones} sheet={character}`,
    },
  ],
  "SheetFaceDialog.jsx": [
    {
      find: `<SheetZoneContent zone={zone} sheet={character}`,
      replace: `<SheetZoneContent zone={zone} zones={zones} sheet={character}`,
    },
  ],
  "sheetPdf.js": [
    {
      find: `function drawZone(page, font, zone, character, model, helpers) {`,
      replace: `function drawZone(page, font, zone, character, model, helpers) {`,
    },
    {
      find: `helpers.clean(zoneText(zone, character));`,
      replace: `helpers.clean(zoneText(zone, character, model.zones));`,
    },
    {
      find: `const context = { tracks: model.tracks || [],`,
      replace: `const context = { zones: sheet.zones || [], tracks: model.tracks || [],`,
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
