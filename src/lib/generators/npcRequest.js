// === SECTION NPC REQUEST ===
// Relie le contexte d'une campagne (univers, tables du MJ, modèle de fiche, barème, compétences connues)
// au générateur de PNJ. Fonctions pures : le contexte est chargé ailleurs (voir lib/services/npcGeneration.js).
//
// Contexte : { universeId, generatorData, characteristicNames, characteristicFields, scale, skillPool, ... }

import { createRng, newSeed } from "./random";
import { generateNpc } from "./npcGenerator";
import { checkNpc, levelNames, rangesForLevel, skillCountForLevel } from "./npcScale";

/**
 * Options de `generateNpc` pour un contexte de campagne. Le niveau est fixé ici (choisi à partir de la graine
 * s'il n'est pas imposé), pour que les plages de caractéristiques et le nombre de compétences soient ceux du niveau.
 * @param {object} context
 * @param {{ seed: number | string, level?: string, gender?: string, withFamily?: boolean,
 *   traitCount?: number | [number, number], keep?: Record<string, any> }} options
 */
export function buildNpcRequest(context, options) {
  const { seed, gender, withFamily, traitCount, keep = {} } = options;
  const scale = context.scale || { levels: [] };
  const names = levelNames(scale);
  const requested = keep.level || options.level;
  const level = (requested && String(requested).trim()) || createRng(`${seed}:level`).pick(names) || "";
  const request = {
    universeId: context.universeId,
    generatorData: context.generatorData,
    seed,
    level,
    levels: names,
    ranges: rangesForLevel(scale, level, context.characteristicNames),
    fieldNames: context.characteristicFields || {},
    skillPool: context.skillPool || [],
    keep,
  };
  const skillCount = skillCountForLevel(scale, level);
  if (skillCount) request.skillCount = skillCount;
  if (gender !== undefined) request.gender = gender;
  if (withFamily !== undefined) request.withFamily = withFamily;
  if (traitCount !== undefined) request.traitCount = traitCount;
  return request;
}

/**
 * Génère un PNJ pour une campagne et le contrôle avec son barème.
 * @returns {{ seed: number | string, npc: object, warnings: string[], check: ReturnType<typeof checkNpc> }}
 */
export function generateForContext(context, options = {}) {
  const seed = options.seed === undefined || options.seed === null ? newSeed() : options.seed;
  const result = generateNpc(buildNpcRequest(context, { ...options, seed }));
  return { ...result, check: checkNpc(result.npc, context.scale, context.characteristicNames) };
}
