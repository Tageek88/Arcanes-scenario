import { api } from "@/api/localClient";

// Crée une campagne vide et la renvoie.
export const makeCampaign = (name = "Campagne de test") =>
  api.entities.Campaign.create({ name, system: "", summary: "", universe_type: "arcanes" });

export const all = async (entity, campaignId) =>
  (await api.entities[entity].filter(campaignId ? { campaign_id: campaignId } : {}, { limit: 5000 })).items;
