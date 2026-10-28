// Quête affichée, mémorisée par campagne (comme la campagne sélectionnée) et partagée entre les pages.
const keyOf = (campaignId) => `arcanes_quest_id:${campaignId}`;
const memory = new Map();
const listeners = new Set();

export const getSelectedQuestId = (campaignId) => {
  if (!campaignId) return "";
  try {
    return localStorage.getItem(keyOf(campaignId)) || memory.get(campaignId) || "";
  } catch {
    return memory.get(campaignId) || "";
  }
};

export const setSelectedQuestId = (campaignId, id) => {
  if (!campaignId) return;
  memory.set(campaignId, id || "");
  try {
    localStorage.setItem(keyOf(campaignId), id || "");
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((listener) => listener(campaignId));
};

// Prévient les écrans quand la quête d'une campagne change. Renvoie la fonction qui se désabonne.
export const subscribeQuestSelection = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
