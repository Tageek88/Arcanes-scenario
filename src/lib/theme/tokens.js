// Jetons de thème : liste des couleurs, réglages non colorés et valeurs par défaut. Module pur.

/** Jetons de couleur (valeurs « H S% L% »), EXG-11 et nouveaux jetons EXG-12. */
export const COLOR_TOKENS = [
  "background", "foreground", "card", "card-foreground", "popover", "popover-foreground",
  "primary", "primary-foreground", "secondary", "secondary-foreground", "muted", "muted-foreground",
  "accent", "accent-foreground", "destructive", "destructive-foreground", "border", "input", "ring",
  "played", "played-foreground", "key",
  "chart-1", "chart-2", "chart-3", "chart-4", "chart-5",
  "sidebar-background", "sidebar-foreground", "sidebar-primary", "sidebar-primary-foreground",
  "sidebar-accent", "sidebar-accent-foreground", "sidebar-border", "sidebar-ring",
  "warning", "warning-foreground", "icon", "icon-active", "selection",
];

export const RADIUS_VALUES = { none: "0rem", small: "0.25rem", medium: "0.375rem", large: "0.625rem", xl: "1rem" };
export const ICON_STROKES = [1.5, 2, 2.5];
export const PATTERNS = ["dots", "lines", "none"];
export const APPEARANCES = ["dark", "light", "system"];
export const PALETTE_MODES = ["preset", "monochrome", "analogous", "complementary"];
export const ICON_COLORS = ["text", "accent"];
export const TEXT_SCALES = [90, 100, 110, 125];
export const BODY_FONTS = ["inter", "atkinson"];
export const MOTIONS = ["normal", "reduced"];

/** Thème par défaut d'origine (« Arcanes », sombre). */
export const DEFAULT_THEME = Object.freeze({
  version: 1,
  presetId: "arcanes",
  appearance: "dark",
  palette: Object.freeze({ mode: "preset" }),
  overrides: Object.freeze({}),
  titleFont: "cinzel",
  radius: "medium",
  iconStroke: 2,
  pattern: "none",
  iconColor: "text",
});

/** Réglages globaux (EXG-20) : jamais par campagne. */
export const DEFAULT_SETTINGS = Object.freeze({
  id: "global",
  version: 1,
  theme: DEFAULT_THEME,
  textScale: 100,
  bodyFont: "inter",
  motion: "normal",
  gameTableMode: false,
});

export const SETTINGS_ID = "global";
export const BOOT_KEY = "arcanes_theme_boot";
