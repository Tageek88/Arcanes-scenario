// apply-dnd5-lot10a.mjs : lot 10a, système fourni « Donjons & Dragons 5 » (règles 2024) : 6 caractéristiques, 6 sauvegardes, initiative, 18 compétences liées,
// d20 + valeur, pistes (jets de mort, emplacements de sorts...), champs de texte, mise en page à 3 colonnes et positions des valeurs sur la feuille officielle française (2 pages).
// Sans illustration, sans texte de règles, sans objet ni sort : chacun importe sa propre feuille comme fond.
// Usage, depuis la racine du projet :
//   node apply-dnd5-lot10a.mjs --dry     (vérifie sans rien écrire)
//   node apply-dnd5-lot10a.mjs           (applique)
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

// ---------------------------------------------------------------------------------------------
// Données du système (générées ici, puis écrites dans src/lib/meta/builtinDnd5.js)
// ---------------------------------------------------------------------------------------------
const W = 836;
const H = 1082;
const f4 = (n) => Math.round(n * 10000) / 10000;
const zones = [];
const seen = new Set();
// Rectangle en pixels de l'image de référence (x1, y1, x2, y2), converti en fractions de page.
function z(kind, ref, page, x1, y1, x2, y2, size = 1.5, field) {
  const key = kind + "|" + ref + "|" + (field || "");
  if (seen.has(key)) throw new Error("zone en double " + key);
  seen.add(key);
  const id = "zd" + String(zones.length + 1).padStart(3, "0");
  const zone = { id, kind, ref, page, x: f4(x1 / W), y: f4(y1 / H), w: f4((x2 - x1) / W), h: f4((y2 - y1) / H), size };
  if (field) zone.field = field;
  zones.push(zone);
}

const ABILITIES = ["Force", "Dextérité", "Constitution", "Intelligence", "Sagesse", "Charisme"];
const SKILLS = {
  Force: ["Athlétisme"],
  Dextérité: ["Acrobaties", "Discrétion", "Escamotage"],
  Constitution: [],
  Intelligence: ["Arcanes", "Histoire", "Investigation", "Nature", "Religion"],
  Sagesse: ["Dressage", "Intuition", "Médecine", "Perception", "Survie"],
  Charisme: ["Intimidation", "Persuasion", "Représentation", "Tromperie"],
};
const SAVE = (a) => "Sauvegarde de " + a;

const characteristics = [];
for (const a of ABILITIES) {
  characteristics.push({ name: a, field_names: ["Valeur"] });
  characteristics.push({ name: SAVE(a), field_names: [], parent: a });
  if (a === "Dextérité") characteristics.push({ name: "Initiative", field_names: [], parent: a });
  for (const s of SKILLS[a]) characteristics.push({ name: s, field_names: [], parent: a });
}

const tr = (id, name, count) => ({ id, name, count });
const tracks = [
  tr("mort-succes", "Jets de mort : succès", 3),
  tr("mort-echecs", "Jets de mort : échecs", 3),
  tr("inspiration", "Inspiration héroïque", 1),
  tr("armures-legeres", "Armures légères", 1),
  tr("armures-intermediaires", "Armures intermédiaires", 1),
  tr("armures-lourdes", "Armures lourdes", 1),
  tr("boucliers", "Boucliers", 1),
];
const SLOTS = [4, 3, 3, 3, 3, 2, 2, 1, 1];
SLOTS.forEach((n, i) => tracks.push(tr("sorts-" + (i + 1), "Emplacements de sorts niveau " + (i + 1), n)));

const tf = (id, name, long = false) => ({ id, name, long });
const textFields = [
  tf("classe", "Classe"), tf("sous-classe", "Sous-classe"), tf("historique", "Historique"), tf("espece", "Espèce"),
  tf("niveau", "Niveau"), tf("px", "Points d'expérience"),
  tf("classe-armure", "Classe d'armure"), tf("pv-actuels", "PV actuels"), tf("pv-temp", "PV temporaires"), tf("pv-max", "PV max"),
  tf("des-vie", "Dés de vie"), tf("des-vie-depenses", "Dés de vie dépensés"),
  tf("vitesse", "Vitesse"), tf("taille", "Taille"), tf("perception-passive", "Perception passive"), tf("bonus-maitrise", "Bonus de maîtrise"),
  tf("entrainement-armes", "Armes maîtrisées", true), tf("outils", "Outils maîtrisés", true),
  tf("capacites", "Capacités de classe", true), tf("traits-espece", "Traits d'espèce", true), tf("dons", "Dons", true),
  tf("car-incantation", "Caractéristique d'incantation"), tf("mod-incantation", "Modificateur d'incantation"),
  tf("dd-sorts", "DD de sauvegarde contre les sorts"), tf("bonus-sort", "Bonus d'attaque avec un sort"),
  tf("sorts", "Sorts mineurs et sorts préparés", true),
  tf("apparence", "Apparence", true), tf("histoire", "Histoire et personnalité", true), tf("alignement", "Alignement"),
  tf("langues", "Langues", true),
  tf("pc", "PC"), tf("pa", "PA"), tf("pe", "PE"), tf("po", "PO"), tf("pp", "PP"),
];

