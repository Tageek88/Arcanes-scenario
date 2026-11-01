import { describe, it, expect } from "vitest";
import { api, db } from "@/api/localClient";
import { formatTriplet, hexToTriplet, hslToHex, isHex, parseHex, parseTriplet, tripletToHex } from "../src/lib/theme/color.js";
import { autoFixTokens, checkTokens, contrastRatio, failingPairs } from "../src/lib/theme/contrast.js";
import { derivePalette } from "../src/lib/theme/palette.js";
import { PRESETS, PRESET_IDS, presetTheme } from "../src/lib/theme/presets.js";
import { autoFixTheme, choosePreset, clearOverride, contrastReport, duplicateToCustom, presetSwatches, setOverride, setPaletteColor, setPaletteMode, setThemeField, themeLabel } from "../src/lib/theme/editor.js";
import { gameTableTokens } from "../src/lib/theme/gameTable.js";
import { FONTS, TITLE_FONT_IDS, fontStack } from "../src/lib/theme/fonts.js";
import { buildBootCache, resolveAppearance, resolveTheme, settingsVars, themeAttributes } from "../src/lib/theme/resolve.js";
import { COLOR_TOKENS, DEFAULT_SETTINGS, DEFAULT_THEME } from "../src/lib/theme/tokens.js";
import { exportThemeFile, parseThemeFile, sanitizeSettings, validateTheme } from "../src/lib/theme/validate.js";
import { buildBackupPayload, restoreFromPayload } from "@/lib/save/backup";
import { loadAppSettings, loadCampaignTheme, resetAppSettings, saveAppSettings, saveCampaignTheme } from "@/lib/services/appSettings";
import { deleteCampaignCascade } from "@/lib/services/campaignDelete";
import { makeCampaign } from "./helpers";

