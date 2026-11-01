// Registre central des polices (EXG-44). Toutes sont embarquées (paquets Fontsource), aucune n'est chargée depuis Internet.
// `weights` : seules graisses importées (EXG-40). `displayWeight` : graisse des titres (EXG-41) ; une police à une seule
// graisse n'a jamais de gras artificiel. Module pur.

/** @typedef {{ id: string, family: string, role: "title" | "body" | "mono", weights: number[], displayWeight: number, fallback: string, pkg?: string, tolerated?: string }} FontEntry */

const SERIF = "ui-serif, Georgia, serif";
const SANS = "ui-sans-serif, system-ui, sans-serif";

/** @type {FontEntry[]} */
export const FONTS = [
  { id: "cinzel", family: "Cinzel", role: "title", weights: [600, 700], displayWeight: 700, fallback: SERIF },
  { id: "almendra", family: "Almendra", role: "title", weights: [400, 700], displayWeight: 700, fallback: SERIF },
  { id: "im-fell-english", family: "IM Fell English", role: "title", weights: [400], displayWeight: 400, fallback: SERIF },
  { id: "playfair-display", family: "Playfair Display", role: "title", weights: [600, 700], displayWeight: 700, fallback: SERIF },
  { id: "chakra-petch", family: "Chakra Petch", role: "title", weights: [600, 700], displayWeight: 700, fallback: SANS },
  { id: "orbitron", family: "Orbitron", role: "title", tolerated: "«»‹›", weights: [600, 700], displayWeight: 700, fallback: SANS },
  { id: "pirata-one", family: "Pirata One", role: "title", weights: [400], displayWeight: 400, fallback: SERIF },
  { id: "inter", family: "Inter", role: "body", weights: [400, 500, 600], displayWeight: 400, fallback: SANS },
  { id: "atkinson", pkg: "atkinson-hyperlegible", family: "Atkinson Hyperlegible", role: "body", weights: [400, 700], displayWeight: 400, fallback: SANS },
  { id: "jetbrains-mono", family: "JetBrains Mono", role: "mono", weights: [400, 500], displayWeight: 400, fallback: "ui-monospace, SFMono-Regular, Menlo, monospace" },
];

export const fontById = (id) => FONTS.find((font) => font.id === id) || null;
export const TITLE_FONT_IDS = FONTS.filter((font) => font.role === "title").map((font) => font.id);
export const BODY_FONT_IDS = FONTS.filter((font) => font.role === "body").map((font) => font.id);

/** Valeur CSS d'une famille avec sa pile de repli (EXG-43). */
export const fontStack = (id) => {
  const font = fontById(id);
  return font ? `'${font.family}', ${font.fallback}` : null;
};

/** Nom du paquet Fontsource d'une police. */
export const fontPackage = (font) => font.pkg || font.id;
