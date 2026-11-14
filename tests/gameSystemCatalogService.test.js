import { describe, expect, it } from "vitest";
import { api } from "@/api/localClient";
import { applyGameSystemToCampaign, saveCampaignModelAsSystem } from "@/lib/services/gameSystems";
import { makeCampaign } from "./helpers";

async function sourceCampaign() {
  const campaign = await makeCampaign("Source");
  await api.entities.GameSheetModel.create({ campaign_id: campaign.id, characteristics: [{ name: "Agilité", field_names: [] }] });
  await api.entities.SkillCatalog.create({ campaign_id: campaign.id, name: "Tir", roll_modifier: "", characteristic: "Agilité" });
  await api.entities.EquipmentCatalog.create({
    campaign_id: campaign.id,
    name: "Kalash",
    type: "Arme",
    field_names: ["Dégâts"],
    fields: [{ name: "Dégâts", value: "3" }],
  });
  return campaign;
}

const names = async (entity, campaignId) => (await api.entities[entity].filter({ campaign_id: campaignId })).items.map((item) => item.name);

describe("catalogues d'un système (service)", () => {
  it("un système enregistré emporte les compétences et équipements, sans les valeurs de champs", async () => {
    const source = await sourceCampaign();
    const system = await saveCampaignModelAsSystem(source.id, { name: "Metro" });
    expect(system.data.skills).toEqual([{ name: "Tir", roll_modifier: "", characteristic: "Agilité" }]);
    expect(system.data.equipment[0].fields).toEqual([{ name: "Dégâts", value: "" }]);
  });

  it("l'appliquer ajoute au catalogue de la campagne ce qui manque, sans doubler ni toucher au modèle", async () => {
    const source = await sourceCampaign();
    const system = await saveCampaignModelAsSystem(source.id, { name: "Metro" });
    const target = await makeCampaign("Cible");
    await api.entities.SkillCatalog.create({ campaign_id: target.id, name: "tir", roll_modifier: "+2" });
    const result = await applyGameSystemToCampaign(system.id, target.id);
    expect(result).toEqual({ replaced: false, skills: 0, equipment: 1 });
    expect(await names("SkillCatalog", target.id)).toEqual(["tir"]);
    expect(await names("EquipmentCatalog", target.id)).toEqual(["Kalash"]);
    const [model] = (await api.entities.GameSheetModel.filter({ campaign_id: target.id })).items;
    expect(model.skills).toBeUndefined();
    expect(model.equipment).toBeUndefined();
    expect(await applyGameSystemToCampaign(system.id, target.id)).toEqual({ replaced: true, skills: 0, equipment: 0 });
    expect(await names("EquipmentCatalog", target.id)).toEqual(["Kalash"]);
  });
});
