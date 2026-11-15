// apply-demo-metro-lot6e.mjs : lot 6e : la campagne d'exemple (tutoriel) passe au système Metro : modèle de feuille (caractéristiques, pistes,
// champs, dés, positions des valeurs), fiches des personnages et des PNJ converties, armes et protections au catalogue d'équipement.
// Usage, depuis la racine du projet :
//   node apply-demo-metro-lot6e.mjs --dry     (vérifie sans rien écrire)
//   node apply-demo-metro-lot6e.mjs           (applique)
// Le script transforme src/data/demoCampaign.json en tout ou rien ; il refuse de s'appliquer deux fois.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const dry = process.argv.includes("--dry");
const file = path.join(root, "src/data/demoCampaign.json");
const fail = (message) => {
  console.error(message);
  process.exit(1);
};
if (!fs.existsSync(path.join(root, "package.json")) || !fs.existsSync(file)) fail("Lancez ce script depuis la racine du projet (src/data/demoCampaign.json introuvable).");

const raw = fs.readFileSync(file, "utf8");
const crlf = raw.includes("\r\n");
const data = JSON.parse(raw);
const endsWithNewline = /\n$/.test(raw);

const MODEL = {"characteristics": [{"name": "Vigueur", "field_names": ["Maximum"]}, {"name": "Bricolage", "field_names": [], "parent": "Vigueur"}, {"name": "Corps à corps", "field_names": [], "parent": "Vigueur"}, {"name": "Endurance", "field_names": [], "parent": "Vigueur"}, {"name": "Agilité", "field_names": ["Maximum"]}, {"name": "Furtivité", "field_names": [], "parent": "Agilité"}, {"name": "Réaction", "field_names": [], "parent": "Agilité"}, {"name": "Tir", "field_names": [], "parent": "Agilité"}, {"name": "Empathie", "field_names": ["Maximum"]}, {"name": "Analyse", "field_names": [], "parent": "Empathie"}, {"name": "Manipulation", "field_names": [], "parent": "Empathie"}, {"name": "Soins", "field_names": [], "parent": "Empathie"}, {"name": "Esprit", "field_names": ["Maximum"]}, {"name": "Observation", "field_names": [], "parent": "Esprit"}, {"name": "Compréhension", "field_names": [], "parent": "Esprit"}, {"name": "Survie", "field_names": [], "parent": "Esprit"}], "skillRollModifier": false, "dice": {"enabled": true, "mode": "single", "rule": "pool", "single": {"count": 1, "sides": 6}, "perStat": {}, "crit": {"success": null, "failure": null}, "outcome": "success", "difficulty": 6}, "tracks": [{"id": "stress", "name": "Stress", "count": 5}, {"id": "sang-froid", "name": "Sang-froid", "count": 7}, {"id": "radiations", "name": "Radiations", "count": 10}, {"id": "affame", "name": "Affamé", "count": 1}, {"id": "deshydrate", "name": "Déshydraté", "count": 1}, {"id": "epuise", "name": "Épuisé", "count": 1}, {"id": "gele", "name": "Gelé", "count": 1}, {"id": "eau", "name": "Eau", "count": 10}, {"id": "nourriture", "name": "Nourriture", "count": 10}, {"id": "filtres", "name": "Filtres", "count": 10}, {"id": "energie", "name": "Énergie", "count": 10}], "textFields": [{"id": "archetype", "name": "Archétype", "long": false}, {"id": "age", "name": "Âge", "long": false}, {"id": "experience", "name": "Expérience", "long": false}, {"id": "fierte", "name": "Fierté", "long": false}, {"id": "honte", "name": "Honte", "long": false}, {"id": "apparence", "name": "Apparence", "long": false}, {"id": "protection-max", "name": "Protection max", "long": false}, {"id": "protection", "name": "Protection actuelle", "long": false}, {"id": "camarade", "name": "Camarade", "long": false}, {"id": "pote", "name": "Pote", "long": false}, {"id": "rival", "name": "Rival", "long": false}, {"id": "blessures", "name": "Blessures critiques", "long": true}, {"id": "traumatismes", "name": "Traumatismes psychiques", "long": true}, {"id": "notes", "name": "Notes", "long": true}], "layouts": [{"id": "metro", "name": "Feuille Metro 2033", "columns": 2, "blocks": [{"id": "identite", "kind": "texts", "title": "Identité", "wide": true, "ids": ["archetype", "age", "experience", "fierte", "honte", "apparence"]}, {"id": "vigueur", "kind": "stat-group", "stat": "Vigueur"}, {"id": "agilite", "kind": "stat-group", "stat": "Agilité"}, {"id": "empathie", "kind": "stat-group", "stat": "Empathie"}, {"id": "esprit", "kind": "stat-group", "stat": "Esprit"}, {"id": "pistes", "kind": "tracks", "title": "Stress, sang-froid, radiations", "wide": true, "ids": ["stress", "sang-froid", "radiations"]}, {"id": "etats", "kind": "tracks", "title": "États", "ids": ["affame", "deshydrate", "epuise", "gele"]}, {"id": "consommables", "kind": "tracks", "title": "Consommables", "ids": ["eau", "nourriture", "filtres", "energie"]}, {"id": "protection", "kind": "texts", "title": "Protection", "ids": ["protection-max", "protection"]}, {"id": "liens", "kind": "texts", "title": "Liens", "ids": ["camarade", "pote", "rival"]}, {"id": "suite", "kind": "texts", "title": "Talents, blessures et notes", "wide": true, "ids": ["blessures", "traumatismes", "notes"]}]}], "layoutId": "metro", "zones": [{"id": "zb360c85f503d", "kind": "stat", "ref": "Vigueur", "field": "Maximum", "page": 0, "x": 0.487, "y": 0.4136, "w": 0.0295, "h": 0.03, "size": 1.6}, {"id": "za622f0493891", "kind": "stat", "ref": "Bricolage", "page": 0, "x": 0.3978, "y": 0.3454, "w": 0.0248, "h": 0.0315, "size": 1.6}, {"id": "zb3d806b5d9b0", "kind": "stat", "ref": "Corps à corps", "page": 0, "x": 0.4894, "y": 0.3044, "w": 0.0248, "h": 0.03, "size": 1.6}, {"id": "z2f53321bde6f", "kind": "stat", "ref": "Endurance", "page": 0, "x": 0.5811, "y": 0.3469, "w": 0.0271, "h": 0.0346, "size": 1.6}, {"id": "z73ce9e33ddb8", "kind": "stat", "ref": "Agilité", "field": "Maximum", "page": 0, "x": 0.5469, "y": 0.4835, "w": 0.0248, "h": 0.033, "size": 1.6}, {"id": "zfc40614a4c33", "kind": "stat", "ref": "Furtivité", "page": 0, "x": 0.6457, "y": 0.4334, "w": 0.0248, "h": 0.03, "size": 1.6}, {"id": "z578fe0adf6c7", "kind": "stat", "ref": "Réaction", "page": 0, "x": 0.6857, "y": 0.4835, "w": 0.0294, "h": 0.0315, "size": 1.6}, {"id": "zb965a7c453b9", "kind": "stat", "ref": "Tir", "page": 0, "x": 0.6421, "y": 0.5336, "w": 0.0318, "h": 0.0361, "size": 1.6}, {"id": "z63f8759eba66", "kind": "stat", "ref": "Empathie", "field": "Maximum", "page": 0, "x": 0.4882, "y": 0.5563, "w": 0.0271, "h": 0.03, "size": 1.6}, {"id": "ze6fd26d742a9", "kind": "stat", "ref": "Analyse", "page": 0, "x": 0.3965, "y": 0.6216, "w": 0.0283, "h": 0.03, "size": 1.6}, {"id": "zc88944f4b9fe", "kind": "stat", "ref": "Manipulation", "page": 0, "x": 0.4894, "y": 0.6626, "w": 0.0236, "h": 0.0346, "size": 1.6}, {"id": "zcf197a7886bd", "kind": "stat", "ref": "Soins", "page": 0, "x": 0.5799, "y": 0.6246, "w": 0.0248, "h": 0.03, "size": 1.6}, {"id": "z48c69b8db8b7", "kind": "stat", "ref": "Esprit", "field": "Maximum", "page": 0, "x": 0.4295, "y": 0.4835, "w": 0.0283, "h": 0.0361, "size": 1.6}, {"id": "z794894a30b15", "kind": "stat", "ref": "Observation", "page": 0, "x": 0.2908, "y": 0.4819, "w": 0.0248, "h": 0.033, "size": 1.6}, {"id": "z240e20f37bb2", "kind": "stat", "ref": "Compréhension", "page": 0, "x": 0.3307, "y": 0.4319, "w": 0.0236, "h": 0.0346, "size": 1.6}, {"id": "zc80d6655200e", "kind": "stat", "ref": "Survie", "page": 0, "x": 0.3296, "y": 0.5366, "w": 0.0259, "h": 0.03, "size": 1.6}, {"id": "z0ea1f12512a0", "kind": "text", "ref": "archetype", "page": 0, "x": 0.5066, "y": 0.0327, "w": 0.1489, "h": 0.0315, "size": 1.6}, {"id": "z2df9962c79f9", "kind": "text", "ref": "age", "page": 0, "x": 0.3491, "y": 0.0828, "w": 0.1454, "h": 0.027, "size": 1.6}, {"id": "z4227593d3fa2", "kind": "text", "ref": "experience", "page": 0, "x": 0.5043, "y": 0.0874, "w": 0.1466, "h": 0.0239, "size": 1.6}, {"id": "z3bf91b0bdadb", "kind": "text", "ref": "fierte", "page": 0, "x": 0.3503, "y": 0.139, "w": 0.25, "h": 0.03, "size": 1.6}, {"id": "ze1c6be2bb98d", "kind": "text", "ref": "honte", "page": 0, "x": 0.348, "y": 0.1921, "w": 0.25, "h": 0.03, "size": 1.6}, {"id": "z4ef291cef6c8", "kind": "text", "ref": "apparence", "page": 0, "x": 0.3468, "y": 0.2406, "w": 0.25, "h": 0.03, "size": 1.6}, {"id": "z755173bb11ee", "kind": "text", "ref": "camarade", "page": 0, "x": 0.0777, "y": 0.2406, "w": 0.25, "h": 0.03, "size": 1.6}, {"id": "z577ee175160c", "kind": "text", "ref": "pote", "page": 0, "x": 0.0554, "y": 0.189, "w": 0.25, "h": 0.03, "size": 1.6}, {"id": "z7fc6c9a2ee30", "kind": "text", "ref": "rival", "page": 0, "x": 0.0601, "y": 0.268, "w": 0.25, "h": 0.03, "size": 1.6}, {"id": "z0eb1e9f72ac3", "kind": "text", "ref": "blessures", "page": 0, "x": 0.7759, "y": 0.5538, "w": 0.2073, "h": 0.0563, "size": 1.6}, {"id": "zda27a0eae48e", "kind": "text", "ref": "traumatismes", "page": 0, "x": 0.7795, "y": 0.6297, "w": 0.2014, "h": 0.073, "size": 1.6}, {"id": "z8b1b2173a897", "kind": "text", "ref": "notes", "page": 0, "x": 0.6302, "y": 0.8437, "w": 0.3471, "h": 0.1276, "size": 1.6}, {"id": "z9b1c60991cca", "kind": "track", "ref": "stress", "page": 0, "x": 0.78, "y": 0.5108, "w": 0.0884, "h": 0.03, "size": 1.6}, {"id": "zb86887e22a80", "kind": "track", "ref": "sang-froid", "page": 0, "x": 0.8736, "y": 0.5093, "w": 0.1119, "h": 0.0391, "size": 1.6}, {"id": "z2c0c8a603233", "kind": "track", "ref": "radiations", "page": 0, "x": 0.7929, "y": 0.4668, "w": 0.166, "h": 0.033, "size": 1.6}, {"id": "z40d83d4cbbbe", "kind": "track", "ref": "affame", "page": 0, "x": 0.7924, "y": 0.4152, "w": 0.0285, "h": 0.03, "size": 1.6}, {"id": "z53a845ab2965", "kind": "track", "ref": "deshydrate", "page": 0, "x": 0.8536, "y": 0.4137, "w": 0.0297, "h": 0.0315, "size": 1.6}, {"id": "z4f44c99a970d", "kind": "track", "ref": "epuise", "page": 0, "x": 0.9123, "y": 0.4152, "w": 0.0297, "h": 0.033, "size": 1.6}, {"id": "z5f88a755ff8f", "kind": "track", "ref": "gele", "page": 0, "x": 0.957, "y": 0.4167, "w": 0.032, "h": 0.0391, "size": 1.6}, {"id": "z974cc4ba3e04", "kind": "track", "ref": "eau", "page": 0, "x": 0.7654, "y": 0.2741, "w": 0.0837, "h": 0.0392, "size": 1.6}, {"id": "z0d24f3e3ada4", "kind": "track", "ref": "nourriture", "page": 0, "x": 0.8359, "y": 0.2755, "w": 0.0825, "h": 0.0512, "size": 1.6}, {"id": "z56b3e782f098", "kind": "track", "ref": "filtres", "page": 0, "x": 0.7596, "y": 0.3195, "w": 0.0861, "h": 0.0528, "size": 1.6}, {"id": "zc214829d8010", "kind": "track", "ref": "energie", "page": 0, "x": 0.8375, "y": 0.3195, "w": 0.0802, "h": 0.0527, "size": 1.6}, {"id": "z1146161624d5", "kind": "info", "ref": "name", "page": 0, "x": 0.3456, "y": 0.0342, "w": 0.1548, "h": 0.027, "size": 1.6}, {"id": "z2cbfb5c0eda5", "kind": "info", "ref": "skills", "page": 0, "x": 0.6901, "y": 0.0395, "w": 0.2884, "h": 0.1652, "size": 1.6}, {"id": "z22219f8a1ba4", "kind": "info", "ref": "inventory", "page": 0, "x": 0.0262, "y": 0.6026, "w": 0.1979, "h": 0.0923, "size": 1.6}, {"id": "z64dd4840adae", "kind": "info", "ref": "weapons", "page": 0, "x": 0.0262, "y": 0.7574, "w": 0.5704, "h": 0.2122, "size": 1.6}, {"id": "za8d2f8ff7f48", "kind": "info", "ref": "protections", "page": 0, "x": 0.6294, "y": 0.7482, "w": 0.353, "h": 0.0438, "size": 1.6}, {"id": "za9e62954f9a5", "kind": "info", "ref": "equipment", "page": 0, "x": 0.0403, "y": 0.3521, "w": 0.1779, "h": 0.2228, "size": 1.6}]};

