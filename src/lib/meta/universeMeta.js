export const UNIVERSE_TYPES = [
  { id: "arcanes", label: "Arcanes" },
  { id: "heroic_fantasy", label: "Fantasy héroïque" },
  { id: "cosmic_horror", label: "Horreur cosmique" },
  { id: "gothic", label: "Gothique" },
  { id: "cyberpunk", label: "Cyberpunk" },
  { id: "space_opera", label: "Space opera" },
  { id: "dark_fantasy", label: "Dark fantasy" },
  // --- NOUVEAUX UNIVERS POST-APOCALYPTIQUES ---
  { id: "wasteland_nucleaire", label: "Désert radioactif" },
  { id: "effondrement_climatique", label: "Effondrement climatique" },
  { id: "ruines_technologiques", label: "Ruines technologiques" },
  { id: "peste_et_survie", label: "Peste et survie" },
  { id: "cataclysme_magique", label: "Cataclysme magique" },
  // ---------------------------------------------
  { id: "custom", label: "Personnalisé" },
];

export const DEFAULT_UNIVERSE = "arcanes";

export function getUniverseLabel(id) {
  const universe = UNIVERSE_TYPES.find((u) => u.id === id);
  return universe ? universe.label : "Arcanes";
}