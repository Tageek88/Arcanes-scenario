// apply-equipment-lot5e.mjs : lot 5e : « Compléter » à la place de « Reprendre » dans les avertissements du catalogue ; armes et protections distinguées (types « Arme » / « Protection » proposés, listes séparées à placer sur la feuille).
// Usage, depuis la racine du projet :
//   node apply-equipment-lot5e.mjs --dry     (vérifie sans rien écrire)
//   node apply-equipment-lot5e.mjs           (applique)
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

// Ce lot s'appuie sur le lot 5d (informations placables).
if (!fs.existsSync(path.join(root, "tests/sheetZonesInfo.test.js"))) {
  console.error("Appliquez d'abord le lot 5d (fichier absent : tests/sheetZonesInfo.test.js).");
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
  "tests/sheetZonesEquipment.test.js": `import { describe, expect, it } from "vitest";
import { equipmentKind, infoText, placeableItems } from "@/lib/meta/sheetZones.js";

const SHEET = {
  equipment: [
    { name: "Kalash", type: "Arme", fields: [{ name: "Dégâts", value: "3" }] },
    { name: "Revolver", type: "arme à feu", fields: [] },
    { name: "Gilet", type: "Protection", fields: [{ name: "Max", value: "2" }] },
    { name: "Armure de plaques", type: "Armures", fields: [] },
    { name: "Corde", type: "Outil", fields: [] },
    { name: "Briquet", type: "", fields: [] },
  ],
};

describe("armes et protections", () => {
  it("reconnaît la sorte d'après le type, sans tenir compte des accents ni de la casse", () => {
    expect(equipmentKind({ type: "Arme" })).toBe("weapon");
    expect(equipmentKind({ type: "  ARMES blanches" })).toBe("weapon");
    expect(equipmentKind({ type: "Protection" })).toBe("protection");
    expect(equipmentKind({ type: "Armure" })).toBe("protection");
    expect(equipmentKind({ type: "Outil" })).toBe("other");
    expect(equipmentKind({})).toBe("other");
    expect(equipmentKind(null)).toBe("other");
  });
  it("sépare les armes des protections dans les listes de la feuille", () => {
    expect(infoText("weapons", SHEET)).toBe("Kalash (Dégâts 3)\\nRevolver");
    expect(infoText("protections", SHEET)).toBe("Gilet (Max 2)\\nArmure de plaques");
  });
  it("garde la liste complète avec le type", () => {
    expect(infoText("equipment", SHEET).split("\\n")).toHaveLength(6);
    expect(infoText("equipment", SHEET)).toContain("Kalash (Arme, Dégâts 3)");
  });
  it("rend du vide sans équipement", () => {
    expect(infoText("weapons", {})).toBe("");
    expect(infoText("protections", null)).toBe("");
  });
  it("propose les deux listes à placer", () => {
    const refs = placeableItems({}).map((item) => item.ref);
    expect(refs).toContain("weapons");
    expect(refs).toContain("protections");
  });
});
`,
};

