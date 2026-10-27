import { api, db } from "@/api/localClient";
import { withDataBatch } from "@/lib/context/dataEvents";

export const MAIN_QUEST_TITLE = "Quête principale";

const LIMIT = 5000;
const TABLES = ["Quest", "Act", "Scene"];

const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);
const newGroupId = () => globalThis.crypto?.randomUUID?.() || `group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const listCampaign = (entity, campaignId) =>
  api.entities[entity].filter({ campaign_id: campaignId }, { limit: LIMIT }).then((res) => res.items);

/** Quêtes d'une campagne, dans l'ordre. */
export async function loadQuests(campaignId) {
  const quests = await listCampaign("Quest", campaignId);
  return quests.sort(byOrder);
}

/**
 * Rattache à une quête tout acte ou toute scène qui n'en a pas encore (campagnes créées avant les quêtes,
 * sauvegardes anciennes restaurées). S'il n'existe aucune quête, « Quête principale » est créée.
 * Ne fait rien quand tout est déjà rattaché : une campagne volontairement sans quête n'en reçoit pas de nouvelle.
 * Le tout dans une seule transaction (relecture comprise), donc sans doublon si deux chargements se croisent.
 * @returns {Promise<boolean>} true si quelque chose a été écrit
 */
export async function ensureQuests(campaignId) {
  if (!campaignId) return false;
  return db.transaction("rw", TABLES, async () => {
    const [quests, acts, scenes] = await Promise.all([
      listCampaign("Quest", campaignId),
      listCampaign("Act", campaignId),
      listCampaign("Scene", campaignId),
    ]);
    const questIds = new Set(quests.map((q) => q.id));
    const looseActs = acts.filter((a) => !a.quest_id || !questIds.has(a.quest_id));
    const looseScenes = scenes.filter((s) => !s.quest_id || !questIds.has(s.quest_id));
    if (looseActs.length === 0 && looseScenes.length === 0) return false;

    const sortedQuests = [...quests].sort(byOrder);
    const main = sortedQuests[0] || (await api.entities.Quest.create(
      { campaign_id: campaignId, title: MAIN_QUEST_TITLE, order: 1 },
      { silent: true }
    ));

    for (const act of looseActs) {
      await api.entities.Act.update(act.id, { quest_id: main.id }, { silent: true });
    }
    const questOfAct = new Map(acts.map((a) => [a.id, looseActs.includes(a) ? main.id : a.quest_id]));
    for (const scene of looseScenes) {
      const questId = (scene.act_id && questOfAct.get(scene.act_id)) || main.id;
      await api.entities.Scene.update(scene.id, { quest_id: questId }, { silent: true });
    }
    return true;
  });
}

// Copie d'une scène dans une autre quête : mêmes liens (PNJ, lieux, indices), statut remis à « brouillon ».
const copyPayload = (scene, questId, actId, order) => ({
  campaign_id: scene.campaign_id,
  quest_id: questId,
  act_id: actId,
  recurring_group: scene.recurring_group,
  title: scene.title,
  summary: scene.summary || "",
  gm_notes: scene.gm_notes || "",
  status: "brouillon",
  order,
  next_scene_ids: [],
  npc_ids: [...(scene.npc_ids || [])],
  location_ids: [...(scene.location_ids || [])],
  clue_ids: [...(scene.clue_ids || [])],
  ...(scene.character_ids ? { character_ids: [...scene.character_ids] } : {}),
});

// Place les copies de `sources` dans `quest` (premier acte de la quête, sinon « Sans acte »).
// Les « scènes suivantes » ne sont gardées que si la cible est elle aussi copiée dans cette quête.
async function copyScenesInto(quest, sources, { acts, scenes }) {
  if (sources.length === 0) return [];
  const questActs = acts.filter((a) => a.quest_id === quest.id).sort(byOrder);
  const actId = questActs[0]?.id || "";
  let order = scenes
    .filter((s) => s.quest_id === quest.id && (s.act_id || "") === actId)
    .reduce((max, s) => Math.max(max, s.order ?? 0), 0);
  const created = [];
  const idMap = new Map();
  for (const source of sources) {
    order += 1;
    const copy = await api.entities.Scene.create(copyPayload(source, quest.id, actId, order), { silent: true });
    idMap.set(source.id, copy.id);
    created.push({ source, copy });
  }
  for (const { source, copy } of created) {
    const next = (source.next_scene_ids || []).map((id) => idMap.get(id)).filter(Boolean);
    if (next.length > 0) await api.entities.Scene.update(copy.id, { next_scene_ids: next }, { silent: true });
  }
  return created.map((item) => item.copy);
}

/** Crée une quête ; elle reçoit une copie de chaque scène récurrente de la campagne. */
export async function createQuest(campaignId, title) {
  const name = String(title || "").trim() || MAIN_QUEST_TITLE;
  return withDataBatch(() =>
    db.transaction("rw", TABLES, async () => {
      const [quests, acts, scenes] = await Promise.all([
        listCampaign("Quest", campaignId),
        listCampaign("Act", campaignId),
        listCampaign("Scene", campaignId),
      ]);
      const order = quests.reduce((max, q) => Math.max(max, q.order ?? 0), 0) + 1;
      const quest = await api.entities.Quest.create({ campaign_id: campaignId, title: name, order }, { silent: true });
      // Une scène par groupe : la plus ancienne.
      const firstOfGroup = new Map();
      [...scenes]
        .filter((s) => s.recurring_group)
        .sort((a, b) => String(a.created_date || "").localeCompare(String(b.created_date || "")))
        .forEach((s) => { if (!firstOfGroup.has(s.recurring_group)) firstOfGroup.set(s.recurring_group, s); });
      await copyScenesInto(quest, [...firstOfGroup.values()], { acts, scenes });
      return quest;
    })
  );
}

export async function renameQuest(questId, title) {
  const name = String(title || "").trim();
  if (!name) throw new Error("Le titre de la quête est vide.");
  return api.entities.Quest.update(questId, { title: name });
}

/** Supprime la quête, ses actes et ses scènes (copies de scènes récurrentes comprises). Rien ne change dans les autres quêtes. */
export async function deleteQuest(campaignId, questId) {
  return withDataBatch(() =>
    db.transaction("rw", TABLES, async () => {
      const [acts, scenes] = await Promise.all([listCampaign("Act", campaignId), listCampaign("Scene", campaignId)]);
      const actIds = new Set(acts.filter((a) => a.quest_id === questId).map((a) => a.id));
      const sceneIds = scenes.filter((s) => s.quest_id === questId || actIds.has(s.act_id)).map((s) => s.id);
      for (const id of sceneIds) await api.entities.Scene.delete(id, { silent: true });
      for (const id of actIds) await api.entities.Act.delete(id, { silent: true });
      await api.entities.Quest.delete(questId, { silent: true });
      return { scenes: sceneIds.length, acts: actIds.size };
    })
  );
}

/**
 * Rend une scène récurrente : elle reçoit un groupe et une copie est créée dans chacune des autres quêtes
 * (celles qui n'ont pas déjà une scène de ce groupe).
 */
export async function makeRecurring(scene) {
  return withDataBatch(() =>
    db.transaction("rw", TABLES, async () => {
      const campaignId = scene.campaign_id;
      const [quests, acts, scenes] = await Promise.all([
        listCampaign("Quest", campaignId),
        listCampaign("Act", campaignId),
        listCampaign("Scene", campaignId),
      ]);
      const group = scene.recurring_group || newGroupId();
      const source = { ...scene, recurring_group: group };
      await api.entities.Scene.update(scene.id, { recurring_group: group }, { silent: true });
      const have = new Set(scenes.filter((s) => s.recurring_group === group).map((s) => s.quest_id));
      have.add(scene.quest_id);
      const copies = [];
      for (const quest of [...quests].sort(byOrder)) {
        if (have.has(quest.id)) continue;
        copies.push(...(await copyScenesInto(quest, [source], { acts, scenes })));
      }
      return { group, copies: copies.length };
    })
  );
}

/** Retire la scène de son groupe : elle devient une scène ordinaire, les autres copies ne bougent pas. */
export async function stopRecurring(scene) {
  return api.entities.Scene.update(scene.id, { recurring_group: "" });
}