// ---- page 1 ----
z("info", "name", 0, 156, 40, 338, 56);
z("text", "historique", 0, 100, 66, 200, 81, 1.3);
z("text", "classe", 0, 245, 66, 340, 81, 1.3);
z("text", "espece", 0, 78, 96, 200, 111, 1.3);
z("text", "sous-classe", 0, 276, 96, 340, 111, 1.3);
z("text", "niveau", 0, 365, 50, 405, 63, 1.3);
z("text", "px", 0, 362, 79, 408, 92, 1.3);
z("text", "classe-armure", 0, 455, 52, 493, 84, 2);
z("text", "pv-actuels", 0, 524, 40, 600, 96, 2.2);
z("text", "pv-temp", 0, 607, 56, 670, 70, 1.5);
z("text", "pv-max", 0, 607, 86, 670, 100, 1.5);
z("text", "des-vie-depenses", 0, 683, 56, 740, 70, 1.5);
z("text", "des-vie", 0, 683, 86, 740, 100, 1.5);
z("track", "mort-succes", 0, 752, 54, 800, 69, 1.3);
z("track", "mort-echecs", 0, 752, 83, 800, 98, 1.3);
z("text", "bonus-maitrise", 0, 45, 190, 120, 225, 2.2);
z("stat", "Initiative", 0, 330, 178, 405, 205, 2.2);
z("text", "vitesse", 0, 455, 178, 535, 205, 2);
z("text", "taille", 0, 590, 178, 665, 205, 2);
z("text", "perception-passive", 0, 715, 178, 805, 205, 2.2);
z("info", "weapons", 0, 315, 272, 815, 432, 1.4);
z("text", "capacites", 0, 315, 485, 815, 770, 1.4);
z("text", "traits-espece", 0, 315, 820, 545, 1055, 1.4);
z("text", "dons", 0, 570, 820, 818, 1055, 1.4);
z("track", "inspiration", 0, 68, 808, 92, 832, 1.8);
z("track", "armures-legeres", 0, 80, 892, 96, 908, 1.2);
z("track", "armures-intermediaires", 0, 132, 892, 148, 908, 1.2);
z("track", "armures-lourdes", 0, 190, 892, 206, 908, 1.2);
z("track", "boucliers", 0, 240, 892, 256, 908, 1.2);
z("text", "entrainement-armes", 0, 25, 936, 288, 995, 1.3);
z("text", "outils", 0, 25, 1016, 288, 1050, 1.3);

// Par caractéristique : modificateur (grand rond), valeur (petite case), sauvegarde et compétences (espace avant le nom).
const COL = {
  Force: { mod: [40, 292, 86, 328], val: [92, 302, 124, 328], save: [43, 360, 62, 376], skills: { Athlétisme: [43, 387, 62, 403] } },
  Dextérité: { mod: [40, 455, 86, 490], val: [92, 463, 124, 492], save: [43, 523, 62, 539], skills: { Acrobaties: [43, 551, 62, 567], Discrétion: [43, 570, 62, 586], Escamotage: [43, 590, 62, 606] } },
  Constitution: { mod: [40, 657, 86, 692], val: [92, 665, 124, 695], save: [43, 727, 62, 743], skills: {} },
  Intelligence: { mod: [188, 188, 234, 224], val: [238, 197, 270, 225], save: [186, 253, 208, 269], skills: { Arcanes: [186, 281, 208, 297], Histoire: [186, 300, 208, 316], Investigation: [186, 320, 208, 336], Nature: [186, 339, 208, 355], Religion: [186, 359, 208, 375] } },
  Sagesse: { mod: [188, 425, 234, 461], val: [238, 435, 270, 463], save: [186, 494, 208, 510], skills: { Dressage: [186, 522, 208, 538], Intuition: [186, 542, 208, 558], Médecine: [186, 561, 208, 577], Perception: [186, 581, 208, 597], Survie: [186, 600, 208, 616] } },
  Charisme: { mod: [188, 667, 234, 703], val: [238, 677, 270, 705], save: [186, 736, 208, 752], skills: { Intimidation: [186, 764, 208, 780], Persuasion: [186, 783, 208, 799], Représentation: [186, 803, 208, 819], Tromperie: [186, 822, 208, 838] } },
};
for (const a of ABILITIES) {
  const c = COL[a];
  z("stat", a, 0, ...c.mod, 2.4);
  z("stat", a, 0, ...c.val, 1.5, "Valeur");
  z("stat", SAVE(a), 0, ...c.save, 1.3);
  for (const [name, box] of Object.entries(c.skills)) z("stat", name, 0, ...box, 1.3);
}

