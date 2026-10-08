import { api } from "@/api/localClient";
import { withDataBatch } from "@/lib/dataEvents";

const parentOf = (location) => location.parent_id || "";

const byName = (a, b) => (a.name || "").localeCompare(b.name || "", "fr", { numeric: true });

// Regroupe les lieux par parent. Un parent introuvable est traité comme "premier niveau".
export function childrenMap(locations) {
  const ids = new Set(locations.map((l) => l.id));
  const map = new Map();
  for (const location of locations) {
    const parent = ids.has(parentOf(location)) ? parentOf(location) : "";
    if (!map.has(parent)) map.set(parent, []);
    map.get(parent).push(location);
  }
  map.forEach((list) => list.sort(byName));
  return map;
}

// Liste à plat dans l'ordre de l'arbre, avec la profondeur de chaque lieu.
export function flattenTree(locations, { collapsed = new Set(), exclude = new Set() } = {}) {
  const map = childrenMap(locations);
  const rows = [];
  const walk = (parentId, depth, seen) => {
    for (const location of map.get(parentId) || []) {
      if (exclude.has(location.id) || seen.has(location.id)) continue;
      const kids = (map.get(location.id) || []).filter((k) => !exclude.has(k.id));
      rows.push({ location, depth, childCount: kids.length });
      if (!collapsed.has(location.id)) walk(location.id, depth + 1, new Set(seen).add(location.id));
    }
  };
  walk("", 0, new Set());
  return rows;
}

// Tous les descendants d'un lieu (tous niveaux).
export function descendantIds(locations, id) {
  const map = childrenMap(locations);
  const out = [];
  const seen = new Set([id]);
  const walk = (parentId) => {
    for (const child of map.get(parentId) || []) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      out.push(child.id);
      walk(child.id);
    }
  };
  walk(id);
  return out;
}

// Chemin de la racine jusqu'au lieu (lui compris).
export function pathOf(locations, id) {
  const byId = new Map(locations.map((l) => [l.id, l]));
  const path = [];
  const seen = new Set();
  let current = byId.get(id);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = byId.get(parentOf(current));
  }
  return path;
}

// Choix possibles pour le menu "Lieu parent" (sans le lieu lui-même ni ses descendants).
export function parentOptions(locations, excludeId) {
  const exclude = new Set();
  if (excludeId) {
    exclude.add(excludeId);
    descendantIds(locations, excludeId).forEach((id) => exclude.add(id));
  }
  return flattenTree(locations, { exclude }).map(({ location }) => ({
    id: location.id,
    label: pathOf(locations, location.id).map((l) => l.name).join(" › "),
  }));
}

async function removeFromScenes(campaignId, removedIds) {
  const gone = new Set(removedIds);
  const res = await api.entities.Scene.filter({ campaign_id: campaignId }, { limit: 1000 });
  for (const scene of res.items) {
    const ids = scene.location_ids || [];
    if (ids.some((id) => gone.has(id))) {
      await api.entities.Scene.update(scene.id, { location_ids: ids.filter((id) => !gone.has(id)) });
    }
  }
}

// mode = "promote" : les enfants directs remontent d'un niveau.
// mode = "cascade" : le lieu et tous ses descendants sont supprimés.
async function reassignNpcs(campaignId, removedIds, newLocationId) {
  const gone = new Set(removedIds);
  const res = await api.entities.NPC.filter({ campaign_id: campaignId }, { limit: 1000 });
  for (const npc of res.items) {
    if (gone.has(npc.location_id)) {
      await api.entities.NPC.update(npc.id, { location_id: newLocationId });
    }
  }
}

async function reassignClues(campaignId, removedIds, newLocationId) {
  const gone = new Set(removedIds);
  const res = await api.entities.Clue.filter({ campaign_id: campaignId }, { limit: 1000 });
  for (const clue of res.items) {
    if (gone.has(clue.location_id)) {
      await api.entities.Clue.update(clue.id, { location_id: newLocationId });
    }
  }
}

export async function deleteLocation(location, locations, mode) {
  await withDataBatch(async () => {
    let removed = [location.id];
    if (mode === "cascade") {
      removed = [location.id, ...descendantIds(locations, location.id)];
      await api.entities.Location.deleteMany({ id: { $in: removed } });
    } else {
      const direct = locations.filter((l) => parentOf(l) === location.id);
      for (const child of direct) {
        await api.entities.Location.update(child.id, { parent_id: parentOf(location) });
      }
      await api.entities.Location.delete(location.id);
    }
    await removeFromScenes(location.campaign_id, removed);
    await reassignNpcs(location.campaign_id, removed, mode === "cascade" ? "" : parentOf(location));
    await reassignClues(location.campaign_id, removed, mode === "cascade" ? "" : parentOf(location));
  });
}

// Copie tous les sous-lieux d'un lieu sous un nouveau parent (nouveaux identifiants).
export async function copyLocationSubtree(locations, sourceId, newParentId) {
  const map = childrenMap(locations);
  const walk = async (oldParentId, newParent, depth) => {
    if (depth > 30) return;
    for (const child of map.get(oldParentId) || []) {
      const { id, created_date, updated_date, created_by_id, created_by, ...rest } = child;
      const copy = await api.entities.Location.create({ ...rest, parent_id: newParent });
      await walk(child.id, copy.id, depth + 1);
    }
  };
  await withDataBatch(() => walk(sourceId, newParentId, 0));
}