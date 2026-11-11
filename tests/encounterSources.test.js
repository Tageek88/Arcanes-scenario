import { describe, it, expect } from "vitest";
import { api } from "@/api/localClient";
import {
  ENCOUNTER_LIMITS,
  addFromSources,
  cleanCombatant,
  cleanEncounter,
  cleanSource,
  hpFromCharacteristic,
  numberedNames,
} from "@/lib/meta/encounter";
import { loadEncounterSources } from "@/lib/services/encounters";
import { makeCampaign } from "./helpers";

const encounter = (list = []) => cleanEncounter({ id: "e", campaign_id: "c", title: "T", combatants: list });
const named = (...names) => encounter(names.map((name, index) => ({ id: "x" + index, name })));
const namesOf = (value) => value.combatants.map((combatant) => combatant.name);

describe("rencontre : lien avec une fiche", () => {
  it("cleanSource n'accepte qu'un PNJ ou un personnage avec un identifiant", () => {
    expect(cleanSource({ kind: "npc", id: "n1" })).toEqual({ kind: "npc", id: "n1" });
    expect(cleanSource({ kind: "character", id: "c1" })).toEqual({ kind: "character", id: "c1" });
    expect(cleanSource({ kind: "location", id: "l1" })).toBeNull();
    expect(cleanSource({ kind: "npc", id: "" })).toBeNull();
    expect(cleanSource({ kind: "npc" })).toBeNull();
    expect(cleanSource(null)).toBeNull();
  });

  it("cleanCombatant garde le lien seulement s'il est valide, et ne crée pas de champ sinon", () => {
    expect(cleanCombatant({ id: "a", source: { kind: "npc", id: "n1" } }).source).toEqual({ kind: "npc", id: "n1" });
    expect("source" in cleanCombatant({ id: "a" })).toBe(false);
    expect("source" in cleanCombatant({ id: "a", source: { kind: "x", id: "n1" } })).toBe(false);
  });
});

describe("rencontre : PV depuis une caractéristique", () => {
  const sheet = { characteristics: { PV: { value: "12" }, Force: { value: "abc" }, Zero: { value: "0" }, Mixte: { value: "15/20" } } };

  it("lit le premier nombre de la valeur, sinon null", () => {
    expect(hpFromCharacteristic(sheet, "PV")).toBe(12);
    expect(hpFromCharacteristic(sheet, "Mixte")).toBe(15);
    expect(hpFromCharacteristic(sheet, "Force")).toBeNull();
    expect(hpFromCharacteristic(sheet, "Zero")).toBeNull();
    expect(hpFromCharacteristic(sheet, "Inconnue")).toBeNull();
    expect(hpFromCharacteristic(sheet, "")).toBeNull();
    expect(hpFromCharacteristic(null, "PV")).toBeNull();
    expect(hpFromCharacteristic({ characteristics: [] }, "PV")).toBeNull();
  });
});

describe("rencontre : noms numérotés", () => {
  it("un seul exemplaire et aucun autre du même nom : le nom tel quel", () => {
    expect(numberedNames(encounter(), "Garde", 1)).toEqual(["Garde"]);
  });

  it("plusieurs exemplaires : numérotés à partir de 1", () => {
    expect(numberedNames(encounter(), "Garde", 3)).toEqual(["Garde 1", "Garde 2", "Garde 3"]);
  });

  it("à la suite de ceux déjà présents, un « Garde » seul comptant pour le numéro 1", () => {
    expect(numberedNames(named("Garde"), "Garde", 1)).toEqual(["Garde 2"]);
    expect(numberedNames(named("Garde 1", "Garde 3"), "Garde", 2)).toEqual(["Garde 4", "Garde 5"]);
  });

  it("un autre nom qui commence pareil ne compte pas", () => {
    expect(numberedNames(named("Gardien", "Garde noir"), "Garde", 1)).toEqual(["Garde"]);
  });
});

describe("rencontre : ajout depuis les fiches", () => {
  const entries = [
    { kind: "npc", id: "n1", name: "Garde", hpMax: 8, ids: ["a", "b"] },
    { kind: "character", id: "c1", name: "Mira", hpMax: null, ids: ["m"] },
  ];

  it("ajoute chaque exemplaire avec son lien, ses PV max et sans initiative", () => {
    const next = addFromSources(encounter(), entries);
    expect(namesOf(next)).toEqual(["Garde 1", "Garde 2", "Mira"]);
    expect(next.combatants.map((combatant) => combatant.hp_max)).toEqual([8, 8, null]);
    expect(next.combatants.every((combatant) => combatant.initiative === null)).toBe(true);
    expect(next.combatants[0].source).toEqual({ kind: "npc", id: "n1" });
    expect(next.combatants[2].source).toEqual({ kind: "character", id: "c1" });
  });

  it("donne le même résultat à chaque appel (l'écran et l'enregistrement appliquent le même changement)", () => {
    const start = encounter();
    expect(addFromSources(start, entries)).toEqual(addFromSources(start, entries));
  });

  it("ignore une entrée sans identifiant d'exemplaire et respecte la limite de combattants", () => {
    const start = encounter();
    expect(addFromSources(start, [{ kind: "npc", id: "n1", name: "Garde", ids: [] }])).toEqual(start);
    expect(addFromSources(start, null)).toEqual(start);
    const many = Array.from({ length: ENCOUNTER_LIMITS.combatants - 2 }, (_, index) => ({ id: "f" + index, name: "F" + index }));
    const nearlyFull = encounter(many);
    const added = addFromSources(nearlyFull, [{ kind: "npc", id: "n1", name: "Garde", ids: ["1", "2", "3", "4", "5"] }]);
    expect(added.combatants).toHaveLength(ENCOUNTER_LIMITS.combatants);
  });
});

describe("rencontre : fiches d'une campagne (service)", () => {
  it("loadEncounterSources rend PNJ et personnages allégés et les caractéristiques du modèle", async () => {
    const campaign = await makeCampaign();
    await api.entities.GameSheetModel.create({
      campaign_id: campaign.id,
      characteristics: [{ name: "PV", field_names: [] }, { name: "Force", field_names: [] }],
    });
    await api.entities.NPC.create({ campaign_id: campaign.id, name: "Garde", characteristics: { PV: { value: "8" } }, attachments: [{ name: "a", url: "data:x" }] });
    await api.entities.GameCharacter.create({ campaign_id: campaign.id, name: "Mira" });
    const sources = await loadEncounterSources(campaign.id);
    expect(sources.characteristics).toEqual(["PV", "Force"]);
    expect(sources.characters.map((item) => item.name)).toEqual(["Mira"]);
    expect(sources.npcs).toHaveLength(1);
    expect(Object.keys(sources.npcs[0]).sort()).toEqual(["characteristics", "id", "name"]);
    expect(hpFromCharacteristic(sources.npcs[0], "PV")).toBe(8);
  });

  it("sans campagne ou sans modèle : des listes vides", async () => {
    expect(await loadEncounterSources("")).toEqual({ npcs: [], characters: [], characteristics: [] });
    const campaign = await makeCampaign();
    expect(await loadEncounterSources(campaign.id)).toEqual({ npcs: [], characters: [], characteristics: [] });
  });
});
