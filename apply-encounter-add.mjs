// Suivi de rencontre : ajout de combattants depuis les PNJ et les personnages
// + retrait du filtre « Liées à la scène » pour l'onglet Personnages du panneau Codex de l'arborescence.
// À lancer depuis la racine du projet : node apply-encounter-add.mjs
// Tout ou rien : si une retouche ne s'applique pas, aucun fichier n'est modifié.
import fs from "node:fs";

const ENCOUNTER_META = "src/lib/meta/encounter.js";
const ENCOUNTER_SERVICE = "src/lib/services/encounters.js";
const ENCOUNTER_HOOK = "src/hooks/useEncounters.js";
const ENCOUNTER_DIALOG = "src/components/codex/EncounterDialog.jsx";
const CODEX_SIDEBAR = "src/components/codex/CodexSidebar.jsx";
const SOURCES_HOOK = "src/hooks/useEncounterSources.js";
const SOURCES_TEST = "tests/encounterSources.test.js";

// ---------- Retouches des fichiers existants ----------

const edits = {
  [ENCOUNTER_META]: [
    [
      `/** Titre propre : borné, « Rencontre » s'il est vide. */`,
      `const SOURCE_KINDS = ["npc", "character"];

/** Lien d'un combattant avec la fiche dont il vient ({ kind: "npc" | "character", id }), ou null. */
export function cleanSource(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  if (!SOURCE_KINDS.includes(source.kind) || typeof source.id !== "string" || !source.id) return null;
  return { kind: source.kind, id: source.id.slice(0, 100) };
}

/** Titre propre : borné, « Rencontre » s'il est vide. */`,
    ],
    [
      `  const hp = hpMax === null ? null : (toInt(source.hp, 0, hpMax) ?? hpMax);
  return {`,
      `  const hp = hpMax === null ? null : (toInt(source.hp, 0, hpMax) ?? hpMax);
  const link = cleanSource(source.source);
  return {`,
    ],
    [
      `    hp,
    hp_max: hpMax,
  };
}`,
      `    hp,
    hp_max: hpMax,
    ...(link ? { source: link } : {}),
  };
}`,
    ],
    [
      `export const renameEncounter = (encounter, title) => ({ ...encounter, title: cleanTitle(title) });`,
      `export const renameEncounter = (encounter, title) => ({ ...encounter, title: cleanTitle(title) });

// --- Combattants venus des fiches (PNJ et personnages) ---

/**
 * Valeur d'une caractéristique d'une fiche (premier nombre du texte, par exemple « 15 » ou « 15/20 »), ou null.
 * Sert de PV max à un combattant ; 0, vide ou texte sans nombre = PV non suivis.
 */
export function hpFromCharacteristic(sheet, name) {
  if (!name) return null;
  const characteristics = sheet && typeof sheet === "object" ? sheet.characteristics : null;
  if (!characteristics || typeof characteristics !== "object") return null;
  const match = /-?\\d+/.exec(String(characteristics[name]?.value ?? ""));
  if (!match) return null;
  const value = toInt(match[0], 0, ENCOUNTER_LIMITS.hp);
  return value && value > 0 ? value : null;
}

/**
 * Noms à donner à \`count\` combattants qui portent le même nom de base. Un seul et aucun autre du même nom : le nom tel quel ;
 * sinon ils sont numérotés à la suite de ceux déjà présents (« Garde 1 », « Garde 2 »…). Un « Garde » seul compte pour le numéro 1.
 */
export function numberedNames(encounter, baseName, count) {
  const base = text(baseName, ENCOUNTER_LIMITS.name) || DEFAULT_COMBATANT_NAME;
  const taken = [];
  for (const combatant of encounter.combatants) {
    const name = combatant.name;
    if (name === base) taken.push(1);
    else if (name.startsWith(base + " ") && /^\\d+$/.test(name.slice(base.length + 1))) taken.push(Number(name.slice(base.length + 1)));
  }
  const total = Math.max(1, Math.trunc(Number(count)) || 1);
  if (taken.length === 0 && total === 1) return [base];
  const start = taken.length === 0 ? 1 : Math.max(...taken) + 1;
  return Array.from({ length: total }, (_, index) => {
    const suffix = " " + (start + index);
    return base.slice(0, ENCOUNTER_LIMITS.name - suffix.length).trimEnd() + suffix;
  });
}

/**
 * Ajoute des combattants venus de fiches. \`entries\` : [{ kind, id, name, hpMax, ids }] ; \`ids\` donne un identifiant par
 * exemplaire (créés par l'appelant, une seule fois : la fonction doit rester pure). Initiative à saisir ensuite ;
 * la limite de 60 combattants est respectée.
 */
export function addFromSources(encounter, entries) {
  let current = encounter;
  for (const entry of Array.isArray(entries) ? entries : []) {
    const ids = Array.isArray(entry?.ids) ? entry.ids : [];
    if (ids.length === 0) continue;
    const names = numberedNames(current, entry.name, ids.length);
    ids.forEach((id, index) => {
      current = addCombatant(current, {
        id,
        name: names[index],
        initiative: null,
        hp_max: entry.hpMax ?? null,
        source: { kind: entry.kind, id: entry.id },
      });
    });
  }
  return current;
}`,
    ],
  ],

  [ENCOUNTER_SERVICE]: [
    [
      `export async function deleteEncounter(id) {
  await api.entities[ENTITY].delete(id, { silent: true });
}`,
      `export async function deleteEncounter(id) {
  await api.entities[ENTITY].delete(id, { silent: true });
}

/**
 * PNJ et personnages d'une campagne (allégés : identifiant, nom, caractéristiques) et noms des caractéristiques du modèle
 * de fiche, pour ajouter des combattants depuis les fiches.
 */
export async function loadEncounterSources(campaignId) {
  if (!campaignId) return { npcs: [], characters: [], characteristics: [] };
  const [npcs, characters, models] = await Promise.all([
    api.entities.NPC.filter({ campaign_id: campaignId }, { sort: "name", limit: LIMIT }),
    api.entities.GameCharacter.filter({ campaign_id: campaignId }, { sort: "name", limit: LIMIT }),
    api.entities.GameSheetModel.filter({ campaign_id: campaignId }, { limit: 1 }),
  ]);
  const light = (row) => ({
    id: row.id,
    name: row.name || "",
    characteristics: row.characteristics && typeof row.characteristics === "object" ? row.characteristics : {},
  });
  const names = (models.items[0]?.characteristics || [])
    .map((definition) => definition?.name)
    .filter((name) => typeof name === "string" && name);
  return { npcs: npcs.items.map(light), characters: characters.items.map(light), characteristics: [...new Set(names)] };
}`,
    ],
  ],

  [ENCOUNTER_HOOK]: [
    [
      `import { addCombatant, cleanEncounter, sortCombatants } from "@/lib/meta/encounter";`,
      `import { addCombatant, addFromSources, cleanEncounter, sortCombatants } from "@/lib/meta/encounter";`,
    ],
    [
      `  return { encounters, encounter, order, loading, select: setSelectedId, create, remove, apply, addFighter };`,
      `  /** Ajoute des combattants venus de fiches ([{ kind, id, name, hpMax, count }]) ; les identifiants sont créés ici, une seule fois. */
  const addFromSheets = useCallback(
    (entries) => {
      const withIds = entries.map((entry) => ({
        ...entry,
        ids: Array.from({ length: Math.min(20, Math.max(1, Math.trunc(Number(entry.count)) || 1)) }, uid),
      }));
      return apply((current) => addFromSources(current, withIds));
    },
    [apply]
  );

  return { encounters, encounter, order, loading, select: setSelectedId, create, remove, apply, addFighter, addFromSheets };`,
    ],
  ],

  [ENCOUNTER_DIALOG]: [
    [
      `import React, { useEffect, useRef, useState } from "react";`,
      `import React, { useEffect, useMemo, useRef, useState } from "react";`,
    ],
    [
      `import ResponsiveDialog from "@/components/common/ResponsiveDialog";`,
      `import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import OwnerPicker from "@/components/common/OwnerPicker";`,
    ],
    [
      `import { useEncounters } from "@/hooks/useEncounters";`,
      `import { useEncounters } from "@/hooks/useEncounters";
import { useEncounterSources } from "@/hooks/useEncounterSources";`,
    ],
    [
      `  adjustHp,
  isDown,`,
      `  adjustHp,
  hpFromCharacteristic,
  isDown,`,
    ],
    [
      `const show = (value) => (value === null || value === undefined ? "" : String(value));`,
      `const show = (value) => (value === null || value === undefined ? "" : String(value));

const NO_IDS = [];`,
    ],
    [
      `        {down && <span className="tag border border-border text-muted-foreground">À terre</span>}`,
      `        {combatant.source && (
          <span className="tag border border-border text-muted-foreground">{combatant.source.kind === "npc" ? "PNJ" : "PJ"}</span>
        )}
        {down && <span className="tag border border-border text-muted-foreground">À terre</span>}`,
    ],
    [
      `/**
 * Suivi de rencontre : combattants dans l'ordre d'initiative, points de vie, tour de jeu et round.`,
      `const HP_NONE = "__none__";
const MAX_COPIES = 20;

// Caractéristique qui donne les PV max, retenue par campagne sur cet appareil (réglage d'affichage, pas une donnée de jeu).
const readHpChoice = (campaignId) => {
  try {
    return window.localStorage.getItem("arcanes_encounter_hp:" + campaignId) || "";
  } catch {
    return "";
  }
};

const writeHpChoice = (campaignId, value) => {
  try {
    if (value) window.localStorage.setItem("arcanes_encounter_hp:" + campaignId, value);
    else window.localStorage.removeItem("arcanes_encounter_hp:" + campaignId);
  } catch {
    // Stockage indisponible : le choix ne vaut que pour cette fenêtre.
  }
};

/**
 * Ajout de combattants depuis les fiches : un clic sur un PNJ ou un personnage l'ajoute (autant de fois que « Nombre »,
 * numérotés s'il y en a plusieurs) ; le raccourci ajoute tous les PNJ de la scène sélectionnée. Les PV max viennent de la
 * caractéristique choisie, l'initiative reste à saisir.
 */
function AddFromSheets({ campaignId, sources, sceneNpcIds, full, onAdd }) {
  const { npcs, characters, characteristics, loading } = sources;
  const [hpName, setHpName] = useState(() => readHpChoice(campaignId));
  const [count, setCount] = useState("1");

  useEffect(() => {
    setHpName(readHpChoice(campaignId));
  }, [campaignId]);

  const hpChoice = characteristics.includes(hpName) ? hpName : "";
  const copies = Math.min(MAX_COPIES, Math.max(1, Math.trunc(Number(count)) || 1));
  const owners = useMemo(
    () => [
      ...characters.map((item) => ({ kind: "character", id: item.id, name: item.name || "Personnage" })),
      ...npcs.map((item) => ({ kind: "npc", id: item.id, name: item.name || "PNJ" })),
    ],
    [characters, npcs]
  );
  const sceneNpcs = useMemo(() => npcs.filter((item) => sceneNpcIds.includes(item.id)), [npcs, sceneNpcIds]);

  const entryOf = (kind, item, number) => ({
    kind,
    id: item.id,
    name: item.name || (kind === "npc" ? "PNJ" : "Personnage"),
    hpMax: hpFromCharacteristic(item, hpChoice),
    count: number,
  });

  const addOne = (ref) => {
    if (full) return;
    const separator = ref.indexOf(":");
    const kind = ref.slice(0, separator);
    const id = ref.slice(separator + 1);
    const item = (kind === "npc" ? npcs : characters).find((entry) => entry.id === id);
    if (item) onAdd([entryOf(kind, item, copies)]);
  };

  const changeHp = (value) => {
    const next = value === HP_NONE ? "" : value;
    setHpName(next);
    writeHpChoice(campaignId, next);
  };

  return (
    <details className="rounded-lg border border-border p-2">
      <summary className="cursor-pointer text-sm font-medium text-foreground">Ajouter depuis les PNJ et les personnages</summary>
      <div className="stack-y-3 pt-3">
        {loading && (
          <p className="text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">Chargement…</p>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[10rem] flex-1 stack-y-1">
            <Label htmlFor="encounter-hp-characteristic" className="text-xs">Caractéristique des PV</Label>
            <Select value={hpChoice || HP_NONE} onValueChange={changeHp}>
              <SelectTrigger id="encounter-hp-characteristic" aria-label="Caractéristique des PV">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={HP_NONE}>Aucune (PV à saisir)</SelectItem>
                {characteristics.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-20 stack-y-1">
            <Label htmlFor="encounter-copies" className="text-xs">Nombre</Label>
            <Input
              id="encounter-copies"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_COPIES}
              value={count}
              onChange={(event) => setCount(event.target.value)}
            />
          </div>
          {sceneNpcs.length > 0 && (
            <Button type="button" variant="outline" disabled={full} onClick={() => onAdd(sceneNpcs.map((item) => entryOf("npc", item, 1)))}>
              PNJ de la scène ({sceneNpcs.length})
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Les PV max sont la valeur de la caractéristique choisie sur la fiche. Un clic sur un nom l'ajoute (autant de fois que « Nombre ») ; l'initiative reste à saisir.
        </p>
        <OwnerPicker owners={owners} value="" onChange={addOne} label="Fiche à ajouter" />
      </div>
    </details>
  );
}

/**
 * Suivi de rencontre : combattants dans l'ordre d'initiative, points de vie, tour de jeu et round.`,
    ],
    [
      ` * @param {{ open: boolean, onOpenChange: (open: boolean) => void, campaignId: string }} props`,
      ` * @param {{ open: boolean, onOpenChange: (open: boolean) => void, campaignId: string, sceneNpcIds?: string[] }} props \`sceneNpcIds\` : PNJ de la scène sélectionnée (raccourci d'ajout)`,
    ],
    [
      `export default function EncounterDialog({ open, onOpenChange, campaignId }) {
  const { encounters, encounter, order, loading, select, create, remove, apply, addFighter } = useEncounters(campaignId, { enabled: open });`,
      `export default function EncounterDialog({ open, onOpenChange, campaignId, sceneNpcIds = NO_IDS }) {
  const { encounters, encounter, order, loading, select, create, remove, apply, addFighter, addFromSheets } = useEncounters(campaignId, { enabled: open });
  const sources = useEncounterSources(campaignId, { enabled: open });`,
    ],
    [
      `              <AddFighterForm full={full} onAdd={addFighter} />`,
      `              <AddFighterForm full={full} onAdd={addFighter} />
              <AddFromSheets campaignId={campaignId} sources={sources} sceneNpcIds={sceneNpcIds} full={full} onAdd={addFromSheets} />`,
    ],
  ],

  [CODEX_SIDEBAR]: [
    [
      `  const linkedIds = activeScene ? activeScene[kind.linkKey] || [] : [];`,
      `  const linkedIds = activeScene ? activeScene[kind.linkKey] || [] : [];
  // Les personnages ne se filtrent pas par scène : le filtre cacherait les fiches des joueurs.
  const linkedFilterOn = linkedOnly && tab !== "character";`,
    ],
    [
      `kind.entity, { term: "", linkedOnly, linkedIds,`,
      `kind.entity, { term: "", linkedOnly: linkedFilterOn, linkedIds,`,
    ],
    [
      `        {(activeScene || linkedOnly) && (`,
      `        {tab !== "character" && (activeScene || linkedOnly) && (`,
    ],
    [
      `: linkedOnly ? "Aucun élément lié à cette scène." : "Aucun élément pour l'instant."}`,
      `: linkedFilterOn ? "Aucun élément lié à cette scène." : "Aucun élément pour l'instant."}`,
    ],
    [
      `<EncounterDialog open={encounterOpen} onOpenChange={setEncounterOpen} campaignId={campaignId} />`,
      `<EncounterDialog open={encounterOpen} onOpenChange={setEncounterOpen} campaignId={campaignId} sceneNpcIds={activeScene?.npc_ids || NO_IDS} />`,
    ],
  ],
};

