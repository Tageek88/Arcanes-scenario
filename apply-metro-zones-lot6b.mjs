// apply-metro-zones-lot6b.mjs : lot 6b : le système Metro 2033 fourni arrive avec les positions des valeurs sur la feuille (d'après votre export), des armes et une protection d'exemple ; le champ « Talents » est retiré (la liste de compétences se place sur la feuille).
// Usage, depuis la racine du projet :
//   node apply-metro-zones-lot6b.mjs --dry     (vérifie sans rien écrire)
//   node apply-metro-zones-lot6b.mjs           (applique)
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

// Ce lot modifie le système Metro fourni (builtinSystems.js, lot 6).
if (!fs.existsSync(path.join(root, "src/lib/meta/builtinSystems.js"))) {
  console.error("Fichier introuvable : src/lib/meta/builtinSystems.js.");
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
};

const EDITS = {
  "builtinSystems.js": [
    {
      find: `  field("talents", "Talents", true),
`,
      replace: ``,
    },
    {
      find: `ids: ["talents", "blessures", "traumatismes", "notes"]`,
      replace: `ids: ["blessures", "traumatismes", "notes"]`,
    },
    {
      find: `export const BUILTIN_SYSTEMS = [`,
      replace: `// Positions des valeurs sur la feuille officielle (fractions de page) : elles ne contiennent aucune illustration,
// chacun importe sa propre feuille comme fond (voir « Fond de feuille »).
const METRO_ZONES = [
  { id: "zb360c85f503d", kind: "stat", ref: "Vigueur", field: "Maximum", page: 0, x: 0.487, y: 0.4136, w: 0.0295, h: 0.03, size: 1.6 },
  { id: "za622f0493891", kind: "stat", ref: "Bricolage", page: 0, x: 0.3978, y: 0.3454, w: 0.0248, h: 0.0315, size: 1.6 },
  { id: "zb3d806b5d9b0", kind: "stat", ref: "Corps à corps", page: 0, x: 0.4894, y: 0.3044, w: 0.0248, h: 0.03, size: 1.6 },
  { id: "z2f53321bde6f", kind: "stat", ref: "Endurance", page: 0, x: 0.5811, y: 0.3469, w: 0.0271, h: 0.0346, size: 1.6 },
  { id: "z73ce9e33ddb8", kind: "stat", ref: "Agilité", field: "Maximum", page: 0, x: 0.5469, y: 0.4835, w: 0.0248, h: 0.033, size: 1.6 },
  { id: "zfc40614a4c33", kind: "stat", ref: "Furtivité", page: 0, x: 0.6457, y: 0.4334, w: 0.0248, h: 0.03, size: 1.6 },
  { id: "z578fe0adf6c7", kind: "stat", ref: "Réaction", page: 0, x: 0.6857, y: 0.4835, w: 0.0294, h: 0.0315, size: 1.6 },
  { id: "zb965a7c453b9", kind: "stat", ref: "Tir", page: 0, x: 0.6421, y: 0.5336, w: 0.0318, h: 0.0361, size: 1.6 },
  { id: "z63f8759eba66", kind: "stat", ref: "Empathie", field: "Maximum", page: 0, x: 0.4882, y: 0.5563, w: 0.0271, h: 0.03, size: 1.6 },
  { id: "ze6fd26d742a9", kind: "stat", ref: "Analyse", page: 0, x: 0.3965, y: 0.6216, w: 0.0283, h: 0.03, size: 1.6 },
  { id: "zc88944f4b9fe", kind: "stat", ref: "Manipulation", page: 0, x: 0.4894, y: 0.6626, w: 0.0236, h: 0.0346, size: 1.6 },
  { id: "zcf197a7886bd", kind: "stat", ref: "Soins", page: 0, x: 0.5799, y: 0.6246, w: 0.0248, h: 0.03, size: 1.6 },
  { id: "z48c69b8db8b7", kind: "stat", ref: "Esprit", field: "Maximum", page: 0, x: 0.4295, y: 0.4835, w: 0.0283, h: 0.0361, size: 1.6 },
  { id: "z794894a30b15", kind: "stat", ref: "Observation", page: 0, x: 0.2908, y: 0.4819, w: 0.0248, h: 0.033, size: 1.6 },
  { id: "z240e20f37bb2", kind: "stat", ref: "Compréhension", page: 0, x: 0.3307, y: 0.4319, w: 0.0236, h: 0.0346, size: 1.6 },
  { id: "zc80d6655200e", kind: "stat", ref: "Survie", page: 0, x: 0.3296, y: 0.5366, w: 0.0259, h: 0.03, size: 1.6 },
  { id: "z0ea1f12512a0", kind: "text", ref: "archetype", page: 0, x: 0.5066, y: 0.0327, w: 0.1489, h: 0.0315, size: 1.6 },
  { id: "z2df9962c79f9", kind: "text", ref: "age", page: 0, x: 0.3491, y: 0.0828, w: 0.1454, h: 0.027, size: 1.6 },
  { id: "z4227593d3fa2", kind: "text", ref: "experience", page: 0, x: 0.5043, y: 0.0874, w: 0.1466, h: 0.0239, size: 1.6 },
  { id: "z3bf91b0bdadb", kind: "text", ref: "fierte", page: 0, x: 0.3503, y: 0.139, w: 0.25, h: 0.03, size: 1.6 },
  { id: "ze1c6be2bb98d", kind: "text", ref: "honte", page: 0, x: 0.348, y: 0.1921, w: 0.25, h: 0.03, size: 1.6 },
  { id: "z4ef291cef6c8", kind: "text", ref: "apparence", page: 0, x: 0.3468, y: 0.2406, w: 0.25, h: 0.03, size: 1.6 },
  { id: "z755173bb11ee", kind: "text", ref: "camarade", page: 0, x: 0.0777, y: 0.2406, w: 0.25, h: 0.03, size: 1.6 },
  { id: "z577ee175160c", kind: "text", ref: "pote", page: 0, x: 0.0554, y: 0.189, w: 0.25, h: 0.03, size: 1.6 },
  { id: "z7fc6c9a2ee30", kind: "text", ref: "rival", page: 0, x: 0.0601, y: 0.268, w: 0.25, h: 0.03, size: 1.6 },
  { id: "z0eb1e9f72ac3", kind: "text", ref: "blessures", page: 0, x: 0.7759, y: 0.5538, w: 0.2073, h: 0.0563, size: 1.6 },
  { id: "zda27a0eae48e", kind: "text", ref: "traumatismes", page: 0, x: 0.7795, y: 0.6297, w: 0.2014, h: 0.073, size: 1.6 },
  { id: "z8b1b2173a897", kind: "text", ref: "notes", page: 0, x: 0.6302, y: 0.8437, w: 0.3471, h: 0.1276, size: 1.6 },
  { id: "z9b1c60991cca", kind: "track", ref: "stress", page: 0, x: 0.78, y: 0.5108, w: 0.0884, h: 0.03, size: 1.6 },
  { id: "zb86887e22a80", kind: "track", ref: "sang-froid", page: 0, x: 0.8736, y: 0.5093, w: 0.1119, h: 0.0391, size: 1.6 },
  { id: "z2c0c8a603233", kind: "track", ref: "radiations", page: 0, x: 0.7929, y: 0.4668, w: 0.166, h: 0.033, size: 1.6 },
  { id: "z40d83d4cbbbe", kind: "track", ref: "affame", page: 0, x: 0.7924, y: 0.4152, w: 0.0285, h: 0.03, size: 1.6 },
  { id: "z53a845ab2965", kind: "track", ref: "deshydrate", page: 0, x: 0.8536, y: 0.4137, w: 0.0297, h: 0.0315, size: 1.6 },
  { id: "z4f44c99a970d", kind: "track", ref: "epuise", page: 0, x: 0.9123, y: 0.4152, w: 0.0297, h: 0.033, size: 1.6 },
  { id: "z5f88a755ff8f", kind: "track", ref: "gele", page: 0, x: 0.957, y: 0.4167, w: 0.032, h: 0.0391, size: 1.6 },
  { id: "z974cc4ba3e04", kind: "track", ref: "eau", page: 0, x: 0.7654, y: 0.2741, w: 0.0837, h: 0.0392, size: 1.6 },
  { id: "z0d24f3e3ada4", kind: "track", ref: "nourriture", page: 0, x: 0.8359, y: 0.2755, w: 0.0825, h: 0.0512, size: 1.6 },
  { id: "z56b3e782f098", kind: "track", ref: "filtres", page: 0, x: 0.7596, y: 0.3195, w: 0.0861, h: 0.0528, size: 1.6 },
  { id: "zc214829d8010", kind: "track", ref: "energie", page: 0, x: 0.8375, y: 0.3195, w: 0.0802, h: 0.0527, size: 1.6 },
  { id: "z1146161624d5", kind: "info", ref: "name", page: 0, x: 0.3456, y: 0.0342, w: 0.1548, h: 0.027, size: 1.6 },
  { id: "z2cbfb5c0eda5", kind: "info", ref: "skills", page: 0, x: 0.6901, y: 0.0395, w: 0.2884, h: 0.1652, size: 1.6 },
  { id: "z22219f8a1ba4", kind: "info", ref: "inventory", page: 0, x: 0.0262, y: 0.6026, w: 0.1979, h: 0.0923, size: 1.6 },
  { id: "z64dd4840adae", kind: "info", ref: "weapons", page: 0, x: 0.0262, y: 0.7574, w: 0.5704, h: 0.2122, size: 1.6 },
  { id: "za8d2f8ff7f48", kind: "info", ref: "protections", page: 0, x: 0.6294, y: 0.7482, w: 0.353, h: 0.0438, size: 1.6 },
  { id: "za9e62954f9a5", kind: "info", ref: "equipment", page: 0, x: 0.0403, y: 0.3521, w: 0.1779, h: 0.2228, size: 1.6 },
];

// Équipement d'exemple : des armes et une protection avec les champs de la feuille (valeurs à saisir selon le livre de règles).
const METRO_EQUIPMENT = [
  { name: "Objet contondant", type: "Arme", field_names: ["Prise", "Bonus", "Dégâts", "Fiabilité", "Portée", "Notes"], fields: [{"name": "Prise", "value": ""}, {"name": "Bonus", "value": ""}, {"name": "Dégâts", "value": ""}, {"name": "Fiabilité", "value": ""}, {"name": "Portée", "value": ""}, {"name": "Notes", "value": ""}] },
  { name: "Couteau", type: "Arme", field_names: ["Prise", "Bonus", "Dégâts", "Fiabilité", "Portée", "Notes"], fields: [{"name": "Prise", "value": ""}, {"name": "Bonus", "value": ""}, {"name": "Dégâts", "value": ""}, {"name": "Fiabilité", "value": ""}, {"name": "Portée", "value": ""}, {"name": "Notes", "value": ""}] },
  { name: "Hache", type: "Arme", field_names: ["Prise", "Bonus", "Dégâts", "Fiabilité", "Portée", "Notes"], fields: [{"name": "Prise", "value": ""}, {"name": "Bonus", "value": ""}, {"name": "Dégâts", "value": ""}, {"name": "Fiabilité", "value": ""}, {"name": "Portée", "value": ""}, {"name": "Notes", "value": ""}] },
  { name: "Pistolet", type: "Arme", field_names: ["Prise", "Bonus", "Dégâts", "Fiabilité", "Portée", "Notes"], fields: [{"name": "Prise", "value": ""}, {"name": "Bonus", "value": ""}, {"name": "Dégâts", "value": ""}, {"name": "Fiabilité", "value": ""}, {"name": "Portée", "value": ""}, {"name": "Notes", "value": ""}] },
  { name: "Pistolet lourd", type: "Arme", field_names: ["Prise", "Bonus", "Dégâts", "Fiabilité", "Portée", "Notes"], fields: [{"name": "Prise", "value": ""}, {"name": "Bonus", "value": ""}, {"name": "Dégâts", "value": ""}, {"name": "Fiabilité", "value": ""}, {"name": "Portée", "value": ""}, {"name": "Notes", "value": ""}] },
  { name: "Revolver", type: "Arme", field_names: ["Prise", "Bonus", "Dégâts", "Fiabilité", "Portée", "Notes"], fields: [{"name": "Prise", "value": ""}, {"name": "Bonus", "value": ""}, {"name": "Dégâts", "value": ""}, {"name": "Fiabilité", "value": ""}, {"name": "Portée", "value": ""}, {"name": "Notes", "value": ""}] },
  { name: "Fusil", type: "Arme", field_names: ["Prise", "Bonus", "Dégâts", "Fiabilité", "Portée", "Notes"], fields: [{"name": "Prise", "value": ""}, {"name": "Bonus", "value": ""}, {"name": "Dégâts", "value": ""}, {"name": "Fiabilité", "value": ""}, {"name": "Portée", "value": ""}, {"name": "Notes", "value": ""}] },
  { name: "Fusil à lunette", type: "Arme", field_names: ["Prise", "Bonus", "Dégâts", "Fiabilité", "Portée", "Notes"], fields: [{"name": "Prise", "value": ""}, {"name": "Bonus", "value": ""}, {"name": "Dégâts", "value": ""}, {"name": "Fiabilité", "value": ""}, {"name": "Portée", "value": ""}, {"name": "Notes", "value": ""}] },
  { name: "Fusil avec silencieux", type: "Arme", field_names: ["Prise", "Bonus", "Dégâts", "Fiabilité", "Portée", "Notes"], fields: [{"name": "Prise", "value": ""}, {"name": "Bonus", "value": ""}, {"name": "Dégâts", "value": ""}, {"name": "Fiabilité", "value": ""}, {"name": "Portée", "value": ""}, {"name": "Notes", "value": ""}] },
  { name: "Fusil d'assaut", type: "Arme", field_names: ["Prise", "Bonus", "Dégâts", "Fiabilité", "Portée", "Notes"], fields: [{"name": "Prise", "value": ""}, {"name": "Bonus", "value": ""}, {"name": "Dégâts", "value": ""}, {"name": "Fiabilité", "value": ""}, {"name": "Portée", "value": ""}, {"name": "Notes", "value": ""}] },
  { name: "Sarbacane de fortune", type: "Arme", field_names: ["Prise", "Bonus", "Dégâts", "Fiabilité", "Portée", "Notes"], fields: [{"name": "Prise", "value": ""}, {"name": "Bonus", "value": ""}, {"name": "Dégâts", "value": ""}, {"name": "Fiabilité", "value": ""}, {"name": "Portée", "value": ""}, {"name": "Notes", "value": ""}] },
  { name: "Gilet pare-balles", type: "Protection", field_names: ["Protection", "Modificateur"], fields: [{"name": "Protection", "value": ""}, {"name": "Modificateur", "value": ""}] },
];

export const BUILTIN_SYSTEMS = [`,
    },
    {
      find: `      // Les positions des valeurs sur la feuille viendront avec le fond de chaque utilisateur : aucune par défaut.
      zones: [],
      skills: [],
      equipment: [],`,
      replace: `      zones: METRO_ZONES,
      skills: [],
      equipment: METRO_EQUIPMENT,`,
    },
    {
      find: `Sans illustration : importez votre propre feuille comme fond.`,
      replace: `Sans illustration : importez votre propre feuille comme fond, les valeurs se placent toutes seules.`,
    },
  ],
  "gameSystemBuiltin.test.js": [
    {
      find: `    expect(await applyBuiltinSystemToCampaign("builtin-metro-2033", campaign.id)).toEqual({ replaced: false, skills: 0, equipment: 0 });`,
      replace: `    const result = await applyBuiltinSystemToCampaign("builtin-metro-2033", campaign.id);
    expect(result).toMatchObject({ replaced: false, skills: 0 });
    expect(result.equipment).toBe(getBuiltinSystem("builtin-metro-2033").data.equipment.length);`,
    },
    {
      find: `    expect(await applyBuiltinSystemToCampaign("builtin-metro-2033", campaign.id)).toEqual({ replaced: true, skills: 0, equipment: 0 });`,
      replace: `    expect(await applyBuiltinSystemToCampaign("builtin-metro-2033", campaign.id)).toMatchObject({ replaced: true, skills: 0 });`,
    },
    {
      find: `import { applyBuiltinSystemToCampaign, copyBuiltinSystem, listGameSystems } from "@/lib/services/gameSystems";`,
      replace: `import { applyBuiltinSystemToCampaign, copyBuiltinSystem, listGameSystems } from "@/lib/services/gameSystems";
import { getBuiltinSystem } from "@/lib/meta/builtinSystems";`,
    },
  ],
  "builtinSystems.test.js": [
    {
      find: `  it("la mise en page montre tout : quatre groupes, et chaque piste et chaque champ une fois", () => {`,
      replace: `  it("les positions de la feuille sont toutes valables pour le modèle (aucune n'est retirée au nettoyage)", () => {
    const { zones } = metro.data;
    expect(zones.length).toBeGreaterThan(0);
    expect(cleanZones(zones, metro.data)).toEqual(zones);
  });

  it("l'équipement d'exemple sépare armes et protections par le type", () => {
    const kinds = metro.data.equipment.map((item) => equipmentKind(item));
    expect(kinds.filter((kind) => kind === "weapon").length).toBeGreaterThan(0);
    expect(kinds).toContain("protection");
    expect(kinds.includes("other")).toBe(false);
  });

  it("la mise en page montre tout : quatre groupes, et chaque piste et chaque champ une fois", () => {`,
    },
    {
      find: `import { resolveLayout } from "@/lib/meta/layouts.js";`,
      replace: `import { resolveLayout } from "@/lib/meta/layouts.js";
import { cleanZones, equipmentKind } from "@/lib/meta/sheetZones.js";`,
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
