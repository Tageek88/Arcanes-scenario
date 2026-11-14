// apply-catalogs-lot4b.mjs : lot 4b, un système de jeu emporte aussi les compétences et équipements du catalogue (ajoutés sans rien écraser quand on l'applique à une campagne).
// Usage, depuis la racine du projet :
//   node apply-catalogs-lot4b.mjs --dry     (vérifie sans rien écrire)
//   node apply-catalogs-lot4b.mjs           (applique)
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

// Ce lot s'appuie sur les lots 4 et 6, et sur le correctif du lot 6.
const REQUIRED = ["src/lib/meta/gameSystem.js", "src/lib/services/gameSystems.js", "src/lib/meta/builtinSystems.js"];
const lacking = REQUIRED.filter((file) => !fs.existsSync(path.join(root, file)));
if (lacking.length) {
  console.error("Appliquez d'abord les lots 4 et 6. Fichiers absents : " + lacking.join(", "));
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
  "tests/gameSystemCatalog.test.js": `import { describe, expect, it } from "vitest";
import {
  MAX_CATALOG_ITEMS,
  cleanCatalogEquipment,
  cleanCatalogSkills,
  cleanSystemData,
  exportSystemFile,
  parseSystemFile,
} from "@/lib/meta/gameSystem.js";

describe("compétences du catalogue d'un système", () => {
  it("garde le nom, le modificateur et le lien vers une caractéristique du système", () => {
    const out = cleanCatalogSkills([{ name: " Tir ", roll_modifier: "+1", characteristic: "Agilité" }], ["Agilité"]);
    expect(out).toEqual([{ name: "Tir", roll_modifier: "+1", characteristic: "Agilité" }]);
  });

  it("retire le lien vers une caractéristique inconnue, mais garde la compétence", () => {
    expect(cleanCatalogSkills([{ name: "Tir", characteristic: "Inconnue" }], ["Agilité"])).toEqual([{ name: "Tir", roll_modifier: "" }]);
  });

  it("retire les doublons (casse comprise) et les entrées sans nom, et borne le nombre", () => {
    expect(cleanCatalogSkills([{ name: "Tir" }, { name: "tir" }, { name: "" }], []).map((item) => item.name)).toEqual(["Tir"]);
    const many = Array.from({ length: MAX_CATALOG_ITEMS + 5 }, (_, i) => ({ name: \`S\${i}\` }));
    expect(cleanCatalogSkills(many, [])).toHaveLength(MAX_CATALOG_ITEMS);
    expect(cleanCatalogSkills(null, [])).toEqual([]);
  });
});

describe("équipements du catalogue d'un système", () => {
  it("garde les noms de champs sans leurs valeurs", () => {
    const out = cleanCatalogEquipment([{ name: "Kalash", type: "Arme", fields: [{ name: "Dégâts", value: "3" }, { name: "Portée", value: "" }] }]);
    expect(out).toEqual([
      { name: "Kalash", type: "Arme", field_names: ["Dégâts", "Portée"], fields: [{ name: "Dégâts", value: "" }, { name: "Portée", value: "" }] },
    ]);
  });

  it("préfère field_names, retire les noms répétés et les doublons d'équipement", () => {
    const out = cleanCatalogEquipment([{ name: "Corde", field_names: ["Longueur", "Longueur", ""] }, { name: "corde" }]);
    expect(out).toHaveLength(1);
    expect(out[0].field_names).toEqual(["Longueur"]);
  });
});

describe("catalogues dans un système", () => {
  const data = {
    characteristics: [{ name: "Agilité", field_names: [] }],
    skills: [{ name: "Tir", roll_modifier: "", characteristic: "Agilité" }],
    equipment: [{ name: "Corde", type: "", field_names: [], fields: [] }],
  };

  it("un export se relit à l'identique, catalogues compris", () => {
    const back = parseSystemFile(exportSystemFile({ name: "X", data }));
    expect(back.ok).toBe(true);
    expect(back.issues).toEqual([]);
    expect(back.system.data.skills).toEqual(cleanSystemData(data).skills);
    expect(back.system.data.equipment).toEqual(cleanSystemData(data).equipment);
  });

  it("signale les compétences et équipements ignorés à l'import", () => {
    const file = JSON.stringify({ app: "arcanes-scenario", kind: "game-system", format: 1, data: { ...data, skills: [...data.skills, { name: "" }], equipment: [{ name: "" }, { name: "" }] } });
    expect(parseSystemFile(file).issues).toEqual(["1 compétence ignorée", "2 équipements ignorés"]);
  });

  it("un système ancien, sans catalogues, donne des listes vides", () => {
    const out = cleanSystemData({ characteristics: [{ name: "A" }] });
    expect(out.skills).toEqual([]);
    expect(out.equipment).toEqual([]);
  });
});
`,
  "tests/gameSystemCatalogService.test.js": `import { describe, expect, it } from "vitest";
import { api } from "@/api/localClient";
import { applyGameSystemToCampaign, saveCampaignModelAsSystem } from "@/lib/services/gameSystems";
import { makeCampaign } from "./helpers";

async function sourceCampaign() {
  const campaign = await makeCampaign("Source");
  await api.entities.GameSheetModel.create({ campaign_id: campaign.id, characteristics: [{ name: "Agilité", field_names: [] }] });
  await api.entities.SkillCatalog.create({ campaign_id: campaign.id, name: "Tir", roll_modifier: "", characteristic: "Agilité" });
  await api.entities.EquipmentCatalog.create({
    campaign_id: campaign.id,
    name: "Kalash",
    type: "Arme",
    field_names: ["Dégâts"],
    fields: [{ name: "Dégâts", value: "3" }],
  });
  return campaign;
}

const names = async (entity, campaignId) => (await api.entities[entity].filter({ campaign_id: campaignId })).items.map((item) => item.name);

describe("catalogues d'un système (service)", () => {
  it("un système enregistré emporte les compétences et équipements, sans les valeurs de champs", async () => {
    const source = await sourceCampaign();
    const system = await saveCampaignModelAsSystem(source.id, { name: "Metro" });
    expect(system.data.skills).toEqual([{ name: "Tir", roll_modifier: "", characteristic: "Agilité" }]);
    expect(system.data.equipment[0].fields).toEqual([{ name: "Dégâts", value: "" }]);
  });

  it("l'appliquer ajoute au catalogue de la campagne ce qui manque, sans doubler ni toucher au modèle", async () => {
    const source = await sourceCampaign();
    const system = await saveCampaignModelAsSystem(source.id, { name: "Metro" });
    const target = await makeCampaign("Cible");
    await api.entities.SkillCatalog.create({ campaign_id: target.id, name: "tir", roll_modifier: "+2" });
    const result = await applyGameSystemToCampaign(system.id, target.id);
    expect(result).toEqual({ replaced: false, skills: 0, equipment: 1 });
    expect(await names("SkillCatalog", target.id)).toEqual(["tir"]);
    expect(await names("EquipmentCatalog", target.id)).toEqual(["Kalash"]);
    const [model] = (await api.entities.GameSheetModel.filter({ campaign_id: target.id })).items;
    expect(model.skills).toBeUndefined();
    expect(model.equipment).toBeUndefined();
    expect(await applyGameSystemToCampaign(system.id, target.id)).toEqual({ replaced: true, skills: 0, equipment: 0 });
    expect(await names("EquipmentCatalog", target.id)).toEqual(["Kalash"]);
  });
});
`,
};

