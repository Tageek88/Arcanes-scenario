import { describe, it, expect } from "vitest";
import { generatePc, PC_LOCKABLE_FIELDS } from "@/lib/generators/pcGenerator";
import { generatePcForContext } from "@/lib/generators/pcRequest";
import { checkPc, hasPcScale, pcEquipmentCount, pcRanges, pcSkillCount, renamePcScaleCharacteristics, sanitizePcScale } from "@/lib/generators/pcScale";
import { draftToPcScale, pcScaleToDraft } from "@/lib/generators/scaleDraft";

const names = ["Force", "Agilité"];
const skillPool = [{ name: "Escalade" }, { name: "Furtivité", roll_modifier: "+1" }, { name: "escalade" }, { name: "Soin" }, { name: " " }];
const equipmentPool = [
  { name: "Épée", type: "Arme", fieldNames: ["Dégâts"] },
  { name: "Corde", type: "Outil" },
  { name: "Torche" },
  { name: "Torche" },
];
const scale = sanitizePcScale({ ranges: { Force: { min: 14, max: 8 }, Agilité: { min: "9", max: "12" }, Magie: { min: 1, max: 2 } }, skills: { min: 2, max: 3 }, equipment: { min: 2, max: 2 } }, names);
const context = {
  universeId: "arcanes",
  generatorData: {},
  characteristicNames: names,
  characteristicFields: { Force: ["Bonus"] },
  skillPool,
  equipmentPool,
  pcScale: scale,
};

describe("barème des personnages joueurs", () => {
  it("nettoie : bornes remises dans l'ordre, caractéristique inconnue retirée, entrées à moitié saisies abandonnées", () => {
    expect(scale.ranges).toEqual({ Force: { min: 8, max: 14 }, Agilité: { min: 9, max: 12 } });
    expect(scale.skills).toEqual({ min: 2, max: 3 });
    expect(sanitizePcScale({ ranges: { Force: { min: 5 } }, skills: { min: 99, max: 100 } }, names)).toEqual({ ranges: {}, skills: { min: 20, max: 20 }, equipment: null });
    expect(sanitizePcScale("n'importe quoi")).toEqual({ ranges: {}, skills: null, equipment: null });
    expect(hasPcScale(scale)).toBe(true);
    expect(hasPcScale(sanitizePcScale({}))).toBe(false);
  });

  it("donne les plages dans l'ordre du modèle et les nombres attendus", () => {
    expect(pcRanges(scale, ["Agilité", "Force"]).map((r) => r.name)).toEqual(["Agilité", "Force"]);
    expect(pcSkillCount(scale)).toEqual([2, 3]);
    expect(pcEquipmentCount(scale)).toEqual([2, 2]);
    expect(pcSkillCount(sanitizePcScale({}))).toBeUndefined();
  });

  it("contrôle sans jamais bloquer", () => {
    const ok = checkPc({ characteristics: { Force: { value: "10" }, Agilité: { value: "9" } }, skills: [{ name: "a" }, { name: "b" }], equipment: [{ name: "x" }, { name: "y" }] }, scale, names);
    expect(ok).toEqual({ ok: true, issues: [] });
    const bad = checkPc({ characteristics: { Force: { value: "20" }, Agilité: { value: "abc" } }, skills: [], equipment: [{ name: "x" }, { name: "y" }, { name: "z" }] }, scale, names);
    expect(bad.issues.map((i) => i.code)).toEqual(["above_range", "not_numeric", "skills_low", "equipment_high"]);
  });
});

