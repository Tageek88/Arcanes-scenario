// apply-gamesystem-lot4.mjs : lot 4, systèmes de jeu stockés hors campagne (table GameSystem, db.version(10)), copie vers une campagne, export et import d'un fichier validé.
// Usage, depuis la racine du projet :
//   node apply-gamesystem-lot4.mjs --dry     (vérifie sans rien écrire)
//   node apply-gamesystem-lot4.mjs           (applique)
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

// Ce lot s'appuie sur les lots précédents (cases à cocher, liens, champs de texte, mises en page).
const REQUIRED = ["src/lib/meta/tracks.js", "src/lib/meta/statLinks.js", "src/lib/meta/textFields.js", "src/lib/meta/layouts.js"];
const lacking = REQUIRED.filter((file) => !fs.existsSync(path.join(root, file)));
if (lacking.length) {
  console.error("Appliquez d'abord les lots précédents. Fichiers absents : " + lacking.join(", "));
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
  "src/lib/meta/gameSystem.js": `// Pure rules of the game systems stored outside any campaign (no React, no Dexie).
//
// A game system is a reusable copy of the sheet model of a campaign: characteristics (with their links), dice rule,
// NPC and PC scales, checkbox tracks, text fields and sheet layouts. It never holds characters or campaign content.
//   GameSystem row: { id, name, description, data }       data = see cleanSystemData
//   Game system file: { app, kind: "game-system", format, name, description, data }

import { characteristicNamesOf, sanitizeScale } from "@/lib/generators/npcScale";
import { sanitizePcScale } from "@/lib/generators/pcScale";
import { cleanDiceConfig } from "@/lib/meta/dice";
import { cleanParents } from "@/lib/meta/statLinks";
import { cleanTracks } from "@/lib/meta/tracks";
import { cleanTextFields } from "@/lib/meta/textFields";
import { activeLayoutId, cleanLayouts } from "@/lib/meta/layouts";

export const SYSTEM_APP = "arcanes-scenario";
export const SYSTEM_KIND = "game-system";
export const SYSTEM_FORMAT = 1;
export const MAX_SYSTEM_FILE_BYTES = 500 * 1024;
export const MAX_SYSTEMS = 100;
export const MAX_SYSTEM_NAME_LENGTH = 80;
export const MAX_SYSTEM_DESCRIPTION_LENGTH = 500;
export const MAX_CHARACTERISTICS = 60;
export const MAX_CHARACTERISTIC_NAME_LENGTH = 80;
export const MAX_FIELD_NAMES = 20;
export const MAX_FIELD_NAME_LENGTH = 60;

const text = (value) => String(value ?? "").trim();
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

/** Characteristics cleaned: a name each (repeats removed, whatever the case), their extra field names, their valid links. */
export function cleanCharacteristics(raw) {
  const out = [];
  const seen = new Set();
  for (const item of Array.isArray(raw) ? raw : []) {
    if (out.length >= MAX_CHARACTERISTICS) break;
    const name = text(item?.name).slice(0, MAX_CHARACTERISTIC_NAME_LENGTH);
    const key = name.toLocaleLowerCase("fr");
    if (!name || key === "__proto__" || seen.has(key)) continue;
    seen.add(key);
    const fieldNames = (Array.isArray(item?.field_names) ? item.field_names : [])
      .map((value) => text(value).slice(0, MAX_FIELD_NAME_LENGTH))
      .filter(Boolean)
      .slice(0, MAX_FIELD_NAMES);
    const entry = { name, field_names: fieldNames };
    const parent = text(item?.parent);
    if (parent) entry.parent = parent;
    out.push(entry);
  }
  return cleanParents(out);
}

/**
 * The content of a system, cleaned and bounded, from a model row or a file (\`pc_scale\` or \`pcScale\` both read).
 * Always returns every key, so a copy into a campaign overwrites the whole model.
 */
export function cleanSystemData(raw) {
  const source = isObject(raw) ? raw : {};
  const characteristics = cleanCharacteristics(source.characteristics);
  const names = characteristicNamesOf(characteristics);
  const tracks = cleanTracks(source.tracks);
  const textFields = cleanTextFields(source.textFields);
  const layouts = cleanLayouts(source.layouts, { characteristics, tracks, textFields });
  return {
    characteristics,
    skillRollModifier: source.skillRollModifier === true,
    scale: sanitizeScale(source.scale, names),
    pc_scale: sanitizePcScale(source.pc_scale ?? source.pcScale, names),
    dice: cleanDiceConfig(source.dice),
    tracks,
    textFields,
    layouts,
    layoutId: activeLayoutId(layouts, source.layoutId),
  };
}

/** Name and description of a system, cleaned (a system always has a name). */
export function cleanSystemInfo(raw, fallbackName = "Système sans nom") {
  return {
    name: text(raw?.name).slice(0, MAX_SYSTEM_NAME_LENGTH) || fallbackName,
    description: text(raw?.description).slice(0, MAX_SYSTEM_DESCRIPTION_LENGTH),
  };
}

/** The fields of a GameSheetModel row that a system provides (everything but the campaign and the row identity). */
export const modelFieldsFromSystem = (system) => cleanSystemData(system?.data);

/** What a system holds, for the list: { stats, links, tracks, textFields, layouts, hasDice }. */
export function describeSystem(system) {
  const data = cleanSystemData(system?.data);
  return {
    stats: data.characteristics.length,
    links: data.characteristics.filter((item) => item.parent).length,
    tracks: data.tracks.length,
    textFields: data.textFields.length,
    layouts: data.layouts.length,
    hasDice: Boolean(data.dice),
  };
}

/** The file to hand to the user (JSON text) for a system row. */
export function exportSystemFile(system) {
  const info = cleanSystemInfo(system);
  return JSON.stringify(
    { app: SYSTEM_APP, kind: SYSTEM_KIND, format: SYSTEM_FORMAT, name: info.name, description: info.description, data: cleanSystemData(system?.data) },
    null,
    2
  );
}

/** A file name for a system: arcanes-systeme-<name>.json */
export const systemFileName = (name) =>
  \`arcanes-systeme-\${String(name || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "jeu"}.json\`;

const countDropped = (raw, kept) => Math.max(0, (Array.isArray(raw) ? raw.length : 0) - kept);

/**
 * Reads the text of a game system file. Never throws: { ok, system: { name, description, data }, issues, error }.
 * \`issues\` lists what the cleaning dropped, so the user knows the import was not a perfect copy.
 */
export function parseSystemFile(content, size = String(content ?? "").length) {
  const fail = (error) => ({ ok: false, system: null, issues: [], error });
  if (size > MAX_SYSTEM_FILE_BYTES) return fail("Le fichier dépasse 500 Ko : ce n'est pas un système de jeu.");
  let parsed;
  try {
    parsed = JSON.parse(String(content ?? ""));
  } catch {
    return fail("Le fichier n'est pas un JSON valide.");
  }
  if (!isObject(parsed) || parsed.app !== SYSTEM_APP || parsed.kind !== SYSTEM_KIND) {
    return fail("Ce fichier n'est pas un système de jeu de cette application.");
  }
  if (!Number.isInteger(parsed.format) || parsed.format < 1) return fail("Le format du fichier est inconnu.");
  if (parsed.format > SYSTEM_FORMAT) return fail("Ce fichier vient d'une version plus récente de l'application.");
  if (!isObject(parsed.data)) return fail("Le fichier ne contient pas de système.");

  const data = cleanSystemData(parsed.data);
  if (data.characteristics.length === 0) return fail("Ce système ne contient aucune caractéristique.");

  const raw = parsed.data;
  const issues = [];
  const dropped = [
    ["caractéristique", "caractéristiques", "e", countDropped(raw.characteristics, data.characteristics.length)],
    ["case à cocher", "cases à cocher", "e", countDropped(raw.tracks, data.tracks.length)],
    ["champ de texte", "champs de texte", "", countDropped(raw.textFields, data.textFields.length)],
    ["mise en page", "mises en page", "e", countDropped(raw.layouts, data.layouts.length)],
  ];
  for (const [one, many, feminine, count] of dropped) {
    if (count > 0) issues.push(\`\${count} \${count > 1 ? many : one} ignoré\${feminine}\${count > 1 ? "s" : ""}\`);
  }
  return { ok: true, system: { ...cleanSystemInfo(parsed, "Système importé"), data }, issues, error: "" };
}
`,
  "src/lib/services/gameSystems.js": `import { api } from "@/api/localClient";
import { isNativeApp, shareTextFile } from "@/lib/save/nativeShare";
import {
  MAX_SYSTEMS,
  cleanSystemData,
  cleanSystemInfo,
  exportSystemFile,
  modelFieldsFromSystem,
  parseSystemFile,
  systemFileName,
} from "@/lib/meta/gameSystem";

// Systèmes de jeu enregistrés hors campagne : un modèle de fiche réutilisable d'une campagne à l'autre, et partageable
// par fichier. Un système ne contient jamais de personnages ni de contenu de campagne (voir \`lib/meta/gameSystem.js\`).

const modelOf = async (campaignId) => (await api.entities.GameSheetModel.filter({ campaign_id: campaignId }, { limit: 1 })).items[0] || null;

/** Les systèmes enregistrés, par nom. */
export const listGameSystems = () => api.entities.GameSystem.list("name");

async function createSystem(info, data) {
  const existing = await api.entities.GameSystem.list(undefined, MAX_SYSTEMS + 1);
  if (existing.length >= MAX_SYSTEMS) throw new Error(\`Limite atteinte : \${MAX_SYSTEMS} systèmes au plus.\`);
  return api.entities.GameSystem.create({ ...cleanSystemInfo(info), data });
}

/** Enregistre le modèle de fiche d'une campagne comme système (une copie : la campagne n'est pas modifiée). */
export async function saveCampaignModelAsSystem(campaignId, info) {
  const row = await modelOf(campaignId);
  if (!row) throw new Error("Cette campagne n'a pas de modèle de fiche.");
  const data = cleanSystemData(row);
  if (data.characteristics.length === 0) throw new Error("Le modèle de cette campagne n'a aucune caractéristique.");
  return createSystem(info, data);
}

/**
 * Copie un système dans une campagne : son modèle de fiche est créé, ou remplacé s'il existe. Les personnages ne sont pas
 * touchés : ils gardent leurs valeurs, mais seules les caractéristiques de même nom s'affichent.
 * @returns {Promise<{ replaced: boolean }>}
 */
export async function applyGameSystemToCampaign(systemId, campaignId) {
  const system = await api.entities.GameSystem.get(systemId);
  const fields = modelFieldsFromSystem(system);
  if (fields.characteristics.length === 0) throw new Error("Ce système ne contient aucune caractéristique.");
  const existing = await modelOf(campaignId);
  if (existing) {
    await api.entities.GameSheetModel.update(existing.id, fields);
    return { replaced: true };
  }
  await api.entities.GameSheetModel.create({ campaign_id: campaignId, ...fields });
  return { replaced: false };
}

/** Change le nom et la description d'un système. */
export const updateGameSystemInfo = (id, info) => api.entities.GameSystem.update(id, cleanSystemInfo(info));

/** Supprime un système (les campagnes qui l'ont utilisé gardent leur copie). */
export const deleteGameSystem = (id) => api.entities.GameSystem.delete(id);

/** Lit un fichier de système choisi par l'utilisateur et l'enregistre. Ne lève pas d'erreur : { ok, system, issues, error }. */
export async function importGameSystemFromFile(file) {
  if (!file) return { ok: false, system: null, issues: [], error: "Aucun fichier sélectionné." };
  try {
    const result = parseSystemFile(await file.text(), file.size);
    if (!result.ok) return result;
    const system = await createSystem(result.system, result.system.data);
    return { ...result, system };
  } catch (error) {
    console.error("Import du système de jeu impossible :", error);
    return { ok: false, system: null, issues: [], error: error?.message || "Le fichier n'a pas pu être lu." };
  }
}

/** Remet un système à l'utilisateur sous forme de fichier JSON (partage sur Android, téléchargement ailleurs). */
export async function exportGameSystem(system) {
  const text = exportSystemFile(system);
  const fileName = systemFileName(system?.name);
  if (isNativeApp()) {
    try {
      return await shareTextFile(text, fileName, "Système de jeu Arcanes & Scénario");
    } catch (error) {
      console.warn("Échec du partage natif, tentative via téléchargement :", error);
    }
  }
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
`,
  "src/components/game/GameSystemsDialog.jsx": `import React, { useEffect, useRef, useState } from "react";
import { Download, Trash2, Upload } from "lucide-react";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { describeSystem } from "@/lib/meta/gameSystem";
import {
  applyGameSystemToCampaign,
  deleteGameSystem,
  exportGameSystem,
  importGameSystemFromFile,
  listGameSystems,
  saveCampaignModelAsSystem,
} from "@/lib/services/gameSystems";

const plural = (count, one, many) => \`\${count} \${count > 1 ? many : one}\`;

function summary(system) {
  const info = describeSystem(system);
  const parts = [plural(info.stats, "caractéristique", "caractéristiques")];
  if (info.links) parts.push(plural(info.links, "lien", "liens"));
  if (info.tracks) parts.push(plural(info.tracks, "piste de cases", "pistes de cases"));
  if (info.textFields) parts.push(plural(info.textFields, "champ de texte", "champs de texte"));
  if (info.layouts) parts.push(plural(info.layouts, "mise en page", "mises en page"));
  if (info.hasDice) parts.push("lancer de dés");
  return parts.join(" · ");
}

/**
 * Systèmes de jeu enregistrés hors campagne : enregistrer le modèle de la campagne, appliquer un système à la campagne
 * (copie), exporter et importer un fichier. Les campagnes ne partagent jamais un système : chacune garde sa copie.
 */
export default function GameSystemsDialog({ open, onOpenChange, campaignId, hasModel }) {
  const { toast } = useToast();
  const fileRef = useRef(null);
  const [systems, setSystems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [confirm, setConfirm] = useState(null);

  const reload = async () => {
    setLoading(true);
    try {
      setSystems(await listGameSystems());
    } catch (error) {
      console.error("Lecture des systèmes de jeu impossible :", error);
      toast({ variant: "destructive", title: "Lecture impossible", description: "Les systèmes n'ont pas pu être chargés." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setConfirm(null);
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const run = async (task, success) => {
    setBusy(true);
    try {
      const result = await task();
      if (success) toast({ title: success });
      await reload();
      return result;
    } catch (error) {
      console.error("Action sur les systèmes de jeu impossible :", error);
      toast({ variant: "destructive", title: "Action impossible", description: error?.message || "Une erreur est survenue." });
      return undefined;
    } finally {
      setBusy(false);
    }
  };

  const saveCurrent = async () => {
    const saved = await run(() => saveCampaignModelAsSystem(campaignId, { name, description }), "Système enregistré");
    if (saved) {
      setName("");
      setDescription("");
    }
  };

  const applySystem = async (system) => {
    if (hasModel && confirm?.id !== system.id) {
      setConfirm({ kind: "apply", id: system.id });
      return;
    }
    setConfirm(null);
    const done = await run(() => applyGameSystemToCampaign(system.id, campaignId));
    if (done) {
      toast({ title: "Système appliqué", description: \`« \${system.name} » est maintenant le modèle de fiche de cette campagne.\` });
      onOpenChange(false);
    }
  };

  const removeSystem = async (system) => {
    if (confirm?.id !== system.id) {
      setConfirm({ kind: "delete", id: system.id });
      return;
    }
    setConfirm(null);
    await run(() => deleteGameSystem(system.id), "Système supprimé");
  };

  const importFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    const result = await importGameSystemFromFile(file);
    setBusy(false);
    if (!result.ok) {
      toast({ variant: "destructive", title: "Import impossible", description: result.error });
      return;
    }
    toast({ title: "Système importé", description: result.issues.length ? \`Ignoré : \${result.issues.join(", ")}.\` : result.system.name });
    await reload();
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Systèmes de jeu"
      description="Réutilisez un modèle de fiche d'une campagne à l'autre, ou partagez-le par fichier. Chaque campagne garde sa propre copie."
      footer={<Button variant="ghost" onClick={() => onOpenChange(false)}>Fermer</Button>}
    >
      <div className="stack-y-5 py-1">
        {hasModel && (
          <section className="stack-y-2 rounded-lg border border-border p-3">
            <h3 className="font-display font-semibold">Enregistrer le modèle de cette campagne</h3>
            <div className="stack-y-1.5">
              <Label htmlFor="system-name">Nom du système</Label>
              <Input id="system-name" value={name} maxLength={80} placeholder="Ex. Metro 2033" onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="stack-y-1.5">
              <Label htmlFor="system-description">Description (facultative)</Label>
              <Input id="system-description" value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} />
            </div>
            <Button onClick={saveCurrent} disabled={busy || !name.trim()}>Enregistrer comme système</Button>
          </section>
        )}

        <section className="stack-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display font-semibold">Systèmes enregistrés</h3>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Importer un fichier
            </Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={importFile} />
          </div>
          {loading && systems.length === 0 && <p className="text-sm text-muted-foreground">Chargement…</p>}
          {!loading && systems.length === 0 && (
            <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              Aucun système enregistré. {hasModel ? "Enregistrez le modèle de cette campagne, ou importez un fichier." : "Importez un fichier pour commencer."}
            </p>
          )}
          <ul className="stack-y-2">
            {systems.map((system) => (
              <li key={system.id} className="stack-y-2 rounded-lg border border-border p-3">
                <div>
                  <p className="font-medium">{system.name}</p>
                  {system.description && <p className="text-xs text-muted-foreground">{system.description}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{summary(system)}</p>
                </div>
                {confirm?.id === system.id ? (
                  <div className="stack-y-2 rounded-md bg-secondary/50 p-2">
                    <p className="text-xs">
                      {confirm.kind === "apply"
                        ? "Le modèle de fiche actuel de cette campagne sera remplacé. Les fiches gardent leurs valeurs, mais seules les caractéristiques de même nom s'affichent."
                        : "Supprimer ce système ? Les campagnes qui l'ont utilisé gardent leur copie. Exportez-le d'abord pour le conserver."}
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant={confirm.kind === "delete" ? "destructive" : "default"} disabled={busy} onClick={() => (confirm.kind === "apply" ? applySystem(system) : removeSystem(system))}>
                        {confirm.kind === "apply" ? "Remplacer le modèle" : "Supprimer"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirm(null)}>Annuler</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" disabled={busy || !campaignId} onClick={() => applySystem(system)}>Utiliser pour cette campagne</Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => exportGameSystem(system))}>
                      <Download className="h-4 w-4" /> Exporter
                    </Button>
                    <Button size="icon" variant="ghost" aria-label={\`Supprimer le système \${system.name}\`} disabled={busy} onClick={() => removeSystem(system)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </ResponsiveDialog>
  );
}
`,
  "tests/gameSystem.test.js": `import { describe, expect, it } from "vitest";
import {
  MAX_CHARACTERISTICS,
  MAX_SYSTEM_FILE_BYTES,
  SYSTEM_FORMAT,
  cleanCharacteristics,
  cleanSystemData,
  cleanSystemInfo,
  describeSystem,
  exportSystemFile,
  parseSystemFile,
  systemFileName,
} from "@/lib/meta/gameSystem.js";

const DATA = {
  characteristics: [
    { name: "Vigueur", field_names: [] },
    { name: "Endurance", field_names: ["Notes"], parent: "Vigueur" },
    { name: "Agilité", field_names: [] },
  ],
  skillRollModifier: false,
  scale: { levels: [] },
  pc_scale: { ranges: {}, skills: null, equipment: null },
  dice: { enabled: true, mode: "single", rule: "pool", single: { count: 1, sides: 6 }, perStat: {}, crit: {}, outcome: "success", difficulty: 6 },
  tracks: [{ id: "t1", name: "Stress", count: 5 }],
  textFields: [{ id: "x1", name: "Archétype", long: false }],
  layouts: [{ id: "l1", name: "Metro", columns: 2, blocks: [{ id: "g1", kind: "stat-group", stat: "Vigueur" }] }],
  layoutId: "l1",
};
const SYSTEM = { name: "Metro 2033", description: "Survie", data: DATA };

describe("cleanCharacteristics", () => {
  it("garde les noms, retire les doublons (casse comprise) et les liens inutilisables", () => {
    const out = cleanCharacteristics([
      { name: " Vigueur " },
      { name: "vigueur" },
      { name: "Endurance", parent: "Vigueur" },
      { name: "Tir", parent: "Inconnue" },
      { name: "" },
    ]);
    expect(out.map((item) => item.name)).toEqual(["Vigueur", "Endurance", "Tir"]);
    expect(out[1].parent).toBe("Vigueur");
    expect(out[2].parent).toBeUndefined();
  });

  it("borne le nombre de caractéristiques et tolère une valeur qui n'est pas une liste", () => {
    const many = Array.from({ length: MAX_CHARACTERISTICS + 5 }, (_, i) => ({ name: \`C\${i}\` }));
    expect(cleanCharacteristics(many)).toHaveLength(MAX_CHARACTERISTICS);
    expect(cleanCharacteristics(null)).toEqual([]);
  });
});

describe("cleanSystemData", () => {
  it("renvoie toujours toutes les clés, même pour une valeur vide", () => {
    const out = cleanSystemData(null);
    expect(Object.keys(out).sort()).toEqual(
      ["characteristics", "dice", "layoutId", "layouts", "pc_scale", "scale", "skillRollModifier", "textFields", "tracks"]
    );
    expect(out.characteristics).toEqual([]);
    expect(out.dice).toBeNull();
  });

  it("garde un système complet à l'identique", () => {
    const out = cleanSystemData(DATA);
    expect(out.characteristics).toEqual(DATA.characteristics);
    expect(out.tracks).toEqual(DATA.tracks);
    expect(out.textFields).toEqual(DATA.textFields);
    expect(out.layouts[0].blocks[0].stat).toBe("Vigueur");
    expect(out.layoutId).toBe("l1");
    expect(out.dice.rule).toBe("pool");
  });

  it("lit pcScale comme pc_scale, et ignore les clés inconnues", () => {
    const out = cleanSystemData({ ...DATA, pc_scale: undefined, pcScale: { ranges: { Vigueur: { min: 1, max: 4 } } }, secret: "x" });
    expect(out.pc_scale.ranges.Vigueur).toBeDefined();
    expect(out.secret).toBeUndefined();
  });

  it("retire d'une mise en page un groupe dont la caractéristique n'existe plus", () => {
    const out = cleanSystemData({ ...DATA, characteristics: [{ name: "Agilité" }] });
    expect(out.layouts[0].blocks).toEqual([]);
  });

  it("revient à la mise en page par défaut si celle choisie n'existe plus", () => {
    expect(cleanSystemData({ ...DATA, layoutId: "zz" }).layoutId).toBe("");
  });
});

describe("cleanSystemInfo et describeSystem", () => {
  it("donne toujours un nom et borne la description", () => {
    expect(cleanSystemInfo({ name: "  " }).name).toBe("Système sans nom");
    expect(cleanSystemInfo({ name: " A ", description: "z".repeat(900) }).description).toHaveLength(500);
  });

  it("compte ce que contient un système", () => {
    expect(describeSystem(SYSTEM)).toEqual({ stats: 3, links: 1, tracks: 1, textFields: 1, layouts: 1, hasDice: true });
  });
});

describe("fichier de système", () => {
  it("un export se relit à l'identique", () => {
    const back = parseSystemFile(exportSystemFile(SYSTEM));
    expect(back.ok).toBe(true);
    expect(back.issues).toEqual([]);
    expect(back.system.name).toBe("Metro 2033");
    expect(back.system.description).toBe("Survie");
    expect(back.system.data).toEqual(cleanSystemData(DATA));
  });

  it("refuse ce qui n'est pas un système, sans lever d'erreur", () => {
    expect(parseSystemFile("pas du json").ok).toBe(false);
    expect(parseSystemFile("[]").ok).toBe(false);
    expect(parseSystemFile(JSON.stringify({ app: "autre", kind: "game-system", format: 1, data: DATA })).ok).toBe(false);
    expect(parseSystemFile(JSON.stringify({ app: "arcanes-scenario", kind: "theme", format: 1, data: DATA })).ok).toBe(false);
  });

  it("refuse un format plus récent, un format absent, un fichier trop gros et un système sans caractéristique", () => {
    const file = (extra) => JSON.stringify({ app: "arcanes-scenario", kind: "game-system", format: 1, name: "X", data: DATA, ...extra });
    expect(parseSystemFile(file({ format: SYSTEM_FORMAT + 1 })).error).toContain("plus récente");
    expect(parseSystemFile(file({ format: undefined })).ok).toBe(false);
    expect(parseSystemFile(file({}), MAX_SYSTEM_FILE_BYTES + 1).ok).toBe(false);
    expect(parseSystemFile(file({ data: { characteristics: [] } })).error).toContain("aucune caractéristique");
    expect(parseSystemFile(file({ data: null })).ok).toBe(false);
  });

  it("signale ce que le nettoyage a retiré", () => {
    const text = JSON.stringify({
      app: "arcanes-scenario",
      kind: "game-system",
      format: 1,
      data: { ...DATA, tracks: [...DATA.tracks, { id: "", name: "" }], textFields: [{ id: "a", name: "" }, { id: "b", name: "" }] },
    });
    const out = parseSystemFile(text);
    expect(out.ok).toBe(true);
    expect(out.issues).toEqual(["1 case à cocher ignorée", "2 champs de texte ignorés"]);
    expect(out.system.name).toBe("Système importé");
  });

  it("le nom du fichier est sûr", () => {
    expect(systemFileName("Métro 2033 / v2")).toBe("arcanes-systeme-metro-2033-v2.json");
    expect(systemFileName("")).toBe("arcanes-systeme-jeu.json");
  });
});
`,
  "tests/gameSystemService.test.js": `import { describe, expect, it } from "vitest";
import { api } from "@/api/localClient";
import { deleteCampaignCascade } from "@/lib/services/campaignDelete";
import { applyGameSystemToCampaign, deleteGameSystem, listGameSystems, saveCampaignModelAsSystem } from "@/lib/services/gameSystems";
import { makeCampaign } from "./helpers";

const CHARACTERISTICS = [
  { name: "Vigueur", field_names: [] },
  { name: "Endurance", field_names: [], parent: "Vigueur" },
];
const TRACKS = [{ id: "t1", name: "Stress", count: 5 }];

async function campaignWithModel() {
  const campaign = await makeCampaign("Source");
  await api.entities.GameSheetModel.create({ campaign_id: campaign.id, characteristics: CHARACTERISTICS, skillRollModifier: false, tracks: TRACKS });
  return campaign;
}

describe("systèmes de jeu (service)", () => {
  it("enregistre le modèle d'une campagne comme système, sans modifier la campagne", async () => {
    const campaign = await campaignWithModel();
    const system = await saveCampaignModelAsSystem(campaign.id, { name: "Metro", description: "Survie" });
    expect(system.name).toBe("Metro");
    expect(system.campaign_id).toBeUndefined();
    expect(system.data.characteristics.map((item) => item.name)).toEqual(["Vigueur", "Endurance"]);
    expect(system.data.tracks).toEqual(TRACKS);
    expect((await listGameSystems()).map((item) => item.name)).toEqual(["Metro"]);
  });

  it("refuse d'enregistrer une campagne sans modèle", async () => {
    const campaign = await makeCampaign("Vide");
    await expect(saveCampaignModelAsSystem(campaign.id, { name: "X" })).rejects.toThrow("pas de modèle");
  });

  it("copie un système dans une campagne qui n'a pas de modèle", async () => {
    const source = await campaignWithModel();
    const system = await saveCampaignModelAsSystem(source.id, { name: "Metro" });
    const target = await makeCampaign("Cible");
    expect(await applyGameSystemToCampaign(system.id, target.id)).toEqual({ replaced: false });
    const rows = (await api.entities.GameSheetModel.filter({ campaign_id: target.id })).items;
    expect(rows).toHaveLength(1);
    expect(rows[0].characteristics.map((item) => item.name)).toEqual(["Vigueur", "Endurance"]);
    expect(rows[0].tracks).toEqual(TRACKS);
  });

  it("remplace le modèle d'une campagne sans toucher à ses personnages", async () => {
    const source = await campaignWithModel();
    const system = await saveCampaignModelAsSystem(source.id, { name: "Metro" });
    const target = await makeCampaign("Cible");
    await api.entities.GameSheetModel.create({ campaign_id: target.id, characteristics: [{ name: "Force", field_names: [] }] });
    await api.entities.GameCharacter.create({ campaign_id: target.id, name: "Hero", characteristics: { Force: { value: "3" } } });
    expect(await applyGameSystemToCampaign(system.id, target.id)).toEqual({ replaced: true });
    const models = (await api.entities.GameSheetModel.filter({ campaign_id: target.id })).items;
    expect(models).toHaveLength(1);
    expect(models[0].characteristics.map((item) => item.name)).toEqual(["Vigueur", "Endurance"]);
    const heroes = (await api.entities.GameCharacter.filter({ campaign_id: target.id })).items;
    expect(heroes[0].characteristics.Force.value).toBe("3");
  });

  it("supprimer un système laisse la copie des campagnes", async () => {
    const source = await campaignWithModel();
    const system = await saveCampaignModelAsSystem(source.id, { name: "Metro" });
    const target = await makeCampaign("Cible");
    await applyGameSystemToCampaign(system.id, target.id);
    await deleteGameSystem(system.id);
    expect(await listGameSystems()).toEqual([]);
    expect((await api.entities.GameSheetModel.filter({ campaign_id: target.id })).items).toHaveLength(1);
  });

  it("supprimer une campagne laisse les systèmes enregistrés", async () => {
    const source = await campaignWithModel();
    await saveCampaignModelAsSystem(source.id, { name: "Metro" });
    await deleteCampaignCascade(source.id);
    expect((await listGameSystems()).map((item) => item.name)).toEqual(["Metro"]);
  });
});
`,
};

