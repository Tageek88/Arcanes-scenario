export const KIND_META = {
  npc: { entity: "NPC", title: "PNJ", singular: "PNJ", nameLabel: "Nom du PNJ" },
  location: { entity: "Location", title: "Lieux", singular: "Lieu", nameLabel: "Nom du lieu" },
  clue: { entity: "Clue", title: "Indices & infos", singular: "indice ou info", nameLabel: "Intitulé" },
};

export const CODEX_TABS = [
  { key: "npc", label: "PNJ", entity: "NPC", linkKey: "npc_ids" },
  { key: "location", label: "Lieux", entity: "Location", linkKey: "location_ids" },
  { key: "clue", label: "Indices & infos", entity: "Clue", linkKey: "clue_ids" },
];

/** @param {"npc" | "location" | "clue"} kind */
export const defaultEntry = (kind) => {
  if (kind === "npc")
    return { name: "", comment: "", role: "", description: "", attitude: "neutre", attachments: [], location_id: "" };
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