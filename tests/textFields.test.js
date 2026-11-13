import { describe, expect, it } from "vitest";
import {
  MAX_LONG_TEXT,
  MAX_SHORT_TEXT,
  MAX_TEXT_FIELDS,
  cleanTextFields,
  cleanTexts,
  draftToTextFields,
  newTextFieldId,
  setText,
  textFieldsToDraft,
  textRows,
} from "@/lib/meta/textFields.js";

const ARCHETYPE = { id: "x1", name: "Archétype", long: false };
const TALENTS = { id: "x2", name: "Talents", long: true };

describe("cleanTextFields", () => {
  it("garde un champ valide, court par défaut", () => {
    expect(cleanTextFields([{ id: "x1", name: " Archétype " }])).toEqual([ARCHETYPE]);
    expect(cleanTextFields([{ id: "x2", name: "Talents", long: true }])).toEqual([TALENTS]);
  });

  it("retire les champs sans nom ni identifiant, et les identifiants répétés", () => {
    const raw = [
      { id: "a", name: "" },
      { id: "", name: "Sans id" },
      { id: "b", name: "Bon" },
      { id: "b", name: "Doublon" },
      null,
    ];
    expect(cleanTextFields(raw)).toEqual([{ id: "b", name: "Bon", long: false }]);
  });

  it("borne le nombre de champs et tolère une valeur qui n'est pas une liste", () => {
    const many = Array.from({ length: MAX_TEXT_FIELDS + 5 }, (_, i) => ({ id: `i${i}`, name: `C${i}` }));
    expect(cleanTextFields(many)).toHaveLength(MAX_TEXT_FIELDS);
    expect(cleanTextFields(null)).toEqual([]);
  });

  it("passe par le brouillon de l'éditeur sans rien perdre", () => {
    expect(draftToTextFields(textFieldsToDraft([ARCHETYPE, TALENTS]))).toEqual([ARCHETYPE, TALENTS]);
    expect(draftToTextFields([{ id: "n", name: "", long: false }])).toEqual([]);
  });

  it("fabrique des identifiants distincts", () => {
    expect(newTextFieldId()).not.toBe(newTextFieldId());
  });
});

describe("cleanTexts", () => {
  const fields = [ARCHETYPE, TALENTS];

  it("garde les champs connus, sans les textes vides", () => {
    expect(cleanTexts({ x1: "  Stalker ", x2: "", x3: "inconnu" }, fields)).toEqual({ x1: "Stalker" });
  });

  it("un champ court tient sur une ligne et est borné, un champ long garde ses lignes", () => {
    expect(cleanTexts({ x1: "a\nb" }, fields)).toEqual({ x1: "a b" });
    expect(cleanTexts({ x2: "a\r\nb" }, fields)).toEqual({ x2: "a\nb" });
    expect(cleanTexts({ x1: "z".repeat(MAX_SHORT_TEXT + 50) }, fields).x1).toHaveLength(MAX_SHORT_TEXT);
    expect(cleanTexts({ x2: "z".repeat(MAX_LONG_TEXT + 50) }, fields).x2).toHaveLength(MAX_LONG_TEXT);
  });

  it("sans modèle, garde tous les identifiants ; tolère les valeurs qui ne sont pas des objets", () => {
    expect(cleanTexts({ n: "x" })).toEqual({ n: "x" });
    expect(cleanTexts(null, fields)).toEqual({});
    expect(cleanTexts([1], fields)).toEqual({});
  });

  it("renommer un champ (même identifiant) garde le texte", () => {
    expect(cleanTexts({ x1: "Stalker" }, [{ ...ARCHETYPE, name: "Classe" }])).toEqual({ x1: "Stalker" });
  });
});

describe("setText et textRows", () => {
  it("modifie un texte sans toucher à l'original", () => {
    const before = { x1: "a" };
    expect(setText(before, "x2", "b")).toEqual({ x1: "a", x2: "b" });
    expect(before).toEqual({ x1: "a" });
    expect(setText(undefined, "x1", "z")).toEqual({ x1: "z" });
  });

  it("liste les champs du modèle avec le texte de la fiche", () => {
    expect(textRows([ARCHETYPE, TALENTS], { x1: " Stalker ", gone: "x" })).toEqual([
      { ...ARCHETYPE, value: "Stalker" },
      { ...TALENTS, value: "" },
    ]);
    expect(textRows(undefined, { x1: "a" })).toEqual([]);
  });
});
