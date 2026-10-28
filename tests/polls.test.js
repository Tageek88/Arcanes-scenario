import { describe, it, expect } from "vitest";
import { buildPollPayload, parsePlayerNames, validatePollForm } from "@/lib/services/polls/pollForm";

const valid = () => ({
  title: "Séance 5",
  comment: "",
  players: ["Ana", "Ben"],
  slots: [{ date: "12/11/2026", time: "20:00" }, { date: "13/11/2026", time: "20:00" }],
  expiresOn: "13/11/2026",
  timezone: "Europe/Paris",
});

describe("sondages de séance", () => {
  it("parsePlayerNames : une ligne par joueur, espaces nettoyés, lignes vides ignorées", () => {
    expect(parsePlayerNames("  Ana  \r\n\r\nBen   Le  Fou\n")).toEqual(["Ana", "Ben Le Fou"]);
  });

  it("un formulaire correct est accepté", () => {
    expect(validatePollForm(valid())).toBeNull();
  });

  it("refuse un titre vide ou trop long", () => {
    expect(validatePollForm({ ...valid(), title: "  " })?.title).toBe("Titre invalide");
    expect(validatePollForm({ ...valid(), title: "x".repeat(121) })?.title).toBe("Titre invalide");
  });

  it("refuse zéro joueur, trop de joueurs ou un doublon (casse et accents de forme ignorés)", () => {
    const bad = "Liste de joueurs invalide";
    expect(validatePollForm({ ...valid(), players: [] })?.title).toBe(bad);
    expect(validatePollForm({ ...valid(), players: Array.from({ length: 41 }, (_, i) => `J${i}`) })?.title).toBe(bad);
    expect(validatePollForm({ ...valid(), players: ["Ana", " ana "] })?.title).toBe(bad);
  });

  it("refuse moins de deux dates ou une date invalide", () => {
    const bad = "Dates incomplètes ou invalides";
    expect(validatePollForm({ ...valid(), slots: [valid().slots[0]] })?.title).toBe(bad);
    expect(validatePollForm({ ...valid(), slots: [{ date: "31/02/2026", time: "20:00" }, valid().slots[1]] })?.title).toBe(bad);
  });

  it("refuse une date d'expiration invalide", () => {
    expect(validatePollForm({ ...valid(), expiresOn: "n'importe quoi" })?.title).toBe("Date d'expiration invalide");
  });

  it("buildPollPayload convertit les dates en ISO et refuse deux propositions identiques", () => {
    const payload = buildPollPayload(valid());
    expect(payload.slots.map((s) => s.date)).toEqual(["2026-11-12", "2026-11-13"]);
    expect(payload.title).toBe("Séance 5");
    const twice = { ...valid(), slots: [valid().slots[0], { ...valid().slots[0] }] };
    expect(() => buildPollPayload(twice)).toThrow(/uniques/);
  });
});
