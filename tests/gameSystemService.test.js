import { describe, expect, it } from "vitest";
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
    expect(await applyGameSystemToCampaign(system.id, target.id)).toEqual({ replaced: false, skills: 0, equipment: 0 });
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
    expect(await applyGameSystemToCampaign(system.id, target.id)).toEqual({ replaced: true, skills: 0, equipment: 0 });
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