// ---- page 2 ----
z("text", "car-incantation", 1, 22, 20, 186, 40, 1.3);
z("text", "mod-incantation", 1, 26, 66, 62, 96, 1.8);
z("text", "dd-sorts", 1, 26, 105, 62, 135, 1.8);
z("text", "bonus-sort", 1, 26, 143, 62, 173, 1.8);
const SLOT_BOX = [
  [277, 117, 331, 134], [277, 136, 313, 153], [277, 156, 313, 173],
  [398, 117, 438, 134], [398, 136, 438, 153], [398, 156, 421, 173],
  [507, 117, 535, 134], [507, 136, 521, 153], [507, 156, 521, 173],
];
SLOT_BOX.forEach((box, i) => z("track", "sorts-" + (i + 1), 1, ...box, 1.2));
z("text", "sorts", 1, 22, 245, 545, 1050, 1.3);
z("text", "apparence", 1, 572, 45, 814, 145, 1.3);
z("text", "histoire", 1, 572, 190, 814, 380, 1.3);
z("text", "alignement", 1, 572, 404, 814, 418, 1.3);
z("text", "langues", 1, 572, 475, 814, 520, 1.3);
z("info", "equipment", 1, 572, 570, 814, 810, 1.3);
[["pc", 575, 618], ["pa", 624, 667], ["pe", 673, 716], ["po", 722, 765], ["pp", 771, 814]].forEach(([id, a, b]) => z("text", id, 1, a, 975, b, 1010, 1.4));

// ---- mise en page ----
const textBlock = (id, title, ids, wide) => ({ id, kind: "texts", title, ...(wide ? { wide: true } : {}), ids });
const trackBlock = (id, title, ids, wide) => ({ id, kind: "tracks", title, ...(wide ? { wide: true } : {}), ids });
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const blocks = [
  textBlock("identite", "Identité", ["classe", "sous-classe", "historique", "espece", "niveau", "px"], true),
  textBlock("combat", "Combat", ["classe-armure", "pv-actuels", "pv-temp", "pv-max", "des-vie", "des-vie-depenses", "vitesse", "taille", "perception-passive", "bonus-maitrise"], true),
  trackBlock("pistes", "Jets de mort et inspiration", ["mort-succes", "mort-echecs", "inspiration"]),
  ...ABILITIES.map((a) => ({ id: slug(a), kind: "stat-group", stat: a })),
  trackBlock("armures", "Armures maîtrisées", ["armures-legeres", "armures-intermediaires", "armures-lourdes", "boucliers"]),
  textBlock("entrainements", "Entraînements et maîtrises", ["entrainement-armes", "outils"]),
  textBlock("incantation", "Incantation", ["car-incantation", "mod-incantation", "dd-sorts", "bonus-sort"]),
  trackBlock("emplacements", "Emplacements de sorts", SLOTS.map((_, i) => "sorts-" + (i + 1))),
  textBlock("sorts", "Sorts", ["sorts"], true),
  textBlock("capacites", "Capacités et traits", ["capacites", "traits-espece", "dons"], true),
  textBlock("personnage", "Personnage", ["apparence", "histoire", "alignement", "langues"], true),
  textBlock("pieces", "Pièces", ["pc", "pa", "pe", "po", "pp"]),
];
const layout = { id: "dnd5", name: "Feuille D&D 5", columns: 3, blocks };

