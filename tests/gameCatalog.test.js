import { describe, it, expect } from "vitest";
import { api } from "@/api/localClient";
import { saveCodexEntry } from "@/lib/services/codexEntries";
import { addSheetItemsToCatalog, missingFromCatalog } from "@/lib/services/gameCatalog";
import { all, makeCampaign } from "./helpers";

describe("catalogue du système de jeu : règles", () => {
  it("missingFromCatalog : seulement les noms absents, une fois chacun, sans tenir compte de la casse", () => {
    const items = [{ name: "Épée" }, { name: " épée " }, { name: "Arc" }, { name: "" }, { name: "ARC" }, {}, { name: "Dague" }];
    expect(missingFromCatalog(["arc"], items).map((i) => i.name)).toEqual(["Épée", "Dague"]);
    expect(missingFromCatalog(null, null)).toEqual([]);
  });
});

describe("catalogue du système de jeu : alimentation depuis un PNJ", () => {
  it("ajoute les compétences et équipements manquants, sans toucher aux entrées existantes", async () => {
    const campaign = await makeCampaign();
    await api.entities.SkillCatalog.create({ campaign_id: campaign.id, name: "Discrétion", roll_modifier: "+2" });
    await api.entities.EquipmentCatalog.create({ campaign_id: campaign.id, name: "Dague", type: "Arme", field_names: ["Dégâts"], fields: [{ name: "Dégâts", value: "1d4" }] });

    const result = await addSheetItemsToCatalog(campaign.id, {
      skills: [{ name: "discrétion", roll_modifier: "+5" }, { name: "Escalade", roll_modifier: "+1" }],
      equipment: [
        { name: "Dague", type: "Arme", fields: [{ name: "Dégâts", value: "9" }] },
        { name: "Corde", type: "Outil", fields: [{ name: "Longueur", value: "15 m" }] },
      ],
    });
    expect(result).toEqual({ skills: 1, equipment: 1 });

    const skills = await all("SkillCatalog", campaign.id);
    expect(skills.map((s) => s.name).sort()).toEqual(["Discrétion", "Escalade"]);
    expect(skills.find((s) => s.name === "Discrétion").roll_modifier).toBe("+2");
    const equipment = await all("EquipmentCatalog", campaign.id);
    expect(equipment.find((e) => e.name === "Dague").fields[0].value).toBe("1d4");
    expect(equipment.find((e) => e.name === "Corde")).toMatchObject({ type: "Outil", field_names: ["Longueur"], fields: [{ name: "Longueur", value: "" }] });
  });

  it("est sans effet une seconde fois, et sans campagne", async () => {
    const campaign = await makeCampaign();
    const sheet = { skills: [{ name: "Chant" }], equipment: [{ name: "Luth", type: "Instrument", fields: [] }] };
    expect(await addSheetItemsToCatalog(campaign.id, sheet)).toEqual({ skills: 1, equipment: 1 });
    expect(await addSheetItemsToCatalog(campaign.id, sheet)).toEqual({ skills: 0, equipment: 0 });
    expect(await addSheetItemsToCatalog("", sheet)).toEqual({ skills: 0, equipment: 0 });
    expect(await all("SkillCatalog", campaign.id)).toHaveLength(1);
  });

  it("enregistrer un PNJ (création ou modification) remplit le catalogue", async () => {
    const campaign = await makeCampaign();
    const created = await saveCodexEntry("NPC", undefined, {
      campaign_id: campaign.id,
      name: "Garde",
      skills: [{ name: "Escrime", roll_modifier: "+3", fields: [] }],
      equipment: [{ name: "Hallebarde", type: "Arme", fields: [] }],
    });
    expect((await all("SkillCatalog", campaign.id)).map((s) => s.name)).toEqual(["Escrime"]);
    expect((await all("EquipmentCatalog", campaign.id)).map((e) => e.name)).toEqual(["Hallebarde"]);

    await saveCodexEntry("NPC", created.id, {
      campaign_id: campaign.id,
      name: "Garde",
      skills: [{ name: "Escrime" }, { name: "Vigilance" }],
      equipment: [{ name: "Hallebarde", type: "Arme" }, { name: "Cor", type: "Outil" }],
    });
    expect((await all("SkillCatalog", campaign.id)).map((s) => s.name).sort()).toEqual(["Escrime", "Vigilance"]);
    expect((await all("EquipmentCatalog", campaign.id)).map((e) => e.name).sort()).toEqual(["Cor", "Hallebarde"]);
  });

  it("un lieu ou un indice ne touche pas au catalogue", async () => {
    const campaign = await makeCampaign();
    await saveCodexEntry("Location", undefined, { campaign_id: campaign.id, name: "Auberge", skills: [{ name: "Cuisine" }] });
    expect(await all("SkillCatalog", campaign.id)).toHaveLength(0);
  });

  it("un échec du catalogue n'empêche pas d'enregistrer le PNJ", async () => {
    const campaign = await makeCampaign();
    const original = api.entities.SkillCatalog.filter;
    api.entities.SkillCatalog.filter = async () => {
      throw new Error("panne simulée");
    };
    try {
      const created = await saveCodexEntry("NPC", undefined, { campaign_id: campaign.id, name: "Meunier", skills: [{ name: "Mouture" }] });
      expect((await api.entities.NPC.get(created.id)).name).toBe("Meunier");
    } finally {
      api.entities.SkillCatalog.filter = original;
    }
  });
});
