import { describe, expect, it } from "vitest";
import { BUILTIN_PROBLEMS, BUILTIN_SYSTEMS, getBuiltinSystem } from "@/lib/meta/builtinSystems.js";
import { cleanSystemData, describeSystem, parseSystemFile, exportSystemFile } from "@/lib/meta/gameSystem.js";
import { resolveLayout } from "@/lib/meta/layouts.js";
import { cleanZones } from "@/lib/meta/sheetZones.js";

describe("systèmes fournis", () => {
  it("chaque système fourni a un identifiant unique, un nom et le drapeau builtin", () => {
    const ids = BUILTIN_SYSTEMS.map((system) => system.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const system of BUILTIN_SYSTEMS) {
      expect(system.builtin).toBe(true);
      expect(system.name.length > 0).toBe(true);
    }
    expect(getBuiltinSystem("builtin-metro-2033").name).toBe("Metro 2033");
    expect(getBuiltinSystem("zz")).toBeNull();
  });

  it("tous les fichiers de src/data/systems sont lus sans problème, sans compétences ni équipements", () => {
    expect(BUILTIN_PROBLEMS).toEqual([]);
    const ids = BUILTIN_SYSTEMS.map((system) => system.id);
    expect(ids.includes("builtin-metro-2033")).toBe(true);
    expect(ids.includes("builtin-dnd-5")).toBe(true);
    for (const system of BUILTIN_SYSTEMS) {
      expect(system.data.skills).toEqual([]);
      expect(system.data.equipment).toEqual([]);
    }
  });

  it("le nettoyage ne retire rien : les données fournies sont déjà valides", () => {
    for (const system of BUILTIN_SYSTEMS) expect(cleanSystemData(system.data)).toEqual(system.data);
  });

  it("un système fourni passe l'export puis l'import sans rien perdre", () => {
    for (const system of BUILTIN_SYSTEMS) {
      const back = parseSystemFile(exportSystemFile(system));
      expect(back.ok).toBe(true);
      expect(back.issues).toEqual([]);
      expect(back.system.data).toEqual(system.data);
    }
  });
});

describe("Metro 2033", () => {
  const metro = getBuiltinSystem("builtin-metro-2033");

  it("4 attributs et 12 compétences, chacune liée à son attribut", () => {
    const stats = metro.data.characteristics;
    expect(stats).toHaveLength(16);
    expect(stats.filter((item) => !item.parent).map((item) => item.name)).toEqual(["Vigueur", "Agilité", "Empathie", "Esprit"]);
    const endurance = stats.find((item) => item.name === "Endurance");
    expect(endurance.parent).toBe("Vigueur");
    expect(stats.filter((item) => item.parent === "Esprit").map((item) => item.name)).toEqual(["Observation", "Compréhension", "Survie"]);
    expect(describeSystem(metro).links).toBe(12);
  });

  it("réserve de d6 où seul un 6 réussit", () => {
    expect(metro.data.dice.rule).toBe("pool");
    expect(metro.data.dice.single.sides).toBe(6);
    expect(metro.data.dice.difficulty).toBe(6);
  });

  it("pistes : stress 5, sang-froid 7, radiations 10, quatre états à une case, quatre consommables à 10", () => {
    const count = (id) => metro.data.tracks.find((item) => item.id === id).count;
    expect([count("stress"), count("sang-froid"), count("radiations")]).toEqual([5, 7, 10]);
    expect(["affame", "deshydrate", "epuise", "gele"].map(count)).toEqual([1, 1, 1, 1]);
    expect(["eau", "nourriture", "filtres", "energie"].map(count)).toEqual([10, 10, 10, 10]);
  });

  it("les positions de la feuille sont toutes valables pour le modèle (aucune n'est retirée au nettoyage)", () => {
    const { zones } = metro.data;
    expect(zones.length).toBeGreaterThan(0);
    expect(cleanZones(zones, metro.data)).toEqual(zones);
  });

  it("la mise en page montre tout : quatre groupes, et chaque piste et chaque champ une fois", () => {
    const layout = resolveLayout(metro.data.layouts, metro.data.layoutId, metro.data);
    expect(layout.columns).toBe(2);
    expect(layout.blocks.filter((block) => block.kind === "stat-group").map((block) => block.stat)).toEqual(["Vigueur", "Agilité", "Empathie", "Esprit"]);
    expect(layout.blocks.find((block) => block.stat === "Vigueur").children).toEqual(["Bricolage", "Corps à corps", "Endurance"]);
    expect(layout.blocks.some((block) => block.kind === "stats")).toBe(false);
    const shown = (kind, key) => layout.blocks.filter((block) => block.kind === kind).flatMap((block) => block[key].map((item) => item.id));
    expect(shown("tracks", "tracks").sort()).toEqual(metro.data.tracks.map((item) => item.id).sort());
    expect(shown("texts", "fields").sort()).toEqual(metro.data.textFields.map((item) => item.id).sort());
  });
});

