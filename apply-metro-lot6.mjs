// apply-metro-lot6.mjs : lot 6, Metro 2033 fourni avec l'application (sans illustration) : 4 attributs, 12 compétences liées, dés, pistes, champs de texte, mise en page ; proposé dans la fenêtre « Systèmes ».
// Usage, depuis la racine du projet :
//   node apply-metro-lot6.mjs --dry     (vérifie sans rien écrire)
//   node apply-metro-lot6.mjs           (applique)
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

// Ce lot s'appuie sur le lot 4 (systèmes de jeu).
const REQUIRED = ["src/lib/meta/gameSystem.js", "src/lib/services/gameSystems.js", "src/components/game/GameSystemsDialog.jsx"];
const lacking = REQUIRED.filter((file) => !fs.existsSync(path.join(root, file)));
if (lacking.length) {
  console.error("Appliquez d'abord le lot 4. Fichiers absents : " + lacking.join(", "));
  process.exit(1);
}

// Retrouve un fichier du projet par son nom (une seule correspondance attendue sous src/).
function findInSrc(name) {
  const hits = fs.readdirSync(path.join(root, "src"), { recursive: true })
    .map(String)
    .filter((file) => path.basename(file) === name && !file.split(path.sep).includes("node_modules"));
  return hits.length === 1 ? path.join("src", hits[0]) : null;
}

