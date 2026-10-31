const KEY = "arcanes_campaign_id";
const listeners = new Set();

/** Appelle `listener(id)` à chaque changement de campagne choisie ; renvoie la fonction qui arrête l'écoute. */
export const subscribeSelectedCampaign = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getSelectedCampaignId = () => {
  try {
    return localStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
};

export const setSelectedCampaignId = (id) => {
  try {
    localStorage.setItem(KEY, id || "");
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((listener) => listener(id || ""));
};