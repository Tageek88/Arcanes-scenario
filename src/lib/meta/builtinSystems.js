// Game systems shipped with the application (no artwork: only names, links, rules and a layout).
// A shipped system has the same shape as a saved one ({ id, name, description, data }) plus `builtin: true`;
// the user copies it into a campaign or into their own systems, then adapts it freely.

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
  field("talents", "Talents", true),
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
    { id: "suite", kind: "texts", title: "Talents, blessures et notes", wide: true, ids: ["talents", "blessures", "traumatismes", "notes"] },
  ],
};

export const BUILTIN_SYSTEMS = [
  {
    id: "builtin-metro-2033",
    builtin: true,
    name: "Metro 2033",
    description:
      "4 attributs et 12 compétences liées (réserve de d6, seul un 6 réussit), pistes de cases (stress, sang-froid, radiations, états, consommables) et feuille en deux colonnes. Sans illustration : importez votre propre feuille comme fond.",
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
      skills: [],
      equipment: [],
    },
  },
];

/** A shipped system by id, or null. */
export const getBuiltinSystem = (id) => BUILTIN_SYSTEMS.find((system) => system.id === id) || null;
