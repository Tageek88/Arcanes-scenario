import { api } from "@/api/localClient";

// Enfants d'abord, la campagne en dernier.
export const LINKED_ENTITIES = [
  { entity: "SessionPoll", label: "sondage", plural: "sondages" },
  { entity: "NPCRelation", label: "relation entre PNJ", plural: "relations entre PNJ" },
  { entity: "GameCharacter", label: "personnage", plural: "personnages" },
  { entity: "GameSheetModel", label: "modèle de fiche", plural: "modèles de fiche" },
  { entity: "SkillCatalog", label: "compétence du catalogue", plural: "compétences du catalogue" },
  { entity: "EquipmentCatalog", label: "équipement du catalogue", plural: "équipements du catalogue" },
  { entity: "Clue", label: "indice", plural: "indices" },
  { entity: "Scene", label: "scène", plural: "scènes" },
  { entity: "Act", label: "acte", plural: "actes" },
  { entity: "NPC", label: "PNJ", plural: "PNJ" },
  { entity: "Location", label: "lieu", plural: "lieux" },
  { entity: "Note", label: "note", plural: "notes" },
  { entity: "RollTable", label: "table aléatoire", plural: "tables aléatoires" },
  { entity: "GameSession", label: "session de jeu", plural: "sessions de jeu" },
];

const PAGE = 5000;

// Liste ce qui sera supprimé, pour la confirmation.
export async function countCampaignContent(campaignId) {
  const results = await Promise.all(
    LINKED_ENTITIES.map(async ({ entity, label, plural }) => {
      const res = await api.entities[entity].filter({ campaign_id: campaignId }, { limit: PAGE });
      const rows = res.items.length;
      // Une relation est stockée en deux lignes (une par PNJ) : on compte les paires.
      const count = entity === "NPCRelation" ? Math.ceil(rows / 2) : rows;
      return {
        entity,
        count,
        text: `${count}${rows >= PAGE ? "+" : ""} ${count > 1 ? plural : label}`,
      };
    })
  );
  return results.filter((r) => r.count > 0);
}

// Supprime tout le contenu, vérifie qu'il ne reste rien, puis supprime la campagne.
export async function deleteCampaignCascade(campaignId) {
  for (const { entity } of LINKED_ENTITIES) {
    await api.entities[entity].deleteMany({ campaign_id: campaignId });
    const left = await api.entities[entity].filter({ campaign_id: campaignId }, { limit: 1 });
    if (left.items.length > 0) {
      throw new Error(`Il reste des éléments de type ${entity} : la campagne n'a pas été supprimée.`);
    }
  }
  await api.entities.Campaign.delete(campaignId);
}