import { describe, expect, it } from "vitest";
import {
  MAX_CATALOG_ITEMS,
  cleanCatalogEquipment,
  cleanCatalogSkills,
  cleanSystemData,
  exportSystemFile,
  parseSystemFile,
} from "@/lib/meta/gameSystem.js";

describe("compétences du catalogue d'un système", () => {
  it("garde le nom, le modificateur et le lien vers une caractéristique du système", () => {
    const out = cleanCatalogSkills([{ name: " Tir ", roll_modifier: "+1", characteristic: "Agilité" }], ["Agilité"]);
    expect(out).toEqual([{ name: "Tir", roll_modifier: "+1", characteristic: "Agilité" }]);
  });

  it("retire le lien vers une caractéristique inconnue, mais garde la compétence", () => {
    expect(cleanCatalogSkills([{ name: "Tir", characteristic: "Inconnue" }], ["Agilité"])).toEqual([{ name: "Tir", roll_modifier: "" }]);
  });

  it("retire les doublons (casse comprise) et les entrées sans nom, et borne le nombre", () => {
    expect(cleanCatalogSkills([{ name: "Tir" }, { name: "tir" }, { name: "" }], []).map((item) => item.name)).toEqual(["Tir"]);
    const many = Array.from({ length: MAX_CATALOG_ITEMS + 5 }, (_, i) => ({ name: `S${i}` }));
    expect(cleanCatalogSkills(many, [])).toHaveLength(MAX_CATALOG_ITEMS);
    expect(cleanCatalogSkills(null, [])).toEqual([]);
  });
});

describe("équipements du catalogue d'un système", () => {
  it("garde les noms de champs sans leurs valeurs", () => {
    const out = cleanCatalogEquipment([{ name: "Kalash", type: "Arme", fields: [{ name: "Dégâts", value: "3" }, { name: "Portée", value: "" }] }]);
    expect(out).toEqual([
      { name: "Kalash", type: "Arme", field_names: ["Dégâts", "Portée"], fields: [{ name: "Dégâts", value: "" }, { name: "Portée", value: "" }] },
    ]);
  });

  it("préfère field_names, retire les noms répétés et les doublons d'équipement", () => {
    const out = cleanCatalogEquipment([{ name: "Corde", field_names: ["Longueur", "Longueur", ""] }, { name: "corde" }]);
    expect(out).toHaveLength(1);
    expect(out[0].field_names).toEqual(["Longueur"]);
  });
});

describe("catalogues dans un système", () => {
  const data = {
    characteristics: [{ name: "Agilité", field_names: [] }],
    skills: [{ name: "Tir", roll_modifier: "", characteristic: "Agilité" }],
    equipment: [{ name: "Corde", type: "", field_names: [], fields: [] }],
  };

  it("un export se relit à l'identique, catalogues compris", () => {
    const back = parseSystemFile(exportSystemFile({ name: "X", data }));
    expect(back.ok).toBe(true);
    expect(back.issues).toEqual([]);
    expect(back.system.data.skills).toEqual(cleanSystemData(data).skills);
    expect(back.system.data.equipment).toEqual(cleanSystemData(data).equipment);
  });

  it("signale les compétences et équipements ignorés à l'import", () => {
    const file = JSON.stringify({ app: "arcanes-scenario", kind: "game-system", format: 1, data: { ...data, skills: [...data.skills, { name: "" }], equipment: [{ name: "" }, { name: "" }] } });
    expect(parseSystemFile(file).issues).toEqual(["1 compétence ignorée", "2 équipements ignorés"]);
  });

  it("un système ancien, sans catalogues, donne des listes vides", () => {
    const out = cleanSystemData({ characteristics: [{ name: "A" }] });
    expect(out.skills).toEqual([]);
    expect(out.equipment).toEqual([]);
  });
});
