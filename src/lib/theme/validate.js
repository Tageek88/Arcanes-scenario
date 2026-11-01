// Validation (EXG-110, EXG-114) : liste blanche stricte. Jamais de CSS libre ni d'URL. Module pur.
import { isHex } from "./color.js";
import { TITLE_FONT_IDS } from "./fonts.js";
import { PRESET_IDS } from "./presets.js";
import {
  APPEARANCES, BODY_FONTS, COLOR_TOKENS, DEFAULT_SETTINGS, DEFAULT_THEME, ICON_COLORS, ICON_STROKES, MOTIONS,
  PALETTE_MODES, PATTERNS, RADIUS_VALUES, TEXT_SCALES,
} from "./tokens.js";

export const MAX_THEME_FILE_BYTES = 100 * 1024;

const THEME_KEYS = ["version", "presetId", "appearance", "palette", "overrides", "titleFont", "radius", "iconStroke", "pattern", "iconColor"];
const PALETTE_KEYS = ["mode", "accent", "background"];
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * Valide un thème. Ne lève jamais d'erreur : renvoie un thème propre (valeurs invalides remplacées par celles du
 * thème par défaut) et la liste des problèmes à signaler.
 * @param {unknown} input
 * @returns {{ theme: typeof DEFAULT_THEME, issues: { path: string, message: string }[], valid: boolean }}
 */
export function validateTheme(input) {
  const issues = [];
  const flag = (path, message) => issues.push({ path, message });
  if (!isObject(input)) {
    flag("", "Le thème est absent ou illisible : le thème d'origine est utilisé.");
    return { theme: DEFAULT_THEME, issues, valid: false };
  }
  for (const key of Object.keys(input)) {
    if (!THEME_KEYS.includes(key)) flag(key, `Réglage inconnu ignoré : « ${key} ».`);
  }

  const pick = (key, allowed, label) => {
    const value = input[key];
    if (value === undefined) return DEFAULT_THEME[key];
    if (allowed.includes(value)) return value;
    flag(key, `${label} invalide : « ${String(value).slice(0, 40)} ».`);
    return DEFAULT_THEME[key];
  };

  if (input.version !== undefined && input.version !== 1) flag("version", "Version de thème non prise en charge.");

  const theme = {
    version: 1,
    presetId: pick("presetId", PRESET_IDS, "Thème prédéfini"),
    appearance: pick("appearance", APPEARANCES, "Apparence"),
    palette: { mode: "preset" },
    overrides: {},
    titleFont: pick("titleFont", TITLE_FONT_IDS, "Police des titres"),
    radius: pick("radius", Object.keys(RADIUS_VALUES), "Rayon des coins"),
    iconStroke: pick("iconStroke", ICON_STROKES, "Épaisseur des icônes"),
    pattern: pick("pattern", PATTERNS, "Motif de fond"),
    iconColor: pick("iconColor", ICON_COLORS, "Couleur des icônes"),
  };

  if (input.palette !== undefined) {
    if (!isObject(input.palette)) flag("palette", "Palette invalide.");
    else {
      for (const key of Object.keys(input.palette)) {
        if (!PALETTE_KEYS.includes(key)) flag(`palette.${key}`, `Réglage de palette inconnu ignoré : « ${key} ».`);
      }
      const { mode, accent, background } = input.palette;
      if (mode !== undefined && !PALETTE_MODES.includes(mode)) flag("palette.mode", "Mode de palette invalide.");
      else if (mode !== undefined) theme.palette.mode = mode;
      if (accent !== undefined) {
        if (isHex(accent)) theme.palette.accent = accent.toLowerCase();
        else flag("palette.accent", "Couleur d'accent invalide (format attendu : #rrggbb).");
      }
      if (background !== undefined) {
        if (isHex(background)) theme.palette.background = background.toLowerCase();
        else flag("palette.background", "Couleur de fond invalide (format attendu : #rrggbb).");
      }
    }
    // Une palette dérivée sans accent n'a pas de sens : on revient au thème prédéfini.
    if (theme.palette.mode !== "preset" && !theme.palette.accent) {
      flag("palette.accent", "Une palette dérivée demande une couleur d'accent.");
      theme.palette = { mode: "preset" };
    }
  }

  if (input.overrides !== undefined) {
    if (!isObject(input.overrides)) flag("overrides", "Réglages avancés invalides.");
    else {
      // Deux formes : « jeton: #hex » (valable pour les deux apparences) ou « dark / light: { jeton: #hex } ».
      const readColors = (source, path, target) => {
        for (const [token, value] of Object.entries(source)) {
          if (!COLOR_TOKENS.includes(token)) flag(`${path}.${token}`, `Jeton inconnu ignoré : « ${token.slice(0, 40)} ».`);
          else if (!isHex(value)) flag(`${path}.${token}`, `Couleur invalide pour « ${token} » (format attendu : #rrggbb).`);
          else target[token] = value.toLowerCase();
        }
      };
      for (const [key, value] of Object.entries(input.overrides)) {
        if (key === "dark" || key === "light") {
          if (!isObject(value)) flag(`overrides.${key}`, "Réglages avancés invalides.");
          else {
            theme.overrides[key] = {};
            readColors(value, `overrides.${key}`, theme.overrides[key]);
          }
        } else readColors({ [key]: value }, "overrides", theme.overrides);
      }
    }
  }

  return { theme, issues, valid: issues.length === 0 };
}

