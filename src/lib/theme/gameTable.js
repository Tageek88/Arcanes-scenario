// Mode « table de jeu » (EXG-80 à EXG-82) : une surcouche calculée au vol sur le thème actif. Le thème enregistré n'est
// JAMAIS modifié : désactiver le mode restitue exactement le thème d'origine. Module pur.
import { clamp, formatTriplet, parseTriplet } from "./color.js";
import { contrastRatioHsl, CONTRAST_PAIRS, ensureContrast } from "./contrast.js";

/** Texte un peu plus grand (facteur appliqué en plus de la taille choisie). */
export const GAME_TABLE_TEXT_FACTOR = 1.1;
/** Contraste renforcé : 7 : 1 pour le texte (niveau AAA), 4,5 : 1 pour les contours et icônes. */
export const GAME_TABLE_MIN = { text: 7, ui: 4.5 };

const SURFACES = [
  "background", "card", "popover", "secondary", "muted", "accent",
  "sidebar-background", "sidebar-accent",
];

// Fonds de page et de surfaces : déjà adaptés plus haut, jamais déplacés pour satisfaire un texte.
const FIXED_BACKGROUNDS = [...SURFACES];

const round = (hsl) => ({ h: Math.round(hsl.h), s: Math.round(hsl.s), l: Math.round(hsl.l) });

/**
 * @param {Record<string, string>} tokens jetons « H S% L% » du thème actif
 * @param {"dark" | "light"} appearance
 * @returns {Record<string, string>} nouveaux jetons (l'entrée n'est pas modifiée)
 */
export function gameTableTokens(tokens, appearance) {
  const next = { ...tokens };

  // Fonds moins lumineux : plus sombres en mode sombre, moins éclatants en mode clair.
  for (const name of SURFACES) {
    const color = parseTriplet(next[name]);
    if (!color) continue;
    const l = appearance === "dark" ? color.l * 0.8 : Math.max(color.l - 6, 70);
    next[name] = formatTriplet(round({ ...color, l: clamp(l, 0, 100) }));
  }

  // Contraste renforcé : on ajuste la couleur de premier plan de chaque paire (jamais le fond), deux passes car
  // certaines couleurs servent dans plusieurs paires (accent sur fond, texte sur accent).
  for (let pass = 0; pass < 2; pass += 1) {
    for (const pair of CONTRAST_PAIRS) {
      const fg = parseTriplet(next[pair.fg]);
      const bg = parseTriplet(next[pair.bg]);
      if (!fg || !bg) continue;
      const min = GAME_TABLE_MIN[pair.kind] ?? GAME_TABLE_MIN.text;
      if (contrastRatioHsl(fg, bg) >= min) continue;
      const fixed = round(ensureContrast(fg, bg, min));
      next[pair.fg] = formatTriplet(fixed);
      // Texte déjà au plus clair ou au plus sombre : on ajuste alors le fond de la pastille (jamais le fond de la page).
      if (contrastRatioHsl(fixed, bg) < min && !pair.bg.startsWith("background") && !FIXED_BACKGROUNDS.includes(pair.bg)) {
        next[pair.bg] = formatTriplet(round(ensureContrast(bg, fixed, min)));
      }
    }
  }
  return next;
}
