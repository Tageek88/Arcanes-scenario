import { describe, expect, it } from "vitest";
import { cleanZones, infoText, isLongZone, newZoneFor, placeableItems, zoneText } from "@/lib/meta/sheetZones.js";

const SHEET = {
  name: " Ivan ",
  notes: "Ancien du métro\nBlessé",
  skills: [{ name: "Tir", fields: [{ name: "Niveau", value: "2" }] }, { name: "Furtivité", fields: [] }],
  equipment: [{ name: "Kalash", type: "Arme", fields: [{ name: "Dégâts", value: "3" }] }, { name: "Masque", type: "", fields: [] }],
  inventory: [{ id: "i1", name: "Filtre" }, { id: "i2", name: "Eau" }],
};
const zone = (ref, over = {}) => ({ id: `z-${ref}`, kind: "info", ref, page: 0, x: 0.1, y: 0.1, w: 0.2, h: 0.1, size: 1.6, ...over });

describe("informations de la fiche placées sur la feuille", () => {
  it("propose le nom, les notes et les trois listes, avant les éléments du modèle", () => {
    const items = placeableItems({ characteristics: [{ name: "Vigueur" }] });
    expect(items.slice(0, 7).map((item) => item.ref)).toEqual(["name", "notes", "skills", "equipment", "weapons", "protections", "inventory"]);
    expect(items[7].ref).toBe("Vigueur");
  });
  it("garde les zones d'information et refuse une information inconnue", () => {
    const out = cleanZones([zone("name"), zone("skills"), zone("poids")], {});
    expect(out.map((item) => item.ref)).toEqual(["name", "skills"]);
  });
  it("lit le nom et les notes", () => {
    expect(infoText("name", SHEET)).toBe("Ivan");
    expect(infoText("notes", SHEET)).toBe("Ancien du métro\nBlessé");
  });
  it("écrit une ligne par compétence, équipement ou objet", () => {
    expect(infoText("skills", SHEET)).toBe("Tir (Niveau 2)\nFurtivité");
    expect(infoText("equipment", SHEET)).toBe("Kalash (Arme, Dégâts 3)\nMasque");
    expect(infoText("inventory", SHEET)).toBe("- Filtre\n- Eau");
  });
  it("rend du texte vide pour une fiche vide ou une information inconnue", () => {
    expect(infoText("skills", {})).toBe("");
    expect(infoText("inventory", null)).toBe("");
    expect(infoText("autre", SHEET)).toBe("");
    expect(zoneText(zone("name"), null)).toBe("");
  });
  it("passe par zoneText", () => {
    expect(zoneText(zone("name"), SHEET)).toBe("Ivan");
  });
  it("sait quelles zones passent à la ligne", () => {
    expect(isLongZone(zone("name"), new Set())).toBe(false);
    expect(isLongZone(zone("skills"), new Set())).toBe(true);
    expect(isLongZone({ kind: "text", ref: "f" }, new Set(["f"]))).toBe(true);
    expect(isLongZone({ kind: "stat", ref: "f" }, new Set(["f"]))).toBe(false);
  });
  it("crée une grande zone pour une liste et une petite pour le nom", () => {
    const [name, notes] = placeableItems({});
    expect(newZoneFor(name).h).toBeLessThan(0.05);
    expect(newZoneFor(notes).h).toBeGreaterThan(0.1);
  });
});
