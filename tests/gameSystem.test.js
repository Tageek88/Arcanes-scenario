import { describe, expect, it } from "vitest";
import {
  MAX_CHARACTERISTICS,
  MAX_SYSTEM_FILE_BYTES,
  SYSTEM_FORMAT,
  cleanCharacteristics,
  cleanSystemData,
  cleanSystemInfo,
  describeSystem,
  exportSystemFile,
  parseSystemFile,
  systemFileName,
} from "@/lib/meta/gameSystem.js";

const DATA = {
  characteristics: [
    { name: "Vigueur", field_names: [] },
    { name: "Endurance", field_names: ["Notes"], parent: "Vigueur" },
    { name: "Agilité", field_names: [] },
  ],
  skillRollModifier: false,
  scale: { levels: [] },
  pc_scale: { ranges: {}, skills: null, equipment: null },
  dice: { enabled: true, mode: "single", rule: "pool", single: { count: 1, sides: 6 }, perStat: {}, crit: {}, outcome: "success", difficulty: 6 },
  tracks: [{ id: "t1", name: "Stress", count: 5 }],
  textFields: [{ id: "x1", name: "Archétype", long: false }],
  layouts: [{ id: "l1", name: "Metro", columns: 2, blocks: [{ id: "g1", kind: "stat-group", stat: "Vigueur" }] }],
  layoutId: "l1",
};
const SYSTEM = { name: "Metro 2033", description: "Survie", data: DATA };

describe("cleanCharacteristics", () => {
  it("garde les noms, retire les doublons (casse comprise) et les liens inutilisables", () => {
    const out = cleanCharacteristics([
      { name: " Vigueur " },
      { name: "vigueur" },
      { name: "Endurance", parent: "Vigueur" },
      { name: "Tir", parent: "Inconnue" },
      { name: "" },
    ]);
    expect(out.map((item) => item.name)).toEqual(["Vigueur", "Endurance", "Tir"]);
    expect(out[1].parent).toBe("Vigueur");
    expect(out[2].parent).toBeUndefined();
  });

  it("borne le nombre de caractéristiques et tolère une valeur qui n'est pas une liste", () => {
    const many = Array.from({ length: MAX_CHARACTERISTICS + 5 }, (_, i) => ({ name: `C${i}` }));
    expect(cleanCharacteristics(many)).toHaveLength(MAX_CHARACTERISTICS);
    expect(cleanCharacteristics(null)).toEqual([]);
  });
});

describe("cleanSystemData", () => {
  it("renvoie toujours toutes les clés, même pour une valeur vide", () => {
    const out = cleanSystemData(null);
    expect(Object.keys(out).sort()).toEqual(
      ["characteristics", "dice", "layoutId", "layouts", "pc_scale", "scale", "skillRollModifier", "textFields", "tracks"]
    );
    expect(out.characteristics).toEqual([]);
    expect(out.dice).toBeNull();
  });

  it("garde un système complet à l'identique", () => {
    const out = cleanSystemData(DATA);
    expect(out.characteristics).toEqual(DATA.characteristics);
    expect(out.tracks).toEqual(DATA.tracks);
    expect(out.textFields).toEqual(DATA.textFields);
    expect(out.layouts[0].blocks[0].stat).toBe("Vigueur");
    expect(out.layoutId).toBe("l1");
    expect(out.dice.rule).toBe("pool");
  });

  it("lit pcScale comme pc_scale, et ignore les clés inconnues", () => {
    const out = cleanSystemData({ ...DATA, pc_scale: undefined, pcScale: { ranges: { Vigueur: { min: 1, max: 4 } } }, secret: "x" });
    expect(out.pc_scale.ranges.Vigueur).toBeDefined();
    expect(out.secret).toBeUndefined();
  });

  it("retire d'une mise en page un groupe dont la caractéristique n'existe plus", () => {
    const out = cleanSystemData({ ...DATA, characteristics: [{ name: "Agilité" }] });
    expect(out.layouts[0].blocks).toEqual([]);
  });

  it("revient à la mise en page par défaut si celle choisie n'existe plus", () => {
    expect(cleanSystemData({ ...DATA, layoutId: "zz" }).layoutId).toBe("");
  });
});

describe("cleanSystemInfo et describeSystem", () => {
  it("donne toujours un nom et borne la description", () => {
    expect(cleanSystemInfo({ name: "  " }).name).toBe("Système sans nom");
    expect(cleanSystemInfo({ name: " A ", description: "z".repeat(900) }).description).toHaveLength(500);
  });

  it("compte ce que contient un système", () => {
    expect(describeSystem(SYSTEM)).toEqual({ stats: 3, links: 1, tracks: 1, textFields: 1, layouts: 1, hasDice: true });
  });
});

describe("fichier de système", () => {
  it("un export se relit à l'identique", () => {
    const back = parseSystemFile(exportSystemFile(SYSTEM));
    expect(back.ok).toBe(true);
    expect(back.issues).toEqual([]);
    expect(back.system.name).toBe("Metro 2033");
    expect(back.system.description).toBe("Survie");
    expect(back.system.data).toEqual(cleanSystemData(DATA));
  });

  it("refuse ce qui n'est pas un système, sans lever d'erreur", () => {
    expect(parseSystemFile("pas du json").ok).toBe(false);
    expect(parseSystemFile("[]").ok).toBe(false);
    expect(parseSystemFile(JSON.stringify({ app: "autre", kind: "game-system", format: 1, data: DATA })).ok).toBe(false);
    expect(parseSystemFile(JSON.stringify({ app: "arcanes-scenario", kind: "theme", format: 1, data: DATA })).ok).toBe(false);
  });

  it("refuse un format plus récent, un format absent, un fichier trop gros et un système sans caractéristique", () => {
    const file = (extra) => JSON.stringify({ app: "arcanes-scenario", kind: "game-system", format: 1, name: "X", data: DATA, ...extra });
    expect(parseSystemFile(file({ format: SYSTEM_FORMAT + 1 })).error).toContain("plus récente");
    expect(parseSystemFile(file({ format: undefined })).ok).toBe(false);
    expect(parseSystemFile(file({}), MAX_SYSTEM_FILE_BYTES + 1).ok).toBe(false);
    expect(parseSystemFile(file({ data: { characteristics: [] } })).error).toContain("aucune caractéristique");
    expect(parseSystemFile(file({ data: null })).ok).toBe(false);
  });

  it("signale ce que le nettoyage a retiré", () => {
    const text = JSON.stringify({
      app: "arcanes-scenario",
      kind: "game-system",
      format: 1,
      data: { ...DATA, tracks: [...DATA.tracks, { id: "", name: "" }], textFields: [{ id: "a", name: "" }, { id: "b", name: "" }] },
    });
    const out = parseSystemFile(text);
    expect(out.ok).toBe(true);
    expect(out.issues).toEqual(["1 case à cocher ignorée", "2 champs de texte ignorés"]);
    expect(out.system.name).toBe("Système importé");
  });

  it("le nom du fichier est sûr", () => {
    expect(systemFileName("Métro 2033 / v2")).toBe("arcanes-systeme-metro-2033-v2.json");
    expect(systemFileName("")).toBe("arcanes-systeme-jeu.json");
  });
});