const used = (kind, key) => blocks.filter((b) => b.kind === kind).flatMap((b) => b[key]).sort().join();
if (used("tracks", "ids") !== tracks.map((t) => t.id).sort().join()) throw new Error("pistes non couvertes par la mise en page");
if (used("texts", "ids") !== textFields.map((t) => t.id).sort().join()) throw new Error("champs non couverts par la mise en page");
if (blocks.length > 30 || zones.length > 150 || tracks.length > 20 || textFields.length > 40 || characteristics.length > 60) throw new Error("limite du modèle dépassée");

const dice = { enabled: true, mode: "single", rule: "add", single: { count: 1, sides: 20 }, perStat: {}, crit: { success: 20, failure: 1 }, outcome: "total", difficulty: null };

const json = (v) => JSON.stringify(v);
const lines = (arr) => arr.map((x) => "  " + json(x) + ",").join("\n");

const DND_FILE = [
  "// Système fourni : Donjons & Dragons 5 (règles 2024), sans illustration.",
  "// Il ne contient que les noms, les liens, les positions des valeurs sur la feuille officielle française (2 pages) et le d20 :",
  "// chacun importe sa propre feuille comme fond (voir « Fond de feuille »). Aucun texte de règles, objet ni sort.",
  "// Convention : la valeur d'une caractéristique est son MODIFICATEUR (le score est dans le champ « Valeur »).",
  "// Sauvegardes, initiative et compétences sont liées à leur caractéristique : on y saisit le bonus de maîtrise éventuel, le lancer ajoute le modificateur.",
  "",
  "const CHARACTERISTICS = [",
  lines(characteristics),
  "];",
  "",
  "const TRACKS = [",
  lines(tracks),
  "];",
  "",
  "const TEXT_FIELDS = [",
  lines(textFields),
  "];",
  "",
  "const LAYOUT = " + JSON.stringify(layout, null, 2) + ";",
  "",
  "// Positions en fractions de page, relevées sur la feuille officielle : à ajuster si besoin avec « Placer les valeurs ».",
  "const ZONES = [",
  lines(zones),
  "];",
  "",
  "export const DND5_SYSTEM = {",
  '  id: "builtin-dnd-5",',
  "  builtin: true,",
  '  name: "Donjons & Dragons 5",',
  "  description:",
  '    "6 caractéristiques (le modificateur est la valeur, le score un champ), 6 sauvegardes, initiative et 18 compétences liées, d20 + valeur, pistes (jets de mort, emplacements de sorts...) et feuille en trois colonnes. Sans illustration : importez votre propre feuille comme fond.",',
  "  data: {",
  "    characteristics: CHARACTERISTICS,",
  "    skillRollModifier: false,",
  "    scale: { levels: [] },",
  "    pc_scale: { ranges: {}, skills: null, equipment: null },",
  "    dice: " + json(dice) + ",",
  "    tracks: TRACKS,",
  "    textFields: TEXT_FIELDS,",
  "    layouts: [LAYOUT],",
  '    layoutId: "dnd5",',
  "    zones: ZONES,",
  "    skills: [],",
  "    equipment: [],",
  "  },",
  "};",
  "",
].join("\n");

const NEW_FILES = { "src/lib/meta/builtinDnd5.js": DND_FILE };

