// === INVENTAIRE ===
// Objets possédés par un personnage ou un PNJ (champ `inventory` de la fiche). Fonctions pures, sans accès aux données.
// Chaque objet a un identifiant stable (`id`) : il sert de clé d'affichage et permettra de le retrouver depuis d'autres pages.
//   { id, name, quantity, notes, catalog_id, fields: [{ name, value }] }
// L'équipement de la fiche décrit ce que le personnage utilise ; l'inventaire compte ce qu'il possède.

export const MAX_QUANTITY = 9999;

const text = (value) => (typeof value === "string" ? value.trim() : "");
const cell = (value) => (value === undefined || value === null ? "" : String(value));
const normalize = (value) => text(value).toLocaleLowerCase("fr");

export function newItemId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Quantité entière entre 0 et MAX_QUANTITY ; une valeur absente ou illisible vaut 1. */
export function cleanQuantity(value) {
  if (value === "" || value === null || value === undefined) return 1;
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number) || number < 0) return 1;
  return Math.min(number, MAX_QUANTITY);
}

export const emptyItem = (patch = {}) => ({
  id: newItemId(),
  name: "",
  quantity: 1,
  notes: "",
  catalog_id: "",
  fields: [],
  ...patch,
});

const cleanFields = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((field) => text(field?.name))
    .map((field) => ({ name: text(field.name), value: cell(field.value) }));

/**
 * Inventaire nettoyé avant enregistrement : les objets sans nom sont retirés, la quantité est un entier,
 * l'identifiant existant est conservé (un identifiant manquant ou en double est remplacé).
 * @param {unknown} list
 */
export function cleanInventory(list) {
  const seen = new Set();
  return (Array.isArray(list) ? list : [])
    .filter((item) => text(item?.name))
    .map((item) => {
      let id = text(item.id);
      if (!id || seen.has(id)) id = newItemId();
      seen.add(id);
      return {
        id,
        name: text(item.name),
        quantity: cleanQuantity(item.quantity),
        notes: text(item.notes),
        catalog_id: text(item.catalog_id),
        fields: cleanFields(item.fields),
      };
    });
}

const sameFields = (a, b) => JSON.stringify(cleanFields(a)) === JSON.stringify(cleanFields(b));

/**
 * Ajoute un objet à l'inventaire. Un objet identique (même nom, mêmes notes, mêmes champs) voit sa quantité augmenter
 * au lieu de créer une ligne en double. Renvoie une nouvelle liste ; l'original n'est pas modifié.
 */
export function addToInventory(list, item) {
  const current = cleanInventory(list);
  const [incoming] = cleanInventory([item]);
  if (!incoming) return current;
  const index = current.findIndex(
    (entry) => normalize(entry.name) === normalize(incoming.name) && normalize(entry.notes) === normalize(incoming.notes) && sameFields(entry.fields, incoming.fields)
  );
  if (index < 0) return [...current, incoming];
  return current.map((entry, i) =>
    i === index ? { ...entry, quantity: Math.min(entry.quantity + incoming.quantity, MAX_QUANTITY) } : entry
  );
}

export const STASH_NAME = "Sans propriétaire";

/**
 * Propriétaires d'objets d'une campagne, dans l'ordre : la réserve de la campagne (objets sans propriétaire, stockés dans
 * `Campaign.inventory`), puis les personnages, puis les PNJ (chacun trié par nom).
 * @param {{ campaign?: any, characters?: any[], npcs?: any[] }} data
 * @returns {{ kind: "campaign" | "character" | "npc", id: string, name: string, inventory: any[] }[]}
 */
export function inventoryOwners({ campaign, characters = [], npcs = [] }) {
  const byName = (a, b) => a.name.localeCompare(b.name, "fr", { numeric: true });
  const toOwner = (kind) => (row) => ({
    kind,
    id: row.id,
    name: text(row.name) || "Sans nom",
    inventory: cleanInventory(row.inventory),
  });
  return [
    { kind: "campaign", id: campaign?.id || "", name: STASH_NAME, inventory: cleanInventory(campaign?.inventory) },
    ...characters.map(toOwner("character")).sort(byName),
    ...npcs.map(toOwner("npc")).sort(byName),
  ];
}

/**
 * Objets déjà présents dans les inventaires (propositions de saisie) : un par nom, avec les noms de champs facultatifs
 * déjà utilisés pour cet objet. Trié par nom.
 * @param {unknown[][]} inventories listes d'objets (une par propriétaire)
 * @returns {{ name: string, fieldNames: string[] }[]}
 */
export function catalogFromInventories(inventories) {
  const known = new Map();
  for (const list of Array.isArray(inventories) ? inventories : []) {
    for (const item of cleanInventory(list)) {
      const key = normalize(item.name);
      const entry = known.get(key) || { name: item.name, fieldNames: [] };
      for (const field of item.fields) if (!entry.fieldNames.includes(field.name)) entry.fieldNames.push(field.name);
      known.set(key, entry);
    }
  }
  return [...known.values()].sort((a, b) => a.name.localeCompare(b.name, "fr", { numeric: true }));
}

/** Détail d'un objet sur une ligne : notes puis champs facultatifs (« Durée : 1 h »). Vide s'il n'y en a pas. */
export function inventoryDetail(item) {
  const fields = (Array.isArray(item?.fields) ? item.fields : [])
    .filter((field) => text(field?.name) || text(cell(field?.value)))
    .map((field) => `${text(field.name)}${text(cell(field.value)) ? `${text(field.name) ? " : " : ""}${text(cell(field.value))}` : ""}`);
  return [text(item?.notes), ...fields].filter(Boolean).join(" · ");
}

/** Ligne imprimable d'un objet : « Torche × 3 (Durée : 1 h) ». */
export function inventoryPrintLine(item) {
  const detail = inventoryDetail(item);
  const label = inventoryLabel({ name: text(item?.name), quantity: cleanQuantity(item?.quantity) });
  return detail ? `${label} (${detail})` : label;
}

/** Nombre total d'objets (somme des quantités). */
export const inventoryCount = (list) => cleanInventory(list).reduce((total, item) => total + item.quantity, 0);

/** « Potion de soin × 3 », ou le nom seul pour une quantité de 1. */
export const inventoryLabel = (item) => (item.quantity === 1 ? item.name : `${item.name} × ${item.quantity}`);