// ---------- Nouveaux fichiers ----------

const newFiles = {
  [SOURCES_HOOK]: `import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useDataRefresh } from "@/lib/context/RefreshContext";
import { loadEncounterSources } from "@/lib/services/encounters";

const EMPTY = { npcs: [], characters: [], characteristics: [] };

/**
 * PNJ, personnages et caractéristiques du modèle de fiche d'une campagne, pour ajouter des combattants depuis les fiches.
 * @param {string} campaignId
 * @param {{ enabled?: boolean }} [options] \`enabled: false\` évite de charger tant que la fenêtre n'est pas ouverte
 */
export function useEncounterSources(campaignId, { enabled = true } = {}) {
  const { toast } = useToast();
  const { refreshKey } = useDataRefresh();
  const [sources, setSources] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSources(EMPTY);
  }, [campaignId]);

  useEffect(() => {
    if (!campaignId || !enabled) return undefined;
    let alive = true;
    setLoading(true);
    loadEncounterSources(campaignId)
      .then((loaded) => {
        if (alive) setSources(loaded);
      })
      .catch((error) => {
        console.error("Chargement des fiches pour la rencontre impossible :", error);
        if (alive) toast({ variant: "destructive", title: "Fiches indisponibles", description: "Impossible de charger les PNJ et les personnages." });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [campaignId, enabled, refreshKey, toast]);

  return { ...sources, loading };
}
`,

  [SOURCES_TEST]: `import { describe, it, expect } from "vitest";
import { api } from "@/api/localClient";
import {
  ENCOUNTER_LIMITS,
  addFromSources,
  cleanCombatant,
  cleanEncounter,
  cleanSource,
  hpFromCharacteristic,
  numberedNames,
} from "@/lib/meta/encounter";
import { loadEncounterSources } from "@/lib/services/encounters";
import { makeCampaign } from "./helpers";

const encounter = (list = []) => cleanEncounter({ id: "e", campaign_id: "c", title: "T", combatants: list });
const named = (...names) => encounter(names.map((name, index) => ({ id: "x" + index, name })));
const namesOf = (value) => value.combatants.map((combatant) => combatant.name);

describe("rencontre : lien avec une fiche", () => {
  it("cleanSource n'accepte qu'un PNJ ou un personnage avec un identifiant", () => {
    expect(cleanSource({ kind: "npc", id: "n1" })).toEqual({ kind: "npc", id: "n1" });
    expect(cleanSource({ kind: "character", id: "c1" })).toEqual({ kind: "character", id: "c1" });
    expect(cleanSource({ kind: "location", id: "l1" })).toBeNull();
    expect(cleanSource({ kind: "npc", id: "" })).toBeNull();
    expect(cleanSource({ kind: "npc" })).toBeNull();
    expect(cleanSource(null)).toBeNull();
  });

  it("cleanCombatant garde le lien seulement s'il est valide, et ne crée pas de champ sinon", () => {
    expect(cleanCombatant({ id: "a", source: { kind: "npc", id: "n1" } }).source).toEqual({ kind: "npc", id: "n1" });
    expect("source" in cleanCombatant({ id: "a" })).toBe(false);
    expect("source" in cleanCombatant({ id: "a", source: { kind: "x", id: "n1" } })).toBe(false);
  });
});

describe("rencontre : PV depuis une caractéristique", () => {
  const sheet = { characteristics: { PV: { value: "12" }, Force: { value: "abc" }, Zero: { value: "0" }, Mixte: { value: "15/20" } } };

  it("lit le premier nombre de la valeur, sinon null", () => {
    expect(hpFromCharacteristic(sheet, "PV")).toBe(12);
    expect(hpFromCharacteristic(sheet, "Mixte")).toBe(15);
    expect(hpFromCharacteristic(sheet, "Force")).toBeNull();
    expect(hpFromCharacteristic(sheet, "Zero")).toBeNull();
    expect(hpFromCharacteristic(sheet, "Inconnue")).toBeNull();
    expect(hpFromCharacteristic(sheet, "")).toBeNull();
    expect(hpFromCharacteristic(null, "PV")).toBeNull();
    expect(hpFromCharacteristic({ characteristics: [] }, "PV")).toBeNull();
  });
});

describe("rencontre : noms numérotés", () => {
  it("un seul exemplaire et aucun autre du même nom : le nom tel quel", () => {
    expect(numberedNames(encounter(), "Garde", 1)).toEqual(["Garde"]);
  });

  it("plusieurs exemplaires : numérotés à partir de 1", () => {
    expect(numberedNames(encounter(), "Garde", 3)).toEqual(["Garde 1", "Garde 2", "Garde 3"]);
  });

  it("à la suite de ceux déjà présents, un « Garde » seul comptant pour le numéro 1", () => {
    expect(numberedNames(named("Garde"), "Garde", 1)).toEqual(["Garde 2"]);
    expect(numberedNames(named("Garde 1", "Garde 3"), "Garde", 2)).toEqual(["Garde 4", "Garde 5"]);
  });

  it("un autre nom qui commence pareil ne compte pas", () => {
    expect(numberedNames(named("Gardien", "Garde noir"), "Garde", 1)).toEqual(["Garde"]);
  });
});

describe("rencontre : ajout depuis les fiches", () => {
  const entries = [
    { kind: "npc", id: "n1", name: "Garde", hpMax: 8, ids: ["a", "b"] },
    { kind: "character", id: "c1", name: "Mira", hpMax: null, ids: ["m"] },
  ];

  it("ajoute chaque exemplaire avec son lien, ses PV max et sans initiative", () => {
    const next = addFromSources(encounter(), entries);
    expect(namesOf(next)).toEqual(["Garde 1", "Garde 2", "Mira"]);
    expect(next.combatants.map((combatant) => combatant.hp_max)).toEqual([8, 8, null]);
    expect(next.combatants.every((combatant) => combatant.initiative === null)).toBe(true);
    expect(next.combatants[0].source).toEqual({ kind: "npc", id: "n1" });
    expect(next.combatants[2].source).toEqual({ kind: "character", id: "c1" });
  });

  it("donne le même résultat à chaque appel (l'écran et l'enregistrement appliquent le même changement)", () => {
    const start = encounter();
    expect(addFromSources(start, entries)).toEqual(addFromSources(start, entries));
  });

  it("ignore une entrée sans identifiant d'exemplaire et respecte la limite de combattants", () => {
    const start = encounter();
    expect(addFromSources(start, [{ kind: "npc", id: "n1", name: "Garde", ids: [] }])).toEqual(start);
    expect(addFromSources(start, null)).toEqual(start);
    const many = Array.from({ length: ENCOUNTER_LIMITS.combatants - 2 }, (_, index) => ({ id: "f" + index, name: "F" + index }));
    const nearlyFull = encounter(many);
    const added = addFromSources(nearlyFull, [{ kind: "npc", id: "n1", name: "Garde", ids: ["1", "2", "3", "4", "5"] }]);
    expect(added.combatants).toHaveLength(ENCOUNTER_LIMITS.combatants);
  });
});

describe("rencontre : fiches d'une campagne (service)", () => {
  it("loadEncounterSources rend PNJ et personnages allégés et les caractéristiques du modèle", async () => {
    const campaign = await makeCampaign();
    await api.entities.GameSheetModel.create({
      campaign_id: campaign.id,
      characteristics: [{ name: "PV", field_names: [] }, { name: "Force", field_names: [] }],
    });
    await api.entities.NPC.create({ campaign_id: campaign.id, name: "Garde", characteristics: { PV: { value: "8" } }, attachments: [{ name: "a", url: "data:x" }] });
    await api.entities.GameCharacter.create({ campaign_id: campaign.id, name: "Mira" });
    const sources = await loadEncounterSources(campaign.id);
    expect(sources.characteristics).toEqual(["PV", "Force"]);
    expect(sources.characters.map((item) => item.name)).toEqual(["Mira"]);
    expect(sources.npcs).toHaveLength(1);
    expect(Object.keys(sources.npcs[0]).sort()).toEqual(["characteristics", "id", "name"]);
    expect(hpFromCharacteristic(sources.npcs[0], "PV")).toBe(8);
  });

  it("sans campagne ou sans modèle : des listes vides", async () => {
    expect(await loadEncounterSources("")).toEqual({ npcs: [], characters: [], characteristics: [] });
    const campaign = await makeCampaign();
    expect(await loadEncounterSources(campaign.id)).toEqual({ npcs: [], characters: [], characteristics: [] });
  });
});
`,
};

