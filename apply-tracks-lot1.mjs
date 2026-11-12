// apply-tracks-lot1.mjs : lot 1 de la refonte des fiches, cases à cocher (pistes du modèle, cases cochées sur les fiches de personnage).
// Usage, depuis la racine du projet :
//   node apply-tracks-lot1.mjs --dry     (vérifie sans rien écrire)
//   node apply-tracks-lot1.mjs           (applique)
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

// Retrouve un fichier du projet par son nom (une seule correspondance attendue sous src/).
function findInSrc(name) {
  const hits = fs.readdirSync(path.join(root, "src"), { recursive: true })
    .map(String)
    .filter((file) => path.basename(file) === name && !file.split(path.sep).includes("node_modules"));
  return hits.length === 1 ? path.join("src", hits[0]) : null;
}

const NEW_FILES = {
  "src/lib/meta/tracks.js": `// Pure rules of the tracks ("cases à cocher") of a game sheet model (no React, no Dexie).
//
// Model (GameSheetModel.tracks): [{ id, name, count }]
//   \`id\` is stable: renaming a track never loses the boxes already ticked on the sheets.
// Sheet (GameCharacter.checks, NPC.checks): { <track id>: number of ticked boxes }
//   Boxes are ticked from the first one; a track with no ticked box has no entry.

export const MAX_TRACKS = 20;
export const MAX_TRACK_BOXES = 40;
export const MAX_TRACK_NAME_LENGTH = 60;

function toInt(value) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? n : null;
}

/** A new stable identifier for a track. */
export function newTrackId() {
  const random = globalThis.crypto?.randomUUID?.() || \`\${Date.now().toString(36)}\${Math.random().toString(36).slice(2, 8)}\`;
  return \`t\${random.replace(/-/g, "").slice(0, 12)}\`;
}

/**
 * Tracks cleaned and bounded. A track needs an id, a name and 1 to MAX_TRACK_BOXES boxes
 * (\`count\` may be typed text); anything else is dropped, and so is a repeated id.
 */
export function cleanTracks(raw) {
  const out = [];
  const seen = new Set();
  for (const item of Array.isArray(raw) ? raw : []) {
    if (out.length >= MAX_TRACKS) break;
    const id = String(item?.id ?? "").trim();
    const name = String(item?.name ?? "").trim().slice(0, MAX_TRACK_NAME_LENGTH);
    const count = toInt(item?.count);
    if (!id || id === "__proto__" || seen.has(id) || !name || count === null || count < 1) continue;
    seen.add(id);
    out.push({ id, name, count: Math.min(count, MAX_TRACK_BOXES) });
  }
  return out;
}

/** Draft of the model editor: every value is text, rows keep their id. */
export function tracksToDraft(tracks) {
  return cleanTracks(tracks).map((track) => ({ id: track.id, name: track.name, count: String(track.count) }));
}

/** Saved tracks from the editor draft (rows without a name or a box count are dropped). */
export function draftToTracks(draft) {
  return cleanTracks(draft);
}

/** Ticked boxes to show for a stored value, between 0 and the number of boxes of the track. */
export function checkedCount(value, count) {
  const n = toInt(value);
  return n === null ? 0 : Math.min(Math.max(n, 0), Math.max(0, toInt(count) ?? 0));
}

/** Value after a click on box \`index\` (0-based): clicking the last ticked box unticks it, any other box ticks up to it. */
export function nextCheckedValue(checked, index) {
  return checked === index + 1 ? index : index + 1;
}

/**
 * Ticked boxes of a sheet, cleaned. With \`tracks\` (the model's), only known tracks are kept and the value is
 * bounded by the box count; without, any id is kept (bounded by MAX_TRACK_BOXES). Zero is never stored.
 */
export function cleanChecks(raw, tracks) {
  const out = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const limits = Array.isArray(tracks) ? new Map(cleanTracks(tracks).map((track) => [track.id, track.count])) : null;
  for (const [id, value] of Object.entries(raw)) {
    if (!id.trim() || id === "__proto__") continue;
    const max = limits ? limits.get(id) : MAX_TRACK_BOXES;
    if (max === undefined) continue;
    const n = toInt(value);
    if (n === null || n < 1) continue;
    out[id] = Math.min(n, max);
  }
  return out;
}

/** The checks of a sheet with one track set to \`value\` (0 removes it). */
export function setChecked(checks, id, value) {
  const next = { ...(checks && typeof checks === "object" && !Array.isArray(checks) ? checks : {}) };
  const n = toInt(value);
  if (n === null || n < 1) delete next[id];
  else next[id] = n;
  return next;
}

/** What a printout shows: [{ id, name, count, checked }] for the model's tracks and a sheet's checks. */
export function trackRows(tracks, checks) {
  const source = checks && typeof checks === "object" ? checks : {};
  return cleanTracks(tracks).map((track) => ({
    ...track,
    checked: checkedCount(Object.hasOwn(source, track.id) ? source[track.id] : 0, track.count),
  }));
}
`,
  "src/components/game/TrackBoxes.jsx": `import React from "react";
import { cn } from "@/lib/utils";
import { checkedCount, nextCheckedValue } from "@/lib/meta/tracks";

/**
 * Une piste de cases à cocher (stress, radiations, consommables…) : son nom et ses cases.
 * \`value\` est le nombre de cases cochées ; \`onChange(nombre)\` reçoit la nouvelle valeur. Sans \`onChange\`, les cases sont en lecture seule.
 * Les cases sont des boutons : un clic dessus n'ouvre ni ne ferme la carte qui les porte.
 */
export default function TrackBoxes({ track, value = 0, onChange, className }) {
  const checked = checkedCount(value, track.count);
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{track.name}</span>
      <div className="flex flex-wrap gap-1" role="group" aria-label={\`\${track.name} : \${checked} case\${checked > 1 ? "s" : ""} cochée\${checked > 1 ? "s" : ""} sur \${track.count}\`}>
        {Array.from({ length: track.count }, (_, index) => {
          const on = index < checked;
          return (
            <button
              key={index}
              type="button"
              role="checkbox"
              aria-checked={on}
              aria-label={\`\${track.name}, case \${index + 1}\`}
              disabled={!onChange}
              onClick={(event) => {
                event.stopPropagation();
                onChange?.(nextCheckedValue(checked, index));
              }}
              className={cn(
                "h-6 w-6 rounded-sm border transition-colors",
                on ? "border-primary bg-primary" : "border-border bg-transparent hover:border-primary/60"
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
`,
  "tests/tracks.test.js": `import { describe, expect, it } from "vitest";
import {
  MAX_TRACKS,
  MAX_TRACK_BOXES,
  checkedCount,
  cleanChecks,
  cleanTracks,
  draftToTracks,
  newTrackId,
  nextCheckedValue,
  setChecked,
  trackRows,
  tracksToDraft,
} from "@/lib/meta/tracks.js";

const STRESS = { id: "t1", name: "Stress", count: 5 };
const RAD = { id: "t2", name: "Radiations", count: 10 };

describe("cleanTracks", () => {
  it("keeps a valid track and reads a typed box count", () => {
    expect(cleanTracks([{ id: "t1", name: " Stress ", count: "5" }])).toEqual([STRESS]);
  });

  it("drops tracks without name, id or a usable box count, and repeated ids", () => {
    const raw = [
      { id: "a", name: "", count: 3 },
      { id: "", name: "Sans id", count: 3 },
      { id: "b", name: "Zéro", count: 0 },
      { id: "c", name: "Texte", count: "abc" },
      { id: "d", name: "Bon", count: 2 },
      { id: "d", name: "Doublon", count: 2 },
      null,
    ];
    expect(cleanTracks(raw)).toEqual([{ id: "d", name: "Bon", count: 2 }]);
  });

  it("bounds the number of boxes and of tracks, and tolerates a non-array", () => {
    expect(cleanTracks([{ id: "x", name: "Long", count: 999 }])[0].count).toBe(MAX_TRACK_BOXES);
    const many = Array.from({ length: MAX_TRACKS + 5 }, (_, i) => ({ id: \`i\${i}\`, name: \`P\${i}\`, count: 1 }));
    expect(cleanTracks(many)).toHaveLength(MAX_TRACKS);
    expect(cleanTracks(null)).toEqual([]);
  });

  it("round-trips through the editor draft", () => {
    expect(tracksToDraft([STRESS])).toEqual([{ id: "t1", name: "Stress", count: "5" }]);
    expect(draftToTracks([{ id: "t1", name: "Stress", count: "5" }, { id: "t9", name: "", count: "3" }])).toEqual([STRESS]);
  });

  it("makes distinct identifiers", () => {
    expect(newTrackId()).not.toBe(newTrackId());
  });
});

describe("clicking boxes", () => {
  it("ticks up to the clicked box, and unticks the last ticked box", () => {
    expect(nextCheckedValue(0, 2)).toBe(3);
    expect(nextCheckedValue(3, 4)).toBe(5);
    expect(nextCheckedValue(3, 1)).toBe(2);
    expect(nextCheckedValue(3, 2)).toBe(2);
    expect(nextCheckedValue(1, 0)).toBe(0);
  });

  it("bounds the ticked boxes shown", () => {
    expect(checkedCount(3, 5)).toBe(3);
    expect(checkedCount(9, 5)).toBe(5);
    expect(checkedCount(-2, 5)).toBe(0);
    expect(checkedCount("x", 5)).toBe(0);
    expect(checkedCount(undefined, 5)).toBe(0);
  });
});

describe("cleanChecks", () => {
  it("keeps known tracks only, bounded by their box count, without zeros", () => {
    const raw = { t1: 9, t2: "4", t3: 2, t4: 0, "": 1 };
    expect(cleanChecks(raw, [STRESS, RAD])).toEqual({ t1: 5, t2: 4 });
  });

  it("keeps any id when no model is given, and tolerates non-objects", () => {
    expect(cleanChecks({ whatever: 3, bad: "no" })).toEqual({ whatever: 3 });
    expect(cleanChecks(null, [STRESS])).toEqual({});
    expect(cleanChecks([1, 2], [STRESS])).toEqual({});
  });

  it("keeps the ticked boxes when a track is renamed (same id)", () => {
    const renamed = [{ ...STRESS, name: "Tension" }];
    expect(cleanChecks({ t1: 3 }, renamed)).toEqual({ t1: 3 });
  });
});

describe("setChecked", () => {
  it("sets a value and removes the entry at zero, without touching the input", () => {
    const before = { t1: 2 };
    expect(setChecked(before, "t2", 4)).toEqual({ t1: 2, t2: 4 });
    expect(setChecked(before, "t1", 0)).toEqual({});
    expect(before).toEqual({ t1: 2 });
    expect(setChecked(undefined, "t1", 1)).toEqual({ t1: 1 });
  });
});

describe("trackRows", () => {
  it("lists the model tracks with the boxes ticked on the sheet", () => {
    expect(trackRows([STRESS, RAD], { t1: 2, gone: 7 })).toEqual([
      { ...STRESS, checked: 2 },
      { ...RAD, checked: 0 },
    ]);
    expect(trackRows(undefined, { t1: 2 })).toEqual([]);
  });
});
`,
};

