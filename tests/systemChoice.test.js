import { describe, expect, it } from "vitest";
import { NO_SYSTEM, chosenSystemNotice, splitCampaignForm, systemChoices } from "@/lib/meta/systemChoice.js";

describe("systemChoices", () => {
  it("met les systèmes fournis d'abord, puis ceux de l'utilisateur", () => {
    const out = systemChoices([{ id: "builtin-a", name: "Metro 2033" }], [{ id: "s1", name: "Mon système" }]);
    expect(out.map((item) => item.id)).toEqual(["builtin-a", "s1"]);
    expect(out[0].label).toBe("Metro 2033 (fourni)");
    expect(out[1].label).toBe("Mon système");
    expect(out[0].name).toBe("Metro 2033");
  });
  it("ignore les entrées sans identifiant ou sans nom, et les listes absentes", () => {
    expect(systemChoices([{ id: "", name: "x" }, { id: "b" }, null], [{ name: "y" }, 4])).toEqual([]);
    expect(systemChoices(null, undefined)).toEqual([]);
  });
});

describe("splitCampaignForm", () => {
  it("retire sheet_system des champs de la campagne", () => {
    const out = splitCampaignForm({ name: "A", system: "D&D", summary: "", universe_type: "arcanes", sheet_system: "builtin-dnd-5" });
    expect(out.sheetSystemId).toBe("builtin-dnd-5");
    expect(out.fields).toEqual({ name: "A", system: "D&D", summary: "", universe_type: "arcanes" });
    expect("sheet_system" in out.fields).toBe(false);
  });
  it("aucun système : chaîne vide, absent ou « none »", () => {
    expect(splitCampaignForm({ name: "A" }).sheetSystemId).toBe("");
    expect(splitCampaignForm({ name: "A", sheet_system: "" }).sheetSystemId).toBe("");
    expect(splitCampaignForm({ name: "A", sheet_system: NO_SYSTEM }).sheetSystemId).toBe("");
  });
  it("accepte un formulaire absent", () => {
    expect(splitCampaignForm(null)).toEqual({ fields: {}, sheetSystemId: "" });
  });
});

describe("chosenSystemNotice", () => {
  it("nomme le système, et rappelle d'importer la feuille s'il a des positions", () => {
    expect(chosenSystemNotice({ name: "Metro 2033", zones: 45 })).toContain("« Metro 2033 »");
    expect(chosenSystemNotice({ name: "Metro 2033", zones: 45 })).toContain("Fond de feuille");
  });
  it("sans positions, pas de rappel", () => {
    expect(chosenSystemNotice({ name: "Maison", zones: 0 })).toBe("Modèle de fiche « Maison » appliqué.");
    expect(chosenSystemNotice(null)).toBe("Modèle de fiche appliqué.");
  });
});
