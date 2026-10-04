export const KIND_META = {
  npc: { entity: "NPC", title: "PNJ", singular: "PNJ", nameLabel: "Nom du PNJ" },
  location: { entity: "Location", title: "Lieux", singular: "Lieu", nameLabel: "Nom du lieu" },
  clue: { entity: "Clue", title: "Indices", singular: "Indice", nameLabel: "Intitulé de l'indice" },
};

export const CODEX_TABS = [
  { key: "npc", label: "PNJ", entity: "NPC", linkKey: "npc_ids" },
  { key: "location", label: "Lieux", entity: "Location", linkKey: "location_ids" },
  { key: "clue", label: "Indices", entity: "Clue", linkKey: "clue_ids" },
];

export const defaultEntry = (kind) => {
if (kind === "npc") return { name: "", role: "", description: "", attitude: "neutre", attachments: [], location_id: "" };
if (kind === "location") return { name: "", type: "", description: "", attachments: [], parent_id: "" };
  return { name: "", description: "", discovered: false, attachments: [] };
};