describe("thème : couleurs et contraste", () => {
  it("convertit hexadécimal et gabarit « H S% L% »", () => {
    expect(isHex("#a1b2c3")).toBe(true);
    expect(isHex("#abc")).toBe(false);
    expect(parseHex("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
    expect(hslToHex({ h: 0, s: 100, l: 50 })).toBe("#ff0000");
    expect(formatTriplet({ h: 38.4, s: 92.2, l: 40.4 })).toBe("38 92% 40%");
    expect(parseTriplet("38 92% 40%")).toEqual({ h: 38, s: 92, l: 40 });
    expect(parseTriplet("38 92 40")).toBeNull();
    expect(parseTriplet("400 92% 40%")).toBeNull();
    expect(tripletToHex("0 0% 100%")).toBe("#ffffff");
    expect(hexToTriplet("#000000")).toBe("0 0% 0%");
  });

  it("mesure le contraste (noir sur blanc = 21)", () => {
    expect(contrastRatio("0 0% 0%", "0 0% 100%")).toBeCloseTo(21, 0);
    expect(contrastRatio("0 0% 50%", "0 0% 50%")).toBeCloseTo(1, 5);
    expect(contrastRatio("n'importe quoi", "0 0% 0%")).toBe(0);
  });

  it("la correction automatique relève un texte illisible sans toucher aux fonds", () => {
    const broken = { ...PRESETS.arcanes.tokens.dark, foreground: "220 14% 14%" };
    expect(failingPairs(broken).some((pair) => pair.fg === "foreground")).toBe(true);
    const fixed = autoFixTokens(broken);
    expect(failingPairs(fixed).some((pair) => pair.fg === "foreground")).toBe(false);
    expect(fixed.background).toBe(broken.background);
  });
});

describe("thème : palette dérivée", () => {
  it("est déterministe, complète et conforme pour les trois modes", () => {
    for (const mode of ["monochrome", "analogous", "complementary"]) {
      for (const appearance of ["light", "dark"]) {
        for (const accent of ["#d97706", "#2563eb", "#9333ea", "#ffffff", "#808080"]) {
          const tokens = derivePalette({ mode, accent }, appearance);
          expect(derivePalette({ mode, accent }, appearance)).toEqual(tokens);
          expect(COLOR_TOKENS.filter((name) => !parseTriplet(tokens[name]))).toEqual([]);
          expect(failingPairs(tokens)).toEqual([]);
        }
      }
    }
  });

  it("les couleurs sémantiques ne suivent pas l'accent", () => {
    const blue = derivePalette({ mode: "monochrome", accent: "#2563eb" }, "dark");
    const green = derivePalette({ mode: "monochrome", accent: "#16a34a" }, "dark");
    expect(parseTriplet(blue.destructive).h).toBe(parseTriplet(green.destructive).h);
    expect(parseTriplet(blue.played).h).toBe(parseTriplet(green.played).h);
    expect(blue.primary).not.toBe(green.primary);
  });
});

describe("thème : validation et résolution", () => {
  it("accepte le thème par défaut et refuse le reste sans planter", () => {
    expect(validateTheme(DEFAULT_THEME).valid).toBe(true);
    const bad = validateTheme({ ...DEFAULT_THEME, titleFont: "x", css: "body{}", overrides: { primary: "rouge", evil: "#fff" }, palette: { mode: "monochrome" } });
    expect(bad.valid).toBe(false);
    expect(bad.theme.titleFont).toBe("cinzel");
    expect(bad.theme.css).toBeUndefined();
    expect(bad.theme.overrides).toEqual({});
    expect(bad.theme.palette).toEqual({ mode: "preset" });
    expect(validateTheme(null).theme).toBe(DEFAULT_THEME);
  });

  it("export puis import donnent le même thème ; un mauvais fichier est refusé", () => {
    const theme = { ...DEFAULT_THEME, palette: { mode: "complementary", accent: "#9333ea" }, overrides: { ring: "#ff00aa" } };
    const back = parseThemeFile(exportThemeFile(theme));
    expect(back.ok).toBe(true);
    expect(back.theme).toEqual(validateTheme(theme).theme);
    expect(parseThemeFile("{oups").ok).toBe(false);
    expect(parseThemeFile("{}", 200 * 1024).ok).toBe(false);
    expect(parseThemeFile("[1,2]").ok).toBe(false);
  });

  it("résout l'apparence et les variables CSS", () => {
    expect(resolveAppearance("system", false)).toBe("light");
    expect(resolveAppearance("system", true)).toBe("dark");
    const resolved = resolveTheme(DEFAULT_THEME);
    expect(resolved.vars["--background"]).toBe(PRESETS.arcanes.tokens.dark.background);
    expect(resolved.vars["--radius"]).toBe("0.375rem");
    expect(resolveTheme("n'importe quoi").theme.presetId).toBe("arcanes");
    const custom = resolveTheme({ ...DEFAULT_THEME, palette: { mode: "analogous", accent: "#2563eb" }, overrides: { ring: "#ff0000" } });
    expect(custom.vars["--ring"]).toBe("0 100% 50%");
    const boot = buildBootCache({ ...DEFAULT_THEME, appearance: "system" });
    expect(boot.a).toBe("system");
    expect(boot.d["--background"]).not.toBe(boot.l["--background"]);
  });

  it("applique taille du texte, police du texte, animations et motif", () => {
    expect(settingsVars({ ...DEFAULT_SETTINGS, textScale: 125 })["--text-scale"]).toBe("1.25");
    expect("--font-body" in settingsVars(DEFAULT_SETTINGS)).toBe(false);
    expect(settingsVars({ ...DEFAULT_SETTINGS, bodyFont: "atkinson" })["--font-body"]).toContain("Atkinson Hyperlegible");
    const attrs = themeAttributes({ ...DEFAULT_THEME, pattern: "lines" }, { ...DEFAULT_SETTINGS, motion: "reduced" });
    expect(attrs["data-pattern"]).toBe("lines");
    expect(attrs["data-motion"]).toBe("reduced");
    const resolved = resolveTheme(DEFAULT_THEME, { settings: { ...DEFAULT_SETTINGS, textScale: 110 } });
    expect(resolved.vars["--text-scale"]).toBe("1.1");
    expect(buildBootCache(DEFAULT_THEME).t["data-pattern"]).toBe("none");
  });

  it("registre de polices complet, avec pile de repli", () => {
    expect(TITLE_FONT_IDS).toEqual(expect.arrayContaining(["cinzel", "almendra", "im-fell-english", "playfair-display", "chakra-petch", "orbitron", "pirata-one"]));
    for (const font of FONTS) {
      expect(fontStack(font.id)).toContain(font.family);
      expect(font.weights).toContain(font.displayWeight);
    }
    expect(resolveTheme({ ...DEFAULT_THEME, titleFont: "pirata-one" }).vars["--display-weight"]).toBe("400");
  });

  it("les sept préréglages sont définis, valides et lisibles en clair comme en sombre", () => {
    for (const id of PRESET_IDS.filter((name) => name !== "custom")) {
      expect(PRESETS[id]?.id).toBe(id);
      expect(validateTheme(presetTheme(id)).valid).toBe(true);
      if (id === "arcanes") continue; // thème d'origine : écarts de contraste conservés à l'identique
      for (const appearance of ["light", "dark"]) expect(failingPairs(PRESETS[id].tokens[appearance])).toEqual([]);
    }
    const resolved = resolveTheme(presetTheme("cyberpunk"));
    expect(resolved.vars["--font-display"]).toContain("Chakra Petch");
    expect(resolved.vars["--radius"]).toBe("0rem");
  });

  it("éditeur : un préréglage n'est jamais modifié sur place", () => {
    const before = JSON.stringify(PRESETS.gothic);
    let theme = choosePreset("gothic");
    expect(themeLabel(theme)).toBe("Gothique");
    theme = setPaletteMode(theme, "complementary");
    expect(themeLabel(theme)).toBe("Gothique (modifié)");
    expect(theme.palette.accent).toMatch(/^#[0-9a-f]{6}$/);
    theme = setPaletteColor(theme, "accent", "#118844");
    expect(resolveTheme(theme).vars["--primary"]).not.toBe(resolveTheme(choosePreset("gothic")).vars["--primary"]);
    expect(setThemeField(theme, "radius", "nimporte").radius).toBe(DEFAULT_THEME.radius);
    expect(JSON.stringify(PRESETS.gothic)).toBe(before);
    expect(presetSwatches("gothic")).toHaveLength(5);
    const custom = duplicateToCustom(choosePreset("fantasy"));
    expect(custom.presetId).toBe("custom");
    expect(custom.palette.mode).not.toBe("preset");
  });

  it("éditeur : réglages avancés par apparence, avertissement et correction automatique", () => {
    let theme = setOverride(choosePreset("space-opera"), "dark", "foreground", "#555555");
    expect(theme.overrides.dark.foreground).toBe("#555555");
    expect(resolveTheme(theme, { systemDark: true }).vars["--foreground"]).toBe("0 0% 33%");
    // l'autre apparence n'est pas touchée
    expect(resolveTheme({ ...theme, appearance: "light" }).vars["--foreground"]).toBe(PRESETS["space-opera"].tokens.light.foreground);
    const report = contrastReport(theme);
    expect(report.find((item) => item.appearance === "dark").pairs.length).toBeGreaterThan(0);
    expect(report.find((item) => item.appearance === "light").pairs).toEqual([]);
    theme = autoFixTheme(theme, "dark");
    expect(contrastReport(theme).every((item) => item.pairs.length === 0)).toBe(true);
    theme = clearOverride(theme, "dark", "foreground");
    expect(theme.overrides.dark.foreground).toBeUndefined();
    // forme simple (valable pour les deux apparences) toujours acceptée
    expect(validateTheme({ overrides: { ring: "#ff0000", light: { ring: "#00ff00" } } }).valid).toBe(true);
    expect(validateTheme({ overrides: { dark: { ring: "rouge" } } }).valid).toBe(false);
  });

  it("mode table de jeu : surcouche lisible qui ne modifie pas le thème", () => {
    const saved = JSON.stringify(presetTheme("fantasy"));
    for (const id of PRESET_IDS.filter((name) => name !== "custom")) {
      for (const appearance of ["dark", "light"]) {
        const tokens = resolveTheme({ ...presetTheme(id), appearance }, { settings: { ...DEFAULT_SETTINGS, gameTableMode: true } }).tokens;
        for (const pair of checkTokens(tokens)) expect(pair.ratio).toBeGreaterThanOrEqual(pair.kind === "text" ? 7 : 4.5);
      }
    }
    const on = resolveTheme(presetTheme("fantasy"), { settings: { ...DEFAULT_SETTINGS, gameTableMode: true } });
    const off = resolveTheme(presetTheme("fantasy"));
    expect(on.attrs["data-game-table"]).toBe("on");
    expect(on.attrs["data-motion"]).toBe("reduced");
    expect(on.vars["--text-scale"]).toBe("1.1");
    expect(on.theme).toEqual(off.theme);
    expect(JSON.stringify(presetTheme("fantasy"))).toBe(saved);
    const tokens = { ...PRESETS.arcanes.tokens.dark };
    gameTableTokens(tokens, "dark");
    expect(tokens).toEqual(PRESETS.arcanes.tokens.dark);
    expect(resolveTheme(presetTheme("fantasy"), { settings: { ...DEFAULT_SETTINGS, textScale: 125, gameTableMode: true } }).vars["--text-scale"]).toBe("1.375");
  });

  it("répare des réglages globaux corrompus", () => {
    expect(sanitizeSettings(undefined)).toEqual({ settings: DEFAULT_SETTINGS, repaired: false });
    const { settings, repaired } = sanitizeSettings({ textScale: 77, motion: "x", gameTableMode: "oui", theme: { presetId: "inconnu" } });
    expect(repaired).toBe(true);
    expect(settings.textScale).toBe(100);
    expect(settings.gameTableMode).toBe(false);
    expect(settings.theme.presetId).toBe("arcanes");
  });
});

describe("thème : données", () => {
  it("lit les réglages par défaut, les enregistre par morceaux et les réinitialise", async () => {
    expect((await loadAppSettings()).settings).toEqual(DEFAULT_SETTINGS);
    await saveAppSettings({ textScale: 110 });
    await saveAppSettings({ motion: "reduced" });
    const { settings } = await loadAppSettings();
    expect(settings.textScale).toBe(110);
    expect(settings.motion).toBe("reduced");
    expect(await db.table("AppSettings").count()).toBe(1);
    await resetAppSettings();
    expect((await loadAppSettings()).settings).toEqual(DEFAULT_SETTINGS);
  });

  it("une ligne corrompue en base est réparée au chargement", async () => {
    await db.table("AppSettings").put({ id: "global", textScale: 999, theme: "n'importe quoi" });
    const { settings, repaired } = await loadAppSettings();
    expect(repaired).toBe(true);
    expect(settings.theme.presetId).toBe("arcanes");
  });

  it("enregistre, relit et retire le thème d'une campagne ; sa suppression l'emporte avec elle", async () => {
    const campaign = await makeCampaign("Thème");
    expect((await loadCampaignTheme(campaign.id)).theme).toBeNull();
    await saveCampaignTheme(campaign.id, { ...DEFAULT_THEME, palette: { mode: "monochrome", accent: "#9333ea" } });
    expect((await loadCampaignTheme(campaign.id)).theme.palette.accent).toBe("#9333ea");
    await saveCampaignTheme(campaign.id, null);
    expect((await loadCampaignTheme(campaign.id)).theme).toBeNull();
    await saveCampaignTheme(campaign.id, DEFAULT_THEME);
    await deleteCampaignCascade(campaign.id);
    expect((await loadCampaignTheme(campaign.id)).theme).toBeNull();
    expect((await api.entities.Campaign.filter({})).items).toHaveLength(0);
  });

  it("la sauvegarde contient les réglages ; une ancienne sauvegarde (sans eux) s'importe et rend le thème d'origine", async () => {
    await saveAppSettings({ textScale: 125 });
    const payload = await buildBackupPayload();
    expect(payload.data.AppSettings).toHaveLength(1);
    await restoreFromPayload({ app: "arcanes-scenario", version: 1, data: { Campaign: [{ id: "c1", name: "Ancienne" }] } });
    expect((await loadAppSettings()).settings).toEqual(DEFAULT_SETTINGS);
  });
});
