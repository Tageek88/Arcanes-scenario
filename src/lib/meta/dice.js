// Pure dice rules (no React, no Dexie, no alias): skill and characteristic rolls.
//
// Model setting (GameSheetModel.dice):
//   { mode: "single" | "per_stat", rule: "add" | "pool" | "under",
//     single: { count, sides }, perStat: { <characteristic>: { count, sides } },
//     crit: { success: number | null, failure: number | null },
//     outcome: "total" | "success" | "both", difficulty: number | null,
//     enabled: boolean }   (false = roll button hidden, settings kept)
// Sheet override (GameCharacter.dice_override, NPC.dice_override):
//   { <characteristic>: { count, sides } } (only the stats the GM changed).
// No config (null) or enabled: false means: no roll button.

export const DICE_MODES = ["single", "per_stat"];
export const DICE_RULES = ["add", "pool", "under"];
export const DICE_OUTCOMES = ["total", "success", "both"];

export const DICE_MODE_LABELS = {
  single: "Un dé pour tout le système",
  per_stat: "Un dé par caractéristique",
};
export const DICE_RULE_LABELS = {
  add: "Dé + valeur de la caractéristique",
  pool: "La valeur donne le nombre de dés",
  under: "Le dé doit rester sous la valeur",
};
export const DICE_OUTCOME_LABELS = {
  total: "Total seulement",
  success: "Réussite ou échec seulement",
  both: "Total et réussite ou échec",
};

export const MAX_DICE_COUNT = 20;
export const MAX_DICE_SIDES = 1000;
export const MAX_POOL_COUNT = 30;
export const DEFAULT_DIE = { count: 1, sides: 20 };

export const NO_CHARACTERISTIC_WARNING =
  "Cette compétence n'est liée à aucune caractéristique : dé par défaut, valeur 0.";

function toInt(value) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? n : null;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/** A die spec { count, sides } cleaned and bounded, or `fallback` when unusable. */
export function cleanDie(raw, fallback = null) {
  if (!raw || typeof raw !== "object") return fallback;
  const count = toInt(raw.count);
  const sides = toInt(raw.sides);
  if (count === null || sides === null || count < 1 || sides < 2) return fallback;
  return {
    count: clamp(count, 1, MAX_DICE_COUNT),
    sides: clamp(sides, 2, MAX_DICE_SIDES),
  };
}

export function describeDie(die) {
  const d = cleanDie(die, DEFAULT_DIE);
  return `${d.count}d${d.sides}`;
}

function cleanThreshold(value) {
  if (value === null || value === undefined || value === "") return null;
  return toInt(value);
}

function cleanPerStat(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [name, die] of Object.entries(raw)) {
    const key = String(name).trim();
    const clean = cleanDie(die);
    if (key && clean) out[key] = clean;
  }
  return out;
}

/**
 * Cleans a model setting. Returns null when there is no usable config
 * (absent, or mode/rule invalid): the roll button is then hidden.
 * Both `single` and `perStat` are always kept, so switching the mode later
 * never loses the values already typed.
 */
export function cleanDiceConfig(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (!DICE_MODES.includes(raw.mode) || !DICE_RULES.includes(raw.rule)) return null;
  const crit = raw.crit && typeof raw.crit === "object" ? raw.crit : {};
  return {
    enabled: raw.enabled !== false,
    mode: raw.mode,
    rule: raw.rule,
    single: cleanDie(raw.single, { ...DEFAULT_DIE }),
    perStat: cleanPerStat(raw.perStat),
    crit: { success: cleanThreshold(crit.success), failure: cleanThreshold(crit.failure) },
    outcome: DICE_OUTCOMES.includes(raw.outcome) ? raw.outcome : "total",
    difficulty: cleanThreshold(raw.difficulty),
  };
}

export function hasDiceConfig(raw) {
  const clean = cleanDiceConfig(raw);
  return clean !== null && clean.enabled;
}

/** A sheet override: only valid dice are kept. Always returns an object. */
export function cleanDiceOverride(raw) {
  return cleanPerStat(raw);
}

/** Sets (or removes, with `die` null) the override of one characteristic. */
export function setOverride(override, characteristic, die) {
  const next = { ...cleanDiceOverride(override) };
  const clean = cleanDie(die);
  if (!characteristic) return next;
  if (clean) next[characteristic] = clean;
  else delete next[characteristic];
  return next;
}

/** Follows the rename of a characteristic in the model setting. */
export function renameDiceCharacteristic(config, oldName, newName) {
  const clean = cleanDiceConfig(config);
  if (!clean || !oldName || oldName === newName) return config;
  if (!(oldName in clean.perStat)) return clean;
  const perStat = { ...clean.perStat };
  perStat[newName] = perStat[oldName];
  delete perStat[oldName];
  return { ...clean, perStat };
}

/** Follows the rename of a characteristic in a sheet override. */
export function renameOverrideCharacteristic(override, oldName, newName) {
  const clean = cleanDiceOverride(override);
  if (!oldName || oldName === newName || !(oldName in clean)) return clean;
  const next = { ...clean };
  next[newName] = next[oldName];
  delete next[oldName];
  return next;
}

