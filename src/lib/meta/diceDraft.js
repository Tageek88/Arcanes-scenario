// Pure helpers for the "Lancer de dés" section of the model editor (no React, no Dexie).
// The editor works on a draft made of strings (what the inputs hold); a characteristic
// is identified by its stable editing key (`_key`), so renaming one in the editor never
// loses its die. `draftToDice` turns the draft back into a clean model setting.

import { DEFAULT_DIE, cleanDiceConfig, presetDice } from "@/lib/meta/dice.js";

const text = (value) => (value === null || value === undefined ? "" : String(value));
const dieDraft = (die) => (die ? { count: text(die.count), sides: text(die.sides) } : { count: "", sides: "" });
const nameOf = (item) => String(item?.name || "").trim();

/** A draft with nothing configured: the roll button stays hidden. */
export function emptyDiceDraft() {
  return {
    enabled: false,
    // true once a setting exists or the GM touched something: a disabled draft is then kept, not dropped
    used: false,
    mode: "single",
    rule: "add",
    single: dieDraft(DEFAULT_DIE),
    perStat: {},
    critSuccess: "",
    critFailure: "",
    outcome: "total",
    difficulty: "",
  };
}

/** Draft from a saved setting; `characteristics` are the editor items `{ _key, name }`. */
export function diceToDraft(config, characteristics = []) {
  const clean = cleanDiceConfig(config);
  if (!clean) return emptyDiceDraft();
  const perStat = {};
  for (const item of characteristics) {
    const name = nameOf(item);
    if (item?._key && name && clean.perStat[name]) perStat[item._key] = dieDraft(clean.perStat[name]);
  }
  return {
    enabled: clean.enabled,
    used: true,
    mode: clean.mode,
    rule: clean.rule,
    single: dieDraft(clean.single),
    perStat,
    critSuccess: text(clean.crit.success),
    critFailure: text(clean.crit.failure),
    outcome: clean.outcome,
    difficulty: text(clean.difficulty),
  };
}

/**
 * Model setting from a draft. Returns null only when nothing was ever configured
 * (disabled and untouched): the saved model then keeps no setting at all.
 * A disabled but used draft is kept with `enabled: false`: no value is lost.
 */
export function draftToDice(draft, characteristics = []) {
  if (!draft || (!draft.enabled && !draft.used)) return null;
  const perStat = {};
  for (const item of characteristics) {
    const name = nameOf(item);
    const die = draft.perStat?.[item?._key];
    if (name && die) perStat[name] = { count: die.count, sides: die.sides };
  }
  return cleanDiceConfig({
    enabled: !!draft.enabled,
    mode: draft.mode,
    rule: draft.rule,
    single: draft.single,
    perStat,
    crit: { success: draft.critSuccess, failure: draft.critFailure },
    outcome: draft.outcome,
    difficulty: draft.difficulty,
  });
}

/** Changes some fields of the draft (and marks it as used). */
export function updateDiceDraft(draft, patch) {
  return { ...draft, ...patch, used: true };
}

/** Changes `count` or `sides` of the single die. */
export function updateSingleDie(draft, side, value) {
  return updateDiceDraft(draft, { single: { ...draft.single, [side]: value } });
}

/** Changes `count` or `sides` of the die of one characteristic (by editing key). */
export function updateStatDie(draft, key, side, value) {
  const current = draft.perStat?.[key] || { count: "", sides: "" };
  return updateDiceDraft(draft, { perStat: { ...draft.perStat, [key]: { ...current, [side]: value } } });
}

/** Applies a quick-start preset: it replaces everything but the dice of each characteristic. */
export function applyPresetToDraft(draft, presetId) {
  const dice = presetDice(presetId);
  if (!dice) return draft;
  const fromPreset = diceToDraft(dice, []);
  return { ...fromPreset, perStat: draft.perStat || {}, enabled: true, used: true };
}

// Die override of a sheet ({ characteristic: { count, sides } }): kept as typed text while editing,
// cleaned with `cleanDiceOverride` (lib/meta/dice.js) when the sheet is saved.
const overrideBase = (override) => (override && typeof override === "object" ? override : {});

/** Starts a custom die for one characteristic, from a die (the model's one) shown as text inputs. */
export function startOverride(override, characteristic, die) {
  return { ...overrideBase(override), [characteristic]: dieDraft(die || DEFAULT_DIE) };
}

/** Changes `count` or `sides` of the custom die of one characteristic. */
export function updateOverrideDie(override, characteristic, side, value) {
  const base = overrideBase(override);
  const current = base[characteristic] || { count: "", sides: "" };
  return { ...base, [characteristic]: { ...current, [side]: value } };
}

/** Back to the model's die for one characteristic. */
export function clearOverride(override, characteristic) {
  const next = { ...overrideBase(override) };
  delete next[characteristic];
  return next;
}
