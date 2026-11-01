// Contraste des couleurs (WCAG 2.1 AA). Module pur.
import { hslToRgb, parseTriplet, clamp } from "./color.js";

/** Luminance relative d'une couleur RVB 0-255 (formule WCAG). */
export function relativeLuminance({ r, g, b }) {
  const lin = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

const luminanceOf = (hsl) => relativeLuminance(hslToRgb(hsl));

/** Rapport de contraste entre deux couleurs HSL ({h,s,l}), de 1 à 21. */
export function contrastRatioHsl(a, b) {
  const la = luminanceOf(a);
  const lb = luminanceOf(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Rapport de contraste entre deux jetons « H S% L% ». Renvoie 0 si l'un des deux est invalide. */
export function contrastRatio(tripletA, tripletB) {
  const a = parseTriplet(tripletA);
  const b = parseTriplet(tripletB);
  return a && b ? contrastRatioHsl(a, b) : 0;
}

/**
 * Éclaircit ou assombrit `color` (teinte et saturation conservées) jusqu'à atteindre `min` contre `against`.
 * Choisit le sens qui s'éloigne du fond. Déterministe : pas de 1 point de luminosité.
 * @param {{h:number,s:number,l:number}} color
 * @param {{h:number,s:number,l:number}} against
 * @param {number} min
 */
export function ensureContrast(color, against, min) {
  if (contrastRatioHsl(color, against) >= min) return color;
  const fgRaises = luminanceOf(color) >= luminanceOf(against);
  const sameSideFirst = fgRaises ? 1 : -1;
  for (const dir of [sameSideFirst, -sameSideFirst]) {
    for (let l = color.l; l >= 0 && l <= 100; l += dir) {
      const candidate = { ...color, l: clamp(l, 0, 100) };
      if (contrastRatioHsl(candidate, against) >= min) return candidate;
    }
  }
  // Aucun réglage de luminosité ne suffit : noir ou blanc.
  const black = { ...color, l: 0 };
  const white = { ...color, l: 100 };
  return contrastRatioHsl(black, against) >= contrastRatioHsl(white, against) ? black : white;
}

/**
 * Paires à contrôler (EXG-33). `min` : 4,5 pour du texte, 3 pour un composant d'interface ou un anneau de focus.
 * @type {{ fg: string, bg: string, min: number, kind: "text" | "ui" }[]}
 */
export const CONTRAST_PAIRS = [
  { fg: "foreground", bg: "background", min: 4.5, kind: "text" },
  { fg: "card-foreground", bg: "card", min: 4.5, kind: "text" },
  { fg: "popover-foreground", bg: "popover", min: 4.5, kind: "text" },
  { fg: "primary-foreground", bg: "primary", min: 4.5, kind: "text" },
  { fg: "secondary-foreground", bg: "secondary", min: 4.5, kind: "text" },
  { fg: "accent-foreground", bg: "accent", min: 4.5, kind: "text" },
  { fg: "muted-foreground", bg: "background", min: 4.5, kind: "text" },
  { fg: "muted-foreground", bg: "card", min: 4.5, kind: "text" },
  { fg: "muted-foreground", bg: "muted", min: 4.5, kind: "text" },
  { fg: "destructive-foreground", bg: "destructive", min: 4.5, kind: "text" },
  { fg: "played-foreground", bg: "played", min: 4.5, kind: "text" },
  { fg: "warning-foreground", bg: "warning", min: 4.5, kind: "text" },
  { fg: "sidebar-foreground", bg: "sidebar-background", min: 4.5, kind: "text" },
  { fg: "sidebar-primary-foreground", bg: "sidebar-primary", min: 4.5, kind: "text" },
  { fg: "primary", bg: "background", min: 4.5, kind: "text" },
  { fg: "destructive", bg: "background", min: 4.5, kind: "text" },
  { fg: "warning", bg: "background", min: 4.5, kind: "text" },
  { fg: "input", bg: "background", min: 3, kind: "ui" },
  { fg: "ring", bg: "background", min: 3, kind: "ui" },
  { fg: "icon", bg: "background", min: 3, kind: "ui" },
  { fg: "icon-active", bg: "background", min: 3, kind: "ui" },
];

/**
 * Contrôle un jeu de jetons.
 * @param {Record<string, string>} tokens
 * @returns {{ fg: string, bg: string, min: number, kind: string, ratio: number, ok: boolean }[]} toutes les paires, mesurées
 */
export function checkTokens(tokens) {
  return CONTRAST_PAIRS.map((pair) => {
    const ratio = contrastRatio(tokens?.[pair.fg], tokens?.[pair.bg]);
    return { ...pair, ratio: Math.round(ratio * 100) / 100, ok: ratio >= pair.min };
  });
}

/** Seulement les paires insuffisantes. */
export const failingPairs = (tokens) => checkTokens(tokens).filter((pair) => !pair.ok);

/**
 * « Corriger automatiquement » (EXG-35) : ajuste la luminosité du texte (premier jeton de chaque paire) pour
 * atteindre le seuil ; ne touche jamais aux fonds.
 * @param {Record<string, string>} tokens
 * @returns {Record<string, string>} nouveaux jetons
 */
export function autoFixTokens(tokens) {
  const next = { ...tokens };
  for (const pair of CONTRAST_PAIRS) {
    const fg = parseTriplet(next[pair.fg]);
    const bg = parseTriplet(next[pair.bg]);
    if (!fg || !bg) continue;
    if (contrastRatioHsl(fg, bg) >= pair.min) continue;
    const fixed = ensureContrast(fg, bg, pair.min);
    next[pair.fg] = `${Math.round(fixed.h)} ${Math.round(fixed.s)}% ${Math.round(fixed.l)}%`;
  }
  return next;
}
