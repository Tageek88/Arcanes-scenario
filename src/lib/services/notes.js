import { api, db } from "@/api/localClient";
import { newItemId } from "@/lib/meta/inventory";
import { cleanTarget, targetFields } from "@/lib/meta/postit";

// Post-it de MJ : notes collées sur un élément. La création et la modification d'une note passent par le hook
// `useNotes` ; ce service porte ce qui touche aussi les autres tables (libellés, identifiants de parties, renommages).

const LIMIT = 5000;
const OWNER_ENTITY = { npc: "NPC", character: "GameCharacter" };

/** Lignes nécessaires pour nommer les cibles d'une campagne, rangées par type puis par identifiant. */
export async function loadTargetLookup(campaignId) {
  const list = (entity) => api.entities[entity].filter({ campaign_id: campaignId }, { limit: LIMIT });
  const [scenes, npcs, locations, clues, characters] = await Promise.all([
    list("Scene"), list("NPC"), list("Location"), list("Clue"), list("GameCharacter"),
  ]);
  const byId = (result) => new Map(result.items.map((row) => [row.id, row]));
  return { scene: byId(scenes), npc: byId(npcs), location: byId(locations), clue: byId(clues), character: byId(characters) };
}

/**
 * Donne un identifiant stable aux compétences et aux équipements d'une fiche qui n'en ont pas encore (fiches créées
 * avant les post-it). Une compétence ou un équipement déjà identifié n'est jamais modifié.
 * @param {"npc" | "character"} kind
 * @param {string} id identifiant de la fiche
 * @returns {Promise<{ skills: any[], equipment: any[] }>} les listes à jour
 */
export async function ensurePartIds(kind, id) {
  const entity = OWNER_ENTITY[kind];
  if (!entity || !id) throw new Error("Fiche inconnue.");
  return db.transaction("rw", [entity], async () => {
    const row = await api.entities[entity].get(id);
    if (!row) throw new Error("Fiche introuvable.");
    const withIds = (list) => (Array.isArray(list) ? list : []).map((item) => (item && !item.id ? { ...item, id: newItemId() } : item));
    const skills = withIds(row.skills);
    const equipment = withIds(row.equipment);
    const changed = skills.some((item, i) => item !== (row.skills || [])[i]) || equipment.some((item, i) => item !== (row.equipment || [])[i]);
    if (changed) await api.entities[entity].update(id, { skills, equipment });
    return { skills, equipment };
  });
}

/** Détache une note de son élément : elle devient une note libre. */
export const detachNote = (noteId) => api.entities.Note.update(noteId, targetFields(null));

/**
 * Suit le renommage de caractéristiques : les notes collées sur « Force » suivent « Puissance ».
 * @param {string} campaignId
 * @param {Map<string, string>} renames ancien nom -> nouveau nom
 * @returns {Promise<number>} nombre de notes modifiées
 */
export async function renameCharacteristicNotes(campaignId, renames) {
  if (!campaignId || !renames || renames.size === 0) return 0;
  return db.transaction("rw", ["Note"], async () => {
    const { items } = await api.entities.Note.filter({ campaign_id: campaignId, part_kind: "characteristic" }, { limit: LIMIT });
    let count = 0;
    for (const note of items) {
      const next = renames.get(note.part_id);
      if (!next || next === note.part_id) continue;
      await api.entities.Note.update(note.id, { part_id: next });
      count += 1;
    }
    return count;
  });
}

/** Cible d'une note après vérification (null si elle est invalide) : à utiliser avant d'enregistrer un post-it. */
export const checkedTarget = (ref) => cleanTarget(ref);
