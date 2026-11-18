// apply-encounter-initiative-lot15.mjs : lot 15, jet d'initiative des rencontres avec les dés du système
// Usage, depuis la racine du projet :
//   node apply-encounter-initiative-lot15.mjs --dry     (vérifie sans rien écrire)
//   node apply-encounter-initiative-lot15.mjs           (applique)
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

// Retrouve un fichier du projet sous src/ ou tests/ : par son nom, ou par un bout de chemin (« pages/Home.jsx », « tests/x.test.js »).
function findInSrc(name) {
  const hits = [];
  for (const base of ["src", "tests"]) {
    if (!fs.existsSync(path.join(root, base))) continue;
    for (const entry of fs.readdirSync(path.join(root, base), { recursive: true }).map(String)) {
      const file = path.join(base, entry);
      if (file.split(path.sep).includes("node_modules")) continue;
      const slashed = file.split(path.sep).join("/");
      if (name.includes("/") ? slashed.endsWith(name) : path.basename(file) === name) hits.push(file);
    }
  }
  return hits.length === 1 ? hits[0] : null;
}

const NEW_FILES = {
  "src/lib/meta/encounterInitiative.js": `// Initiative des rencontres lancée avec les dés du système : règles pures (aucun accès aux données ni au navigateur).
//
// Le jet part d'une caractéristique du modèle de fiche (par défaut celle qui s'appelle « Initiative », ce qu'a D&D 5 ; Metro n'en a pas :
// l'initiative reste alors à saisir à la main). Il utilise les dés et les réglages du système, comme le bouton de lancer des fiches
// (buildRollRequest / evaluateRoll), et donne un entier qu'on range dans \`initiative\` du combattant. Le MJ peut toujours la corriger.

import { evaluateRoll } from "@/lib/meta/dice";
import { buildRollRequest } from "@/lib/meta/rollRequest";

/** Choix « la caractéristique s'appelle Initiative » (sélecteur) et choix « saisie à la main ». */
export const INITIATIVE_AUTO = "__auto__";
export const INITIATIVE_MANUAL = "__manual__";

const plain = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/\\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

/** La caractéristique nommée « Initiative » (sans tenir compte des accents ni de la casse), ou "". */
export function findInitiativeStat(characteristics) {
  return (Array.isArray(characteristics) ? characteristics : []).find((name) => plain(name) === "initiative") || "";
}

/**
 * La caractéristique qui sert au jet, d'après le choix du MJ ("" ou INITIATIVE_AUTO : celle nommée « Initiative »,
 * INITIATIVE_MANUAL : aucune, un nom du modèle : celui-là). "" si rien ne convient : pas de bouton de lancer.
 */
export function initiativeStat(choice, characteristics) {
  const names = Array.isArray(characteristics) ? characteristics : [];
  if (choice === INITIATIVE_MANUAL) return "";
  if (choice && choice !== INITIATIVE_AUTO && names.includes(choice)) return choice;
  return findInitiativeStat(names);
}

/**
 * L'initiative qui sort d'un jet (\`evaluateRoll\`) : plus haut passe avant. « dé + valeur » et réserve de dés : le total (ou les réussites) ;
 * « sous la valeur » (plus bas est mieux) : la marge, cible moins jet.
 */
export function initiativeFromRoll(result) {
  if (!result) return null;
  const value = result.rule === "under" ? result.target - result.sum : result.total;
  return Number.isFinite(value) ? Math.round(value) : null;
}

const signed = (n) => (n < 0 ? \`− \${Math.abs(n)}\` : \`+ \${n}\`);

/** « Garde 1 : 14 (11 + 3) » : le résultat d'un jet, en une ligne lisible. */
export function describeInitiativeRoll(name, result) {
  const value = initiativeFromRoll(result);
  if (value === null) return \`\${name} : —\`;
  if (result.rule === "pool") return \`\${name} : \${value} réussite\${value > 1 ? "s" : ""} (\${result.rolls.join(" · ")})\`;
  const dice = result.rolls.join(" + ");
  if (result.rule === "under") return \`\${name} : marge \${value} (jet \${result.sum}, cible \${result.target})\`;
  const parts = [dice];
  if (result.value !== 0) parts.push(signed(result.value));
  if (result.bonus !== 0) parts.push(signed(result.bonus));
  return \`\${name} : \${value} (\${parts.join(" ")})\`;
}

/** La fiche (PNJ ou personnage allégé) d'un combattant venu d'une fiche, ou null (combattant saisi à la main). */
export function sheetOfCombatant(combatant, sources) {
  const source = combatant?.source;
  if (!source) return null;
  const list = source.kind === "npc" ? sources?.npcs : sources?.characters;
  return (Array.isArray(list) ? list : []).find((item) => item.id === source.id) || null;
}

/**
 * Lance l'initiative de chaque combattant de \`combatants\` avec la caractéristique \`characteristic\`.
 * \`setup\` vient de useRollSetup ({ dice, links, parents, modifiers }), \`sources\` de useEncounterSources.
 * Un combattant sans fiche lance avec la valeur 0. Rien n'est lancé sans caractéristique ni réglage de dés.
 * @returns {{ values: Record<string, number>, lines: string[], rolled: number }} \`values\` : identifiant du combattant -> initiative
 */
export function rollCombatants(combatants, sources, setup, characteristic, rng = Math.random) {
  const values = {};
  const lines = [];
  if (!characteristic) return { values, lines, rolled: 0 };
  for (const combatant of Array.isArray(combatants) ? combatants : []) {
    const request = buildRollRequest({ setup, sheet: sheetOfCombatant(combatant, sources), characteristic });
    if (!request) continue;
    const result = evaluateRoll({ config: request.config, die: request.spec.die, value: request.value, bonus: request.bonus, rng });
    const value = initiativeFromRoll(result);
    if (value === null) continue;
    values[combatant.id] = value;
    lines.push(describeInitiativeRoll(combatant.name, result));
  }
  return { values, lines, rolled: Object.keys(values).length };
}
`,
  "tests/encounterInitiative.test.js": `import { describe, expect, it } from "vitest";
import { presetDice } from "@/lib/meta/dice.js";
import { cleanEncounter, setInitiatives, sortCombatants } from "@/lib/meta/encounter.js";
import {
  INITIATIVE_AUTO,
  INITIATIVE_MANUAL,
  describeInitiativeRoll,
  findInitiativeStat,
  initiativeFromRoll,
  initiativeStat,
  rollCombatants,
  sheetOfCombatant,
} from "@/lib/meta/encounterInitiative.js";

const setupOf = (preset) => ({ dice: presetDice(preset), links: {}, modifiers: {}, parents: {} });
const sources = {
  npcs: [{ id: "n1", name: "Garde", characteristics: { Initiative: { value: "3" } } }],
  characters: [{ id: "c1", name: "Mira", characteristics: { Initiative: { value: "-1" } } }],
};
const guard = { id: "g", name: "Garde", initiative: null, source: { kind: "npc", id: "n1" } };
const mira = { id: "m", name: "Mira", initiative: null, source: { kind: "character", id: "c1" } };
const free = { id: "f", name: "Libre", initiative: null };
const half = () => 0.5;

describe("caractéristique d'initiative", () => {
  it("trouve « Initiative » sans tenir compte des accents ni de la casse", () => {
    expect(findInitiativeStat(["Force", "initiative"])).toBe("initiative");
    expect(findInitiativeStat(["Dextérité", " INITIATIVE "])).toBe(" INITIATIVE ");
    expect(findInitiativeStat(["Agilité", "Vigueur"])).toBe("");
    expect(findInitiativeStat(null)).toBe("");
  });
  it("suit le choix du MJ : automatique, saisie à la main, ou une caractéristique du modèle", () => {
    const names = ["Agilité", "Initiative"];
    expect(initiativeStat("", names)).toBe("Initiative");
    expect(initiativeStat(INITIATIVE_AUTO, names)).toBe("Initiative");
    expect(initiativeStat(INITIATIVE_MANUAL, names)).toBe("");
    expect(initiativeStat("Agilité", names)).toBe("Agilité");
    expect(initiativeStat("Disparue", names)).toBe("Initiative");
    expect(initiativeStat("", ["Agilité"])).toBe("");
  });
});

describe("rollCombatants", () => {
  it("lance d20 + valeur de la fiche : 11 + 3 = 14, 11 − 1 = 10", () => {
    const out = rollCombatants([guard, mira], sources, setupOf("d20-add"), "Initiative", half);
    expect(out.values).toEqual({ g: 14, m: 10 });
    expect(out.rolled).toBe(2);
    expect(out.lines[0]).toBe("Garde : 14 (11 + 3)");
    expect(out.lines[1]).toBe("Mira : 10 (11 − 1)");
  });
  it("un combattant sans fiche lance avec la valeur 0", () => {
    expect(rollCombatants([free], sources, setupOf("d20-add"), "Initiative", half).values).toEqual({ f: 11 });
  });
  it("ne lance rien sans caractéristique, sans réglage de dés ou avec un réglage désactivé", () => {
    expect(rollCombatants([guard], sources, setupOf("d20-add"), "", half).rolled).toBe(0);
    expect(rollCombatants([guard], sources, { dice: null }, "Initiative", half).rolled).toBe(0);
    expect(rollCombatants([guard], sources, { dice: { ...presetDice("d20-add"), enabled: false } }, "Initiative", half).rolled).toBe(0);
    expect(rollCombatants(null, sources, setupOf("d20-add"), "Initiative", half)).toEqual({ values: {}, lines: [], rolled: 0 });
  });
  it("réserve de dés : le nombre de réussites ; sous la valeur : la marge", () => {
    const pool = rollCombatants([{ ...guard }], { npcs: [{ id: "n1", name: "Garde", characteristics: { Initiative: { value: "2" } } }] }, setupOf("d6-pool"), "Initiative", () => 0.99);
    expect(pool.values.g).toBe(2);
    expect(pool.lines[0]).toContain("2 réussites");
    const under = rollCombatants([guard], sources, setupOf("3d6-under"), "Initiative", half);
    // 3d6 à 4 = 12 contre la cible 3 : marge 3 − 12
    expect(under.values.g).toBe(-9);
    expect(under.lines[0]).toContain("marge -9");
  });
  it("donne les mêmes valeurs pour le même tirage", () => {
    const first = rollCombatants([guard, mira], sources, setupOf("d20-add"), "Initiative", half);
    const second = rollCombatants([guard, mira], sources, setupOf("d20-add"), "Initiative", half);
    expect(first).toEqual(second);
  });
});

describe("résultats et fiches", () => {
  it("initiativeFromRoll rend null sans résultat", () => {
    expect(initiativeFromRoll(null)).toBeNull();
    expect(describeInitiativeRoll("X", null)).toBe("X : —");
  });
  it("retrouve la fiche d'un combattant d'après son lien", () => {
    expect(sheetOfCombatant(guard, sources).name).toBe("Garde");
    expect(sheetOfCombatant(mira, sources).name).toBe("Mira");
    expect(sheetOfCombatant(free, sources)).toBeNull();
    expect(sheetOfCombatant({ source: { kind: "npc", id: "zzz" } }, sources)).toBeNull();
    expect(sheetOfCombatant(guard, null)).toBeNull();
  });
});

describe("setInitiatives", () => {
  const encounter = cleanEncounter({ id: "e", campaign_id: "c", title: "T", combatants: [{ id: "a", name: "A" }, { id: "b", name: "B", initiative: 4 }] });
  it("range les initiatives dans les combattants, ignore un inconnu et ne modifie pas l'original", () => {
    const next = setInitiatives(encounter, { a: 15, b: 2, zzz: 9 });
    expect(next.combatants.map((item) => item.initiative)).toEqual([15, 2]);
    expect(encounter.combatants.map((item) => item.initiative)).toEqual([null, 4]);
    expect(sortCombatants(next.combatants).map((item) => item.id)).toEqual(["a", "b"]);
  });
  it("accepte des valeurs absentes ou vides", () => {
    expect(setInitiatives(encounter, null)).toEqual(encounter);
    expect(setInitiatives(encounter, {})).toEqual(encounter);
  });
});
`,
};

