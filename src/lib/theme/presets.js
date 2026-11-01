// Thèmes prédéfinis. Un preset fourni n'est jamais modifié sur place : on le copie en thème « personnalisé ».
// Module pur. Les valeurs du thème « Arcanes » reproduisent EXACTEMENT src/index.css (vérifié par check:themes).

import { derivePalette } from "./palette.js";

/** Tous les identifiants acceptés (EXG-50) ; les presets non encore définis retombent sur « Arcanes ». */
export const PRESET_IDS = ["arcanes", "fantasy", "cosmic-horror", "gothic", "cyberpunk", "space-opera", "dark-fantasy", "custom"];

export const ARCANES = {
  id: "arcanes",
  name: "Arcanes",
  native: "dark",
  titleFont: "cinzel",
  radius: "medium",
  iconStroke: 2,
  // La grille de points existe dans index.css (.hex-grid) mais n'est affichée nulle part : « aucun » garde l'aspect d'origine.
  pattern: "none",
  tokens: {
    light: {
      "background": "40 33% 97%",
      "foreground": "220 20% 12%",
      "card": "0 0% 100%",
      "card-foreground": "220 20% 12%",
      "popover": "0 0% 100%",
      "popover-foreground": "220 20% 12%",
      "primary": "38 92% 40%",
      "primary-foreground": "0 0% 100%",
      "secondary": "40 20% 92%",
      "secondary-foreground": "220 20% 14%",
      "muted": "40 20% 93%",
      "muted-foreground": "220 12% 42%",
      "accent": "40 20% 90%",
      "accent-foreground": "220 20% 14%",
      "destructive": "0 72% 46%",
      "destructive-foreground": "0 0% 100%",
      "border": "40 16% 85%",
      "input": "40 16% 82%",
      "ring": "38 92% 40%",
      "played": "158 55% 32%",
      "played-foreground": "0 0% 100%",
      "key": "38 92% 40%",
      "chart-1": "38 92% 45%",
      "chart-2": "158 55% 38%",
      "chart-3": "0 72% 50%",
      "chart-4": "220 12% 42%",
      "chart-5": "40 20% 70%",
      "sidebar-background": "40 28% 95%",
      "sidebar-foreground": "220 18% 20%",
      "sidebar-primary": "38 92% 40%",
      "sidebar-primary-foreground": "0 0% 100%",
      "sidebar-accent": "40 20% 89%",
      "sidebar-accent-foreground": "220 20% 14%",
      "sidebar-border": "40 16% 85%",
      "sidebar-ring": "38 92% 40%",
      "warning": "26 90% 37%",
      "warning-foreground": "0 0% 100%",
      "icon": "220 12% 42%",
      "icon-active": "38 92% 40%",
      "selection": "38 92% 40%",
    },
    dark: {
      "background": "216 16% 6%",
      "foreground": "220 14% 96%",
      "card": "222 19% 11%",
      "card-foreground": "220 14% 96%",
      "popover": "222 19% 11%",
      "popover-foreground": "220 14% 96%",
      "primary": "38 92% 50%",
      "primary-foreground": "216 16% 6%",
      "secondary": "221 17% 18%",
      "secondary-foreground": "220 14% 96%",
      "muted": "221 17% 16%",
      "muted-foreground": "218 11% 65%",
      "accent": "221 17% 18%",
      "accent-foreground": "220 14% 96%",
      "destructive": "0 84% 60%",
      "destructive-foreground": "220 14% 96%",
      "border": "221 17% 18%",
      "input": "221 17% 24%",
      "ring": "38 92% 50%",
      "played": "158 62% 42%",
      "played-foreground": "216 16% 8%",
      "key": "38 92% 50%",
      "chart-1": "38 92% 45%",
      "chart-2": "158 55% 38%",
      "chart-3": "0 72% 50%",
      "chart-4": "220 12% 42%",
      "chart-5": "40 20% 70%",
      "sidebar-background": "222 19% 9%",
      "sidebar-foreground": "220 14% 92%",
      "sidebar-primary": "38 92% 50%",
      "sidebar-primary-foreground": "216 16% 6%",
      "sidebar-accent": "221 17% 16%",
      "sidebar-accent-foreground": "220 14% 96%",
      "sidebar-border": "221 17% 18%",
      "sidebar-ring": "38 92% 50%",
      "warning": "38 92% 50%",
      "warning-foreground": "26 91% 10%",
      "icon": "218 11% 65%",
      "icon-active": "38 92% 50%",
      "selection": "38 92% 50%",
    },
  },
};