/**
 * Lit un fichier de thème exporté (texte JSON).
 * @param {string} text
 * @param {number} [size] taille du fichier en octets
 * @returns {{ ok: boolean, theme?: typeof DEFAULT_THEME, issues: { path: string, message: string }[], error?: string }}
 */
export function parseThemeFile(text, size = String(text || "").length) {
  if (size > MAX_THEME_FILE_BYTES) return { ok: false, issues: [], error: "Le fichier dépasse 100 Ko : ce n'est pas un thème." };
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, issues: [], error: "Le fichier n'est pas un thème valide (JSON illisible)." };
  }
  // Un export contient { app, kind: "theme", theme } ; on accepte aussi le thème seul.
  const candidate = isObject(parsed) && isObject(parsed.theme) ? parsed.theme : parsed;
  if (!isObject(candidate)) return { ok: false, issues: [], error: "Le fichier ne contient pas de thème." };
  const { theme, issues } = validateTheme(candidate);
  return { ok: true, theme, issues };
}

/** Contenu du fichier d'export d'un thème. */
export const exportThemeFile = (theme) => JSON.stringify({ app: "arcanes-scenario", kind: "theme", theme }, null, 2);

/** Réglages globaux : valeurs inconnues remplacées, jamais d'erreur. `repaired` signale une correction. */
export function sanitizeSettings(input) {
  if (input == null) return { settings: DEFAULT_SETTINGS, repaired: false };
  if (!isObject(input)) return { settings: DEFAULT_SETTINGS, repaired: true };
  const { theme, valid } = validateTheme(input.theme === undefined ? DEFAULT_THEME : input.theme);
  const textScale = TEXT_SCALES.includes(input.textScale) ? input.textScale : DEFAULT_SETTINGS.textScale;
  const bodyFont = BODY_FONTS.includes(input.bodyFont) ? input.bodyFont : DEFAULT_SETTINGS.bodyFont;
  const motion = MOTIONS.includes(input.motion) ? input.motion : DEFAULT_SETTINGS.motion;
  const gameTableMode = input.gameTableMode === true;
  const repaired = !valid || textScale !== (input.textScale ?? 100) || bodyFont !== (input.bodyFont ?? "inter") || motion !== (input.motion ?? "normal");
  return { settings: { id: "global", version: 1, theme, textScale, bodyFont, motion, gameTableMode }, repaired };
}
