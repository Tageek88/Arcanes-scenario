// Résolution d'un thème : jetons de couleur, variables CSS et caches de démarrage. Module pur.
import { hexToTriplet, tripletToHex } from "./color.js";
import { derivePalette } from "./palette.js";
import { fontById, fontStack } from "./fonts.js";
import { gameTableTokens, GAME_TABLE_TEXT_FACTOR } from "./gameTable.js";
import { getPreset } from "./presets.js";
import { COLOR_TOKENS, DEFAULT_SETTINGS, DEFAULT_THEME, RADIUS_VALUES } from "./tokens.js";
import { validateTheme } from "./validate.js";

/** Apparence réellement affichée (« system » suit le système). */
export const resolveAppearance = (appearance, systemDark) => (appearance === "system" ? (systemDark ? "dark" : "light") : appearance === "light" ? "light" : "dark");

/** Jetons de couleur d'un thème pour une apparence donnée (préréglage, palette dérivée, puis réglages avancés). */
export function themeTokens(theme, appearance, { gameTable = false } = {}) {
  const preset = getPreset(theme.presetId);
  let tokens;
  if (theme.palette?.mode && theme.palette.mode !== "preset" && theme.palette.accent) {
    tokens = derivePalette(theme.palette, appearance);
  } else if (preset.tokens[appearance]) {
    tokens = { ...preset.tokens[appearance] };
  } else {
    tokens = derivePalette({ mode: "monochrome", accent: tripletToHex(preset.tokens[preset.native].primary) }, appearance);
  }
  // Réglages avancés : d'abord ceux des deux apparences, puis ceux de l'apparence affichée.
  const own = theme.overrides?.[appearance] || {};
  const shared = Object.fromEntries(Object.entries(theme.overrides || {}).filter(([key]) => key !== "dark" && key !== "light"));
  for (const [token, hex] of Object.entries({ ...shared, ...own })) {
    const triplet = hexToTriplet(hex);
    if (triplet && COLOR_TOKENS.includes(token)) tokens[token] = triplet;
  }
  // Couleur des icônes : « accent » les colore comme les icônes actives.
  if (theme.iconColor === "accent") tokens.icon = tokens["icon-active"];
  // Mode table de jeu : surcouche calculée, le thème enregistré reste intact (EXG-81).
  return gameTable ? gameTableTokens(tokens, appearance) : tokens;
}

/** Variables CSS (« --background » -> « 40 33% 97% ») d'un thème pour une apparence. */
export function themeVars(theme, appearance, options = {}) {
  const tokens = themeTokens(theme, appearance, options);
  const vars = {};
  for (const name of COLOR_TOKENS) if (tokens[name]) vars[`--${name}`] = tokens[name];
  vars["--radius"] = RADIUS_VALUES[theme.radius] || RADIUS_VALUES.medium;
  vars["--icon-stroke"] = String(theme.iconStroke);
  const title = fontStack(theme.titleFont);
  if (title) {
    vars["--font-display"] = title;
    vars["--font-heading"] = title;
    vars["--display-weight"] = String(fontById(theme.titleFont)?.displayWeight ?? 600);
  }
  return vars;
}

/** Variables CSS des réglages globaux (taille du texte, police du texte), EXG-20 et EXG-75. */
export function settingsVars(settings = DEFAULT_SETTINGS) {
  const factor = settings.gameTableMode ? GAME_TABLE_TEXT_FACTOR : 1;
  const vars = { "--text-scale": String(Math.round(((settings.textScale || 100) / 100) * factor * 1000) / 1000) };
  const body = fontStack(settings.bodyFont);
  if (body && settings.bodyFont !== "inter") vars["--font-body"] = body; // Inter : valeur d'origine de index.css
  return vars;
}

/** Attributs posés sur la racine : motif de fond, animations, mode table de jeu. */
export function themeAttributes(theme, settings = DEFAULT_SETTINGS) {
  return {
    "data-pattern": theme.pattern,
    "data-icon-color": theme.iconColor,
    // Le mode table de jeu coupe aussi animations et flou (EXG-80).
    "data-motion": settings.motion === "reduced" || settings.gameTableMode ? "reduced" : "normal",
    "data-game-table": settings.gameTableMode ? "on" : "off",
  };
}

/**
 * Résolution complète : thème validé (EXG-114), apparence, jetons et variables CSS.
 * @param {unknown} theme
 * @param {{ systemDark?: boolean }} [context]
 */
export function resolveTheme(theme, { systemDark = true, settings = DEFAULT_SETTINGS } = {}) {
  const { theme: clean } = validateTheme(theme ?? DEFAULT_THEME);
  const appearance = resolveAppearance(clean.appearance, systemDark);
  const options = { gameTable: !!settings.gameTableMode };
  const tokens = themeTokens(clean, appearance, options);
  return {
    theme: clean,
    appearance,
    tokens,
    vars: { ...themeVars(clean, appearance, options), ...settingsVars(settings) },
    attrs: themeAttributes(clean, settings),
  };
}

/** Cache de démarrage (EXG-111) : les variables des deux apparences, appliquées avant l'affichage de React. */
export function buildBootCache(theme, settings = DEFAULT_SETTINGS) {
  const { theme: clean } = validateTheme(theme ?? DEFAULT_THEME);
  const extra = settingsVars(settings);
  const options = { gameTable: !!settings.gameTableMode };
  return {
    a: clean.appearance,
    d: { ...themeVars(clean, "dark", options), ...extra },
    l: { ...themeVars(clean, "light", options), ...extra },
    t: themeAttributes(clean, settings),
  };
}

/** Couleur de fond de la fenêtre (« #rrggbb ») pour le pont Electron. */
export const windowBackground = (tokens) => tripletToHex(tokens.background);
