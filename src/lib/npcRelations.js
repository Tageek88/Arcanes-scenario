import { api } from "@/api/localClient";
import { CUSTOM_TYPE, groupIndex, inverseOf, parentEdge, relationLabel } from "@/lib/relationMeta";
const table = () => api.entities.NPCRelation;

const uid = () =>
  globalThis.crypto?.randomUUID?.() ||
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export async function loadRelations(campaignId) {
  const res = await table().filter({ campaign_id: campaignId }, { limit: 5000 });
  return res.items;
}

export const mirrorOf = (row, relations) =>
  relations.find((r) => r.pair_id === row.pair_id && r.id !== row.id) || null;

// "ok" | "one_sided" (pas de réciproque) | "mismatch" (réciproque différente)
export function pairStatus(row, relations) {
  const mirror = mirrorOf(row, relations);
  if (!mirror) return "one_sided";
  const sameEnds = mirror.from_id === row.to_id && mirror.to_id === row.from_id;
  const sameTypes =
    row.type === CUSTOM_TYPE || mirror.type === CUSTOM_TYPE
      ? row.type === mirror.type
      : mirror.type === inverseOf(row.type);
  return sameEnds && sameTypes ? "ok" : "mismatch";
}

// Renvoie un message d'erreur, ou "" si la relation est valide.
export function validateRelation(relations, { fromId, toId, type, ignorePairId }) {
  if (!toId) return "Choisissez un PNJ.";
  if (fromId === toId) return "Un PNJ ne peut pas être lié à lui-même.";
  const others = relations.filter((r) => r.pair_id !== ignorePairId);

  if (type !== CUSTOM_TYPE && others.some((r) => r.from_id === fromId && r.to_id === toId && r.type === type)) {
    return "Cette relation existe déjà entre ces deux PNJ.";
  }

  const edge = parentEdge({ type, from_id: fromId, to_id: toId });
  if (edge) {
    const [parent, child] = edge;
    const edges = others.map(parentEdge).filter(Boolean);
    const seen = new Set([parent]);
    const queue = [parent];
    while (queue.length) {
      const node = queue.pop();
      for (const [p, c] of edges) {
        if (c !== node || seen.has(p)) continue;
        if (p === child) return "Cette filiation créerait une boucle : un PNJ serait son propre ancêtre.";
        seen.add(p);
        queue.push(p);
      }
    }
  }
  return "";
}

export async function createRelation(
  campaignId,
  { fromId, toId, type, label = "", inverseLabel = "", notes = "", oneSided = false }
) {
  const pair_id = uid();
  const base = { campaign_id: campaignId, pair_id, notes };
  const first = await table().create({
    ...base,
    from_id: fromId,
    to_id: toId,
    type,
    custom_label: type === CUSTOM_TYPE ? label : "",
  });
  if (oneSided) return;
  try {
    await table().create({
      ...base,
      from_id: toId,
      to_id: fromId,
      type: inverseOf(type),
      custom_label: type === CUSTOM_TYPE ? inverseLabel : "",
    });
  } catch (error) {
    await table().delete(first.id).catch(() => { });
    throw error;
  }
}

// manual = true : seul ce côté est modifié. Sinon la ligne miroir est mise à jour (ou recréée).
export async function updateRelation(
  row,
  relations,
  { toId, type, label = "", inverseLabel = "", notes = "", manual = false }
) {
  await table().update(row.id, {
    to_id: toId,
    type,
    custom_label: type === CUSTOM_TYPE ? label : "",
    notes,
  });
  if (manual) return;
  const mirror = mirrorOf(row, relations);
  const data = {
    from_id: toId,
    to_id: row.from_id,
    type: inverseOf(type),
    custom_label: type === CUSTOM_TYPE ? inverseLabel : "",
    notes,
  };
  if (mirror) await table().update(mirror.id, data);
  else await table().create({ campaign_id: row.campaign_id, pair_id: row.pair_id, ...data });
}

// Réaligne la ligne miroir sur cette ligne.
export async function repairRelation(row, relations) {
  const mirror = mirrorOf(row, relations);
  await updateRelation(row, relations, {
    toId: row.to_id,
    type: row.type,
    label: row.custom_label || "",
    inverseLabel: mirror?.custom_label || "",
    notes: row.notes || "",
  });
}

export async function deleteRelation(row, relations, both = true) {
  const ids = [row.id];
  if (both) {
    const mirror = mirrorOf(row, relations);
    if (mirror) ids.push(mirror.id);
  }
  await table().deleteMany({ id: { $in: ids } });
}

// À appeler quand un PNJ est supprimé.
export async function deleteNpcRelations(campaignId, npcId) {
  const all = await loadRelations(campaignId);
  const pairs = new Set(all.filter((r) => r.from_id === npcId || r.to_id === npcId).map((r) => r.pair_id));
  const ids = all.filter((r) => pairs.has(r.pair_id)).map((r) => r.id);
  if (ids.length) await table().deleteMany({ id: { $in: ids } });
}

// Relations de chaque PNJ, triées (famille d'abord), pour l'affichage sur les cartes.
export function relationsByNpc(relations, npcs) {
  const names = new Map(npcs.map((n) => [n.id, n.name]));
  const map = new Map();
  relations.forEach((r) => {
    if (!names.has(r.from_id) || !names.has(r.to_id)) return;
    if (!map.has(r.from_id)) map.set(r.from_id, []);
    map.get(r.from_id).push({
      id: r.id,
      order: groupIndex(r.type),
      text: `${relationLabel(r)} ${names.get(r.to_id)}`,
    });
  });
  map.forEach((list) =>
    list.sort((a, b) => a.order - b.order || a.text.localeCompare(b.text, "fr"))
  );
  return map;
}

// Reprend sur un nouveau PNJ les relations d'un PNJ existant (côté inverse compris).
export async function copyNpcRelations(campaignId, sourceId, newId) {
  const all = await loadRelations(campaignId);
  const mine = all.filter((r) => r.from_id === sourceId && r.to_id !== newId);
  for (const row of mine) {
    const mirror = mirrorOf(row, all);
    await createRelation(campaignId, {
      fromId: newId,
      toId: row.to_id,
      type: row.type,
      label: row.custom_label || "",
      inverseLabel: mirror?.custom_label || "",
      notes: row.notes || "",
      oneSided: !mirror,
    });
  }
}