import { describe, it, expect, vi } from "vitest";
import { api } from "@/api/localClient";
import { LINKED_ENTITIES, countCampaignContent, deleteCampaignCascade } from "@/lib/services/campaignDelete";
import { all, makeCampaign } from "./helpers";

// Une ligne dans chaque entité rattachée à la campagne.
async function fillCampaign(campaignId) {
  for (const { entity } of LINKED_ENTITIES) {
    await api.entities[entity].create({ campaign_id: campaignId, name: entity, title: entity });
  }
}

describe("suppression d'une campagne en cascade", () => {
  it("supprime la campagne et tout son contenu, et seulement le sien", async () => {
    const doomed = await makeCampaign("À supprimer");
    const kept = await makeCampaign("À garder");
    await fillCampaign(doomed.id);
    await fillCampaign(kept.id);
    await deleteCampaignCascade(doomed.id);
    for (const { entity } of LINKED_ENTITIES) {
      expect(await all(entity, doomed.id)).toHaveLength(0);
      expect(await all(entity, kept.id)).toHaveLength(1);
    }
    expect((await api.entities.Campaign.filter({})).items.map((c) => c.id)).toEqual([kept.id]);
  });

  it("une erreur en cours de route n'efface rien (transaction)", async () => {
    const campaign = await makeCampaign();
    await fillCampaign(campaign.id);
    // Scène vient après Indice dans la liste : l'indice a déjà été supprimé quand l'erreur survient.
    vi.spyOn(api.entities.Scene, "deleteMany").mockRejectedValue(new Error("panne simulée"));
    await expect(deleteCampaignCascade(campaign.id)).rejects.toThrow("panne simulée");
    expect(await all("Clue", campaign.id)).toHaveLength(1);
    expect(await all("Scene", campaign.id)).toHaveLength(1);
    expect((await api.entities.Campaign.filter({})).items).toHaveLength(1);
  });

  it("countCampaignContent compte chaque type, et les relations par paires", async () => {
    const campaign = await makeCampaign();
    await api.entities.Scene.create({ campaign_id: campaign.id, title: "a" });
    await api.entities.Scene.create({ campaign_id: campaign.id, title: "b" });
    await api.entities.NPCRelation.create({ campaign_id: campaign.id, pair_id: "p", from_id: "1", to_id: "2" });
    await api.entities.NPCRelation.create({ campaign_id: campaign.id, pair_id: "p", from_id: "2", to_id: "1" });
    const counts = Object.fromEntries((await countCampaignContent(campaign.id)).map((c) => [c.entity, c.count]));
    expect(counts).toEqual({ Scene: 2, NPCRelation: 1 });
  });

  it("la liste des entités rattachées couvre toutes les tables sauf la campagne", async () => {
    const { TABLES } = await import("@/api/localClient");
    const linked = LINKED_ENTITIES.map((item) => item.entity).sort();
    expect(linked).toEqual(TABLES.filter((t) => t !== "Campaign").sort());
  });
});
