import { db } from "@/api/localClient";
import { withDataBatch } from "@/lib/context/dataEvents";
import { setSelectedCampaignId, getSelectedCampaignId } from "@/lib/context/campaignStore";
import { DEMO_CAMPAIGN_ID } from "@/lib/meta/demoCampaign";
import { withRelativeSessionDates } from "@/lib/meta/demoDates";
import { deleteCampaignCascade } from "@/lib/services/campaignDelete";
import { deleteTrashEntry, listTrash } from "@/lib/services/trash";

// Tables remplies par la campagne d'exemple (enfants après la campagne : l'ordre n'a pas d'importance pour Dexie).
export const DEMO_TABLES = [
  "Campaign", "Quest", "Act", "Scene", "NPC", "Location", "Clue", "NPCRelation", "RollTable", "GameSheetModel",
  "GameCharacter", "SkillCatalog", "EquipmentCatalog", "GameSession", "Note", "CampaignDocument", "CampaignDocumentFile",
];

export async function hasDemoCampaign() {
  return Boolean(await db.table("Campaign").get(DEMO_CAMPAIGN_ID));
}

/**
 * Ajoute la campagne d'exemple (une seule fois), en une transaction : tout ou rien.
 * @returns {Promise<{ created: boolean, rows: number }>}
 */
export async function importDemoCampaign() {
  if (await hasDemoCampaign()) return { created: false, rows: 0 };
  const { default: data } = await import("@/data/demoCampaign.json");
  let rows = 0;
  let created = false;
  await withDataBatch(() =>
    db.transaction("rw", DEMO_TABLES, async () => {
      // Relu dans la transaction : deux demandes simultanées n'ajoutent pas la campagne deux fois.
      if (await db.table("Campaign").get(DEMO_CAMPAIGN_ID)) return;
      for (const table of DEMO_TABLES) {
        const list = table === "GameSession" ? withRelativeSessionDates(data[table] || []) : data[table] || [];
        if (list.length) await db.table(table).bulkAdd(list);
        rows += list.length;
      }
      created = true;
    })
  );
  return { created, rows: created ? rows : 0 };
}

/**
 * Supprime la campagne d'exemple avec tout ce qu'elle contient (y compris ce que la personne y a ajouté).
 * Elle ne reste pas dans la corbeille : la rajouter se fait en un clic.
 * @returns {Promise<{ removed: boolean }>}
 */
export async function removeDemoCampaign() {
  if (!(await hasDemoCampaign())) return { removed: false };
  await deleteCampaignCascade(DEMO_CAMPAIGN_ID);
  const entries = await listTrash();
  for (const entry of entries.filter((item) => item.campaign_id === DEMO_CAMPAIGN_ID)) {
    await deleteTrashEntry(entry.id);
  }
  if (getSelectedCampaignId() === DEMO_CAMPAIGN_ID) setSelectedCampaignId("");
  return { removed: true };
}