describe("Donjons & Dragons 5", () => {
  const dnd = getBuiltinSystem("builtin-dnd-5");

  it("6 caractéristiques, chacune avec sa sauvegarde, et 18 compétences liées à la bonne caractéristique", () => {
    const stats = dnd.data.characteristics;
    expect(stats.filter((item) => !item.parent).map((item) => item.name)).toEqual(["Force", "Dextérité", "Constitution", "Intelligence", "Sagesse", "Charisme"]);
    expect(stats.filter((item) => item.name.startsWith("Sauvegarde de ")).length).toBe(6);
    expect(stats.find((item) => item.name === "Athlétisme").parent).toBe("Force");
    expect(stats.find((item) => item.name === "Escamotage").parent).toBe("Dextérité");
    expect(stats.find((item) => item.name === "Médecine").parent).toBe("Sagesse");
    expect(stats.find((item) => item.name === "Tromperie").parent).toBe("Charisme");
    expect(stats.filter((item) => item.parent === "Intelligence" && !item.name.startsWith("Sauvegarde")).length).toBe(5);
  });

  it("d20 + valeur, 20 et 1 naturels critiques", () => {
    expect(dnd.data.dice.rule).toBe("add");
    expect(dnd.data.dice.single.sides).toBe(20);
    expect(dnd.data.dice.crit).toEqual({ success: 20, failure: 1 });
  });

  it("emplacements de sorts : 4, 3, 3, 3, 3, 2, 2, 1, 1 cases ; jets de mort : 3 et 3", () => {
    const count = (id) => dnd.data.tracks.find((item) => item.id === id).count;
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => count("sorts-" + level))).toEqual([4, 3, 3, 3, 3, 2, 2, 1, 1]);
    expect([count("mort-succes"), count("mort-echecs")]).toEqual([3, 3]);
  });

  it("les positions de la feuille sont toutes valables pour le modèle (aucune n'est retirée au nettoyage)", () => {
    const { zones } = dnd.data;
    expect(zones.length).toBeGreaterThan(0);
    expect(cleanZones(zones, dnd.data)).toEqual(zones);
    expect(new Set(zones.map((zone) => zone.page))).toEqual(new Set([0, 1]));
  });

  it("la mise en page montre tout : six groupes, et chaque piste et chaque champ une fois", () => {
    const layout = resolveLayout(dnd.data.layouts, dnd.data.layoutId, dnd.data);
    expect(layout.columns).toBe(3);
    expect(layout.blocks.filter((block) => block.kind === "stat-group").map((block) => block.stat)).toEqual(["Force", "Dextérité", "Constitution", "Intelligence", "Sagesse", "Charisme"]);
    const shown = (kind, key) => layout.blocks.filter((block) => block.kind === kind).flatMap((block) => block[key].map((item) => item.id));
    expect(shown("tracks", "tracks").sort()).toEqual(dnd.data.tracks.map((item) => item.id).sort());
    expect(shown("texts", "fields").sort()).toEqual(dnd.data.textFields.map((item) => item.id).sort());
  });
});
