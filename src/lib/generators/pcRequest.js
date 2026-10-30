// === SECTION PC REQUEST ===
// Relie le contexte d'une campagne (univers, tables du MJ, modèle de fiche, barème des PJ, catalogues) au générateur
// de personnages joueurs. Fonctions pures : le contexte est chargé ailleurs (voir lib/services/npcGeneration.js).

import { newSeed } from "./random";
import { generatePc } from "./pcGenerator";
import { checkPc, pcEquipmentCount, pcRanges, pcSkillCount } from "./pcScale";

/** Options de `generatePc` pour un contexte de campagne. */
export function buildPcRequest(context, options) {
  const { seed, gender, withFamily, keep = {} } = options;
  const request = {
    universeId: context.universeId,
    generatorData: context.generatorData,
    seed,
    ranges: pcRanges(context.pcScale, context.characteristicNames),
    fieldNames: context.characteristicFields || {},
    skillPool: context.skillPool || [],
    equipmentPool: context.equipmentPool || [],
    keep,
  };
  const skillCount = pcSkillCount(context.pcScale);
  if (skillCount) request.skillCount = skillCount;
  const equipmentCount = pcEquipmentCount(context.pcScale);
  if (equipmentCount) request.equipmentCount = equipmentCount;
  if (gender !== undefined) request.gender = gender;
  if (withFamily !== undefined) request.withFamily = withFamily;
  return request;
}

/**
 * Génère un personnage joueur pour une campagne et le contrôle avec le barème des PJ.
 * @returns {{ seed: number | string, pc: object, warnings: string[], check: ReturnType<typeof checkPc> }}
 */
export function generatePcForContext(context, options = {}) {
  const seed = options.seed === undefined || options.seed === null ? newSeed() : options.seed;
  const result = generatePc(buildPcRequest(context, { ...options, seed }));
  return { ...result, check: checkPc(result.pc, context.pcScale, context.characteristicNames) };
}