const EDITS = {
  "gameSystem.js": [
    {
      find: `export const MAX_FIELD_NAME_LENGTH = 60;`,
      replace: `export const MAX_FIELD_NAME_LENGTH = 60;
export const MAX_CATALOG_ITEMS = 300;
export const MAX_CATALOG_NAME_LENGTH = 80;
export const MAX_CATALOG_TEXT_LENGTH = 100;`,
    },
    {
      find: `/**
 * The content of a system, cleaned and bounded, from a model row or a file (\`pc_scale\` or \`pcScale\` both read).`,
      replace: `const normalize = (value) => text(value).toLocaleLowerCase("fr");

/**
 * Catalog skills of a system: { name, roll_modifier, characteristic? }. A repeated name is dropped, and a link to a
 * characteristic the system does not have is removed (the skill is kept).
 */
export function cleanCatalogSkills(raw, characteristicNames = []) {
  const known = new Set(characteristicNames);
  const out = [];
  const seen = new Set();
  for (const item of Array.isArray(raw) ? raw : []) {
    if (out.length >= MAX_CATALOG_ITEMS) break;
    const name = text(item?.name).slice(0, MAX_CATALOG_NAME_LENGTH);
    const key = normalize(name);
    if (!name || key === "__proto__" || seen.has(key)) continue;
    seen.add(key);
    const entry = { name, roll_modifier: text(item?.roll_modifier).slice(0, MAX_CATALOG_TEXT_LENGTH) };
    const characteristic = text(item?.characteristic);
    if (characteristic && known.has(characteristic)) entry.characteristic = characteristic;
    out.push(entry);
  }
  return out;
}

/**
 * Catalog equipment of a system: { name, type, field_names, fields }. Only the names of the fields are kept: their values
 * belong to each sheet. A repeated name is dropped.
 */
export function cleanCatalogEquipment(raw) {
  const out = [];
  const seen = new Set();
  for (const item of Array.isArray(raw) ? raw : []) {
    if (out.length >= MAX_CATALOG_ITEMS) break;
    const name = text(item?.name).slice(0, MAX_CATALOG_NAME_LENGTH);
    const key = normalize(name);
    if (!name || key === "__proto__" || seen.has(key)) continue;
    seen.add(key);
    const source = Array.isArray(item?.field_names) ? item.field_names : (Array.isArray(item?.fields) ? item.fields.map((field) => field?.name) : []);
    const fieldNames = [...new Set(source.map((value) => text(value).slice(0, MAX_FIELD_NAME_LENGTH)).filter(Boolean))].slice(0, MAX_FIELD_NAMES);
    out.push({ name, type: text(item?.type).slice(0, MAX_CATALOG_TEXT_LENGTH), field_names: fieldNames, fields: fieldNames.map((fieldName) => ({ name: fieldName, value: "" })) });
  }
  return out;
}

/**
 * The content of a system, cleaned and bounded, from a model row or a file (\`pc_scale\` or \`pcScale\` both read).`,
    },
    {
      find: `    layoutId: activeLayoutId(layouts, source.layoutId),
  };`,
      replace: `    layoutId: activeLayoutId(layouts, source.layoutId),
    skills: cleanCatalogSkills(source.skills, names),
    equipment: cleanCatalogEquipment(source.equipment),
  };`,
    },
    {
      find: `    hasDice: Boolean(data.dice),
  };`,
      replace: `    hasDice: Boolean(data.dice),
    skills: data.skills.length,
    equipment: data.equipment.length,
  };`,
    },
    {
      find: `    ["mise en page", "mises en page", "e", countDropped(raw.layouts, data.layouts.length)],`,
      replace: `    ["mise en page", "mises en page", "e", countDropped(raw.layouts, data.layouts.length)],
    ["compétence", "compétences", "e", countDropped(raw.skills, data.skills.length)],
    ["équipement", "équipements", "", countDropped(raw.equipment, data.equipment.length)],`,
    },
  ],
  "gameSystems.js": [
    {
      find: `import { api } from "@/api/localClient";`,
      replace: `import { api } from "@/api/localClient";
import { missingFromCatalog } from "@/lib/services/gameCatalog";`,
    },
    {
      find: `  const data = cleanSystemData(row);
  if (data.characteristics.length === 0) throw new Error("Le modèle de cette campagne n'a aucune caractéristique.");`,
      replace: `  // Le système emporte aussi les compétences et équipements du catalogue de la campagne.
  const [skills, equipment] = await Promise.all([
    api.entities.SkillCatalog.filter({ campaign_id: campaignId }, { limit: 1000 }),
    api.entities.EquipmentCatalog.filter({ campaign_id: campaignId }, { limit: 1000 }),
  ]);
  const data = cleanSystemData({ ...row, skills: skills.items, equipment: equipment.items });
  if (data.characteristics.length === 0) throw new Error("Le modèle de cette campagne n'a aucune caractéristique.");`,
    },
    {
      find: ` * touchés : ils gardent leurs valeurs, mais seules les caractéristiques de même nom s'affichent.
 * @returns {Promise<{ replaced: boolean }>}`,
      replace: ` * touchés : ils gardent leurs valeurs, mais seules les caractéristiques de même nom s'affichent. Les compétences et
 * équipements du système sont ajoutés au catalogue de la campagne ; ceux qui y sont déjà (même nom) ne sont ni modifiés ni doublés.
 * @returns {Promise<{ replaced: boolean, skills: number, equipment: number }>} \`skills\` et \`equipment\` : entrées ajoutées au catalogue`,
    },
    {
      find: `  const existing = await modelOf(campaignId);
  if (existing) {
    await api.entities.GameSheetModel.update(existing.id, fields);
    return { replaced: true };
  }
  await api.entities.GameSheetModel.create({ campaign_id: campaignId, ...fields });
  return { replaced: false };
}`,
      replace: `  // Les catalogues ne font pas partie de la ligne du modèle : ils vont dans les catalogues de la campagne.
  const { skills, equipment, ...modelFields } = fields;
  const existing = await modelOf(campaignId);
  if (existing) await api.entities.GameSheetModel.update(existing.id, modelFields);
  else await api.entities.GameSheetModel.create({ campaign_id: campaignId, ...modelFields });
  return { replaced: Boolean(existing), ...(await addCatalogItems(campaignId, skills, equipment)) };
}

/** Ajoute aux catalogues de la campagne les compétences et équipements qui n'y sont pas (comparaison sans tenir compte de la casse). */
async function addCatalogItems(campaignId, skills, equipment) {
  const [skillRes, equipmentRes] = await Promise.all([
    api.entities.SkillCatalog.filter({ campaign_id: campaignId }, { limit: 1000 }),
    api.entities.EquipmentCatalog.filter({ campaign_id: campaignId }, { limit: 1000 }),
  ]);
  const newSkills = missingFromCatalog(skillRes.items.map((item) => item.name), skills);
  const newEquipment = missingFromCatalog(equipmentRes.items.map((item) => item.name), equipment);
  for (const skill of newSkills) await api.entities.SkillCatalog.create({ campaign_id: campaignId, ...skill });
  for (const item of newEquipment) await api.entities.EquipmentCatalog.create({ campaign_id: campaignId, ...item });
  return { skills: newSkills.length, equipment: newEquipment.length };
}`,
    },
  ],
  "GameSystemsDialog.jsx": [
    {
      find: `  if (info.layouts) parts.push(plural(info.layouts, "mise en page", "mises en page"));`,
      replace: `  if (info.layouts) parts.push(plural(info.layouts, "mise en page", "mises en page"));
  if (info.skills) parts.push(plural(info.skills, "compétence", "compétences"));
  if (info.equipment) parts.push(plural(info.equipment, "équipement", "équipements"));`,
    },
    {
      find: `Les fiches gardent leurs valeurs, mais seules les caractéristiques de même nom s'affichent."`,
      replace: `Les fiches gardent leurs valeurs, mais seules les caractéristiques de même nom s'affichent. Les compétences et équipements du système sont ajoutés au catalogue, sans rien supprimer."`,
    },
    {
      find: `Enregistrez le modèle de cette campagne, ou importez un fichier.`,
      replace: `Enregistrez le modèle de cette campagne (avec son catalogue de compétences et d'équipements), ou importez un fichier.`,
    },
  ],
  "builtinSystems.js": [
    {
      find: `      layoutId: "metro",`,
      replace: `      layoutId: "metro",
      skills: [],
      equipment: [],`,
    },
  ],
  "gameSystem.test.js": [
    {
      find: `["characteristics", "dice", "layoutId", "layouts", "pc_scale", "scale", "skillRollModifier", "textFields", "tracks"]`,
      replace: `["characteristics", "dice", "equipment", "layoutId", "layouts", "pc_scale", "scale", "skillRollModifier", "skills", "textFields", "tracks"]`,
    },
    {
      find: `{ stats: 3, links: 1, tracks: 1, textFields: 1, layouts: 1, hasDice: true }`,
      replace: `{ stats: 3, links: 1, tracks: 1, textFields: 1, layouts: 1, hasDice: true, skills: 0, equipment: 0 }`,
    },
  ],
  "gameSystemService.test.js": [
    {
      find: `expect(await applyGameSystemToCampaign(system.id, target.id)).toEqual({ replaced: false });`,
      replace: `expect(await applyGameSystemToCampaign(system.id, target.id)).toEqual({ replaced: false, skills: 0, equipment: 0 });`,
    },
    {
      find: `expect(await applyGameSystemToCampaign(system.id, target.id)).toEqual({ replaced: true });`,
      replace: `expect(await applyGameSystemToCampaign(system.id, target.id)).toEqual({ replaced: true, skills: 0, equipment: 0 });`,
    },
  ],
  "gameSystemBuiltin.test.js": [
    {
      find: `expect(await applyBuiltinSystemToCampaign("builtin-metro-2033", campaign.id)).toEqual({ replaced: false });`,
      replace: `expect(await applyBuiltinSystemToCampaign("builtin-metro-2033", campaign.id)).toEqual({ replaced: false, skills: 0, equipment: 0 });`,
    },
    {
      find: `expect(await applyBuiltinSystemToCampaign("builtin-metro-2033", campaign.id)).toEqual({ replaced: true });`,
      replace: `expect(await applyBuiltinSystemToCampaign("builtin-metro-2033", campaign.id)).toEqual({ replaced: true, skills: 0, equipment: 0 });`,
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