const EDITS = {
  "lib/meta/encounter.js": [
    {
      find: `export const renameEncounter = (encounter, title) => ({ ...encounter, title: cleanTitle(title) });`,
      replace: `export const renameEncounter = (encounter, title) => ({ ...encounter, title: cleanTitle(title) });

/** Range des initiatives (\`values\` : identifiant du combattant -> initiative) ; un identifiant inconnu est ignoré. */
export function setInitiatives(encounter, values) {
  let current = encounter;
  for (const [id, value] of Object.entries(values && typeof values === "object" ? values : {})) current = updateCombatant(current, id, { initiative: value });
  return current;
}`,
    },
  ],
  "lib/services/encounters.js": [
    {
      find: `    characteristics: row.characteristics && typeof row.characteristics === "object" ? row.characteristics : {},
  });`,
      replace: `    characteristics: row.characteristics && typeof row.characteristics === "object" ? row.characteristics : {},
    // Dés propres à la fiche (réglés par le MJ) : le jet d'initiative les respecte.
    dice_override: row.dice_override && typeof row.dice_override === "object" ? row.dice_override : {},
  });`,
    },
  ],
  "tests/encounterSources.test.js": [
    {
      find: `    expect(Object.keys(sources.npcs[0]).sort()).toEqual(["characteristics", "id", "name"]);`,
      replace: `    expect(Object.keys(sources.npcs[0]).sort()).toEqual(["characteristics", "dice_override", "id", "name"]);`,
    },
  ],
  "components/codex/EncounterDialog.jsx": [
    {
      find: `import { useEncounterSources } from "@/hooks/useEncounterSources";`,
      replace: `import { useEncounterSources } from "@/hooks/useEncounterSources";
import { useRollSetup } from "@/hooks/useRollSetup";
import { hasDiceConfig } from "@/lib/meta/dice";
import { INITIATIVE_AUTO, INITIATIVE_MANUAL, findInitiativeStat, initiativeStat, rollCombatants } from "@/lib/meta/encounterInitiative";`,
    },
    {
      find: `  setActive,
  updateCombatant,
} from "@/lib/meta/encounter";`,
      replace: `  setActive,
  setInitiatives,
  updateCombatant,
} from "@/lib/meta/encounter";`,
    },
    {
      find: `function CombatantRow({ combatant, active, apply }) {`,
      replace: `function CombatantRow({ combatant, active, apply, onRoll }) {`,
    },
    {
      find: `          onCommit={(value) => change({ initiative: value })}
          className="w-16"
        />`,
      replace: `          onCommit={(value) => change({ initiative: value })}
          className="w-16"
        />
        {onRoll && (
          <Button type="button" size="sm" variant="outline" className="h-8 min-touch" aria-label={\`Lancer l'initiative de \${name}\`} onClick={() => onRoll(combatant)}>
            Lancer
          </Button>
        )}`,
    },
    {
      find: `; l'initiative reste à saisir.`,
      replace: `; l'initiative se saisit ou se lance.`,
    },
    {
      find: `/**
 * Suivi de rencontre : combattants dans l'ordre d'initiative, points de vie, tour de jeu et round.`,
      replace: `// Caractéristique qui sert au jet d'initiative, retenue par campagne sur cet appareil ("" : celle nommée « Initiative »).
const readInitiativeChoice = (campaignId) => {
  try {
    return window.localStorage.getItem("arcanes_encounter_initiative:" + campaignId) || "";
  } catch {
    return "";
  }
};

const writeInitiativeChoice = (campaignId, value) => {
  try {
    if (value) window.localStorage.setItem("arcanes_encounter_initiative:" + campaignId, value);
    else window.localStorage.removeItem("arcanes_encounter_initiative:" + campaignId);
  } catch {
    // Stockage indisponible : le choix ne vaut que pour cette fenêtre.
  }
};

/** Choix de la caractéristique du jet d'initiative : automatique (« Initiative »), saisie à la main, ou une caractéristique du modèle. */
function InitiativeSetting({ characteristics, choice, onChange }) {
  const auto = findInitiativeStat(characteristics);
  const value = choice === INITIATIVE_MANUAL ? INITIATIVE_MANUAL : characteristics.includes(choice) ? choice : INITIATIVE_AUTO;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Label htmlFor="encounter-initiative-stat" className="text-xs">Lancer l'initiative avec</Label>
      <Select value={value} onValueChange={(next) => onChange(next === INITIATIVE_AUTO ? "" : next)}>
        <SelectTrigger id="encounter-initiative-stat" aria-label="Caractéristique de l'initiative" className="h-8 w-full sm:w-64">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={INITIATIVE_AUTO}>{auto ? \`Automatique (« \${auto} »)\` : "Automatique (aucune « Initiative »)"}</SelectItem>
          <SelectItem value={INITIATIVE_MANUAL}>Saisie à la main</SelectItem>
          {characteristics.map((name) => (
            <SelectItem key={name} value={name}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Suivi de rencontre : combattants dans l'ordre d'initiative, points de vie, tour de jeu et round.`,
    },
    {
      find: `  const sources = useEncounterSources(campaignId, { enabled: open });`,
      replace: `  const sources = useEncounterSources(campaignId, { enabled: open });
  const rollSetup = useRollSetup(campaignId);
  const [initiativeChoice, setInitiativeChoice] = useState(() => readInitiativeChoice(campaignId));
  const [rollNote, setRollNote] = useState("");

  useEffect(() => {
    setInitiativeChoice(readInitiativeChoice(campaignId));
    setRollNote("");
  }, [campaignId]);`,
    },
    {
      find: `  const footer = (
    <div className="flex justify-end">`,
      replace: `  // Jet d'initiative : les dés du système sur la caractéristique choisie (par défaut « Initiative »). Sans caractéristique ou sans
  // réglage de dés (Metro, par exemple), il n'y a pas de bouton : l'initiative se saisit à la main.
  const diceReady = hasDiceConfig(rollSetup.dice);
  const rollStat = initiativeStat(initiativeChoice, sources.characteristics);
  const canRoll = diceReady && Boolean(rollStat);
  const missing = order.filter((combatant) => combatant.initiative === null);

  const changeInitiativeChoice = (value) => {
    setInitiativeChoice(value);
    writeInitiativeChoice(campaignId, value);
  };

  const rollFor = async (list) => {
    const rolled = rollCombatants(list, sources, rollSetup, rollStat);
    if (rolled.rolled === 0) {
      setRollNote("Rien n'a pu être lancé : vérifiez le réglage des dés du système.");
      return;
    }
    // Les valeurs sont tirées ici, une seule fois : le changement appliqué à l'écran et à l'enregistrement est identique.
    const saved = await apply((current) => setInitiatives(current, rolled.values));
    setRollNote(saved ? rolled.lines.join(" · ") : "");
  };

  const footer = (
    <div className="flex justify-end">`,
    },
    {
      find: `                <Button type="button" size="sm" onClick={() => apply(nextTurn)} disabled={order.length === 0}>`,
      replace: `                {canRoll && (
                  <Button type="button" size="sm" variant="outline" onClick={() => rollFor(missing)} disabled={missing.length === 0}>
                    Lancer les initiatives manquantes ({missing.length})
                  </Button>
                )}
                <Button type="button" size="sm" onClick={() => apply(nextTurn)} disabled={order.length === 0}>`,
    },
    {
      find: `                    <CombatantRow key={combatant.id} combatant={combatant} active={combatant.id === encounter.active_id} apply={apply} />`,
      replace: `                    <CombatantRow
                      key={combatant.id}
                      combatant={combatant}
                      active={combatant.id === encounter.active_id}
                      apply={apply}
                      onRoll={canRoll ? (item) => rollFor([item]) : undefined}
                    />`,
    },
    {
      find: `                <p className="text-xs text-muted-foreground">Un combattant à 0 PV est grisé mais garde son tour. Les combattants sans initiative passent en dernier.</p>
              )}`,
      replace: `                <p className="text-xs text-muted-foreground">Un combattant à 0 PV est grisé mais garde son tour. Les combattants sans initiative passent en dernier.</p>
              )}
              {diceReady && sources.characteristics.length > 0 && (
                <InitiativeSetting characteristics={sources.characteristics} choice={initiativeChoice} onChange={changeInitiativeChoice} />
              )}
              {rollNote && (
                <p role="status" className="text-xs text-foreground">
                  {rollNote}
                </p>
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
