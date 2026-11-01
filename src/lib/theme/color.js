// Couleurs : conversions hexadécimal <-> HSL et gabarit « H S% L% » des variables CSS du thème.
// Module pur (sans React, sans accès aux données), imports relatifs : testable avec Node.

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const normHue = (hue) => ((hue % 360) + 360) % 360;

const HEX = /^#([0-9a-f]{6})$/i;

/** @returns {boolean} vrai pour « #rrggbb » (six chiffres, rien d'autre). */
export const isHex = (value) => typeof value === "string" && HEX.test(value);

/** @returns {{ r: number, g: number, b: number } | null} composantes de 0 à 255 */
export function parseHex(hex) {
  const match = typeof hex === "string" ? hex.match(HEX) : null;
  if (!match) return null;
  const n = parseInt(match[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export const toHex = ({ r, g, b }) =>
  `#${[r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("")}`;

/** HSL (teinte 0-360, saturation et luminosité 0-100) vers RVB 0-255. */
export function hslToRgb({ h, s, l }) {
  const sat = clamp(s, 0, 100) / 100;
  const lum = clamp(l, 0, 100) / 100;
  const hue = normHue(h);
  const k = (n) => (n + hue / 30) % 12;
  const a = sat * Math.min(lum, 1 - lum);
  const f = (n) => lum - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255 };
}

export function rgbToHsl({ r, g, b }) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l: l * 100 };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: normHue(h * 60), s: s * 100, l: l * 100 };
}

export const hexToHsl = (hex) => {
  const rgb = parseHex(hex);
  return rgb ? rgbToHsl(rgb) : null;
};
export const hslToHex = (hsl) => toHex(hslToRgb(hsl));

/** « 38 92% 40% » : le gabarit des variables CSS du projet (utilisé par `hsl(var(--x))` de Tailwind). */
export const formatTriplet = ({ h, s, l }) => `${Math.round(normHue(h))} ${Math.round(clamp(s, 0, 100))}% ${Math.round(clamp(l, 0, 100))}%`;

const TRIPLET = /^(\d{1,3}(?:\.\d+)?)\s+(\d{1,3}(?:\.\d+)?)%\s+(\d{1,3}(?:\.\d+)?)%$/;

/** @returns {{ h: number, s: number, l: number } | null} */
export function parseTriplet(value) {
  const match = typeof value === "string" ? value.trim().match(TRIPLET) : null;
  if (!match) return null;
  const [h, s, l] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (h > 360 || s > 100 || l > 100) return null;
  return { h, s, l };
}

export const isTriplet = (value) => parseTriplet(value) !== null;

export const tripletToHex = (value) => {
  const hsl = parseTriplet(value);
  return hsl ? hslToHex(hsl) : null;
};

export const hexToTriplet = (hex) => {
  const hsl = hexToHsl(hex);
  return hsl ? formatTriplet(hsl) : null;
};
