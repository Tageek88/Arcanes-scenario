import { api } from "@/api/localClient";

// Enregistrement local (IndexedDB) des références aux sondages. Le service distant est géré par ./client.

/**
 * Sondages d'une campagne, du plus récent au plus ancien.
 * @param {string} campaignId
 * @returns {Promise<any[]>}
 */
export async function listCampaignPolls(campaignId) {
  const { items } = await api.entities.SessionPoll.filter({ campaign_id: campaignId }, { sort: "-created_date" });
  return items;
}

/** @param {object} data champs du sondage à enregistrer */
export const createLocalPoll = (data) => api.entities.SessionPoll.create(data);

/**
 * @param {string} id identifiant local du sondage
 * @param {object} data champs à modifier
 */
export const updateLocalPoll = (id, data) => api.entities.SessionPoll.update(id, data);

/** @param {string} id identifiant local du sondage */
export const deleteLocalPoll = (id) => api.entities.SessionPoll.delete(id);
