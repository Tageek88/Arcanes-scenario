import { tripletToHex } from "@/lib/theme/color";

/**
 * Génère les styles CSS d'impression basés sur le thème actuel.
 * Adapte les couleurs pour un rendu optimal sur papier (haute contrast, fond blanc).
 * @param {Object} tokens - Les tokens de couleur du thème (triplets HSL)
 * @returns {string} CSS pour @media print
 */
export function generatePrintCSS(tokens) {
  if (!tokens) return "";

  const hex = (tokenName) => {
    const triplet = tokens[tokenName];
    if (!triplet) return null;
    return tripletToHex(triplet);
  };

  const foreground = hex("foreground") || "#111";
  const border = hex("border") || "#999";
  const borderMuted = hex("muted") || "#bbb";
  const secondary = hex("secondary") || "#888";
  const secondaryMuted = hex("muted-foreground") || "#555";
  const cardBg = hex("card") || "#f2f2f2";
  const accentColor = hex("accent") || "#111";

  return `
@page { size: A4; margin: 15mm; }
@media screen { .print-root { display: none; } }
@media print {
  html, body { background: #fff !important; color: ${foreground} !important; }
  body > *:not(.print-root) { display: none !important; }
  .print-root { display: block; font-family: Inter, system-ui, sans-serif; font-size: 10.5pt; line-height: 1.45; color: ${foreground}; }
  .print-root h1, .print-root h2, .print-root h3, .print-root h4 { font-family: Cinzel, Georgia, serif; color: ${foreground}; margin: 0; break-after: avoid; }
  .prt-header { border-bottom: 2px solid ${foreground}; padding-bottom: 6px; margin-bottom: 14px; }
  .prt-header h1 { font-size: 20pt; }
  .prt-header p { margin: 2px 0 0; color: ${secondaryMuted}; font-size: 9pt; }
  .prt-section { margin-top: 18px; }
  .prt-block-break { break-before: page; }
  .prt-block-break > .prt-section { margin-top: 0; }
  .prt-section > h2 { font-size: 14pt; border-bottom: 1px solid ${border}; padding-bottom: 3px; margin-bottom: 10px; }
  .prt-act { margin: 14px 0 8px; font-size: 12pt; text-transform: uppercase; letter-spacing: 0.06em; color: ${secondary}; }
  .prt-scene { margin: 0 0 14px; padding: 8px 10px; border: 1px solid ${secondary}; border-left: 4px solid ${accentColor}; border-radius: 3px; }
  .prt-scene > h3 { font-size: 12pt; }
  .prt-meta { font-size: 9pt; color: ${secondaryMuted}; margin: 2px 0 6px; }
  .prt-label { font-weight: 600; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.05em; color: ${secondary}; margin: 6px 0 2px; }
  .prt-text { white-space: pre-wrap; margin: 0; }
  .prt-secret { border: 1px dashed ${secondary}; padding: 4px 8px; margin-top: 6px; background: ${cardBg}; }
  .prt-list { margin: 2px 0 0; padding-left: 16px; }
  .prt-clue, .prt-item, .prt-npc { margin: 4px 0; padding: 4px 8px; border: 1px solid ${borderMuted}; border-radius: 3px; break-inside: avoid; }
  .prt-group { margin: 12px 0 6px; font-size: 11.5pt; }
  .prt-img { max-height: 60mm; max-width: 100%; margin-top: 6px; }
  .prt-title { font-weight: 700; }
  .prt-character-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(48mm, 1fr)); gap: 8px; }
  .prt-blank { display: inline-block; min-width: 14mm; height: 5mm; border: 1px solid ${secondary}; vertical-align: middle; }
  .prt-character-stat, .prt-character-item { border: 1px solid ${borderMuted}; border-radius: 3px; padding: 6px 8px; break-inside: avoid; }
  .prt-character-stat h3 { font-size: 11pt; margin-bottom: 4px; }
  .prt-character-stat p, .prt-character-item p { margin: 1px 0; }
  .prt-character-notes { white-space: pre-wrap; }
  .prt-character + .prt-character { break-before: page; }
}
`;
}
