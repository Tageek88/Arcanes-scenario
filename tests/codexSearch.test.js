import { describe, it, expect } from "vitest";
import { buildSearchEntry, hasFilter, matchesSearch, normalizeSearch, parseSearch, toggleFilter } from "@/lib/services/codexSearch";

const search = (term, entry) => matchesSearch(parseSearch(term), entry);
const npc = buildSearchEntry("npc", { name: "Mira l'Éclaireuse", role: "Garde du corps", traits: ["Loyale", "Têtue"], description: "Cicatrice au front" });

describe("recherche du codex", () => {
  it("ignore accents, majuscules et espaces autour", () => {
    expect(normalizeSearch("  ÉCLAIREUSE ")).toBe("eclaireuse");
  });

  it("texte libre : tous les mots doivent être présents", () => {
    expect(search("eclaireuse", npc)).toBe(true);
    expect(search("cicatrice loyale", npc)).toBe(true);
    expect(search("cicatrice dragon", npc)).toBe(false);
  });

  it("une recherche vide accepte tout", () => {
    expect(search("", npc)).toBe(true);
  });

  it("filtre par rubrique : contient, ou exact entre guillemets", () => {
    expect(search("role:garde", npc)).toBe(true);
    expect(search('role:"garde"', npc)).toBe(false);
    expect(search('role:"Garde du corps"', npc)).toBe(true);
    expect(search("trait:tetue", npc)).toBe(true);
  });

  it("une rubrique inconnue est cherchée comme du texte libre", () => {
    expect(parseSearch("couleur:rouge")).toEqual([{ key: "", value: "couleur:rouge", exact: false }]);
  });

  it("toggleFilter ajoute puis retire un filtre, et hasFilter le voit", () => {
    const added = toggleFilter("mira", "role", "Garde du corps");
    expect(added).toBe('mira role:"Garde du corps"');
    expect(hasFilter(added, "role", "garde du corps")).toBe(true);
    expect(toggleFilter(added, "role", "Garde du corps")).toBe("mira");
    expect(toggleFilter("mira", "role", "  ")).toBe("mira");
  });

  it("un lieu est cherché par son chemin complet", () => {
    const entry = buildSearchEntry(
      "npc",
      { name: "Bran", location_id: "r" },
      { locationLabels: new Map([["r", "Pays › Ville"]]), locationPaths: new Map([["r", ["Pays", "Ville"]]]) }
    );
    expect(search("lieu:ville", entry)).toBe(true);
    expect(search("lieu:pays", entry)).toBe(true);
    expect(search("lieu:village", entry)).toBe(false);
  });

  it("les relations sont cherchées sur le nom de l'autre PNJ", () => {
    const entry = buildSearchEntry("npc", { name: "Bran" }, { relations: [{ label: "Père de", targetName: "Alba" }] });
    expect(search("alba", entry)).toBe(true);
  });
});
