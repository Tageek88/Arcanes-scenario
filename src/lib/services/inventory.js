import { api, db } from "@/api/localClient";
import { addToInventory, cleanInventory, cleanQuantity, inventoryOwners } from "@/lib/meta/inventory";

// Inventaires des personnages (GameCharacter) et des PNJ (NPC) d'une campagne.
// Chaque modification relit la fiche juste avant d'écrire (voir `mutate`).

const ENTITY = { campaign: "Campaign", character: "GameCharacter", npc: "NPC" };

/** @typedef {{ kind: "campaign" | "character" | "npc", id: string }} InventoryOwnerRef */

/**
 * Propriétaires possibles d'un objet : la réserve de la campagne (objets sans propriétaire), les personnages, puis les PNJ,
 * chacun avec son inventaire.
 */
export async function loadOwners(campaignId) {
  if (!campaignId) return [];
  const [campaign, characters, npcs] = await Promise.all([
    api.entities.Campaign.get(campaignId).catch(() => null),
    api.entities.GameCharacter.filter({ campaign_id: campaignId }, { sort: "name", limit: 500 }),
    api.entities.NPC.filter({ campaign_id: campaignId }, { sort: "name", limit: 500 }),
  ]);
  return inventoryOwners({ campaign: campaign || { id: campaignId }, characters: characters.items, npcs: npcs.items });
}

// Lecture et écriture dans une seule transaction : deux ajouts simultanés sur la même fiche s'additionnent au lieu de s'écraser.
async function mutate(owner, change) {
  const entity = ENTITY[owner?.kind];
  if (!entity || !owner.id) throw new Error("Propriétaire de l'objet inconnu.");
  return db.transaction("rw", [entity], async () => {
    const row = await api.entities[entity].get(owner.id);
    if (!row) throw new Error("Fiche introuvable.");
    const next = cleanInventory(change(cleanInventory(row.inventory)));
    await api.entities[entity].update(owner.id, { inventory: next });
    return next;
  });
}

/** Ajoute un objet ; un objet identique voit sa quantité augmenter. */
export const addInventoryItem = (owner, item) => mutate(owner, (list) => addToInventory(list, item));

/** Fixe la quantité d'un objet (0 permis : l'objet reste dans la liste). */
export const setInventoryQuantity = (owner, itemId, quantity) =>
  mutate(owner, (list) => list.map((item) => (item.id === itemId ? { ...item, quantity: cleanQuantity(quantity) } : item)));

export const removeInventoryItem = (owner, itemId) => mutate(owner, (list) => list.filter((item) => item.id !== itemId));

/**
 * Donne un objet (ou une partie de sa quantité) d'un propriétaire à un autre : réserve de la campagne, personnage ou PNJ.
 * Retrait et ajout se font dans une seule transaction. Si tout est donné, la ligne disparaît de l'inventaire d'origine ;
 * chez le destinataire, un objet identique voit sa quantité augmenter.
 * @param {InventoryOwnerRef} from
 * @param {InventoryOwnerRef} to
 * @param {string} itemId
 * @param {number|string} [quantity] par défaut, toute la quantité
 * @returns {Promise<{ given: number, name: string }>}
 */
export async function transferInventoryItem(from, to, itemId, quantity) {
  const fromEntity = ENTITY[from?.kind];
  const toEntity = ENTITY[to?.kind];
  if (!fromEntity || !toEntity || !from.id || !to.id) throw new Error("Propriétaire de l'objet inconnu.");
  if (from.kind === to.kind && from.id === to.id) throw new Error("L'objet appartient déjà à ce propriétaire.");
  const tables = [...new Set([fromEntity, toEntity])];
  return db.transaction("rw", tables, async () => {
    const source = await api.entities[fromEntity].get(from.id);
    const target = await api.entities[toEntity].get(to.id);
    if (!source || !target) throw new Error("Fiche introuvable.");
    const sourceList = cleanInventory(source.inventory);
    const item = sourceList.find((entry) => entry.id === itemId);
    if (!item) throw new Error("Objet introuvable.");
    const given = quantity === undefined || quantity === "" ? item.quantity : Math.min(cleanQuantity(quantity), item.quantity);
    if (given <= 0) throw new Error("Aucune quantité à donner.");
    const rest = item.quantity - given;
    const nextSource = rest > 0 ? sourceList.map((entry) => (entry.id === itemId ? { ...entry, quantity: rest } : entry)) : sourceList.filter((entry) => entry.id !== itemId);
    const nextTarget = addToInventory(cleanInventory(target.inventory), { ...item, quantity: given });
    await api.entities[fromEntity].update(from.id, { inventory: nextSource });
    await api.entities[toEntity].update(to.id, { inventory: nextTarget });
    return { given, name: item.name };
  });
}
