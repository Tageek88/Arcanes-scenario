import { base44 } from "@/api/base44Client";

// Enfants d'abord, la campagne en dernier.
export const LINKED_ENTITIES = [
  { entity: "Clue", label: "indice", plural: "indices" },
  { entity: "Scene", label: "scène", plural: "scènes" },
  { entity: "Act", label: "acte", plural: "actes" },
  { entity: "NPC", label: "PNJ", plural: "PNJ" },
  { entity: "Location", label: "lieu", plural: "lieux" },
  { entity: "Note", label: "note", plural: "notes" },
  { entity: "RollTable", label: "table aléatoire", plural: "tables aléatoires" },
  { entity: "GameSession", label: "session de jeu", plural: "sessions de jeu" },
];

const PAGE = 500;

// Liste ce qui sera supprimé, pour la confirmation.
export async function countCampaignContent(campaignId) {
  const results = await Promise.all(
    LINKED_ENTITIES.map(async ({ entity, label, plural }) => {
      const res = await base44.entities[entity].filter({ campaign_id: campaignId }, { limit: PAGE });
      const count = res.items.length;
      return { entity, count, capped: count >= PAGE, text: `${count}${count >= PAGE ? "+" : ""} ${count > 1 ? plural : label}` };
    })
  );
  return results.filter((r) => r.count > 0);
}

// Supprime tout le contenu, vérifie qu'il ne reste rien, puis supprime la campagne.
export async function deleteCampaignCascade(campaignId) {
  for (const { entity } of LINKED_ENTITIES) {
    await base44.entities[entity].deleteMany({ campaign_id: campaignId });
    const left = await base44.entities[entity].filter({ campaign_id: campaignId }, { limit: 1 });
    if (left.items.length > 0) {
      throw new Error(`Il reste des éléments de type ${entity} : la campagne n'a pas été supprimée.`);
    }
  }
  await base44.entities.Campaign.delete(campaignId);
}