// Armes et protections du catalogue : Prise, Bonus, Dégâts, Fiabilité, Portée, Notes / Protection, Modificateur.
const WEAPON_FIELDS = ["Prise", "Bonus", "Dégâts", "Fiabilité", "Portée", "Notes"];
const PROTECTION_FIELDS = ["Protection", "Modificateur"];
const WEAPONS = ["Objet contondant", "Couteau", "Hache", "Pistolet", "Pistolet lourd", "Revolver", "Fusil", "Fusil à lunette", "Fusil avec silencieux", "Fusil d'assaut", "Sarbacane de fortune"];
const PROTECTIONS = ["Gilet pare-balles"];

// Ancien équipement de l'exemple -> équipement du catalogue Metro.
const RENAME = {
  "Barre de fer": "Objet contondant",
  "Couteau de survie": "Couteau",
  "Revolver rafistolé": "Revolver",
  "Fusil de chasse": "Fusil",
  "Veste matelassée": "Gilet pare-balles",
};
// Valeurs d'exemple pour les fiches (neutres : à adapter à la table).
const SAMPLE = {
  "Objet contondant": { Prise: "1 main", Bonus: "0", "Dégâts": "1", "Fiabilité": "3", "Portée": "Contact", Notes: "" },
  Couteau: { Prise: "1 main", Bonus: "0", "Dégâts": "1", "Fiabilité": "3", "Portée": "Contact", Notes: "" },
  Revolver: { Prise: "1 main", Bonus: "0", "Dégâts": "2", "Fiabilité": "2", "Portée": "Courte", Notes: "" },
  Fusil: { Prise: "2 mains", Bonus: "0", "Dégâts": "3", "Fiabilité": "2", "Portée": "Longue", Notes: "" },
  "Gilet pare-balles": { Protection: "1", Modificateur: "0" },
};

