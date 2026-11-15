import { describe, expect, it } from "vitest";
import { api } from "@/api/localClient";
import { applyBuiltinSystemToCampaign, copyBuiltinSystem, listGameSystems } from "@/lib/services/gameSystems";
import { makeCampaign } from "./helpers";

describe("systèmes fournis (service)", () => {
  it("copie Metro 2033 dans une campagne sans modèle, puis le remplace sur demande", async () => {
    const campaign = await makeCampaign("Metro");
    expect(await applyBuiltinSystemToCampaign("builtin-metro-2033", campaign.id)).toEqual({ replaced: false, skills: 0, equipment: 0 });
    const [row] = (await api.entities.GameSheetModel.filter({ campaign_id: campaign.id })).items;
    expect(row.characteristics).toHaveLength(16);
    expect(row.dice.rule).toBe("pool");
    expect(row.layoutId).toBe("metro");
    expect(await applyBuiltinSystemToCampaign("builtin-metro-2033", campaign.id)).toEqual({ replaced: true, skills: 0, equipment: 0 });
    expect((await api.entities.GameSheetModel.filter({ campaign_id: campaign.id })).items).toHaveLength(1);
  });

  it("ajoute un système fourni à ceux de l'utilisateur", async () => {
    const copy = await copyBuiltinSystem("builtin-metro-2033");
    expect(copy.name).toBe("Metro 2033");
    expect(copy.builtin).toBeUndefined();
    expect((await listGameSystems()).map((item) => item.name)).toContain("Metro 2033");
  });

  it("refuse un système fourni inconnu", async () => {
    const campaign = await makeCampaign("X");
    await expect(applyBuiltinSystemToCampaign("zz", campaign.id)).rejects.toThrow("n'existe plus");
    await expect(copyBuiltinSystem("zz")).rejects.toThrow("n'existe plus");
  });
});