const EDITS = {
  "useGameSheet.js": [
    {
      find: `import { renameCharacteristicNotes } from "@/lib/services/notes";`,
      replace: `import { renameCharacteristicNotes } from "@/lib/services/notes";
import { cleanChecks, cleanTracks } from "@/lib/meta/tracks";`,
    },
    {
      find: `const EMPTY_MODEL = { characteristics: [], skillRollModifier: false, scale: { levels: [] }, pcScale: sanitizePcScale(null), dice: null };`,
      replace: `const EMPTY_MODEL = { characteristics: [], skillRollModifier: false, scale: { levels: [] }, pcScale: sanitizePcScale(null), dice: null, tracks: [] };`,
    },
    {
      find: `    dice: cleanDiceConfig(row?.dice),
`,
      replace: `    dice: cleanDiceConfig(row?.dice),
    // Pistes de cases à cocher (stress, radiations…) ; aucune par défaut.
    tracks: cleanTracks(row?.tracks),
`,
    },
    {
      find: `const payload = { campaign_id: campaignId, ...modelFields, scale, pc_scale: pcScale, dice };`,
      replace: `const payload = { campaign_id: campaignId, ...modelFields, scale, pc_scale: pcScale, dice, tracks: cleanTracks(nextModel.tracks ?? model.tracks) };`,
    },
    {
      find: `      ...(draft.dice_override ? { dice_override: cleanDiceOverride(draft.dice_override) } : {}),
`,
      replace: `      ...(draft.dice_override ? { dice_override: cleanDiceOverride(draft.dice_override) } : {}),
      // Cases cochées par piste : absentes du brouillon, la valeur enregistrée est conservée.
      ...(draft.checks ? { checks: cleanChecks(draft.checks, model.tracks) } : {}),
`,
    },
    {
      find: `  const deleteCharacter = async (character) => {
`,
      replace: `  // Coche ou décoche des cases directement depuis la carte du personnage, sans ouvrir la fiche.
  const saveChecks = async (character, checks) => {
    const next = cleanChecks(checks, model.tracks);
    const previous = character.checks;
    setCharacters((current) => current.map((item) => (item.id === character.id ? { ...item, checks: next } : item)));
    try {
      await api.entities.GameCharacter.update(character.id, { checks: next });
    } catch (error) {
      console.error("Enregistrement des cases cochées impossible :", error);
      setCharacters((current) => current.map((item) => (item.id === character.id ? { ...item, checks: previous } : item)));
      toast({ variant: "destructive", title: "Cases non enregistrées", description: "Les cases cochées n’ont pas été enregistrées." });
    }
  };

  const deleteCharacter = async (character) => {
`,
    },
    {
      find: `    saveCharacter,
    deleteCharacter,
  };`,
      replace: `    saveCharacter,
    saveChecks,
    deleteCharacter,
  };`,
    },
  ],
  "GameSheetModelEditor.jsx": [
    {
      find: `import { applyPresetToDraft, diceToDraft, draftToDice, updateDiceDraft, updateSingleDie, updateStatDie } from "@/lib/meta/diceDraft";`,
      replace: `import { applyPresetToDraft, diceToDraft, draftToDice, updateDiceDraft, updateSingleDie, updateStatDie } from "@/lib/meta/diceDraft";
import { MAX_TRACKS, MAX_TRACK_BOXES, draftToTracks, newTrackId, tracksToDraft } from "@/lib/meta/tracks";`,
    },
    {
      find: `pc: { ranges: {}, skills: EMPTY_COUNT, equipment: EMPTY_COUNT }, dice: diceToDraft(null) };`,
      replace: `pc: { ranges: {}, skills: EMPTY_COUNT, equipment: EMPTY_COUNT }, dice: diceToDraft(null), tracks: [] };`,
    },
    {
      find: `        dice: diceToDraft(model?.dice, characteristics),
      });
      setScaleReport("");`,
      replace: `        dice: diceToDraft(model?.dice, characteristics),
        tracks: tracksToDraft(model?.tracks),
      });
      setScaleReport("");`,
    },
    {
      find: `      dice: draftToDice(form.dice, form.characteristics) ?? undefined,
`,
      replace: `      dice: draftToDice(form.dice, form.characteristics) ?? undefined,
      tracks: draftToTracks(form.tracks),
`,
    },
    {
      find: `  const dice = form.dice;
`,
      replace: `  const updateTrack = (index, patch) =>
    setForm((current) => ({ ...current, tracks: current.tracks.map((track, i) => (i === index ? { ...track, ...patch } : track)) }));
  const addTrack = () => setForm((current) => ({ ...current, tracks: [...current.tracks, { id: newTrackId(), name: "", count: "" }] }));
  const removeTrack = (index) => setForm((current) => ({ ...current, tracks: current.tracks.filter((_, i) => i !== index) }));

  const dice = form.dice;
`,
    },
    {
      find: `        <details data-tutorial="game-model-scale"`,
      replace: `        <details className="rounded-lg border border-border p-3" open={form.tracks.length > 0}>
          <summary className="cursor-pointer font-display font-semibold">Cases à cocher</summary>
          <div className="mt-3 stack-y-3">
            <p className="text-xs text-muted-foreground">
              Définissez des pistes de cases (stress, radiations, consommables…). Chaque fiche coche ses propres cases. Renommer une piste ne fait perdre aucune case cochée.
            </p>
            {form.tracks.map((track, index) => (
              <div key={track.id} className="grid grid-cols-[minmax(0,1fr)_5rem_2.5rem] items-center gap-2">
                <Input
                  aria-label={\`Nom de la piste \${index + 1}\`}
                  value={track.name}
                  placeholder="Ex. Stress"
                  onChange={(event) => updateTrack(index, { name: event.target.value })}
                />
                <Input
                  inputMode="numeric"
                  aria-label={\`Nombre de cases de \${track.name || \`la piste \${index + 1}\`}\`}
                  placeholder="Cases"
                  value={track.count}
                  onChange={(event) => updateTrack(index, { count: event.target.value })}
                />
                <Button type="button" variant="ghost" size="icon" aria-label={\`Supprimer la piste \${track.name || index + 1}\`} onClick={() => removeTrack(index)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addTrack} disabled={form.tracks.length >= MAX_TRACKS}>
              <Plus className="h-4 w-4" /> Ajouter une piste
            </Button>
            <p className="text-xs text-muted-foreground">Une piste sans nom, ou sans nombre de cases (de 1 à {MAX_TRACK_BOXES}), n'est pas enregistrée.</p>
          </div>
        </details>

        <details data-tutorial="game-model-scale"`,
    },
  ],
  "GameCharacterEditor.jsx": [
    {
      find: `import { cleanDiceOverride } from "@/lib/meta/dice";`,
      replace: `import { cleanDiceOverride } from "@/lib/meta/dice";
import TrackBoxes from "@/components/game/TrackBoxes";
import { cleanChecks, setChecked } from "@/lib/meta/tracks";`,
    },
    {
      find: `const EMPTY = { name: "", notes: "", characteristics: {}, skills: [], equipment: [], inventory: [] };`,
      replace: `const EMPTY = { name: "", notes: "", characteristics: {}, skills: [], equipment: [], inventory: [], checks: {} };`,
    },
    {
      find: `      inventory: structuredClone(character.inventory || []),
    } : {`,
      replace: `      inventory: structuredClone(character.inventory || []),
      checks: structuredClone(character.checks || {}),
    } : {`,
    },
    {
      find: `        dice_override: cleanDiceOverride(form.dice_override),
`,
      replace: `        dice_override: cleanDiceOverride(form.dice_override),
        checks: cleanChecks(form.checks, model.tracks),
`,
    },
    {
      find: `        <section className="stack-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <LockedHeading label="Compétences"`,
      replace: `        {model.tracks?.length > 0 && (
          <section className="stack-y-3">
            <h3 className="font-display font-semibold">Cases à cocher</h3>
            {model.tracks.map((track) => (
              <TrackBoxes
                key={track.id}
                track={track}
                value={form.checks?.[track.id]}
                onChange={(next) => setForm((current) => ({ ...current, checks: setChecked(current.checks, track.id, next) }))}
              />
            ))}
          </section>
        )}

        <section className="stack-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <LockedHeading label="Compétences"`,
    },
  ],
  "Jeu.jsx": [
    {
      find: `import RollButton from "@/components/game/RollButton";`,
      replace: `import RollButton from "@/components/game/RollButton";
import TrackBoxes from "@/components/game/TrackBoxes";
import { setChecked } from "@/lib/meta/tracks";`,
    },
    {
      find: `    deleteCharacter: removeCharacter,
`,
      replace: `    saveChecks,
    deleteCharacter: removeCharacter,
`,
    },
    {
      find: `                  {(character.skills || []).length > 0 && (
`,
      replace: `                  {model.tracks?.length > 0 && (
                    <div className="mt-3 stack-y-1.5">
                      {model.tracks.map((track) => (
                        <TrackBoxes
                          key={track.id}
                          track={track}
                          value={character.checks?.[track.id]}
                          onChange={(next) => saveChecks(character, setChecked(character.checks, track.id, next))}
                        />
                      ))}
                    </div>
                  )}
                  {(character.skills || []).length > 0 && (
`,
    },
    {
      find: `            skillRollModifier: model.skillRollModifier,
`,
      replace: `            skillRollModifier: model.skillRollModifier,
            tracks: model.tracks,
`,
    },
  ],
  "PrintSheet.jsx": [
    {
      find: `import { generatePrintCSS } from "@/lib/print/printStyles";`,
      replace: `import { generatePrintCSS } from "@/lib/print/printStyles";
import { trackRows } from "@/lib/meta/tracks";`,
    },
    {
      find: `{block.characters.map(({ character, characteristics, skillRollModifier }) => (`,
      replace: `{block.characters.map(({ character, characteristics, skillRollModifier, tracks }) => (`,
    },
    {
      find: `                                skillRollModifier={skillRollModifier}
                            />`,
      replace: `                                skillRollModifier={skillRollModifier}
                                tracks={tracks}
                            />`,
    },
    {
      find: `function CharacterContent({ character, characteristics, skillRollModifier }) {
`,
      replace: `function CharacterContent({ character, characteristics, skillRollModifier, tracks = [] }) {
    const trackLines = trackRows(tracks, character.checks);
`,
    },
    {
      find: `            {(character.skills || []).length > 0 && (
`,
      replace: `            {trackLines.length > 0 && (
                <section className="prt-section">
                    <h2>Cases à cocher</h2>
                    {trackLines.map((track) => (
                        <div className="prt-character-item" key={track.id}>
                            <span className="prt-title">{track.name}</span>{" "}
                            {Array.from({ length: track.count }, (_, index) => (index < track.checked ? "☑" : "☐")).join(" ")}
                        </div>
                    ))}
                </section>
            )}
            {(character.skills || []).length > 0 && (
`,
    },
    {
      find: `const { character, campaignName, characteristics, skillRollModifier } = model;`,
      replace: `const { character, campaignName, characteristics, skillRollModifier, tracks } = model;`,
    },
    {
      find: `                    skillRollModifier={skillRollModifier}
                />`,
      replace: `                    skillRollModifier={skillRollModifier}
                    tracks={tracks}
                />`,
    },
  ],
  "editablePdf.js": [
    {
      find: `import { cleanInventory, inventoryPrintLine } from "@/lib/meta/inventory";`,
      replace: `import { cleanInventory, inventoryPrintLine } from "@/lib/meta/inventory";
import { trackRows } from "@/lib/meta/tracks";`,
    },
    {
      find: `    const drawImages = async (images = []) => {
`,
      replace: `    // Pistes de cases : une ligne de cases par piste (cochées pleines, vides en cadre), à la ligne si elles dépassent la page.
    const drawTracks = (items) => {
        const box = 11;
        const gap = 4;
        for (const item of items) {
            ensureSpace(9 * 1.4 + box + 8);
            drawText(item.name, { size: 9, font: bold });
            let x = MARGIN;
            for (let index = 0; index < item.count; index += 1) {
                if (x + box > PAGE_WIDTH - MARGIN) {
                    x = MARGIN;
                    cursorY -= box + gap;
                    ensureSpace(box + 6);
                }
                page.drawRectangle({
                    x,
                    y: cursorY - box,
                    width: box,
                    height: box,
                    borderWidth: 0.75,
                    borderColor: FIELD_BORDER,
                    ...(index < item.checked ? { color: BODY_COLOR } : {}),
                });
                x += box + gap;
            }
            cursorY -= box + 8;
        }
    };

    const drawImages = async (images = []) => {
`,
    },
    {
      find: `for (const [characterIndex, { character, characteristics, skillRollModifier }] of block.characters.entries()) {`,
      replace: `for (const [characterIndex, { character, characteristics, skillRollModifier, tracks = [] }] of block.characters.entries()) {`,
    },
    {
      find: `                    drawHeading("Compétences", 3);
`,
      replace: `                    const trackLines = trackRows(tracks, character.checks);
                    if (trackLines.length) {
                        drawHeading("Cases à cocher", 3);
                        drawTracks(trackLines);
                    }
                    drawHeading("Compétences", 3);
`,
    },
  ],
  "codex.js": [
    {
      find: `import { cleanDiceOverride } from "@/lib/meta/dice";`,
      replace: `import { cleanDiceOverride } from "@/lib/meta/dice";
import { cleanChecks } from "@/lib/meta/tracks";`,
    },
    {
      find: `    ...(form && "dice_override" in form ? { dice_override: cleanDiceOverride(form.dice_override) } : {}),
`,
      replace: `    ...(form && "dice_override" in form ? { dice_override: cleanDiceOverride(form.dice_override) } : {}),
    // Cases cochées par piste : absentes du formulaire, la valeur enregistrée est conservée.
    ...(form && "checks" in form ? { checks: cleanChecks(form.checks) } : {}),
`,
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
    const found = text.split(edit.find).length - 1;
    if (found !== 1) {
      console.error(file + " : retouche " + (index + 1) + " non appliquée (" + found + " occurrence(s) trouvée(s), 1 attendue) :");
      console.error("    " + edit.find.split("\n")[0].trim());
      ok = false;
      return;
    }
    text = text.replace(edit.find, () => edit.replace);
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
