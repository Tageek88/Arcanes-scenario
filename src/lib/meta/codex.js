export const KIND_META = {
  npc: { entity: "NPC", title: "PNJ", singular: "PNJ", nameLabel: "Nom du PNJ" },
  location: { entity: "Location", title: "Lieux", singular: "Lieu", nameLabel: "Nom du lieu" },
  clue: { entity: "Clue", title: "Indices & infos", singular: "indice ou info", nameLabel: "Intitulé" },
  character: { entity: "GameCharacter", title: "Personnages", singular: "Personnage", nameLabel: "Nom du personnage" },
};

/** Genres proposés pour un PNJ (les identifiants sont ceux des générateurs). */
export const NPC_GENDER_OPTIONS = [
  { id: "male", label: "Masculin" },
  { id: "female", label: "Féminin" },
  { id: "neutral", label: "Neutre" },
];

export const CODEX_TABS = [
  { key: "npc", label: "PNJ", entity: "NPC", linkKey: "npc_ids" },
  { key: "location", label: "Lieux", entity: "Location", linkKey: "location_ids" },
  { key: "clue", label: "Indices & infos", entity: "Clue", linkKey: "clue_ids" },
  { key: "character", label: "Personnages", entity: "GameCharacter", linkKey: "character_ids" },
];

/** @param {"npc" | "location" | "clue"} kind */
export const defaultEntry = (kind) => {
  if (kind === "npc")
    return {
      name: "",
      comment: "",
      role: "",
      description: "",
      attitude: "neutre",
      attachments: [],
      location_id: "",
      gender: "",
      level: "",
      traits: [],
      motivation: "",
      appearance: "",
      characteristics: {},
      skills: [],
    };
  if (kind === "location")
    return { name: "", comment: "", type: "", description: "", attachments: [], parent_id: "" };
  return {
    name: "",
    comment: "",
    description: "",
    location_id: "",
    clue_type: "indice",
    discovered: false,
    known: false,
    used: false,
    attachments: [],
  };
};

// Copie d'un élément pour la duplication : sans identifiant, avec un commentaire vide à remplir.
/**
 * @param {"npc" | "location" | "clue"} kind
 * @param {Record<string, unknown>} source
 * @returns {Record<string, unknown>}
 */
export const duplicateDraft = (kind, source) => {
  const { id, created_date, updated_date, created_by_id, created_by, ...rest } = source;
  return {
    ...rest,
    comment: "",
    ...(kind === "clue" ? { discovered: false, known: false, used: false } : {}),
  };
};
const text = (value) => (typeof value === "string" ? value.trim() : "");
const cell = (value) => (value === undefined || value === null ? "" : String(value));

/**
 * Champs de la fiche détaillée d'un PNJ (genre, niveau, traits, motivation, signe distinctif, caractéristiques,
 * compétences), nettoyés avant enregistrement. Accepte aussi les PNJ créés avant ces champs.
 * @param {Record<string, any>} form
 */
export function npcSheetPayload(form) {
  const characteristics = {};
  const source = form?.characteristics;
  if (source && typeof source === "object" && !Array.isArray(source)) {
    for (const [name, entry] of Object.entries(source)) {
      if (name === "__proto__" || !name.trim()) continue;
      characteristics[name] = {
        value: cell(entry?.value),
        modifier: cell(entry?.modifier),
        test: cell(entry?.test),
        max: cell(entry?.max),
      };
    }
  }
  return {
    gender: NPC_GENDER_OPTIONS.some((option) => option.id === form?.gender) ? form.gender : "",
    level: text(form?.level),
    traits: (Array.isArray(form?.traits) ? form.traits : []).map(text).filter(Boolean),
    motivation: text(form?.motivation),
    appearance: text(form?.appearance),
    characteristics,
    skills: (Array.isArray(form?.skills) ? form.skills : [])
      .filter((skill) => text(skill?.name))
      .map((skill) => ({ name: text(skill.name), roll_modifier: text(skill.roll_modifier) })),
  };
}