// ---------- Application en mémoire ----------

const results = {};
const problems = [];
for (const [file, steps] of Object.entries(edits)) {
  if (!fs.existsSync(file)) {
    problems.push(`${file} : fichier introuvable (lancer depuis la racine du projet)`);
    continue;
  }
  const raw = fs.readFileSync(file, "utf8");
  const crlf = raw.includes("\r\n");
  const text = raw.replace(/\r\n/g, "\n");
  let next = text;
  steps.forEach(([oldText, newText], index) => {
    if (next.includes(newText)) return; // déjà appliqué
    const count = next.split(oldText).length - 1;
    if (count !== 1) {
      problems.push(`${file} : retouche ${index + 1} trouvée ${count} fois (attendu : 1)`);
      return;
    }
    next = next.replace(oldText, () => newText);
  });
  results[file] = { crlf, text: next, changed: next !== text };
}

if (problems.length) {
  console.error("Aucun fichier modifié. Problèmes :");
  problems.forEach((p) => console.error(" - " + p));
  process.exit(1);
}

for (const [file, { crlf, text, changed }] of Object.entries(results)) {
  if (!changed) {
    console.log(`= ${file} (déjà à jour)`);
    continue;
  }
  fs.writeFileSync(file, crlf ? text.replace(/\n/g, "\r\n") : text, "utf8");
  console.log(`+ ${file}`);
}

for (const [file, content] of Object.entries(newFiles)) {
  if (fs.existsSync(file)) {
    console.log(`= ${file} (existe déjà, laissé tel quel)`);
  } else {
    fs.writeFileSync(file, content, "utf8");
    console.log(`+ ${file}`);
  }
}
