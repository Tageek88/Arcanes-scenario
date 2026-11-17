// Game systems shipped with the application (no artwork: only names, links, rules and a layout).
// A shipped system has the same shape as a saved one ({ id, name, description, data }) plus `builtin: true`;
// the user copies it into a campaign or into their own systems, then adapts it freely.

import { DND5_SYSTEM } from "@/lib/meta/builtinDnd5.js";

const ATTRIBUTES = {
  Vigueur: ["Bricolage", "Corps à corps", "Endurance"],
  Agilité: ["Furtivité", "Réaction", "Tir"],
  Empathie: ["Analyse", "Manipulation", "Soins"],
  Esprit: ["Observation", "Compréhension", "Survie"],
};

const metroCharacteristics = () =>
  Object.entries(ATTRIBUTES).flatMap(([attribute, skills]) => [
    // Le maximum de l'attribut sert de jauge : la valeur courante baisse quand le personnage est blessé.
    { name: attribute, field_names: ["Maximum"] },
    ...skills.map((name) => ({ name, field_names: [], parent: attribute })),
  ]);

const track = (id, name, count) => ({ id, name, count });
const field = (id, name, long = false) => ({ id, name, long });

const METRO_TRACKS = [
  track("stress", "Stress", 5),
  track("sang-froid", "Sang-froid", 7),
  track("radiations", "Radiations", 10),
  track("affame", "Affamé", 1),
  track("deshydrate", "Déshydraté", 1),
  track("epuise", "Épuisé", 1),
  track("gele", "Gelé", 1),
  track("eau", "Eau", 10),
  track("nourriture", "Nourriture", 10),
  track("filtres", "Filtres", 10),
  track("energie", "Énergie", 10),
];

const METRO_TEXT_FIELDS = [
  field("archetype", "Archétype"),
  field("age", "Âge"),
  field("experience", "Expérience"),
  field("fierte", "Fierté"),
  field("honte", "Honte"),
  field("apparence", "Apparence"),
  field("protection-max", "Protection max"),
  field("protection", "Protection actuelle"),
  field("camarade", "Camarade"),
  field("pote", "Pote"),
  field("rival", "Rival"),
  field("blessures", "Blessures critiques", true),
  field("traumatismes", "Traumatismes psychiques", true),
  field("notes", "Notes", true),
];

const METRO_LAYOUT = {
  id: "metro",
  name: "Feuille Metro 2033",
  columns: 2,
  blocks: [
    { id: "identite", kind: "texts", title: "Identité", wide: true, ids: ["archetype", "age", "experience", "fierte", "honte", "apparence"] },
    { id: "vigueur", kind: "stat-group", stat: "Vigueur" },
    { id: "agilite", kind: "stat-group", stat: "Agilité" },
    { id: "empathie", kind: "stat-group", stat: "Empathie" },
    { id: "esprit", kind: "stat-group", stat: "Esprit" },
    { id: "pistes", kind: "tracks", title: "Stress, sang-froid, radiations", wide: true, ids: ["stress", "sang-froid", "radiations"] },
    { id: "etats", kind: "tracks", title: "États", ids: ["affame", "deshydrate", "epuise", "gele"] },
    { id: "consommables", kind: "tracks", title: "Consommables", ids: ["eau", "nourriture", "filtres", "energie"] },
    { id: "protection", kind: "texts", title: "Protection", ids: ["protection-max", "protection"] },
    { id: "liens", kind: "texts", title: "Liens", ids: ["camarade", "pote", "rival"] },
    { id: "suite", kind: "texts", title: "Talents, blessures et notes", wide: true, ids: ["blessures", "traumatismes", "notes"] },
  ],
};