/** Quick-start settings: the GM picks one, then adjusts. */
export const DICE_PRESETS = [
  {
    id: "d20-add",
    label: "d20 + valeur",
    description: "Un d20 auquel on ajoute la valeur. 20 et 1 naturels critiques.",
    dice: {
      mode: "single", rule: "add", single: { count: 1, sides: 20 }, perStat: {},
      crit: { success: 20, failure: 1 }, outcome: "both", difficulty: 10,
    },
  },
  {
    id: "d100-under",
    label: "d100 sous la valeur",
    description: "Un d100 qui doit rester sous la valeur.",
    dice: {
      mode: "single", rule: "under", single: { count: 1, sides: 100 }, perStat: {},
      crit: { success: 5, failure: 96 }, outcome: "success", difficulty: null,
    },
  },
  {
    id: "2d6-add",
    label: "2d6 + valeur",
    description: "Deux d6 auxquels on ajoute la valeur.",
    dice: {
      mode: "single", rule: "add", single: { count: 2, sides: 6 }, perStat: {},
      crit: { success: 12, failure: 2 }, outcome: "both", difficulty: 8,
    },
  },
  {
    id: "d6-pool",
    label: "Réserve de d6",
    description: "La valeur donne le nombre de d6 ; chaque 5 ou plus est une réussite.",
    dice: {
      mode: "single", rule: "pool", single: { count: 1, sides: 6 }, perStat: {},
      crit: { success: null, failure: null }, outcome: "success", difficulty: 5,
    },
  },
  {
    id: "3d6-under",
    label: "3d6 sous la valeur",
    description: "Trois d6 dont le total doit rester sous la valeur.",
    dice: {
      mode: "single", rule: "under", single: { count: 3, sides: 6 }, perStat: {},
      crit: { success: 4, failure: 17 }, outcome: "success", difficulty: null,
    },
  },
];

export function presetDice(id) {
  const preset = DICE_PRESETS.find((p) => p.id === id);
  return preset ? cleanDiceConfig(preset.dice) : null;
}

/** Numeric value of a characteristic (`{ value }` or a bare value); 0 when unusable. */
export function statValue(characteristic) {
  const raw =
    characteristic && typeof characteristic === "object" ? characteristic.value : characteristic;
  const n = Number(String(raw ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Which die is rolled for a characteristic: the sheet override first, then the
 * model (single die, or the die of that characteristic), then DEFAULT_DIE.
 * A skill without a linked characteristic still rolls, with a warning.
 */
export function resolveRollSpec({ config, override, characteristic } = {}) {
  const clean = cleanDiceConfig(config);
  if (!clean || !clean.enabled) return null;
  const name = characteristic ? String(characteristic).trim() : "";
  const own = name ? cleanDiceOverride(override)[name] : null;
  let die;
  let source;
  if (own) {
    die = own;
    source = "override";
  } else if (clean.mode === "single") {
    die = clean.single;
    source = "model";
  } else if (name && clean.perStat[name]) {
    die = clean.perStat[name];
    source = "model";
  } else {
    die = { ...DEFAULT_DIE };
    source = "default";
  }
  return {
    die,
    source,
    rule: clean.rule,
    warning: name ? null : NO_CHARACTERISTIC_WARNING,
  };
}

function rollDice(count, sides, rng) {
  const rolls = [];
  for (let i = 0; i < count; i += 1) {
    rolls.push(Math.min(sides, Math.floor(rng() * sides) + 1));
  }
  return rolls;
}

function criticalOf(rule, sum, crit) {
  if (rule === "pool") return null;
  const { success, failure } = crit;
  // add: high is good (success >=, failure <=); under: low is good (success <=, failure >=)
  const high = rule === "add";
  if (success !== null && (high ? sum >= success : sum <= success)) return "success";
  if (failure !== null && (high ? sum <= failure : sum >= failure)) return "failure";
  return null;
}

/**
 * Rolls. `difficulty` (optional) overrides the model's one: target total for
 * "add", per-die threshold for "pool" (ignored by "under"). `bonus` is a
 * one-off modifier, never saved: added to the total ("add"), the number of dice
 * ("pool") or the target ("under"). In "pool" the die count of the setting is
 * ignored: the value gives it.
 */
export function evaluateRoll({ config, die, value = 0, bonus = 0, difficulty, rng = Math.random } = {}) {
  const clean = cleanDiceConfig(config);
  if (!clean || !clean.enabled) return null;
  const d = cleanDie(die, { ...DEFAULT_DIE });
  const stat = Number.isFinite(Number(value)) ? Number(value) : 0;
  const mod = Number.isFinite(Number(bonus)) ? Number(bonus) : 0;
  const diff = difficulty === undefined || difficulty === null || difficulty === ""
    ? clean.difficulty
    : toInt(difficulty);
  const rule = clean.rule;

  let rolls;
  let sum;
  let total;
  let success = null;
  let target = null;
  let threshold = null;
  let diceCount = d.count;

  if (rule === "pool") {
    diceCount = clamp(Math.round(stat + mod), 1, MAX_POOL_COUNT);
    rolls = rollDice(diceCount, d.sides, rng);
    sum = rolls.reduce((a, b) => a + b, 0);
    threshold = diff === null ? d.sides : clamp(diff, 1, d.sides);
    total = rolls.filter((r) => r >= threshold).length;
    success = total >= 1;
  } else if (rule === "under") {
    rolls = rollDice(d.count, d.sides, rng);
    sum = rolls.reduce((a, b) => a + b, 0);
    target = stat + mod;
    total = sum;
    success = sum <= target;
  } else {
    rolls = rollDice(d.count, d.sides, rng);
    sum = rolls.reduce((a, b) => a + b, 0);
    total = sum + stat + mod;
    target = diff;
    success = diff === null ? null : total >= diff;
  }

  const showSuccess = clean.outcome !== "total" && success !== null;
  return {
    rule,
    die: { count: diceCount, sides: d.sides },
    rolls,
    sum,
    value: stat,
    bonus: mod,
    total,
    target,
    threshold,
    outcome: clean.outcome,
    showTotal: clean.outcome !== "success",
    success: showSuccess ? success : null,
    critical: criticalOf(rule, sum, clean.crit),
  };
}