describe("génération d'un personnage joueur", () => {
  it("respecte plages, nombres et catalogues, sans doublons", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const { pc, check } = generatePcForContext(context, { seed });
      expect(pc.name).not.toBe("");
      expect(Number(pc.characteristics.Force.value)).toBeGreaterThanOrEqual(8);
      expect(Number(pc.characteristics.Force.value)).toBeLessThanOrEqual(14);
      expect(pc.characteristics.Force.fields).toEqual([{ name: "Bonus", value: "" }]);
      expect(Number(pc.characteristics.Agilité.value)).toBeGreaterThanOrEqual(9);
      expect(pc.skills.length).toBeGreaterThanOrEqual(2);
      expect(pc.skills.length).toBeLessThanOrEqual(3);
      expect(new Set(pc.skills.map((s) => s.name.toLowerCase())).size).toBe(pc.skills.length);
      expect(pc.equipment).toHaveLength(2);
      expect(new Set(pc.equipment.map((e) => e.name)).size).toBe(2);
      expect(check.ok).toBe(true);
    }
  });

  it("la même graine redonne le même personnage, une autre graine un autre", () => {
    const a = generatePcForContext(context, { seed: "abc" });
    const b = generatePcForContext(context, { seed: "abc" });
    expect(b.pc).toEqual(a.pc);
    expect(generatePcForContext(context, { seed: "def" }).pc).not.toEqual(a.pc);
  });

  it("garde les rubriques verrouillées et change les autres", () => {
    const first = generatePcForContext(context, { seed: 1 });
    expect(PC_LOCKABLE_FIELDS).toEqual(["name", "characteristics", "skills", "equipment"]);
    const second = generatePcForContext(context, {
      seed: 2,
      keep: { name: first.pc.name, characteristics: first.pc.characteristics, skills: first.pc.skills },
    });
    expect(second.pc.name).toBe(first.pc.name);
    expect(second.pc.characteristics).toEqual(first.pc.characteristics);
    expect(second.pc.skills).toEqual(first.pc.skills);
    const fresh = generatePcForContext(context, { seed: 2 });
    expect(second.pc.equipment).toEqual(fresh.pc.equipment);
  });

  it("respecte un genre demandé et reste vide sans modèle ni catalogue", () => {
    const empty = generatePc({ universeId: "arcanes", seed: 7, gender: "female" });
    expect(empty.pc.characteristics).toEqual({});
    expect(empty.pc.skills).toEqual([]);
    expect(empty.pc.equipment).toEqual([]);
    expect(empty.pc.name).not.toBe("");
  });
});

describe("barème des PJ : brouillon et renommage", () => {
  const items = [{ _key: "c1", name: "Force" }, { _key: "c2", name: "Agilité" }];

  it("fait l'aller-retour avec le brouillon de l'éditeur", () => {
    const draft = pcScaleToDraft(scale, items);
    expect(draft.ranges.c1).toEqual({ min: "8", max: "14" });
    expect(draft.skills).toEqual({ min: "2", max: "3" });
    expect(sanitizePcScale(draftToPcScale(draft, items), names)).toEqual(scale);
    const empty = pcScaleToDraft(sanitizePcScale({}), items);
    expect(empty.skills).toEqual({ min: "", max: "" });
    expect(sanitizePcScale(draftToPcScale(empty, items), names)).toEqual({ ranges: {}, skills: null, equipment: null });
  });

  it("abandonne une plage à moitié saisie", () => {
    const draft = { ranges: { c1: { min: "5", max: "" } }, skills: { min: "", max: "" }, equipment: { min: "1", max: "" } };
    expect(sanitizePcScale(draftToPcScale(draft, items), names)).toEqual({ ranges: {}, skills: null, equipment: null });
  });

  it("suit le renommage d'une caractéristique", () => {
    const renamed = renamePcScaleCharacteristics(scale, new Map([["Force", "Puissance"]]));
    expect(renamed.ranges).toEqual({ Puissance: { min: 8, max: 14 }, Agilité: { min: 9, max: 12 } });
    expect(renamed.skills).toEqual({ min: 2, max: 3 });
    const swapped = renamePcScaleCharacteristics(scale, new Map([["Force", "Agilité"], ["Agilité", "Force"]]));
    expect(swapped.ranges).toEqual({ Agilité: { min: 8, max: 14 }, Force: { min: 9, max: 12 } });
  });
});