const EDITS = {
  "dbConfig.js": [
    {
      find: `// Suivi de rencontre (initiative, PV, tour de jeu) : une ligne par rencontre d'une campagne (voir \`lib/meta/encounter.js\`).
export const TABLES = [...VERSION_8_TABLES, "Encounter"];`,
      replace: `// Suivi de rencontre (initiative, PV, tour de jeu) : une ligne par rencontre d'une campagne (voir \`lib/meta/encounter.js\`).
const VERSION_9_TABLES = [...VERSION_8_TABLES, "Encounter"];
// Systèmes de jeu : modèles de fiche réutilisables, enregistrés hors campagne (voir \`lib/meta/gameSystem.js\`).
export const TABLES = [...VERSION_9_TABLES, "GameSystem"];`,
    },
    {
      find: `export const NON_CAMPAIGN_TABLES = ["Campaign", "AppSettings", "Trash"];`,
      replace: `export const NON_CAMPAIGN_TABLES = ["Campaign", "AppSettings", "Trash", "GameSystem"];`,
    },
    {
      find: `db.version(9).stores(Object.fromEntries(TABLES.map((t) => [t, "id, campaign_id"])));`,
      replace: `db.version(9).stores(Object.fromEntries(VERSION_9_TABLES.map((t) => [t, "id, campaign_id"])));
// La version 10 ajoute les systèmes de jeu, qui n'ont pas de campagne : indexés par nom.
db.version(10).stores(Object.fromEntries(TABLES.map((t) => [t, t === "GameSystem" ? "id, name" : "id, campaign_id"])));`,
    },
  ],
  "trashCapture.js": [
    {
      find: `const NEVER = new Set(["AppSettings", TRASH, "CampaignDocument", "CampaignDocumentFile", "SessionPoll"]);`,
      replace: `const NEVER = new Set(["AppSettings", TRASH, "CampaignDocument", "CampaignDocumentFile", "SessionPoll", "GameSystem"]);
// (GameSystem : sans campagne, un système se met en sécurité en l'exportant en fichier avant de le supprimer.)`,
    },
  ],
  "backup.js": [
    {
      find: `      // Une sauvegarde sans le contenu des PDF (sauvegarde automatique, ancienne version) ne les efface pas.
      if (FILE_TABLES.includes(t) && parsed.data[t] == null) continue;`,
      replace: `      // Une sauvegarde sans le contenu des PDF (sauvegarde automatique, ancienne version) ne les efface pas.
      // Il en va de même des systèmes de jeu : une sauvegarde d'avant leur création ne les efface pas.
      if ((FILE_TABLES.includes(t) || t === "GameSystem") && parsed.data[t] == null) continue;`,
    },
  ],
  "Jeu.jsx": [
    {
      find: `import { Copy, Pencil, Plus, Printer, Search, Shield, Trash2, UserRound } from "lucide-react";`,
      replace: `import { Copy, Library, Pencil, Plus, Printer, Search, Shield, Trash2, UserRound } from "lucide-react";`,
    },
    {
      find: `import GameSheetModelEditor from "@/components/game/GameSheetModelEditor";`,
      replace: `import GameSheetModelEditor from "@/components/game/GameSheetModelEditor";
import GameSystemsDialog from "@/components/game/GameSystemsDialog";`,
    },
    {
      find: `  const [modelOpen, setModelOpen] = useState(false);`,
      replace: `  const [modelOpen, setModelOpen] = useState(false);
  const [systemsOpen, setSystemsOpen] = useState(false);`,
    },
    {
      find: `              <Shield className="h-4 w-4" /> {modelId ? "Modifier le modèle" : "Définir le modèle"}
            </Button>
          )}`,
      replace: `              <Shield className="h-4 w-4" /> {modelId ? "Modifier le modèle" : "Définir le modèle"}
            </Button>
          )}
          {campaignId && (
            <Button variant="outline" onClick={() => setSystemsOpen(true)}>
              <Library className="h-4 w-4" /> Systèmes
            </Button>
          )}`,
    },
    {
      find: `        saving={savingModel}
      />`,
      replace: `        saving={savingModel}
      />
      <GameSystemsDialog open={systemsOpen} onOpenChange={setSystemsOpen} campaignId={campaignId} hasModel={Boolean(modelId)} />`,
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
