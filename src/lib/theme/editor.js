// Opérations de l'éditeur de thème : fonctions pures (sans React) pour pouvoir les tester. Chaque fonction renvoie un
// NOUVEAU thème, jamais le même objet modifié. Un préréglage fourni n'est jamais modifié sur place (EXG-54).
import { hexToTriplet, tripletToHex } from "./color.js";
import { autoFixTokens, CONTRAST_PAIRS, checkTokens } from "./contrast.js";
import { getPreset, presetTheme } from "./presets.js";
import { themeTokens } from "./resolve.js";
import { COLOR_TOKENS } from "./tokens.js";
import { validateTheme } from "./validate.js";

/** Les deux apparences réellement affichables (« system » n'est qu'un choix de l'utilisateur). */
export const APPEARANCE_LIST = ["dark", "light"];
export const APPEARANCE_LABELS = { dark: "sombre", light: "clair" };

/** Cinq pastilles pour la miniature d'un préréglage (EXG-103). */
export function presetSwatches(id) {
  const preset = getPreset(id);
  const tokens = preset.tokens[preset.native];
  return ["background", "card", "primary", "accent", "foreground"].map((token) => tripletToHex(tokens[token]));
}

/** Nom affiché d'un thème : « Fantasy », ou « Fantasy (modifié) » dès qu'on s'écarte du préréglage. */
export function themeLabel(theme) {
  if (!theme) return "Thème par défaut";
  if (theme.presetId === "custom") return "Personnalisé";
  const preset = getPreset(theme.presetId);
  const touched = theme.palette?.mode !== "preset" || Object.keys(theme.overrides || {}).length > 0;
  return touched ? `${preset.name} (modifié)` : preset.name;
}

/** Choisit un préréglage en un clic : tous ses réglages remplacent ceux du brouillon. */
export const choosePreset = (id) => presetTheme(id);

/** Change un réglage simple (apparence, police, rayon, trait, motif, couleur des icônes). */
export const setThemeField = (theme, key, value) => validateTheme({ ...theme, [key]: value }).theme;

/** Active une palette dérivée (monochrome, analogue, complémentaire) ou revient aux couleurs du préréglage. */
export function setPaletteMode(theme, mode) {
  if (mode === "preset") return validateTheme({ ...theme, palette: { mode: "preset" }, overrides: {} }).theme;
  const preset = getPreset(theme.presetId);
  const accent = theme.palette?.accent || tripletToHex(preset.tokens[preset.native].primary);
  return validateTheme({ ...theme, palette: { ...theme.palette, mode, accent }, overrides: {} }).theme;
}

export function setPaletteColor(theme, key, hex) {
  if (key !== "accent" && key !== "background") return theme;
  const palette = { ...theme.palette, [key]: hex };
  if (!hex) delete palette[key];
  return validateTheme({ ...theme, palette }).theme;
}

/** « Dupliquer en thème personnalisé » : détache le thème de son préréglage en gardant ses couleurs d'accent et de fond. */
export function duplicateToCustom(theme) {
  const preset = getPreset(theme.presetId);
  const base = theme.palette?.mode !== "preset" ? theme.palette : { mode: "monochrome", accent: tripletToHex(preset.tokens[preset.native].primary) };
  return validateTheme({ ...theme, presetId: "custom", palette: base }).theme;
}

/** Couleurs actuelles (hex) d'un thème pour une apparence, après palette et réglages avancés. */
export const currentTokens = (theme, appearance) => themeTokens(theme, appearance);

export function setOverride(theme, appearance, token, hex) {
  if (!COLOR_TOKENS.includes(token) || !hexToTriplet(hex)) return theme;
  const overrides = { ...theme.overrides, [appearance]: { ...(theme.overrides?.[appearance] || {}), [token]: hex } };
  return validateTheme({ ...theme, overrides }).theme;
}

export function clearOverride(theme, appearance, token) {
  const own = { ...(theme.overrides?.[appearance] || {}) };
  delete own[token];
  const overrides = { ...theme.overrides, [appearance]: own };
  return validateTheme({ ...theme, overrides }).theme;
}

export const hasOverrides = (theme, appearance) => Object.keys(theme.overrides?.[appearance] || {}).length > 0;

/** Paires de contraste insuffisantes pour chaque apparence (EXG-35). */
export function contrastReport(theme) {
  return APPEARANCE_LIST.map((appearance) => ({
    appearance,
    pairs: checkTokens(themeTokens(theme, appearance)).filter((pair) => !pair.ok),
  }));
}

/** « Corriger automatiquement » : ajuste la luminosité des textes, pour une apparence, via des réglages avancés. */
export function autoFixTheme(theme, appearance) {
  const before = themeTokens(theme, appearance);
  const after = autoFixTokens(before);
  let next = theme;
  for (const token of COLOR_TOKENS) {
    if (after[token] !== before[token]) next = setOverride(next, appearance, token, tripletToHex(after[token]));
  }
  return next;
}

/** Rapports de contraste (jeton -> paires qui le concernent) pour les indicateurs du mode avancé (EXG-105). */
export function pairsByToken(tokens) {
  const result = {};
  for (const pair of checkTokens(tokens)) {
    for (const name of [pair.fg, pair.bg]) (result[name] ||= []).push(pair);
  }
  return result;
}

export { CONTRAST_PAIRS };
