// Palette dérivée (EXG-30 à EXG-32) : à partir d'un accent et d'un fond optionnel, calcule TOUS les jetons de couleur.
// Déterministe : une même entrée donne toujours le même résultat. Module pur.
import { clamp, formatTriplet, hexToHsl, normHue } from "./color.js";
import { contrastRatioHsl, ensureContrast } from "./contrast.js";

const round = (hsl) => ({ h: Math.round(normHue(hsl.h)), s: Math.round(clamp(hsl.s, 0, 100)), l: Math.round(clamp(hsl.l, 0, 100)) });
const tone = (hue, sat, light) => round({ h: hue, s: sat, l: light });
const out = (hsl) => formatTriplet(hsl);

// Couleurs sémantiques : ne dérivent PAS de l'accent (EXG-32). Seule leur luminosité est ajustée.
const SEMANTIC = {
  dark: { destructive: { h: 0, s: 84, l: 60 }, played: { h: 158, s: 62, l: 42 }, warning: { h: 38, s: 92, l: 50 } },
  light: { destructive: { h: 0, s: 72, l: 46 }, played: { h: 158, s: 55, l: 32 }, warning: { h: 26, s: 90, l: 37 } },
};

/**
 * Choisit la couleur de texte (claire ou sombre, teintée comme la surface) la plus lisible sur `surface`,
 * puis, si besoin, corrige la surface (jamais le texte) pour atteindre 4,5 : 1.
 */
function pairOn(surface, lightText, darkText) {
  const pickLight = contrastRatioHsl(lightText, surface) >= contrastRatioHsl(darkText, surface);
  let text = pickLight ? lightText : darkText;
  let fill = surface;
  if (contrastRatioHsl(text, fill) < 4.5) {
    // On déplace la surface dans le sens qui l'éloigne du texte.
    const adjusted = ensureContrast(fill, text, 4.5);
    fill = round(adjusted);
  }
  return { fill, text };
}

/**
 * @param {{ mode?: "monochrome" | "analogous" | "complementary", accent: string, background?: string }} palette
 * @param {"dark" | "light"} appearance
 * @returns {Record<string, string>} tous les jetons de couleur
 */
