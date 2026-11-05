// === SECTION JOURNAL DE SÉANCE : ENREGISTREMENT ===
import { api } from "@/api/localClient";
import { notifyDataChanged, withDataBatch } from "@/lib/context/dataEvents";
import { cleanJournal } from "@/lib/meta/sessionJournal";

const LIMIT = 2000;

/** Toutes les séances d'une campagne (les plus récentes d'abord). */
export async function listCampaignSessions(campaignId) {
  if (!campaignId) return [];
  const res = await api.entities.GameSession.filter({ campaign_id: campaignId }, { sort: "-date", limit: LIMIT });
  return res.items;
}

/**
 * Enregistre le compte rendu d'une séance. Les autres champs de la séance ne sont pas touchés.
 * Si `markPlayedIds` n'est pas vide, ces scènes passent en « joué » dans la même opération.
 */
export async function saveSessionJournal(sessionId, journal, { markPlayedIds = [] } = {}) {
  if (!sessionId) throw new Error("Séance introuvable.");
  const clean = cleanJournal(journal);
  return withDataBatch(async () => {
    const saved = await api.entities.GameSession.update(sessionId, { journal: clean });
    for (const id of markPlayedIds) await api.entities.Scene.update(id, { status: "joue" }, { silent: true });
    if (markPlayedIds.length) notifyDataChanged();
    return saved;
  });
}
