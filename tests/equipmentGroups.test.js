import { describe, expect, it } from "vitest";
import { EQUIPMENT_GROUPS, groupEquipment, groupPosition, newEquipmentItem } from "@/lib/meta/equipmentGroups.js";

const LIST = [
  { name: "Corde", type: "Outil" },
  { name: "Kalash", type: "Arme" },
  { name: "Gilet", type: "Protection" },
  { name: "Revolver", type: "arme à feu" },
  { name: "Briquet", type: "" },
];

describe("groupes d'équipement", () => {
  it("range les objets en armes, protections et autres, dans l'ordre", () => {
    const groups = groupEquipment(LIST);
    expect(groups.map((group) => group.id)).toEqual(["weapon", "protection", "other"]);
    expect(groups[0].entries.map((entry) => entry.item.name)).toEqual(["Kalash", "Revolver"]);
    expect(groups[2].entries.map((entry) => entry.item.name)).toEqual(["Corde", "Briquet"]);
  });
  it("garde la place de chaque objet dans la liste d'origine", () => {
    expect(groupEquipment(LIST)[0].entries.map((entry) => entry.index)).toEqual([1, 3]);
  });
  it("n'affiche pas les groupes vides et accepte une liste absente", () => {
    expect(groupEquipment([{ name: "A", type: "Armure" }]).map((group) => group.id)).toEqual(["protection"]);
    expect(groupEquipment(null)).toEqual([]);
  });
  it("donne la position du groupe", () => {
    expect(groupPosition({ type: "Arme" })).toBe(0);
    expect(groupPosition({ type: "Gilet" })).toBe(1);
    expect(groupPosition({})).toBe(2);
    expect(groupPosition(null)).toBe(2);
  });
  it("crée un objet vide avec le type du groupe et les champs connus, sans doublon", () => {
    expect(newEquipmentItem("weapon", ["Dégâts", "dégâts", " Portée ", ""])).toEqual({
      name: "",
      type: "Arme",
      fields: [{ name: "Dégâts", value: "" }, { name: "Portée", value: "" }],
    });
    expect(newEquipmentItem("protection").type).toBe("Protection");
    expect(newEquipmentItem("other")).toEqual({ name: "", type: "", fields: [] });
    expect(newEquipmentItem("inconnu").type).toBe("");
  });
  it("décrit trois groupes", () => {
    expect(EQUIPMENT_GROUPS.map((group) => group.id)).toEqual(["weapon", "protection", "other"]);
  });
});
