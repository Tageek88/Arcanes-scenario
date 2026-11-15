import { describe, expect, it } from "vitest";
import { infoText, placedLists, zoneText } from "@/lib/meta/sheetZones.js";

const SHEET = {
  equipment: [
    { name: "Kalash", type: "Arme", fields: [] },
    { name: "Gilet", type: "Protection", fields: [] },
    { name: "Corde", type: "Outil", fields: [] },
  ],
};
const info = (ref) => ({ id: ref, kind: "info", ref });

describe("équipement sans doublon", () => {
  it("détecte les listes placées à part", () => {
    expect(placedLists([info("weapons")])).toEqual({ weapons: true, protections: false });
    expect(placedLists(null)).toEqual({ weapons: false, protections: false });
  });
  it("garde tout l'équipement si aucune liste n'est placée", () => {
    expect(infoText("equipment", SHEET).split("\n")).toHaveLength(3);
  });
  it("retire les armes de l'équipement quand la zone armes existe", () => {
    expect(infoText("equipment", SHEET, placedLists([info("weapons")]))).toBe("Gilet (Protection)\nCorde (Outil)");
  });
  it("retire aussi les protections quand leur zone existe", () => {
    expect(infoText("equipment", SHEET, placedLists([info("weapons"), info("protections")]))).toBe("Corde (Outil)");
  });
  it("zoneText applique le filtre à la zone équipement seulement", () => {
    const zones = [info("equipment"), info("weapons")];
    expect(zoneText(zones[0], SHEET, zones).includes("Kalash")).toBe(false);
    expect(zoneText(zones[1], SHEET, zones)).toBe("Kalash");
    expect(zoneText(zones[0], SHEET)).toContain("Kalash");
  });
});
