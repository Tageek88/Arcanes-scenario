import { api } from "@/api/localClient";
import { sanitizeGeneratorData } from "@/lib/generators/generatorTables";
import { characteristicNamesOf, sanitizeScale } from "@/lib/generators/npcScale";
import { sanitizePcScale } from "@/lib/generators/pcScale";

/**
 * Charge ce qu'il faut pour générer un PNJ dans une campagne : univers, tables du MJ, caractéristiques du modèle
 * de fiche (et leurs champs facultatifs), barème, compétences et équipements déjà utilisés.
 * @param {string} campaignId
 */
export async function loadNpcGenerationContext(campaignId) {
  const [campaign, models, skills, equipment] = await Promise.all([
    api.entities.Campaign.get(campaignId),
    api.entities.GameSheetModel.filter({ campaign_id: campaignId }, { limit: 10 }),
    api.entities.SkillCatalog.filter({ campaign_id: campaignId }, { sort: "name", limit: 1000 }),
    api.entities.EquipmentCatalog.filter({ campaign_id: campaignId }, { sort: "name", limit: 1000 }),
  ]);
  const model = models.items[0] || null;
  const characteristicNames = characteristicNamesOf(model?.characteristics);
  // Champs facultatifs proposés par le modèle pour chaque caractéristique.
  const characteristicFields = {};
  for (const definition of model?.characteristics || []) {
    if (!definition?.name || definition.name === "__proto__") continue;
    characteristicFields[definition.name] = (definition.field_names || []).filter((name) => typeof name === "string" && name.trim());
  }
  return {
    campaignId,
    universeId: campaign?.universe_type || "",
    generatorData: sanitizeGeneratorData(campaign?.generator_data),
    characteristicNames,
    characteristicFields,
    skillRollModifier: !!model?.skillRollModifier,
    scale: sanitizeScale(model?.scale, characteristicNames),
    pcScale: sanitizePcScale(model?.pc_scale, characteristicNames),
    skillPool: skills.items
      .filter((skill) => typeof skill.name === "string" && skill.name.trim())
      .map((skill) => ({ name: skill.name, roll_modifier: skill.roll_modifier || "" })),
    // Équipements connus (catalogue de la campagne), proposés à la saisie de l'équipement d'un PNJ.
    equipmentPool: equipment.items
      .filter((item) => typeof item.name === "string" && item.name.trim())
      .map((item) => ({
        id: item.id || "",
        name: item.name,
        type: item.type || "",
        fieldNames: (item.field_names || (item.fields || []).map((field) => field.name)).filter(Boolean),
      })),
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
