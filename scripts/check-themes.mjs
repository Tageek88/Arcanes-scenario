// Contrôle automatique des thèmes : `npm run check:themes`. Aucune dépendance. Sort en erreur (code 1) au premier écart bloquant.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COLOR_TOKENS, DEFAULT_THEME } from "../src/lib/theme/tokens.js";
import { PRESETS, PRESET_IDS, presetTheme } from "../src/lib/theme/presets.js";
import { checkTokens, CONTRAST_PAIRS, failingPairs, autoFixTokens } from "../src/lib/theme/contrast.js";
import { derivePalette } from "../src/lib/theme/palette.js";
import { FONTS, fontById, fontStack } from "../src/lib/theme/fonts.js";
import { buildBootCache, resolveTheme, settingsVars, themeVars } from "../src/lib/theme/resolve.js";
import { autoFixTheme, choosePreset, contrastReport, duplicateToCustom, setOverride, setPaletteMode } from "../src/lib/theme/editor.js";
import { exportThemeFile, parseThemeFile, sanitizeSettings, validateTheme } from "../src/lib/theme/validate.js";
import { isTriplet } from "../src/lib/theme/color.js";

const here = path.dirname(fileURLToPath(import.meta.url));
let errors = 0;
let warnings = 0;
const fail = (message) => { errors += 1; console.error(`  ECHEC  ${message}`); };
const warn = (message) => { warnings += 1; console.warn(`  écart  ${message}`); };
const ok = (message) => console.log(`  ok     ${message}`);
const section = (title) => console.log(`\n${title}`);

// 1. Jetons obligatoires (chaque preset, chaque apparence).
section("1. Jetons des thèmes prédéfinis");
for (const preset of Object.values(PRESETS)) {
  for (const appearance of ["light", "dark"]) {
    const tokens = preset.tokens[appearance];
    const missing = COLOR_TOKENS.filter((name) => !isTriplet(tokens?.[name]));
    if (missing.length) fail(`${preset.id}/${appearance} : jetons absents ou invalides : ${missing.join(", ")}`);
    else ok(`${preset.id}/${appearance} : ${COLOR_TOKENS.length} jetons valides`);
  }
}
const undefinedPresets = PRESET_IDS.filter((id) => id !== "custom" && !PRESETS[id]);
if (undefinedPresets.length) console.log(`  info   presets pas encore définis (phase 3) : ${undefinedPresets.join(", ")}`);

// 2. Le thème « Arcanes » reproduit index.css à l'identique (EXG-14).
section("2. Thème « Arcanes » = src/index.css");
const css = fs.readFileSync(path.join(here, "..", "src", "index.css"), "utf8");
const cssBlock = (selector) => {
  const match = css.match(new RegExp(`\\n  ${selector.replace(".", "\\.")} \\{\\n([\\s\\S]*?)\\n  \\}`));
  return match ? Object.fromEntries([...match[1].matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()])) : {};
};
const cssLight = cssBlock(":root");
const cssDark = { ...cssLight, ...cssBlock(".dark") };
for (const [appearance, cssVars] of [["light", cssLight], ["dark", cssDark]]) {
  const diffs = COLOR_TOKENS.filter((name) => cssVars[name] !== undefined && cssVars[name] !== PRESETS.arcanes.tokens[appearance][name]);
  const missingInCss = COLOR_TOKENS.filter((name) => cssVars[name] === undefined);
  if (diffs.length) fail(`arcanes/${appearance} diffère de index.css : ${diffs.join(", ")}`);
  else ok(`arcanes/${appearance} identique à index.css`);
  if (missingInCss.length) fail(`index.css (${appearance}) n'a pas de valeur par défaut pour : ${missingInCss.join(", ")}`);
}

// 3. Contraste.
section("3. Contraste (WCAG 2.1 AA)");
for (const preset of Object.values(PRESETS)) {
  for (const appearance of ["light", "dark"]) {
    const bad = failingPairs(preset.tokens[appearance]);
    const label = `${preset.id}/${appearance}`;
    if (bad.length === 0) ok(`${label} : ${CONTRAST_PAIRS.length} paires conformes`);
    else if (preset.id === "arcanes") {
      // Le thème d'origine doit rester identique (EXG-14) : ses écarts sont signalés, pas bloquants.
      for (const pair of bad) warn(`${label} : ${pair.fg} / ${pair.bg} = ${pair.ratio} (minimum ${pair.min})`);
    } else for (const pair of bad) fail(`${label} : ${pair.fg} / ${pair.bg} = ${pair.ratio} (minimum ${pair.min})`);
  }
}