// Chaque caractéristique Metro s'appuie sur une caractéristique de l'ancien modèle (valeurs et barème repris).
const SOURCE = {
  Vigueur: "Vigueur", Bricolage: "Débrouillardise", "Corps à corps": "Vigueur", Endurance: "Endurance",
  "Agilité": "Agilité", "Furtivité": "Agilité", "Réaction": "Perception", Tir: "Perception",
  Empathie: "Empathie", Analyse: "Savoir", Manipulation: "Empathie", Soins: "Savoir",
  Esprit: "Sang-froid", Observation: "Perception", "Compréhension": "Savoir", Survie: "Débrouillardise",
};
const PC_EXTRA = {
  Buldov: {
    texts: { archetype: "Porteur", age: "34", fierte: "Protéger le groupe", honte: "Ne sait pas demander de l'aide", camarade: "Baronov", pote: "Shadrov", apparence: "Large, silencieux, mains marquées par les charges" },
    checks: { stress: 1, "sang-froid": 0, radiations: 0, eau: 6, nourriture: 5, filtres: 3, energie: 4 },
  },
  Baronov: {
    texts: { archetype: "Mécano", age: "41", fierte: "Tout réparer", honte: "A déjà vendu des pièces défectueuses", camarade: "Buldov", pote: "Shadrov", apparence: "Menu, vif, toujours un outil dans la poche" },
    checks: { stress: 2, "sang-froid": 1, radiations: 1, eau: 4, nourriture: 3, filtres: 6, energie: 7 },
  },
  Shadrov: {
    texts: { archetype: "Éclaireur", age: "27", fierte: "Connaître chaque tunnel", honte: "S'est enfui une fois", camarade: "Buldov", pote: "Baronov", apparence: "Mince, capuche baissée, regard fuyant" },
    checks: { stress: 3, "sang-froid": 2, radiations: 0, eau: 5, nourriture: 4, filtres: 4, energie: 3 },
  },
};

