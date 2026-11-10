import { describe, it, expect } from "vitest";
import {
  skillLinkMap,
  linkedCharacteristic,
  skillCharacteristic,
  renameSheetLinks,
} from "@/lib/meta/diceLinks.js";

describe("skill links", () => {
  const links = skillLinkMap([
    { name: "Discrétion", characteristic: "Agilité" },
    { name: "  Escalade ", characteristic: " Force " },
    { name: "Sans lien", characteristic: "" },
    { name: "Sans champ" },
    { name: "", characteristic: "Force" },
  ]);
  it("keeps only linked entries, with names compared without case or surrounding spaces", () => {
    expect(linkedCharacteristic("discrétion", links)).toBe("Agilité");
    expect(linkedCharacteristic("ESCALADE", links)).toBe("Force");
    expect(linkedCharacteristic("Sans lien", links)).toBe("");
    expect(linkedCharacteristic("Inconnue", links)).toBe("");
    expect(linkedCharacteristic("", links)).toBe("");
  });
  it("survives odd input", () => {
    expect(Object.keys(skillLinkMap(null))).toEqual([]);
    expect(linkedCharacteristic("x", undefined)).toBe("");
    const odd = skillLinkMap([{ name: "__proto__", characteristic: "Force" }]);
    expect(linkedCharacteristic("__proto__", odd)).toBe("Force");
    expect(linkedCharacteristic("toString", odd)).toBe("");
  });
  it("the characteristic on the sheet wins over the catalog link", () => {
    expect(skillCharacteristic({ name: "Discrétion", characteristic: "Force" }, links)).toBe("Force");
    expect(skillCharacteristic({ name: "Discrétion", characteristic: "" }, links)).toBe("Agilité");
    expect(skillCharacteristic({ name: "Discrétion" }, links)).toBe("Agilité");
    expect(skillCharacteristic({ name: "Inconnue" }, links)).toBe("");
    expect(skillCharacteristic(null, links)).toBe("");
  });
});

describe("renameSheetLinks", () => {
  const renames = new Map([["Force", "Puissance"]]);
  it("renames the die override and the linked skills", () => {
    const sheet = {
      dice_override: { Force: { count: 1, sides: 8 }, Agilité: { count: 1, sides: 6 } },
      skills: [
        { name: "Escalade", characteristic: "Force" },
        { name: "Discrétion", characteristic: "Agilité" },
        { name: "Libre" },
      ],
    };
    expect(renameSheetLinks(sheet, renames)).toEqual({
      dice_override: { Puissance: { count: 1, sides: 8 }, Agilité: { count: 1, sides: 6 } },
      skills: [
        { name: "Escalade", characteristic: "Puissance" },
        { name: "Discrétion", characteristic: "Agilité" },
        { name: "Libre" },
      ],
    });
  });
  it("returns nothing to write when nothing is concerned", () => {
    expect(renameSheetLinks({ skills: [{ name: "Libre" }] }, renames)).toEqual({});
    expect(renameSheetLinks({}, renames)).toEqual({});
    expect(renameSheetLinks(null, renames)).toEqual({});
    expect(renameSheetLinks({ dice_override: { Force: { count: 1, sides: 8 } } }, new Map())).toEqual({});
  });
  it("leaves the skills alone when only the override is concerned", () => {
    const result = renameSheetLinks(
      { dice_override: { Force: { count: 1, sides: 8 } }, skills: [{ name: "Libre" }] },
      renames
    );
    expect(Object.keys(result)).toEqual(["dice_override"]);
  });
});
