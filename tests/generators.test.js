import { describe, it, expect } from "vitest";
import { createRng } from "@/lib/generators/random";
import { parseValue, checkNpc, exportScale, parseScaleJson, sanitizeScale, emptyScale, hasScale } from "@/lib/generators/npcScale";

describe("tirages au sort", () => {
  it("la même graine donne toujours la même suite", () => {
    const a = createRng("graine");
    const b = createRng("graine");
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
    const c = createRng("autre");
    expect(Array.from({ length: 10 }, () => c.next())).not.toEqual(seqA);
  });

  it("int reste dans les bornes (bornes comprises, même inversées)", () => {
    const rng = createRng(42);
    const seen = new Set();
    for (let i = 0; i < 500; i++) {
      const n = rng.int(5, 2);
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(5);
      seen.add(n);
    }
    expect([...seen].sort()).toEqual([2, 3, 4, 5]);
  });

  it("pick d'une liste vide donne undefined ; shuffle garde les éléments et ne modifie pas l'original", () => {
    const rng = createRng(1);
    expect(rng.pick([])).toBeUndefined();
    const list = [1, 2, 3, 4, 5, 6];
    const mixed = rng.shuffle(list);
    expect(list).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...mixed].sort()).toEqual(list);
  });

  it("chance(0) n'arrive jamais, chance(1) arrive toujours", () => {
    const rng = createRng(7);
    for (let i = 0; i < 100; i++) {
      expect(rng.chance(0)).toBe(false);
      expect(rng.chance(1)).toBe(true);
    }
  });
});

describe("échelle de PNJ", () => {
  it("parseValue ne plante sur aucune entrée", () => {
    for (const raw of ["12", "", null, undefined, "abc", "1d6+2", 7, "  3 "]) {
      expect(() => parseValue(raw)).not.toThrow();
    }
  });

  it("une échelle vide n'est pas une échelle", () => {
    expect(hasScale(emptyScale())).toBe(false);
    expect(hasScale(null)).toBe(false);
  });

  it("export puis import redonne la même échelle", () => {
    const names = ["Force", "Agilité"];
    const scale = sanitizeScale(
      { levels: [{ name: "Faible", ranges: { Force: { min: 1, max: 4 } } }, { name: "Élite", ranges: { Force: { min: 8, max: 12 } } }] },
      names
    );
    const result = parseScaleJson(exportScale(scale), names);
    expect(result.ok).toBe(true);
    expect(result.scale).toEqual(scale);
    expect(result.missingCharacteristics).toEqual(["Agilité"]);
    expect(hasScale(result.scale)).toBe(true);
  });

  it("un fichier invalide est refusé avec un code d'erreur, sans exception", () => {
    expect(parseScaleJson("pas du json {", ["Force"])).toEqual({ ok: false, error: "invalid_json" });
    expect(parseScaleJson(JSON.stringify({ format: "autre" }), [])).toEqual({ ok: false, error: "wrong_format" });
    expect(parseScaleJson("x".repeat(200001), [])).toEqual({ ok: false, error: "too_large" });
  });

  it("sanitizeScale ignore les niveaux sans nom ou en double et limite le nombre de niveaux", () => {
    const levels = [{ name: "A" }, { name: " a " }, { name: "" }, 5, ...Array.from({ length: 20 }, (_, i) => ({ name: `N${i}` }))];
    const cleaned = sanitizeScale({ levels });
    expect(cleaned.levels[0].name).toBe("A");
    expect(cleaned.levels.filter((l) => l.name.toLowerCase() === "a")).toHaveLength(1);
    expect(cleaned.levels.length).toBeLessThanOrEqual(8);
  });

  it("checkNpc ne lève jamais d'erreur, même sans échelle", () => {
    expect(() => checkNpc({ name: "X", level: "Faible" }, null, ["Force"])).not.toThrow();
    expect(() => checkNpc({}, emptyScale(), [])).not.toThrow();
  });
});
