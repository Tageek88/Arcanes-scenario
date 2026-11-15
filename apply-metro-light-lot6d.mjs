// apply-metro-light-lot6d.mjs : lot 6d : le système Metro fourni ne contient plus d'équipement d'exemple (seulement le placement sur la feuille et le système de dés) ; corrige l'erreur de lint no-case-declarations de editablePdf.js.
// Usage, depuis la racine du projet :
//   node apply-metro-light-lot6d.mjs --dry     (vérifie sans rien écrire)
//   node apply-metro-light-lot6d.mjs           (applique)
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
if (!fs.existsSync(path.join(root, "src/lib/meta/builtinSystems.js")) || !fs.existsSync(path.join(root, "src/lib/print/editablePdf.js"))) {
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
      find: `// Équipement d'exemple : des armes et une protection avec les champs de la feuille (valeurs à saisir selon le livre de règles).
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
      replace: `export const BUILTIN_SYSTEMS = [`,
    },
    {
      find: `equipment: METRO_EQUIPMENT,`,
      replace: `equipment: [],`,
    },
  ],
  "gameSystemBuiltin.test.js": [
    {
      find: `    const result = await applyBuiltinSystemToCampaign("builtin-metro-2033", campaign.id);
    expect(result).toMatchObject({ replaced: false, skills: 0 });
    expect(result.equipment).toBe(getBuiltinSystem("builtin-metro-2033").data.equipment.length);`,
      replace: `    expect(await applyBuiltinSystemToCampaign("builtin-metro-2033", campaign.id)).toEqual({ replaced: false, skills: 0, equipment: 0 });`,
    },
    {
      find: `toMatchObject({ replaced: true, skills: 0 });`,
      replace: `toEqual({ replaced: true, skills: 0, equipment: 0 });`,
    },
    {
      find: `
import { getBuiltinSystem } from "@/lib/meta/builtinSystems";`,
      replace: ``,
    },
  ],
  "builtinSystems.test.js": [
    {
      find: `  it("l'équipement d'exemple sépare armes et protections par le type", () => {
    const kinds = metro.data.equipment.map((item) => equipmentKind(item));
    expect(kinds.filter((kind) => kind === "weapon").length).toBeGreaterThan(0);
    expect(kinds).toContain("protection");
    expect(kinds.includes("other")).toBe(false);
  });

`,
      replace: ``,
    },
    {
      find: `import { cleanZones, equipmentKind } from`,
      replace: `import { cleanZones } from`,
    },
  ],
  "editablePdf.js": [
    {
      find: `            case "characters":
                if (!block.characters[0]?.sheet) drawHeading("Fiches de personnages");`,
      replace: `            case "characters": {
                if (!block.characters[0]?.sheet) drawHeading("Fiches de personnages");`,
    },
    {
      find: `                break;
            default:
                throw new Error(\`Type de section PDF inconnu`,
      replace: `                break;
            }
            default:
                throw new Error(\`Type de section PDF inconnu`,
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
