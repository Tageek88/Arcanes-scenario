import { describe, expect, it } from "vitest";
import { equipmentKind, infoText, placeableItems } from "@/lib/meta/sheetZones.js";

const SHEET = {
  equipment: [
    { name: "Kalash", type: "Arme", fields: [{ name: "Dégâts", value: "3" }] },
    { name: "Revolver", type: "arme à feu", fields: [] },
    { name: "Gilet", type: "Protection", fields: [{ name: "Max", value: "2" }] },
    { name: "Armure de plaques", type: "Armures", fields: [] },
    { name: "Corde", type: "Outil", fields: [] },
    { name: "Briquet", type: "", fields: [] },
  ],
};

describe("armes et protections", () => {
  it("reconnaît la sorte d'après le type, sans tenir compte des accents ni de la casse", () => {
    expect(equipmentKind({ type: "Arme" })).toBe("weapon");
    expect(equipmentKind({ type: "  ARMES blanches" })).toBe("weapon");
    expect(equipmentKind({ type: "Protection" })).toBe("protection");
    expect(equipmentKind({ type: "Armure" })).toBe("protection");
    expect(equipmentKind({ type: "Outil" })).toBe("other");
    expect(equipmentKind({})).toBe("other");
    expect(equipmentKind(null)).toBe("other");
  });
  it("sépare les armes des protections dans les listes de la feuille", () => {
    expect(infoText("weapons", SHEET)).toBe("Kalash (Dégâts 3)\nRevolver");
    expect(infoText("protections", SHEET)).toBe("Gilet (Max 2)\nArmure de plaques");
  });
  it("garde la liste complète avec le type", () => {
    expect(infoText("equipment", SHEET).split("\n")).toHaveLength(6);
    expect(infoText("equipment", SHEET)).toContain("Kalash (Arme, Dégâts 3)");
  });
  it("rend du vide sans équipement", () => {
    expect(infoText("weapons", {})).toBe("");
    expect(infoText("protections", null)).toBe("");
  });
  it("propose les deux listes à placer", () => {
    const refs = placeableItems({}).map((item) => item.ref);
    expect(refs).toContain("weapons");
    expect(refs).toContain("protections");
  });
});