const NEW_FILES = {
  "src/lib/meta/builtinSystems.js": `// Game systems shipped with the application (no artwork: only names, links, rules and a layout).
// A shipped system has the same shape as a saved one ({ id, name, description, data }) plus \`builtin: true\`;
// the user copies it into a campaign or into their own systems, then adapts it freely.

const ATTRIBUTES = {
  Vigueur: ["Bricolage", "Corps à corps", "Endurance"],
  Agilité: ["Furtivité", "Réaction", "Tir"],
  Empathie: ["Analyse", "Manipulation", "Soins"],
  Esprit: ["Observation", "Compréhension", "Survie"],
};

const metroCharacteristics = () =>
  Object.entries(ATTRIBUTES).flatMap(([attribute, skills]) => [
    // Le maximum de l'attribut sert de jauge : la valeur courante baisse quand le personnage est blessé.
    { name: attribute, field_names: ["Maximum"] },
    ...skills.map((name) => ({ name, field_names: [], parent: attribute })),
  ]);

const track = (id, name, count) => ({ id, name, count });
const field = (id, name, long = false) => ({ id, name, long });

const METRO_TRACKS = [
  track("stress", "Stress", 5),
  track("sang-froid", "Sang-froid", 7),
  track("radiations", "Radiations", 10),
  track("affame", "Affamé", 1),
  track("deshydrate", "Déshydraté", 1),
  track("epuise", "Épuisé", 1),
  track("gele", "Gelé", 1),
  track("eau", "Eau", 10),
  track("nourriture", "Nourriture", 10),
  track("filtres", "Filtres", 10),
  track("energie", "Énergie", 10),
];

const METRO_TEXT_FIELDS = [
  field("archetype", "Archétype"),
  field("age", "Âge"),
  field("experience", "Expérience"),
  field("fierte", "Fierté"),
  field("honte", "Honte"),
  field("apparence", "Apparence"),
  field("protection-max", "Protection max"),
  field("protection", "Protection actuelle"),
  field("talents", "Talents", true),
  field("camarade", "Camarade"),
  field("pote", "Pote"),
  field("rival", "Rival"),
  field("blessures", "Blessures critiques", true),
  field("traumatismes", "Traumatismes psychiques", true),
  field("notes", "Notes", true),
];

const METRO_LAYOUT = {
  id: "metro",
  name: "Feuille Metro 2033",
  columns: 2,
  blocks: [
    { id: "identite", kind: "texts", title: "Identité", wide: true, ids: ["archetype", "age", "experience", "fierte", "honte", "apparence"] },
    { id: "vigueur", kind: "stat-group", stat: "Vigueur" },
    { id: "agilite", kind: "stat-group", stat: "Agilité" },
    { id: "empathie", kind: "stat-group", stat: "Empathie" },
    { id: "esprit", kind: "stat-group", stat: "Esprit" },
    { id: "pistes", kind: "tracks", title: "Stress, sang-froid, radiations", wide: true, ids: ["stress", "sang-froid", "radiations"] },
    { id: "etats", kind: "tracks", title: "États", ids: ["affame", "deshydrate", "epuise", "gele"] },
    { id: "consommables", kind: "tracks", title: "Consommables", ids: ["eau", "nourriture", "filtres", "energie"] },
    { id: "protection", kind: "texts", title: "Protection", ids: ["protection-max", "protection"] },
    { id: "liens", kind: "texts", title: "Liens", ids: ["camarade", "pote", "rival"] },
    { id: "suite", kind: "texts", title: "Talents, blessures et notes", wide: true, ids: ["talents", "blessures", "traumatismes", "notes"] },
  ],
};

export const BUILTIN_SYSTEMS = [
  {
    id: "builtin-metro-2033",
    builtin: true,
    name: "Metro 2033",
    description:
      "4 attributs et 12 compétences liées (réserve de d6, seul un 6 réussit), pistes de cases (stress, sang-froid, radiations, états, consommables) et feuille en deux colonnes. Sans illustration : importez votre propre feuille comme fond.",
    data: {
      characteristics: metroCharacteristics(),
      skillRollModifier: false,
      scale: { levels: [] },
      pc_scale: { ranges: {}, skills: null, equipment: null },
      dice: {
        enabled: true,
        mode: "single",
        rule: "pool",
        single: { count: 1, sides: 6 },
        perStat: {},
        crit: { success: null, failure: null },
        outcome: "success",
        difficulty: 6,
      },
      tracks: METRO_TRACKS,
      textFields: METRO_TEXT_FIELDS,
      layouts: [METRO_LAYOUT],
      layoutId: "metro",
    },
  },
];

/** A shipped system by id, or null. */
export const getBuiltinSystem = (id) => BUILTIN_SYSTEMS.find((system) => system.id === id) || null;
`,
  "tests/builtinSystems.test.js": `import { describe, expect, it } from "vitest";
import { BUILTIN_SYSTEMS, getBuiltinSystem } from "@/lib/meta/builtinSystems.js";
import { cleanSystemData, describeSystem, parseSystemFile, exportSystemFile } from "@/lib/meta/gameSystem.js";
import { resolveLayout } from "@/lib/meta/layouts.js";

describe("systèmes fournis", () => {
  it("chaque système fourni a un identifiant unique, un nom et le drapeau builtin", () => {
    const ids = BUILTIN_SYSTEMS.map((system) => system.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const system of BUILTIN_SYSTEMS) {
      expect(system.builtin).toBe(true);
      expect(system.name.length > 0).toBe(true);
    }
    expect(getBuiltinSystem("builtin-metro-2033").name).toBe("Metro 2033");
    expect(getBuiltinSystem("zz")).toBeNull();
  });

  it("le nettoyage ne retire rien : les données fournies sont déjà valides", () => {
    for (const system of BUILTIN_SYSTEMS) expect(cleanSystemData(system.data)).toEqual(system.data);
  });

  it("un système fourni passe l'export puis l'import sans rien perdre", () => {
    for (const system of BUILTIN_SYSTEMS) {
      const back = parseSystemFile(exportSystemFile(system));
      expect(back.ok).toBe(true);
      expect(back.issues).toEqual([]);
      expect(back.system.data).toEqual(system.data);
    }
  });
});

describe("Metro 2033", () => {
  const metro = getBuiltinSystem("builtin-metro-2033");

  it("4 attributs et 12 compétences, chacune liée à son attribut", () => {
    const stats = metro.data.characteristics;
    expect(stats).toHaveLength(16);
    expect(stats.filter((item) => !item.parent).map((item) => item.name)).toEqual(["Vigueur", "Agilité", "Empathie", "Esprit"]);
    const endurance = stats.find((item) => item.name === "Endurance");
    expect(endurance.parent).toBe("Vigueur");
    expect(stats.filter((item) => item.parent === "Esprit").map((item) => item.name)).toEqual(["Observation", "Compréhension", "Survie"]);
    expect(describeSystem(metro).links).toBe(12);
  });

  it("réserve de d6 où seul un 6 réussit", () => {
    expect(metro.data.dice.rule).toBe("pool");
    expect(metro.data.dice.single.sides).toBe(6);
    expect(metro.data.dice.difficulty).toBe(6);
  });

  it("pistes : stress 5, sang-froid 7, radiations 10, quatre états à une case, quatre consommables à 10", () => {
    const count = (id) => metro.data.tracks.find((item) => item.id === id).count;
    expect([count("stress"), count("sang-froid"), count("radiations")]).toEqual([5, 7, 10]);
    expect(["affame", "deshydrate", "epuise", "gele"].map(count)).toEqual([1, 1, 1, 1]);
    expect(["eau", "nourriture", "filtres", "energie"].map(count)).toEqual([10, 10, 10, 10]);
  });

  it("la mise en page montre tout : quatre groupes, et chaque piste et chaque champ une fois", () => {
    const layout = resolveLayout(metro.data.layouts, metro.data.layoutId, metro.data);
    expect(layout.columns).toBe(2);
    expect(layout.blocks.filter((block) => block.kind === "stat-group").map((block) => block.stat)).toEqual(["Vigueur", "Agilité", "Empathie", "Esprit"]);
    expect(layout.blocks.find((block) => block.stat === "Vigueur").children).toEqual(["Bricolage", "Corps à corps", "Endurance"]);
    expect(layout.blocks.some((block) => block.kind === "stats")).toBe(false);
    const shown = (kind, key) => layout.blocks.filter((block) => block.kind === kind).flatMap((block) => block[key].map((item) => item.id));
    expect(shown("tracks", "tracks").sort()).toEqual(metro.data.tracks.map((item) => item.id).sort());
    expect(shown("texts", "fields").sort()).toEqual(metro.data.textFields.map((item) => item.id).sort());
  });
});
`,
  "tests/gameSystemBuiltin.test.js": `import { describe, expect, it } from "vitest";
import { api } from "@/api/localClient";
import { applyBuiltinSystemToCampaign, copyBuiltinSystem, listGameSystems } from "@/lib/services/gameSystems";
import { makeCampaign } from "./helpers";

describe("systèmes fournis (service)", () => {
  it("copie Metro 2033 dans une campagne sans modèle, puis le remplace sur demande", async () => {
    const campaign = await makeCampaign("Metro");
    expect(await applyBuiltinSystemToCampaign("builtin-metro-2033", campaign.id)).toEqual({ replaced: false });
    const [row] = (await api.entities.GameSheetModel.filter({ campaign_id: campaign.id })).items;
    expect(row.characteristics).toHaveLength(16);
    expect(row.dice.rule).toBe("pool");
    expect(row.layoutId).toBe("metro");
    expect(await applyBuiltinSystemToCampaign("builtin-metro-2033", campaign.id)).toEqual({ replaced: true });
    expect((await api.entities.GameSheetModel.filter({ campaign_id: campaign.id })).items).toHaveLength(1);
  });

  it("ajoute un système fourni à ceux de l'utilisateur", async () => {
    const copy = await copyBuiltinSystem("builtin-metro-2033");
    expect(copy.name).toBe("Metro 2033");
    expect(copy.builtin).toBeUndefined();
    expect((await listGameSystems()).map((item) => item.name)).toContain("Metro 2033");
  });

  it("refuse un système fourni inconnu", async () => {
    const campaign = await makeCampaign("X");
    await expect(applyBuiltinSystemToCampaign("zz", campaign.id)).rejects.toThrow("n'existe plus");
    await expect(copyBuiltinSystem("zz")).rejects.toThrow("n'existe plus");
  });
});
`,
};

