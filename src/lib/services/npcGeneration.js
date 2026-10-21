import { api } from "@/api/localClient";
import { sanitizeGeneratorData } from "@/lib/generators/generatorTables";
import { characteristicNamesOf, sanitizeScale } from "@/lib/generators/npcScale";

/**
 * Charge ce qu'il faut pour générer un PNJ dans une campagne : univers, tables du MJ, caractéristiques du modèle
 * de fiche, barème et compétences déjà utilisées.
 * @param {string} campaignId
 */
export async function loadNpcGenerationContext(campaignId) {
  const [campaign, models, skills] = await Promise.all([
    api.entities.Campaign.get(campaignId),
    api.entities.GameSheetModel.filter({ campaign_id: campaignId }, { limit: 10 }),
    api.entities.SkillCatalog.filter({ campaign_id: campaignId }, { sort: "name", limit: 1000 }),
  ]);
  const model = models.items[0] || null;
  const characteristicNames = characteristicNamesOf(model?.characteristics);
  return {
    campaignId,
    universeId: campaign?.universe_type || "",
    generatorData: sanitizeGeneratorData(campaign?.generator_data),
    characteristicNames,
    scale: sanitizeScale(model?.scale, characteristicNames),
    skillPool: skills.items
      .filter((skill) => typeof skill.name === "string" && skill.name.trim())
      .map((skill) => ({ name: skill.name, roll_modifier: skill.roll_modifier || "" })),
  };
}

/**
 * Enregistre les tables du MJ dans la campagne (nettoyées avant l'écriture).
 * @returns {Promise<Record<string, { mode: string, items: string[] }>>} les tables telles qu'enregistrées
 */
export async function saveGeneratorData(campaignId, data) {
  const clean = sanitizeGeneratorData(data);
  await api.entities.Campaign.update(campaignId, { generator_data: clean });
  return clean;
}