/**
 * Les six autres ambiances (EXG-50). Chacune : un accent, un fond clair et un fond sombre (teinte + saturation de l'ambiance),
 * un mode d'harmonie, une police de titre, un rayon, un motif. Les jetons clair/sombre sont calculés par derivePalette :
 * les 21 paires de contraste sont conformes par construction, et vérifiées par `npm run check:themes`.
 */
const SPECS = [
  { id: "fantasy", name: "Fantasy", native: "light", accent: "#2f855a", bgLight: "#f1e8d0", bgDark: "#15120b", mode: "analogous",
    titleFont: "almendra", radius: "large", iconStroke: 2, pattern: "none" },
  { id: "cosmic-horror", name: "Horreur cosmique", native: "dark", accent: "#3fae95", bgLight: "#e3ecea", bgDark: "#091214", mode: "analogous",
    titleFont: "im-fell-english", radius: "small", iconStroke: 1.5, pattern: "lines" },
  { id: "gothic", name: "Gothique", native: "dark", accent: "#b3213a", bgLight: "#eee6e7", bgDark: "#120a0c", mode: "monochrome",
    titleFont: "playfair-display", radius: "none", iconStroke: 1.5, pattern: "none" },
  { id: "cyberpunk", name: "Cyberpunk", native: "dark", accent: "#ff2bd6", bgLight: "#ece6f4", bgDark: "#0d0818", mode: "complementary",
    titleFont: "chakra-petch", radius: "none", iconStroke: 2.5, pattern: "lines" },
  { id: "space-opera", name: "Space opera", native: "dark", accent: "#3b82f6", bgLight: "#e4eaf5", bgDark: "#070b1a", mode: "analogous",
    titleFont: "orbitron", radius: "large", iconStroke: 2, pattern: "dots" },
  { id: "dark-fantasy", name: "Dark fantasy", native: "dark", accent: "#d9531e", bgLight: "#ece7e3", bgDark: "#0f0d0c", mode: "monochrome",
    titleFont: "pirata-one", radius: "small", iconStroke: 2, pattern: "none" },
];

const fromSpec = (spec) => ({
  id: spec.id,
  name: spec.name,
  native: spec.native,
  titleFont: spec.titleFont,
  radius: spec.radius,
  iconStroke: spec.iconStroke,
  pattern: spec.pattern,
  tokens: {
    light: derivePalette({ mode: spec.mode, accent: spec.accent, background: spec.bgLight }, "light"),
    dark: derivePalette({ mode: spec.mode, accent: spec.accent, background: spec.bgDark }, "dark"),
  },
});

/** Presets définis, par identifiant. */
export const PRESETS = { arcanes: ARCANES, ...Object.fromEntries(SPECS.map((spec) => [spec.id, fromSpec(spec)])) };

export const getPreset = (id) => PRESETS[id] || ARCANES;

/** Thème complet (version 1) correspondant à un préréglage : apparence, police, rayon, trait et motif de l'ambiance. */
export const presetTheme = (id) => {
  const preset = getPreset(id);
  return {
    version: 1,
    presetId: preset.id,
    appearance: preset.native,
    palette: { mode: "preset" },
    overrides: {},
    titleFont: preset.titleFont,
    radius: preset.radius,
    iconStroke: preset.iconStroke,
    pattern: preset.pattern,
    iconColor: "text",
  };
};
