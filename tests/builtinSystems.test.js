import { describe, expect, it } from "vitest";
import { BUILTIN_SYSTEMS, getBuiltinSystem } from "@/lib/meta/builtinSystems.js";
import { cleanSystemData, describeSystem, parseSystemFile, exportSystemFile } from "@/lib/meta/gameSystem.js";
import { resolveLayout } from "@/lib/meta/layouts.js";

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