const EDITS = {
  "gameSystems.js": [
    {
      find: `} from "@/lib/meta/gameSystem";`,
      replace: `} from "@/lib/meta/gameSystem";
import { getBuiltinSystem } from "@/lib/meta/builtinSystems";`,
    },
    {
      find: `export async function applyGameSystemToCampaign(systemId, campaignId) {
  const system = await api.entities.GameSystem.get(systemId);
  const fields = modelFieldsFromSystem(system);`,
      replace: `export async function applyGameSystemToCampaign(systemId, campaignId) {
  return applySystemDataToCampaign(await api.entities.GameSystem.get(systemId), campaignId);
}

/** Même copie pour un système déjà lu (enregistré ou fourni avec l'application). */
export async function applySystemDataToCampaign(system, campaignId) {
  const fields = modelFieldsFromSystem(system);`,
    },
    {
      find: `/** Change le nom et la description d'un système. */`,
      replace: `const builtinOrThrow = (id) => {
  const system = getBuiltinSystem(id);
  if (!system) throw new Error("Ce système fourni n'existe plus.");
  return system;
};

/** Copie un système fourni avec l'application dans une campagne (voir \`applyGameSystemToCampaign\`). */
export const applyBuiltinSystemToCampaign = (id, campaignId) => applySystemDataToCampaign(builtinOrThrow(id), campaignId);

/** Ajoute un système fourni à ceux de l'utilisateur, pour l'adapter ou l'exporter. */
export async function copyBuiltinSystem(id) {
  const system = builtinOrThrow(id);
  return createSystem(system, cleanSystemData(system.data));
}

/** Change le nom et la description d'un système. */`,
    },
  ],
  "GameSystemsDialog.jsx": [
    {
      find: `import { describeSystem } from "@/lib/meta/gameSystem";`,
      replace: `import { describeSystem } from "@/lib/meta/gameSystem";
import { BUILTIN_SYSTEMS } from "@/lib/meta/builtinSystems";`,
    },
    {
      find: `import {
  applyGameSystemToCampaign,
  deleteGameSystem,`,
      replace: `import {
  applyBuiltinSystemToCampaign,
  applyGameSystemToCampaign,
  copyBuiltinSystem,
  deleteGameSystem,`,
    },
    {
      find: `    const done = await run(() => applyGameSystemToCampaign(system.id, campaignId));`,
      replace: `    const done = await run(() => (system.builtin ? applyBuiltinSystemToCampaign(system.id, campaignId) : applyGameSystemToCampaign(system.id, campaignId)));`,
    },
    {
      find: `            <h3 className="font-display font-semibold">Systèmes enregistrés</h3>`,
      replace: `            <h3 className="font-display font-semibold">Systèmes</h3>`,
    },
    {
      find: `              Aucun système enregistré. {hasModel ? "Enregistrez le modèle de cette campagne, ou importez un fichier." : "Importez un fichier pour commencer."}`,
      replace: `              Aucun système à vous pour l'instant. {hasModel ? "Enregistrez le modèle de cette campagne, ou importez un fichier." : "Importez un fichier pour commencer."}`,
    },
    {
      find: `            {systems.map((system) => (`,
      replace: `            {[...BUILTIN_SYSTEMS, ...systems].map((system) => (`,
    },
    {
      find: `                  <p className="font-medium">{system.name}</p>`,
      replace: `                  <p className="font-medium">
                    {system.name}
                    {system.builtin && <span className="ml-2 tag border border-border text-muted-foreground">Fourni</span>}
                  </p>`,
    },
    {
      find: `                    <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => exportGameSystem(system))}>
                      <Download className="h-4 w-4" /> Exporter
                    </Button>
                    <Button size="icon" variant="ghost" aria-label={\`Supprimer le système \${system.name}\`} disabled={busy} onClick={() => removeSystem(system)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>`,
      replace: `                    {system.builtin ? (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => copyBuiltinSystem(system.id), "Ajouté à vos systèmes")}>
                        Ajouter à mes systèmes
                      </Button>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => exportGameSystem(system))}>
                          <Download className="h-4 w-4" /> Exporter
                        </Button>
                        <Button size="icon" variant="ghost" aria-label={\`Supprimer le système \${system.name}\`} disabled={busy} onClick={() => removeSystem(system)}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </>
                    )}`,
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