export function derivePalette(palette, appearance) {
  const dark = appearance === "dark";
  const mode = palette?.mode === "analogous" || palette?.mode === "complementary" ? palette.mode : "monochrome";
  const accentHsl = hexToHsl(palette?.accent) || { h: 38, s: 92, l: 50 };
  const bgGiven = hexToHsl(palette?.background);
  const hue = Math.round(accentHsl.h);

  // Fond et surfaces : même teinte, luminosité étagée (EXG-38).
  const bgSat = bgGiven ? Math.round(bgGiven.s) : clamp(Math.round(accentHsl.s * 0.25), 8, 30);
  const bgHue = bgGiven ? Math.round(bgGiven.h) : hue;
  let bgL = bgGiven ? Math.round(bgGiven.l) : dark ? 7 : 96;
  if (bgGiven) bgL = dark ? clamp(bgL, 3, 18) : clamp(bgL, 82, 99); // le fond suit l'apparence choisie
  const background = tone(bgHue, bgSat, bgL);
  const card = dark ? tone(bgHue, bgSat, bgL + 5) : tone(bgHue, bgSat, Math.min(100, bgL + 3));
  const popover = card;
  const secondary = dark ? tone(bgHue, bgSat, bgL + 12) : tone(bgHue, bgSat, bgL - 5);
  const muted = dark ? tone(bgHue, bgSat, bgL + 10) : tone(bgHue, bgSat, bgL - 4);
  const border = dark ? tone(bgHue, bgSat, bgL + 12) : tone(bgHue, bgSat, bgL - 11);
  const inputColor = dark ? tone(bgHue, bgSat, bgL + 22) : tone(bgHue, bgSat, bgL - 40);
  const sidebar = dark ? tone(bgHue, bgSat, bgL + 3) : tone(bgHue, bgSat, bgL - 2);
  const sidebarAccent = dark ? tone(bgHue, bgSat, bgL + 10) : tone(bgHue, bgSat, bgL - 8);

  // Textes.
  const foreground = ensureContrast(dark ? tone(bgHue, 14, 96) : tone(bgHue, 20, 12), secondary, 7);
  const fg = round(foreground);
  const mutedText = round(
    [background, card, muted].reduce((text, surface) => ensureContrast(text, surface, 4.5), dark ? tone(bgHue, 11, 65) : tone(bgHue, 12, 40))
  );

  // Accent principal (primaire) : lisible sur le fond, avec un texte lisible dessus.
  const targetL = dark ? clamp(accentHsl.l, 48, 64) : clamp(accentHsl.l, 28, 42);
  const primaryRaw = round(ensureContrast({ h: hue, s: clamp(accentHsl.s, 35, 95), l: targetL }, background, 4.5));
  const lightOn = tone(hue, 20, 98);
  const darkOn = tone(hue, 25, 8);
  const primaryPair = pairOn(primaryRaw, lightOn, darkOn);
  const primary = round(ensureContrast(primaryPair.fill, background, 4.5));
  const primaryText = pairOn(primary, lightOn, darkOn).text;

  // Second accent selon le mode d'harmonie (surface « accent », séries de graphiques).
  const secondHue = mode === "analogous" ? hue + 30 : mode === "complementary" ? hue + 180 : hue;
  const accentSurface = dark ? tone(secondHue, mode === "monochrome" ? bgSat : 24, bgL + 12) : tone(secondHue, mode === "monochrome" ? bgSat : 30, bgL - 6);
  const accentText = fg;

  // Couleurs sémantiques.
  const sem = SEMANTIC[appearance === "dark" ? "dark" : "light"];
  const destructivePair = pairOn(sem.destructive, tone(0, 0, 100), tone(0, 0, 6));
  const destructive = round(ensureContrast(destructivePair.fill, background, 4.5));
  const destructiveText = pairOn(destructive, tone(0, 0, 100), tone(0, 0, 6)).text;
  const playedPair = pairOn(sem.played, tone(0, 0, 100), tone(216, 16, 8));
  const played = playedPair.fill;
  const warningPair = pairOn(sem.warning, tone(0, 0, 100), tone(26, 91, 10));
  const warning = round(ensureContrast(warningPair.fill, background, 4.5));
  const warningText = pairOn(warning, tone(0, 0, 100), tone(26, 91, 10)).text;

  const icon = mutedText;
  const sidebarText = round(ensureContrast(fg, sidebar, 4.5));
  const sidebarPrimaryText = pairOn(primary, lightOn, darkOn).text;
  const ring = round(ensureContrast(primary, background, 3));

  return {
    background: out(background), foreground: out(fg),
    card: out(card), "card-foreground": out(round(ensureContrast(fg, card, 4.5))),
    popover: out(popover), "popover-foreground": out(round(ensureContrast(fg, popover, 4.5))),
    primary: out(primary), "primary-foreground": out(primaryText),
    secondary: out(secondary), "secondary-foreground": out(round(ensureContrast(fg, secondary, 4.5))),
    muted: out(muted), "muted-foreground": out(mutedText),
    accent: out(accentSurface), "accent-foreground": out(round(ensureContrast(accentText, accentSurface, 4.5))),
    destructive: out(destructive), "destructive-foreground": out(destructiveText),
    border: out(border), input: out(round(ensureContrast(inputColor, background, 3))), ring: out(ring),
    played: out(played), "played-foreground": out(playedPair.text), key: out(primary),
    "chart-1": out(primary),
    "chart-2": out(played),
    "chart-3": out(destructive),
    "chart-4": out(mutedText),
    "chart-5": out(tone(secondHue, mode === "monochrome" ? 20 : 45, dark ? 62 : 55)),
    "sidebar-background": out(sidebar), "sidebar-foreground": out(sidebarText),
    "sidebar-primary": out(primary), "sidebar-primary-foreground": out(sidebarPrimaryText),
    "sidebar-accent": out(sidebarAccent), "sidebar-accent-foreground": out(round(ensureContrast(fg, sidebarAccent, 4.5))),
    "sidebar-border": out(border), "sidebar-ring": out(ring),
    warning: out(warning), "warning-foreground": out(warningText),
    icon: out(icon), "icon-active": out(primary), selection: out(primary),
  };
}
