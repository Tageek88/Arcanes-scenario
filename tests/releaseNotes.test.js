import { describe, it, expect } from "vitest";
import { bulletLead, compareVersions, lightNotes, parseInline, parseReleaseNotes, versionOfPath } from "@/lib/meta/releaseNotes";

const NOTE = `## Arcanes & Scénario 1.7.0

Version centrée sur les notes de MJ.

### Nouveautés

- **Post-it sur les éléments.** Un bouton ouvre les notes.
- Sans gras : une phrase. Puis la suite.

### Installation

- **Windows** : \`npm run dist\`.
`;

describe("notes de version", () => {
  it("lit le numéro de version d'un chemin et trie les versions", () => {
    expect(versionOfPath("/Docs/releases/RELEASE-1.7.0.md")).toBe("1.7.0");
    expect(versionOfPath("/Docs/releases/notes.md")).toBe("");
    expect(["1.6.4", "1.10.0", "1.7.1"].sort((a, b) => compareVersions(b, a))).toEqual(["1.10.0", "1.7.1", "1.6.4"]);
  });

  it("découpe titre, introduction, sections et puces", () => {
    const parsed = parseReleaseNotes(NOTE);
    expect(parsed.title).toBe("Arcanes & Scénario 1.7.0");
    expect(parsed.intro).toEqual(["Version centrée sur les notes de MJ."]);
    expect(parsed.sections.map((s) => s.heading)).toEqual(["Nouveautés", "Installation"]);
    expect(parsed.sections[0].blocks[0].items).toHaveLength(2);
  });

  it("résume : introduction et titres des nouveautés seulement", () => {
    expect(lightNotes(NOTE)).toEqual({
      title: "Arcanes & Scénario 1.7.0",
      intro: "Version centrée sur les notes de MJ.",
      highlights: ["Post-it sur les éléments", "Sans gras : une phrase"],
    });
    expect(bulletLead("**Cadenas.** Le nom se verrouille.")).toBe("Cadenas");
  });

  it("découpe le gras et le code sans rien interpréter d'autre", () => {
    expect(parseInline("a **b** `c` <b>d</b>")).toEqual([
      { type: "text", value: "a " },
      { type: "bold", value: "b" },
      { type: "text", value: " " },
      { type: "code", value: "c" },
      { type: "text", value: " <b>d</b>" },
    ]);
    expect(lightNotes("")).toEqual({ title: "", intro: "", highlights: [] });
  });
});
