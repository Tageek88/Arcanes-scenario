// src/lib/universeMeta.js
export const UNIVERSE_TYPES = [
  { id: "arcanes", label: "Arcanes" },
  { id: "heroic_fantasy", label: "Fantasy héroïque" },
  { id: "cosmic_horror", label: "Horreur cosmique" },
  { id: "gothic", label: "Gothique" },
  { id: "cyberpunk", label: "Cyberpunk" },
  { id: "space_opera", label: "Space opera" },
  { id: "dark_fantasy", label: "Dark fantasy" },
  { id: "custom", label: "Personnalisé" }
];

export const DEFAULT_UNIVERSE = "arcanes";

export function getUniverseLabel(id) {
  const universe = UNIVERSE_TYPES.find(u => u.id === id);
  return universe ? universe.label : "Arcanes";
}