const EDITS = {
  "sheetZones.js": [
    {
      find: `  const list = Array.isArray(sheet?.[ref]) ? sheet[ref] : [];`,
      replace: `  const source = ref === "weapons" || ref === "protections" ? "equipment" : ref;
  const list = Array.isArray(sheet?.[source]) ? sheet[source] : [];`,
    },
    {
      find: `  { ref: "equipment", label: "Équipement (liste)", long: true },`,
      replace: `  { ref: "equipment", label: "Équipement (liste)", long: true },
  { ref: "weapons", label: "Armes (liste)", long: true },
  { ref: "protections", label: "Protections (liste)", long: true },`,
    },
    {
      find: `/** Texte d'une information de la fiche : nom, notes, ou liste (une ligne par compétence, objet d'équipement ou d'inventaire). */`,
      replace: `const plain = (value) => text(value).normalize("NFD").replace(/\\p{M}/gu, "").toLowerCase();

/**
 * Sorte d'un objet d'équipement d'après son type : "weapon" (type commençant par « arme »), "protection" (« protection »,
 * « armure », « gilet »…) ou "other". Le type reste un texte libre : « Arme à feu » ou « Armes » comptent comme armes.
 */
export function equipmentKind(item) {
  const type = plain(item?.type);
  if (/^arme/.test(type)) return "weapon";
  if (/^(protection|armure|gilet|blindage)/.test(type)) return "protection";
  return "other";
}

/** Texte d'une information de la fiche : nom, notes, ou liste (une ligne par compétence, objet d'équipement ou d'inventaire). */`,
    },
    {
      find: `  if (ref === "equipment") return list.map((item) => itemLine(item, text(item?.type))).filter(Boolean).join("\\n");`,
      replace: `  if (ref === "equipment") return list.map((item) => itemLine(item, text(item?.type))).filter(Boolean).join("\\n");
  // Armes et protections : le type est connu par la liste elle-même, la ligne ne le répète pas.
  if (ref === "weapons") return list.filter((item) => equipmentKind(item) === "weapon").map((item) => itemLine(item)).filter(Boolean).join("\\n");
  if (ref === "protections") return list.filter((item) => equipmentKind(item) === "protection").map((item) => itemLine(item)).filter(Boolean).join("\\n");`,
    },
  ],
  "GameCharacterEditor.jsx": [
    {
      find: `    () => [...new Set(equipmentCatalog.map((item) => item.type).filter(Boolean))],`,
      replace: `    // « Arme » et « Protection » sont toujours proposés : la feuille les place séparément.
    () => [...new Set(["Arme", "Protection", ...equipmentCatalog.map((item) => item.type).filter(Boolean)])],`,
    },
    {
      find: `La compétence « \${known.name} » existe déjà dans le catalogue. Reprendre ses champs ?\`,
      confirmLabel: "Reprendre",`,
      replace: `La compétence « \${known.name} » existe déjà dans le catalogue. Compléter avec ses champs ?\`,
      confirmLabel: "Compléter",`,
    },
    {
      find: `L’équipement « \${known.name} » existe déjà dans le catalogue. Reprendre ses champs ?\`,
      confirmLabel: "Reprendre",`,
      replace: `L’équipement « \${known.name} » existe déjà dans le catalogue. Compléter avec ses champs ?\`,
      confirmLabel: "Compléter",`,
    },
    {
      find: `Les champs facultatifs déjà connus pour un type sont proposés vides pour un nouvel objet.</p>`,
      replace: `Les champs facultatifs déjà connus pour un type sont proposés vides pour un nouvel objet. Les types « Arme » et « Protection » se placent séparément sur la feuille.</p>`,
    },
  ],
  "sheetZones.test.js": [
    {
      find: `toEqual(["Nom du personnage", "Notes du personnage", "Compétences (liste)", "Équipement (liste)", "Inventaire (liste)", "Vigueur", `,
      replace: `toEqual(["Nom du personnage", "Notes du personnage", "Compétences (liste)", "Équipement (liste)", "Armes (liste)", "Protections (liste)", "Inventaire (liste)", "Vigueur", `,
    },
    {
      find: `toEqual(["info", "info", "info", "info", "info"]);`,
      replace: `toEqual(["info", "info", "info", "info", "info", "info", "info"]);`,
    },
    {
      find: `{ characteristics: [{ name: "  " }] })).toHaveLength(5);`,
      replace: `{ characteristics: [{ name: "  " }] })).toHaveLength(7);`,
    },
    {
      find: `toEqual(["Nom du personnage", "Notes du personnage", "Compétences (liste)", "Équipement (liste)", "Inventaire (liste)", "Vigueur · Maximum", `,
      replace: `toEqual(["Nom du personnage", "Notes du personnage", "Compétences (liste)", "Équipement (liste)", "Armes (liste)", "Protections (liste)", "Inventaire (liste)", "Vigueur · Maximum", `,
    },
    {
      find: `expect(unplacedItems(MODEL, [])).toHaveLength(11);`,
      replace: `expect(unplacedItems(MODEL, [])).toHaveLength(13);`,
    },
    {
      find: `toEqual({ placed: 2, total: 11 });`,
      replace: `toEqual({ placed: 2, total: 13 });`,
    },
  ],
  "sheetZonesInfo.test.js": [
    {
      find: `    expect(items.slice(0, 5).map((item) => item.ref)).toEqual(["name", "notes", "skills", "equipment", "inventory"]);
    expect(items[5].ref).toBe("Vigueur");`,
      replace: `    expect(items.slice(0, 7).map((item) => item.ref)).toEqual(["name", "notes", "skills", "equipment", "weapons", "protections", "inventory"]);
    expect(items[7].ref).toBe("Vigueur");`,
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
