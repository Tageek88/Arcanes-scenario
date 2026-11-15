import React from "react";
import { groupEquipment, groupPosition } from "@/lib/meta/equipmentGroups";

/**
 * Titres « Armes », « Protections », « Autres objets » d'une liste d'équipement. Ils se placent avec `style.order` dans le même
 * conteneur que les objets (voir `equipmentOrder`) : un objet garde sa place dans le DOM, donc le curseur, quand son type le change de groupe.
 * Aucun titre quand il n'y a qu'un groupe.
 */
export default function EquipmentGroupHeadings({ equipment }) {
  const groups = groupEquipment(equipment);
  if (groups.length < 2) return null;
  return groups.map((group) => (
    <h4 key={group.id} className="text-sm font-semibold text-foreground" style={{ order: groupPosition({ type: group.type }) * 2 }}>
      {group.label}
    </h4>
  ));
}

/** Style d'un objet de la liste : placé après le titre de son groupe. */
export const equipmentOrder = (item) => ({ order: groupPosition(item) * 2 + 1 });