// Positions des valeurs sur la feuille officielle (fractions de page) : elles ne contiennent aucune illustration,
// chacun importe sa propre feuille comme fond (voir « Fond de feuille »).
const METRO_ZONES = [
  { id: "zb360c85f503d", kind: "stat", ref: "Vigueur", field: "Maximum", page: 0, x: 0.487, y: 0.4136, w: 0.0295, h: 0.03, size: 1.6 },
  { id: "za622f0493891", kind: "stat", ref: "Bricolage", page: 0, x: 0.3978, y: 0.3454, w: 0.0248, h: 0.0315, size: 1.6 },
  { id: "zb3d806b5d9b0", kind: "stat", ref: "Corps à corps", page: 0, x: 0.4894, y: 0.3044, w: 0.0248, h: 0.03, size: 1.6 },
  { id: "z2f53321bde6f", kind: "stat", ref: "Endurance", page: 0, x: 0.5811, y: 0.3469, w: 0.0271, h: 0.0346, size: 1.6 },
  { id: "z73ce9e33ddb8", kind: "stat", ref: "Agilité", field: "Maximum", page: 0, x: 0.5469, y: 0.4835, w: 0.0248, h: 0.033, size: 1.6 },
  { id: "zfc40614a4c33", kind: "stat", ref: "Furtivité", page: 0, x: 0.6457, y: 0.4334, w: 0.0248, h: 0.03, size: 1.6 },
  { id: "z578fe0adf6c7", kind: "stat", ref: "Réaction", page: 0, x: 0.6857, y: 0.4835, w: 0.0294, h: 0.0315, size: 1.6 },
  { id: "zb965a7c453b9", kind: "stat", ref: "Tir", page: 0, x: 0.6421, y: 0.5336, w: 0.0318, h: 0.0361, size: 1.6 },
  { id: "z63f8759eba66", kind: "stat", ref: "Empathie", field: "Maximum", page: 0, x: 0.4882, y: 0.5563, w: 0.0271, h: 0.03, size: 1.6 },
  { id: "ze6fd26d742a9", kind: "stat", ref: "Analyse", page: 0, x: 0.3965, y: 0.6216, w: 0.0283, h: 0.03, size: 1.6 },
  { id: "zc88944f4b9fe", kind: "stat", ref: "Manipulation", page: 0, x: 0.4894, y: 0.6626, w: 0.0236, h: 0.0346, size: 1.6 },
  { id: "zcf197a7886bd", kind: "stat", ref: "Soins", page: 0, x: 0.5799, y: 0.6246, w: 0.0248, h: 0.03, size: 1.6 },
  { id: "z48c69b8db8b7", kind: "stat", ref: "Esprit", field: "Maximum", page: 0, x: 0.4295, y: 0.4835, w: 0.0283, h: 0.0361, size: 1.6 },
  { id: "z794894a30b15", kind: "stat", ref: "Observation", page: 0, x: 0.2908, y: 0.4819, w: 0.0248, h: 0.033, size: 1.6 },
  { id: "z240e20f37bb2", kind: "stat", ref: "Compréhension", page: 0, x: 0.3307, y: 0.4319, w: 0.0236, h: 0.0346, size: 1.6 },
  { id: "zc80d6655200e", kind: "stat", ref: "Survie", page: 0, x: 0.3296, y: 0.5366, w: 0.0259, h: 0.03, size: 1.6 },
  { id: "z0ea1f12512a0", kind: "text", ref: "archetype", page: 0, x: 0.5066, y: 0.0327, w: 0.1489, h: 0.0315, size: 1.6 },
  { id: "z2df9962c79f9", kind: "text", ref: "age", page: 0, x: 0.3491, y: 0.0828, w: 0.1454, h: 0.027, size: 1.6 },
  { id: "z4227593d3fa2", kind: "text", ref: "experience", page: 0, x: 0.5043, y: 0.0874, w: 0.1466, h: 0.0239, size: 1.6 },
  { id: "z3bf91b0bdadb", kind: "text", ref: "fierte", page: 0, x: 0.3503, y: 0.139, w: 0.25, h: 0.03, size: 1.6 },
  { id: "ze1c6be2bb98d", kind: "text", ref: "honte", page: 0, x: 0.348, y: 0.1921, w: 0.25, h: 0.03, size: 1.6 },
  { id: "z4ef291cef6c8", kind: "text", ref: "apparence", page: 0, x: 0.3468, y: 0.2406, w: 0.25, h: 0.03, size: 1.6 },
  { id: "z755173bb11ee", kind: "text", ref: "camarade", page: 0, x: 0.0777, y: 0.2406, w: 0.25, h: 0.03, size: 1.6 },
  { id: "z577ee175160c", kind: "text", ref: "pote", page: 0, x: 0.0554, y: 0.189, w: 0.25, h: 0.03, size: 1.6 },
  { id: "z7fc6c9a2ee30", kind: "text", ref: "rival", page: 0, x: 0.0601, y: 0.268, w: 0.25, h: 0.03, size: 1.6 },
  { id: "z0eb1e9f72ac3", kind: "text", ref: "blessures", page: 0, x: 0.7759, y: 0.5538, w: 0.2073, h: 0.0563, size: 1.6 },
  { id: "zda27a0eae48e", kind: "text", ref: "traumatismes", page: 0, x: 0.7795, y: 0.6297, w: 0.2014, h: 0.073, size: 1.6 },
  { id: "z8b1b2173a897", kind: "text", ref: "notes", page: 0, x: 0.6302, y: 0.8437, w: 0.3471, h: 0.1276, size: 1.6 },
  { id: "z9b1c60991cca", kind: "track", ref: "stress", page: 0, x: 0.7835, y: 0.5093, w: 0.0884, h: 0.03, size: 1.6 },
  { id: "zb86887e22a80", kind: "track", ref: "sang-froid", page: 0, x: 0.8748, y: 0.5093, w: 0.1119, h: 0.0391, size: 1.6 },
  { id: "z2c0c8a603233", kind: "track", ref: "radiations", page: 0, x: 0.7964, y: 0.4668, w: 0.166, h: 0.033, size: 1.6 },
  { id: "z40d83d4cbbbe", kind: "track", ref: "affame", page: 0, x: 0.7924, y: 0.4152, w: 0.0285, h: 0.03, size: 1.6 },
  { id: "z53a845ab2965", kind: "track", ref: "deshydrate", page: 0, x: 0.8536, y: 0.4137, w: 0.0297, h: 0.0315, size: 1.6 },
  { id: "z4f44c99a970d", kind: "track", ref: "epuise", page: 0, x: 0.9146, y: 0.4137, w: 0.0297, h: 0.033, size: 1.6 },
  { id: "z5f88a755ff8f", kind: "track", ref: "gele", page: 0, x: 0.9605, y: 0.4152, w: 0.032, h: 0.0391, size: 1.6 },
  { id: "z974cc4ba3e04", kind: "track", ref: "eau", page: 0, x: 0.7537, y: 0.2726, w: 0.0849, h: 0.0452, size: 1.6 },
  { id: "z0d24f3e3ada4", kind: "track", ref: "nourriture", page: 0, x: 0.8359, y: 0.2725, w: 0.0825, h: 0.0512, size: 1.6 },
  { id: "z56b3e782f098", kind: "track", ref: "filtres", page: 0, x: 0.7536, y: 0.318, w: 0.0861, h: 0.0528, size: 1.6 },
  { id: "zc214829d8010", kind: "track", ref: "energie", page: 0, x: 0.8353, y: 0.3195, w: 0.0802, h: 0.0527, size: 1.6 },
  { id: "z1146161624d5", kind: "info", ref: "name", page: 0, x: 0.3456, y: 0.0342, w: 0.1548, h: 0.027, size: 1.6 },
  { id: "z2cbfb5c0eda5", kind: "info", ref: "skills", page: 0, x: 0.6901, y: 0.0395, w: 0.2884, h: 0.1652, size: 1.6 },
  { id: "z22219f8a1ba4", kind: "info", ref: "inventory", page: 0, x: 0.0262, y: 0.6026, w: 0.1979, h: 0.0923, size: 1.6 },
  { id: "z64dd4840adae", kind: "info", ref: "weapons", page: 0, x: 0.0262, y: 0.7574, w: 0.5704, h: 0.2122, size: 1.6 },
  { id: "za8d2f8ff7f48", kind: "info", ref: "protections", page: 0, x: 0.6294, y: 0.7482, w: 0.353, h: 0.0438, size: 1.6 },
  { id: "z03a529d4dc66", kind: "info", ref: "equipment", page: 0, x: 0.0403, y: 0.3552, w: 0.1779, h: 0.2137, size: 1.6 },
];

