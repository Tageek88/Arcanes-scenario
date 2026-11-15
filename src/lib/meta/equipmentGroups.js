// Rangement de l'équipement en armes, protections et autres objets (d'après le type de chaque objet, voir equipmentKind).
// Le type reste un texte libre : rien n'est stocké en plus, un objet change de groupe dès que son type change.

import { equipmentKind } from "@/lib/meta/sheetZones";

export const EQUIPMENT_GROUPS = [
  { id: "weapon", label: "Armes", type: "Arme", add: "Ajouter une arme" },
  { id: "protection", label: "Protections", type: "Protection", add: "Ajouter une protection" },
  { id: "other", label: "Autres objets", type: "", add: "Ajouter un objet" },
];

/** Position du groupe d'un objet dans EQUIPMENT_GROUPS (0 armes, 1 protections, 2 autres). */
export const groupPosition = (item) => {
  const position = EQUIPMENT_GROUPS.findIndex((group) => group.id === equipmentKind(item));
  return position < 0 ? EQUIPMENT_GROUPS.length - 1 : position;
};

/**
 * Les groupes qui contiennent au moins un objet, dans l'ordre armes, protections, autres :
 * [{ id, label, type, add, entries: [{ item, index }] }] (`index` = place de l'objet dans la liste d'origine).
 */
export function groupEquipment(list) {
  const items = Array.isArray(list) ? list : [];
  return EQUIPMENT_GROUPS.map((group, position) => ({
    ...group,
    entries: items.map((item, index) => ({ item, index })).filter(({ item }) => groupPosition(item) === position),
  })).filter((group) => group.entries.length > 0);
}

/** Un objet vide du groupe `groupId`, avec le type du groupe et les champs connus pour ce type (`fieldNames`). */
export function newEquipmentItem(groupId, fieldNames = []) {
  const group = EQUIPMENT_GROUPS.find((entry) => entry.id === groupId) || EQUIPMENT_GROUPS[EQUIPMENT_GROUPS.length - 1];
  const seen = new Set();
  const fields = [];
  for (const name of fieldNames) {
    const clean = String(name ?? "").trim();
    if (clean && !seen.has(clean.toLowerCase())) {
      seen.add(clean.toLowerCase());
      fields.push({ name: clean, value: "" });
    }
  }
  return { name: "", type: group.type, fields };
}