// 4. Palettes dérivées : déterminisme, trois modes, contraste.
section("4. Palettes dérivées");
const ACCENTS = ["#d97706", "#2563eb", "#9333ea", "#dc2626", "#16a34a", "#0ea5e9", "#e11d48", "#facc15", "#ffffff", "#000000", "#808080"];
let derived = 0;
for (const mode of ["monochrome", "analogous", "complementary"]) {
  for (const appearance of ["light", "dark"]) {
    for (const accent of ACCENTS) {
      const tokens = derivePalette({ mode, accent }, appearance);
      const again = derivePalette({ mode, accent }, appearance);
      derived += 1;
      if (JSON.stringify(tokens) !== JSON.stringify(again)) fail(`non déterministe : ${mode}/${appearance}/${accent}`);
      const missing = COLOR_TOKENS.filter((name) => !isTriplet(tokens[name]));
      if (missing.length) fail(`${mode}/${appearance}/${accent} : jetons invalides : ${missing.join(", ")}`);
      for (const pair of failingPairs(tokens)) fail(`${mode}/${appearance}/${accent} : ${pair.fg} / ${pair.bg} = ${pair.ratio} (minimum ${pair.min})`);
    }
  }
}
if (errors === 0) ok(`${derived} palettes dérivées : déterministes et conformes`);
const withBackground = derivePalette({ mode: "analogous", accent: "#9333ea", background: "#101018" }, "dark");
if (failingPairs(withBackground).length) fail("palette avec fond choisi : contraste insuffisant");
else ok("palette avec un fond choisi : conforme");

// 5. Correction automatique.
section("5. Correction automatique");
const broken = { ...PRESETS.arcanes.tokens.dark, foreground: "220 14% 14%", "muted-foreground": "218 11% 12%" };
const fixed = autoFixTokens(broken);
const stillBad = checkTokens(fixed).filter((pair) => !pair.ok && ["foreground", "muted-foreground"].includes(pair.fg));
if (failingPairs(broken).length === 0) fail("le jeu de test aurait dû être insuffisant");
else if (stillBad.length) fail(`la correction automatique laisse des écarts : ${stillBad.map((p) => `${p.fg}/${p.bg}`).join(", ")}`);
else ok("la correction automatique rétablit les textes illisibles");

// 6. Validation et import.
section("6. Validation et import de thème");
const expectIssues = (label, input, predicate) => {
  const result = validateTheme(input);
  if (predicate(result)) ok(label); else fail(`${label} : ${JSON.stringify(result.issues)}`);
};
expectIssues("thème par défaut valide", DEFAULT_THEME, (r) => r.valid);
expectIssues("clé inconnue ignorée et signalée", { ...DEFAULT_THEME, css: "body{}" }, (r) => !r.valid && r.theme.css === undefined);
expectIssues("couleur invalide refusée", { ...DEFAULT_THEME, palette: { mode: "monochrome", accent: "rouge" } }, (r) => r.issues.some((i) => i.path === "palette.accent") && r.theme.palette.mode === "preset");
expectIssues("police inconnue remplacée", { ...DEFAULT_THEME, titleFont: "comic-sans" }, (r) => r.theme.titleFont === "cinzel" && !r.valid);
expectIssues("jeton inconnu ignoré", { ...DEFAULT_THEME, overrides: { evil: "#ffffff", primary: "#ff0000" } }, (r) => r.theme.overrides.primary === "#ff0000" && r.theme.overrides.evil === undefined);
expectIssues("URL refusée dans une couleur", { ...DEFAULT_THEME, overrides: { primary: "url(http://x)" } }, (r) => r.theme.overrides.primary === undefined);
expectIssues("valeur non objet refusée", "texte", (r) => !r.valid && r.theme === DEFAULT_THEME);
const exported = exportThemeFile({ ...DEFAULT_THEME, palette: { mode: "analogous", accent: "#9333ea" } });
const imported = parseThemeFile(exported);
if (imported.ok && imported.issues.length === 0 && imported.theme.palette.accent === "#9333ea") ok("export puis import : identique");
else fail("export puis import : écart");
if (parseThemeFile("{pas du json").ok === false) ok("fichier illisible refusé proprement"); else fail("fichier illisible accepté");
if (parseThemeFile("x".repeat(100 * 1024 + 1)).ok === false) ok("fichier trop gros refusé"); else fail("fichier trop gros accepté");
if (sanitizeSettings({ textScale: 77, motion: "dingue" }).repaired) ok("réglages corrompus réparés"); else fail("réglages corrompus non réparés");