export const BUILTIN_SYSTEMS = [
  {
    id: "builtin-metro-2033",
    builtin: true,
    name: "Metro 2033",
    description:
      "4 attributs et 12 compétences liées (réserve de d6, seul un 6 réussit), pistes de cases (stress, sang-froid, radiations, états, consommables) et feuille en deux colonnes. Sans illustration : importez votre propre feuille comme fond, les valeurs se placent toutes seules.",
    data: {
      characteristics: metroCharacteristics(),
      skillRollModifier: false,
      scale: { levels: [] },
      pc_scale: { ranges: {}, skills: null, equipment: null },
      dice: {
        enabled: true,
        mode: "single",
        rule: "pool",
        single: { count: 1, sides: 6 },
        perStat: {},
        crit: { success: null, failure: null },
        outcome: "success",
        difficulty: 6,
      },
      tracks: METRO_TRACKS,
      textFields: METRO_TEXT_FIELDS,
      layouts: [METRO_LAYOUT],
      layoutId: "metro",
      zones: METRO_ZONES,
      skills: [],
      equipment: [],
    },
  },
  DND5_SYSTEM,
];

/** A shipped system by id, or null. */
export const getBuiltinSystem = (id) => BUILTIN_SYSTEMS.find((system) => system.id === id) || null;