// ---------------------------------------------------------------------------------------------
// Retouches
// ---------------------------------------------------------------------------------------------
const TEST_ADD = [
  "  });",
  "});",
  "",
  'describe("Donjons & Dragons 5", () => {',
  '  const dnd = getBuiltinSystem("builtin-dnd-5");',
  "",
  '  it("6 caractéristiques, chacune avec sa sauvegarde, et 18 compétences liées à la bonne caractéristique", () => {',
  "    const stats = dnd.data.characteristics;",
  '    expect(stats.filter((item) => !item.parent).map((item) => item.name)).toEqual(["Force", "Dextérité", "Constitution", "Intelligence", "Sagesse", "Charisme"]);',
  '    expect(stats.filter((item) => item.name.startsWith("Sauvegarde de ")).length).toBe(6);',
  '    expect(stats.find((item) => item.name === "Athlétisme").parent).toBe("Force");',
  '    expect(stats.find((item) => item.name === "Escamotage").parent).toBe("Dextérité");',
  '    expect(stats.find((item) => item.name === "Médecine").parent).toBe("Sagesse");',
  '    expect(stats.find((item) => item.name === "Tromperie").parent).toBe("Charisme");',
  '    expect(stats.filter((item) => item.parent === "Intelligence" && !item.name.startsWith("Sauvegarde")).length).toBe(5);',
  "  });",
  "",
  '  it("d20 + valeur, 20 et 1 naturels critiques", () => {',
  '    expect(dnd.data.dice.rule).toBe("add");',
  "    expect(dnd.data.dice.single.sides).toBe(20);",
  "    expect(dnd.data.dice.crit).toEqual({ success: 20, failure: 1 });",
  "  });",
  "",
  '  it("emplacements de sorts : 4, 3, 3, 3, 3, 2, 2, 1, 1 cases ; jets de mort : 3 et 3", () => {',
  "    const count = (id) => dnd.data.tracks.find((item) => item.id === id).count;",
  '    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => count("sorts-" + level))).toEqual([4, 3, 3, 3, 3, 2, 2, 1, 1]);',
  '    expect([count("mort-succes"), count("mort-echecs")]).toEqual([3, 3]);',
  "  });",
  "",
  "  it(\"les positions de la feuille sont toutes valables pour le modèle (aucune n'est retirée au nettoyage)\", () => {",
  "    const { zones } = dnd.data;",
  "    expect(zones.length).toBeGreaterThan(0);",
  "    expect(cleanZones(zones, dnd.data)).toEqual(zones);",
  "    expect(new Set(zones.map((zone) => zone.page))).toEqual(new Set([0, 1]));",
  "  });",
  "",
  "  it(\"la mise en page montre tout : six groupes, et chaque piste et chaque champ une fois\", () => {",
  "    const layout = resolveLayout(dnd.data.layouts, dnd.data.layoutId, dnd.data);",
  "    expect(layout.columns).toBe(3);",
  '    expect(layout.blocks.filter((block) => block.kind === "stat-group").map((block) => block.stat)).toEqual(["Force", "Dextérité", "Constitution", "Intelligence", "Sagesse", "Charisme"]);',
  '    const shown = (kind, key) => layout.blocks.filter((block) => block.kind === kind).flatMap((block) => block[key].map((item) => item.id));',
  '    expect(shown("tracks", "tracks").sort()).toEqual(dnd.data.tracks.map((item) => item.id).sort());',
  '    expect(shown("texts", "fields").sort()).toEqual(dnd.data.textFields.map((item) => item.id).sort());',
  "  });",
  "});",
  "",
].join("\n");

const EDITS = {
  "builtinSystems.js": [
    {
      find: "const ATTRIBUTES = {\n",
      replace: 'import { DND5_SYSTEM } from "@/lib/meta/builtinDnd5.js";\n\nconst ATTRIBUTES = {\n',
    },
    {
      find: "    },\n  },\n];\n\n/** A shipped system by id",
      replace: "    },\n  },\n  DND5_SYSTEM,\n];\n\n/** A shipped system by id",
    },
  ],
  "builtinSystems.test.js": [
    {
      find: '    expect(shown("texts", "fields").sort()).toEqual(metro.data.textFields.map((item) => item.id).sort());\n  });\n});\n',
      replace: '    expect(shown("texts", "fields").sort()).toEqual(metro.data.textFields.map((item) => item.id).sort());\n' + TEST_ADD,
    },
  ],
};

// Retrouve un fichier du projet par son nom (une seule correspondance attendue sous src/ ou tests/).
function findFile(name) {
  const hits = ["src", "tests"].flatMap((dir) =>
    fs.existsSync(path.join(root, dir))
      ? fs.readdirSync(path.join(root, dir), { recursive: true }).map(String).map((file) => path.join(dir, file))
      : []
  ).filter((file) => path.basename(file) === name && !file.split(path.sep).includes("node_modules"));
  return hits.length === 1 ? hits[0] : null;
}

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
  const file = findFile(name);
  if (!file) {
    console.error("INTROUVABLE (ou plusieurs) sous src/ ou tests/ : " + name);
    failures += 1;
    continue;
  }
  const original = fs.readFileSync(path.join(root, file), "utf8");
  const crlf = original.includes("\r\n");
  let text = crlf ? original.replace(/\r\n/g, "\n") : original;
  let ok = true;
  edits.forEach((edit, index) => {
    const found = text.split(edit.find).length - 1;
    if (found !== 1) {
      console.error(file + " : retouche " + (index + 1) + " non appliquée (" + found + " occurrence(s) trouvée(s), 1 attendue) :");
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