// 7. Résolution, variables et cache de démarrage.
section("7. Résolution et cache de démarrage");
const resolved = resolveTheme(DEFAULT_THEME, { systemDark: true });
if (resolved.appearance === "dark" && resolved.vars["--background"] === PRESETS.arcanes.tokens.dark.background) ok("thème par défaut : sombre, variables d'origine");
else fail("thème par défaut : résolution inattendue");
if (resolveTheme({ appearance: "system" }, { systemDark: false }).appearance === "light") ok("apparence « système » suit le système"); else fail("apparence « système » ignorée");
if (resolveTheme("n'importe quoi").theme.presetId === "arcanes") ok("thème corrompu : retour au thème d'origine"); else fail("thème corrompu non géré");
const boot = buildBootCache(DEFAULT_THEME);
const bootText = JSON.stringify(boot);
if (!/[<>;{}]/.test(bootText.replace(/[{}]/g, "")) && boot.d["--background"] && boot.l["--background"]) ok(`cache de démarrage : ${bootText.length} octets`);
else fail("cache de démarrage invalide");
for (const value of Object.values(themeVars(DEFAULT_THEME, "dark"))) {
  if (/[;{}<>]|url\(/i.test(value)) fail(`variable CSS suspecte : ${value}`);
}

section("8. Polices et réglages");
for (const font of FONTS) {
  if (fontStack(font.id)?.includes(font.fallback) && font.weights.includes(font.displayWeight)) ok(`police ${font.family} : pile de repli et graisse ${font.displayWeight}`);
  else fail(`police ${font.family} : registre incohérent`);
}
if (settingsVars({ textScale: 125, bodyFont: "atkinson" })["--text-scale"] === "1.25") ok("taille du texte appliquée"); else fail("taille du texte non appliquée");
if (boot.t && boot.t["data-motion"] === "normal") ok("cache de démarrage : attributs de la racine"); else fail("cache de démarrage sans attributs");

section("9. Préréglages");
for (const id of PRESET_IDS.filter((name) => name !== "custom")) {
  const preset = PRESETS[id];
  if (!preset) { fail(`préréglage « ${id} » non défini`); continue; }
  const { valid, issues } = validateTheme(presetTheme(id));
  if (!valid || issues.length) fail(`${id} : thème du préréglage invalide (${issues.join(", ")})`);
  else if (fontById(preset.titleFont)?.role !== "title") fail(`${id} : police de titre « ${preset.titleFont} » absente du registre`);
  else ok(`${id} : thème valide, police ${fontById(preset.titleFont).family}, apparence d'origine ${preset.native}`);
}
const seen = new Map();
for (const preset of Object.values(PRESETS)) {
  const key = `${preset.tokens.dark.primary}|${preset.tokens.dark.background}`;
  if (seen.has(key)) fail(`${preset.id} et ${seen.get(key)} ont les mêmes couleurs`); else seen.set(key, preset.id);
}
ok(`${seen.size} ambiances aux couleurs distinctes`);

section("10. Éditeur");
{
  const gothic = JSON.stringify(PRESETS.gothic);
  let theme = setOverride(setPaletteMode(choosePreset("gothic"), "analogous"), "dark", "foreground", "#555555");
  if (JSON.stringify(PRESETS.gothic) === gothic) ok("le préréglage n'est pas modifié sur place"); else fail("le préréglage a été modifié");
  if (contrastReport(theme).some((item) => item.pairs.length)) ok("un texte illisible est signalé"); else fail("texte illisible non signalé");
  theme = autoFixTheme(theme, "dark");
  if (contrastReport(theme).every((item) => item.pairs.length === 0)) ok("la correction automatique rend le thème lisible"); else fail("la correction automatique ne suffit pas");
  for (const id of PRESET_IDS.filter((name) => name !== "custom")) {
    for (const mode of ["monochrome", "analogous", "complementary"]) {
      const derived = setPaletteMode(choosePreset(id), mode);
      const bad = contrastReport(derived).flatMap((item) => item.pairs);
      if (bad.length) fail(`${id} en ${mode} : ${bad.length} paire(s) illisible(s)`);
    }
    if (!validateTheme(duplicateToCustom(choosePreset(id))).valid) fail(`${id} : duplication invalide`);
  }
  ok("chaque préréglage reste lisible dans les trois harmonies, et se duplique");
}

section("11. Mode table de jeu");
{
  const settings = { textScale: 100, bodyFont: "inter", motion: "normal", gameTableMode: true };
  let worst = 99;
  for (const id of PRESET_IDS.filter((name) => name !== "custom")) {
    for (const appearance of ["dark", "light"]) {
      const theme = { ...presetTheme(id), appearance };
      const on = resolveTheme(theme, { settings });
      for (const pair of checkTokens(on.tokens)) {
        const need = pair.kind === "text" ? 7 : 4.5;
        if (pair.ratio < need) fail(`${id}/${appearance} (table de jeu) : ${pair.fg} / ${pair.bg} = ${pair.ratio} (minimum ${need})`);
        else if (pair.kind === "text") worst = Math.min(worst, pair.ratio);
      }
      if (JSON.stringify(on.theme) !== JSON.stringify(resolveTheme(theme).theme)) fail(`${id} : le mode table de jeu modifie le thème`);
    }
  }
  ok(`14 combinaisons : texte >= 7 : 1 (plus faible mesuré : ${worst}), contours >= 4,5 : 1, thème enregistré intact`);
}

console.log(`\n${errors === 0 ? "Tous les contrôles sont réussis" : `${errors} échec(s)`}${warnings ? `, ${warnings} écart(s) signalé(s) (thème « Arcanes » conservé tel quel)` : ""}.`);
process.exit(errors === 0 ? 0 : 1);