const uuid5 = (name) => {
  const hash = crypto.createHash("sha1").update("demo-metro-lot6e:" + name).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const model = data.GameSheetModel?.[0];
const campaign = data.Campaign?.[0];
if (!model || !campaign) fail("Données inattendues : GameSheetModel ou Campaign manquant.");
if (model.characteristics.some((stat) => stat.name === "Esprit")) fail("La campagne d'exemple utilise déjà le système Metro : rien à faire.");
for (const name of Object.values(SOURCE)) if (!model.characteristics.some((stat) => stat.name === name)) fail(`Caractéristique attendue introuvable dans l'exemple : ${name}.`);

const oldRanges = (ranges, name) => ranges?.[SOURCE[name]] ?? { min: 1, max: 5 };
const newRanges = (ranges) => Object.fromEntries(MODEL.characteristics.map((stat) => [stat.name, oldRanges(ranges, stat.name)]));

// Modèle de feuille : tout Metro, mais le barème de niveaux de l'exemple est gardé (Faible / Standard / Élite).
const oldScale = model.scale;
const oldPcScale = model.pc_scale;
model.characteristics = MODEL.characteristics;
model.skillRollModifier = MODEL.skillRollModifier;
model.dice = MODEL.dice;
model.tracks = MODEL.tracks;
model.textFields = MODEL.textFields;
// Le nom de la mise en page ne porte pas le titre du jeu (le test du projet interdit toute marque dans l'exemple).
model.layouts = MODEL.layouts.map((layout) => ({ ...layout, name: String(layout.name || "").replace(/\s*2033/i, "") }));
model.layoutId = MODEL.layoutId;
model.zones = MODEL.zones;
model.scale = { ...oldScale, levels: (oldScale?.levels || []).map((level) => ({ ...level, ranges: newRanges(level.ranges) })) };
model.pc_scale = { ...oldPcScale, ranges: newRanges(oldPcScale?.ranges) };

// Fiches : les anciennes valeurs alimentent les nouvelles caractéristiques.
const convertStats = (old) => {
  if (!old || Object.keys(old).length === 0) return old;
  const out = {};
  for (const stat of MODEL.characteristics) {
    const value = String(old[SOURCE[stat.name]]?.value ?? "");
    out[stat.name] = { value, fields: (stat.field_names || []).map((name) => ({ name, value })) };
  }
  return out;
};
const convertEquipment = (list) =>
  (list || []).map((item) => {
    const name = RENAME[item.name] || item.name;
    if (!SAMPLE[name]) return { ...item, name };
    const fieldNames = PROTECTIONS.includes(name) ? PROTECTION_FIELDS : WEAPON_FIELDS;
    return { name, type: PROTECTIONS.includes(name) ? "Protection" : "Arme", fields: fieldNames.map((field) => ({ name: field, value: SAMPLE[name][field] ?? "" })) };
  });
for (const npc of data.NPC || []) {
  npc.characteristics = convertStats(npc.characteristics);
  npc.equipment = convertEquipment(npc.equipment);
}
for (const character of data.GameCharacter || []) {
  character.characteristics = convertStats(character.characteristics);
  character.equipment = convertEquipment(character.equipment);
  const extra = PC_EXTRA[character.name];
  if (extra) {
    character.texts = extra.texts;
    character.checks = extra.checks;
  }
}

// Catalogue d'équipement : armes et protections Metro, plus les outils qui existaient déjà.
const now = campaign.created_date || "2026-10-19T10:00:00.000Z";
const base = { campaign_id: campaign.id, created_date: now, updated_date: now, created_by_id: "local-user", created_by: "local@arcanes" };
const catalogItem = (name, type, fieldNames) => ({ id: uuid5(name), ...base, name, type, fields: fieldNames.map((field) => ({ name: field, value: "" })), field_names: fieldNames });
const kept = (data.EquipmentCatalog || []).filter((item) => !RENAME[item.name]);
data.EquipmentCatalog = [
  ...WEAPONS.map((name) => catalogItem(name, "Arme", WEAPON_FIELDS)),
  ...PROTECTIONS.map((name) => catalogItem(name, "Protection", PROTECTION_FIELDS)),
  ...kept,
];

// Contrôles : plus aucun ancien nom, chaque fiche reste cohérente avec le modèle et les catalogues.
const known = new Set(MODEL.characteristics.map((stat) => stat.name));
const catalogNames = new Set(data.EquipmentCatalog.map((item) => item.name));
const problems = [];
for (const sheet of [...data.NPC, ...data.GameCharacter]) {
  for (const key of Object.keys(sheet.characteristics || {})) if (!known.has(key)) problems.push(`${sheet.name} : caractéristique inconnue ${key}`);
  for (const item of sheet.equipment || []) if (!catalogNames.has(item.name)) problems.push(`${sheet.name} : équipement hors catalogue ${item.name}`);
}
const text = JSON.stringify(data);
for (const old of Object.keys(RENAME)) if (text.includes(old)) problems.push(`Ancien nom encore présent : ${old}`);
if (/2033|hanse|stalker|mutant|meteo/i.test(text.replace(/data:[a-z/+.-]+;base64,[A-Za-z0-9+/=]+/g, ""))) problems.push("Le fichier contiendrait une marque ou un contenu tiers interdit par le test du projet.");
if (problems.length) fail("Rien n'a été écrit :\n - " + problems.join("\n - "));

let out = JSON.stringify(data, null, 1) + (endsWithNewline ? "\n" : "");
if (crlf) out = out.replace(/\n/g, "\r\n");
console.log(`Campagne d'exemple : ${MODEL.characteristics.length} caractéristiques, ${MODEL.tracks.length} pistes, ${MODEL.zones.length} positions, ${data.EquipmentCatalog.length} objets au catalogue, ${data.GameCharacter.length} personnages et ${data.NPC.filter((n) => n.characteristics && Object.keys(n.characteristics).length).length} PNJ convertis.`);
if (dry) {
  console.log("--dry : rien n'a été écrit.");
} else {
  fs.writeFileSync(file, out);
  console.log("modifié   src/data/demoCampaign.json\n\nTerminé. Ensuite : npm run check; npm run lint; npm test; npm run build");
}
