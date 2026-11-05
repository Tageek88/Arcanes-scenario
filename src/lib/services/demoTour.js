import { db } from "@/api/localClient";
import { getSelectedCampaignId, setSelectedCampaignId } from "@/lib/context/campaignStore";
import { DEMO_CAMPAIGN_ID } from "@/lib/meta/demoCampaign";
import { importDemoCampaign } from "@/lib/services/demoCampaign";

// Campagne que la personne avait choisie avant la visite : gardée aussi en stockage, au cas où l'application se ferme en cours de route.
const PREVIOUS_KEY = "arcanes_tour_previous_campaign";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const readPrevious = () => {
  try {
    return localStorage.getItem(PREVIOUS_KEY) || "";
  } catch {
    return "";
  }
};
const writePrevious = (id) => {
  try {
    if (id) localStorage.setItem(PREVIOUS_KEY, id);
    else localStorage.removeItem(PREVIOUS_KEY);
  } catch {
    /* stockage indisponible : la campagne ne sera simplement pas remise */
  }
};

/**
 * Choisit une campagne et vérifie que le choix tient : la liste des campagnes, rechargée juste après un ajout,
 * peut remettre une autre campagne par-dessus. Si c'est le cas, on choisit de nouveau.
 */
export async function selectCampaignReliably(id, { tries = 4, settleMs = 250 } = {}) {
  for (let attempt = 0; attempt < tries; attempt += 1) {
    setSelectedCampaignId(id);
    await wait(settleMs);
    if (getSelectedCampaignId() === id) return true;
  }
  return false;
}

/** Début d'une visite sur l'exemple : ajoute la campagne d'exemple si besoin, retient la campagne en cours, sélectionne l'exemple. */
export async function enterDemo(options) {
  const before = getSelectedCampaignId();
  if (before && before !== DEMO_CAMPAIGN_ID) writePrevious(before);
  else if (!before) writePrevious("");
  const { created } = await importDemoCampaign();
  const selected = await selectCampaignReliably(DEMO_CAMPAIGN_ID, options);
  return { created, selected };
}

/** Fin (ou abandon) d'une visite : remet la campagne de la personne si elle existe encore. L'exemple, lui, reste en place. */
export async function leaveDemo(options) {
  const previous = readPrevious();
  writePrevious("");
  if (!previous || previous === DEMO_CAMPAIGN_ID) return { restored: false };
  const campaign = await db.table("Campaign").get(previous);
  if (!campaign) return { restored: false };
  const restored = await selectCampaignReliably(previous, options);
  return { restored };
}
