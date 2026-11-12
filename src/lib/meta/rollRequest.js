// Pure helpers of the roll dialog (no React, no Dexie): what a roll is made of, and how its result is shown.

import { resolveRollSpec } from "@/lib/meta/dice.js";
import { linkedModifier, skillCharacteristic } from "@/lib/meta/diceLinks.js";
import { linkedStatValue } from "@/lib/meta/statLinks.js";

const NUMBER = /^[+-]?\d+(\.\d+)?$/;

/** Number typed in a bonus or modifier field ("+2", "-1", "− 1", "3", "2,5"), or null when it is not a number. */
export function readNumber(text) {
  const raw = String(text ?? "").replace(/−/g, "-").replace(/\s+/g, "").replace(",", ".");
  if (!NUMBER.test(raw)) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Bonus typed by the user: 0 when it is empty or not a number. */
export function parseBonus(text) {
  return readNumber(text) ?? 0;
}

/**
 * What a roll button rolls, from the dice setup of the campaign ({ dice, links }) and a sheet.
 * - `characteristic`: roll that characteristic (its die, its value).
 * - `skill`: roll that skill. The characteristic is the one on the sheet, else the one linked in the catalog;
 *   without any, the roll still happens (default die, value 0) with a warning. A numeric `roll_modifier`
 *   of the skill becomes the starting bonus.
 * Returns null when there is nothing to roll (no setting, disabled, or nothing to name).
 */
export function buildRollRequest({ setup, sheet, characteristic = "", skill = null } = {}) {
  const config = setup?.dice;
  const stat = skill ? skillCharacteristic(skill, setup?.links) : String(characteristic || "").trim();
  if (!skill && !stat) return null;
  const spec = resolveRollSpec({ config, override: sheet?.dice_override, characteristic: stat });
  if (!spec) return null;

  const characteristics = sheet?.characteristics && typeof sheet.characteristics === "object" ? sheet.characteristics : {};
  const hasValue = stat ? Object.hasOwn(characteristics, stat) : false;
  // A characteristic linked to another one adds the value of that one: Endurance 2 linked to Vigueur 3 rolls with 5.
  const linked = linkedStatValue(stat, characteristics, setup?.parents);
  const value = linked.total;

  const warnings = [];
  const notes = [];
  if (spec.warning) warnings.push(spec.warning);
  else if (stat && !hasValue) warnings.push(`La caractéristique « ${stat} » n'a pas de valeur sur cette fiche : valeur 0.`);

  if (linked.parts.length > 1) {
    notes.push(`Valeur : ${linked.parts.map((part) => `${part.name} ${part.value}`).join(" + ")} = ${linked.total}.`);
  }

  let bonus = 0;
  if (skill) {
    // The modifier of the sheet wins; when it is empty, the one of the catalog applies.
    const text = String(skill.roll_modifier ?? "").trim() || linkedModifier(skill.name, setup?.modifiers);
    const parsed = readNumber(text);
    if (parsed !== null) {
      bonus = parsed;
      if (parsed !== 0) notes.push(`Modificateur de la compétence : ${text} (repris dans le bonus).`);
    } else if (text) {
      warnings.push(`Modificateur « ${text} » non numérique : ignoré.`);
    }
  }

  return {
    config,
    label: skill ? String(skill.name || "").trim() : stat,
    characteristic: stat,
    spec,
    value,
    bonus,
    warnings,
    notes,
  };
}

const signed = (n) => (n < 0 ? `− ${Math.abs(n)}` : `+ ${n}`);

/** What the dialog shows for a result of `evaluateRoll` (null without result). */
export function formatRoll(result) {
  if (!result) return null;
  const faces = result.rolls;
  const diceLabel = `${result.die.count}d${result.die.sides}`;
  const lines = [];
  let big = null;
  let bigLabel = "";

  if (result.rule === "pool") {
    // The number of successes is the result of a pool: it is always shown.
    big = String(result.total);
    bigLabel = result.total === 1 ? "réussite" : "réussites";
    lines.push(`Réserve de ${diceLabel} : ${faces.join(" · ")}`);
    lines.push(`Un dé réussit à partir de ${result.threshold}`);
  } else if (result.rule === "under") {
    big = String(result.sum);
    bigLabel = "jet";
    lines.push(`Jet (${diceLabel}) : ${faces.length > 1 ? `${faces.join(" + ")} = ${result.sum}` : result.sum}`);
    const detail = result.bonus !== 0 ? ` (valeur ${result.value} ${signed(result.bonus)})` : "";
    lines.push(`Cible : ${result.target}${detail}`);
  } else {
    lines.push(`Dés (${diceLabel}) : ${faces.length > 1 ? `${faces.join(" + ")} = ${result.sum}` : result.sum}`);
    if (result.showTotal) {
      big = String(result.total);
      bigLabel = "total";
      const parts = [String(result.sum)];
      if (result.value !== 0) parts.push(signed(result.value));
      if (result.bonus !== 0) parts.push(signed(result.bonus));
      lines.push(`Total : ${parts.join(" ")}${parts.length > 1 ? ` = ${result.total}` : ""}`);
    }
    if (result.success !== null) lines.push(`Difficulté : ${result.target}`);
    else if (result.outcome === "success") lines.push("Aucune difficulté réglée : saisissez-en une pour voir la réussite.");
  }

  const verdict = result.success === true ? "success" : result.success === false ? "failure" : null;
  const verdictLabel = verdict === "success" ? "Réussite" : verdict === "failure" ? "Échec" : "";
  const critical = result.critical || null;
  const criticalLabel = critical === "success" ? "Réussite critique" : critical === "failure" ? "Échec critique" : "";
  const summary = [big !== null ? `${bigLabel} ${big}` : "", verdictLabel, criticalLabel].filter(Boolean).join(", ");

  return { faces, diceLabel, big, bigLabel, lines, verdict, verdictLabel, critical, criticalLabel, summary };
}
