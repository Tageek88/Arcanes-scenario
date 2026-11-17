import { describe, expect, it } from "vitest";
import { api } from "@/api/localClient";
import { BUILTIN_SYSTEMS } from "@/lib/meta/builtinSystems";
import { applyChosenSystemToCampaign, copyBuiltinSystem } from "@/lib/services/gameSystems";
import { makeCampaign } from "./helpers";

const modelOf = async (campaignId) => (await api.entities.GameSheetModel.filter({ campaign_id: campaignId }, { limit: 1 })).items[0];

describe("système choisi à la création d'une campagne (service)", () => {
  it("applique un système fourni à une campagne neuve", async () => {
    const campaign = await makeCampaign();
    const builtin = BUILTIN_SYSTEMS[0];
    const out = await applyChosenSystemToCampaign(builtin.id, campaign.id);
    expect(out.name).toBe(builtin.name);
    expect(out.replaced).toBe(false);
    const model = await modelOf(campaign.id);
    expect(model.characteristics.length).toBeGreaterThan(0);
  });

  it("applique un système enregistré par l'utilisateur", async () => {
    const saved = await copyBuiltinSystem(BUILTIN_SYSTEMS[0].id);
    const campaign = await makeCampaign();
    const out = await applyChosenSystemToCampaign(saved.id, campaign.id);
    expect(out.name).toBe(saved.name);
    expect((await modelOf(campaign.id)).characteristics.length).toBeGreaterThan(0);
  });

  it("refuse un système qui n'existe pas", async () => {
    const campaign = await makeCampaign();
    await expect(applyChosenSystemToCampaign("inconnu", campaign.id)).rejects.toThrow();
  });
});
