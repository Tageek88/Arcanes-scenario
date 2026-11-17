import { describe, expect, it } from "vitest";
import { builtinIdFromPath, loadBuiltinSystems } from "@/lib/meta/builtinFiles.js";

const file = (name, extra = {}) =>
  JSON.stringify({
    app: "arcanes-scenario",
    kind: "game-system",
    format: 1,
    name,
    description: "d",
    data: {
      characteristics: [{ name: "Force", field_names: [] }],
      skills: [{ name: "Escalade", roll_modifier: "" }],
      equipment: [{ name: "Corde", type: "", field_names: [], fields: [] }],
      ...extra,
    },
  });

describe("systèmes fournis depuis des fichiers", () => {
  it("l'identifiant vient du nom du fichier", () => {
    expect(builtinIdFromPath("../../data/systems/metro-2033.json")).toBe("builtin-metro-2033");
    expect(builtinIdFromPath("../../data/systems/Mon Système 5.json")).toBe("builtin-mon-systeme-5");
    expect(builtinIdFromPath("../../data/systems/.json")).toBe("");
  });

  it("un fichier valide devient un système fourni, sans compétences ni équipements", () => {
    const { systems, problems } = loadBuiltinSystems({ "x/test.json": file("Test") });
    expect(problems).toEqual([]);
    expect(systems).toHaveLength(1);
    expect(systems[0].id).toBe("builtin-test");
    expect(systems[0].builtin).toBe(true);
    expect(systems[0].name).toBe("Test");
    expect(systems[0].data.skills).toEqual([]);
    expect(systems[0].data.equipment).toEqual([]);
    expect(systems[0].data.characteristics).toHaveLength(1);
  });

  it("un fichier invalide est signalé sans bloquer les autres", () => {
    const { systems, problems } = loadBuiltinSystems({ "x/bon.json": file("Bon"), "x/mauvais.json": "pas du json" });
    expect(systems.map((system) => system.id)).toEqual(["builtin-bon"]);
    expect(problems).toHaveLength(1);
    expect(problems[0].startsWith("x/mauvais.json")).toBe(true);
  });

  it("deux fichiers qui donnent le même identifiant : le second est refusé", () => {
    const { systems, problems } = loadBuiltinSystems({ "x/a.json": file("A"), "x/A.json": file("A bis") });
    expect(systems).toHaveLength(1);
    expect(problems).toHaveLength(1);
  });

  it("les éléments que le modèle ne retient pas sont signalés", () => {
    const { problems } = loadBuiltinSystems({ "x/test.json": file("Test", { tracks: [{ id: "", name: "", count: 0 }] }) });
    expect(problems.length > 0).toBe(true);
  });
});
