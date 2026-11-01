import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { ThemeContext } from "@/lib/context/ThemeContext";
import { getSelectedCampaignId, subscribeSelectedCampaign } from "@/lib/context/campaignStore";
import { subscribeDataChanged } from "@/lib/context/dataEvents";
import { loadAppSettings, loadCampaignTheme, resetAppSettings, saveAppSettings, saveCampaignTheme } from "@/lib/services/appSettings";
import { buildBootCache, resolveTheme, windowBackground } from "@/lib/theme/resolve";
import { BOOT_KEY, DEFAULT_SETTINGS, DEFAULT_THEME } from "@/lib/theme/tokens";

const DARK_QUERY = "(prefers-color-scheme: dark)";
// Remplace l'état seulement si le contenu a changé : une écriture sans rapport (notes, scènes…) ne doit pas
// réappliquer le thème ni réécrire le cache de démarrage.
const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const keepIfSame = (next) => (previous) => (sameValue(previous, next) ? previous : next);

const systemPrefersDark = () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(DARK_QUERY).matches : true);

/**
 * Applique le thème actif : variables CSS sur la racine (aucun composant ne connaît le thème, EXG-10), classe
 * « dark », cache de démarrage (EXG-111) et couleur de fond de la fenêtre Electron (EXG-112).
 * Seule source de vérité clair/sombre (EXG-16) : remplace next-themes.
 */
export default function ThemeProvider({ children }) {
  const { toast } = useToast();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsReady, setSettingsReady] = useState(false);
  const [campaignReady, setCampaignReady] = useState(false);
  const [campaignId, setCampaignId] = useState(getSelectedCampaignId);
  const [campaignTheme, setCampaignThemeState] = useState(null);
  const [preview, setPreview] = useState(null);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);
  const applied = useRef(new Set());
  const warned = useRef(false);

  const warnOnce = useCallback(() => {
    if (warned.current) return;
    warned.current = true;
    toast({ variant: "destructive", title: "Thème réinitialisé", description: "Un réglage d'apparence était illisible : le thème d'origine est utilisé." });
  }, [toast]);

  const reload = useCallback(async () => {
    try {
      const { settings: loaded, repaired } = await loadAppSettings();
      setSettings(keepIfSame(loaded));
      if (repaired) warnOnce();
    } catch (error) {
      console.error("Lecture des réglages d'apparence impossible :", error);
      warnOnce();
    } finally {
      setSettingsReady(true);
    }
  }, [warnOnce]);

  const reloadCampaignTheme = useCallback(
    async (id) => {
      try {
        const { theme, repaired } = await loadCampaignTheme(id);
        setCampaignThemeState(keepIfSame(theme));
        if (repaired) warnOnce();
      } catch (error) {
        console.error("Lecture du thème de la campagne impossible :", error);
        setCampaignThemeState(null);
      } finally {
        setCampaignReady(true);
      }
    },
    [warnOnce]
  );

  useEffect(() => {
    reload();
  }, [reload]);

  // Le thème suit la campagne choisie, dans n'importe quel onglet (EXG-26).
  useEffect(() => subscribeSelectedCampaign((id) => setCampaignId(id)), []);
  useEffect(() => {
    reloadCampaignTheme(campaignId);
  }, [campaignId, reloadCampaignTheme]);

  // Restauration d'une sauvegarde, modification d'une campagne : on relit les réglages.
  useEffect(
    () =>
      subscribeDataChanged(() => {
        reload();
        reloadCampaignTheme(getSelectedCampaignId());
      }),
    [reload, reloadCampaignTheme]
  );

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const query = window.matchMedia(DARK_QUERY);
    const onChange = () => setSystemDark(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // Tant que les réglages ne sont pas lus, on laisse en place ce que le script de démarrage a appliqué (pas de flash).
  const ready = settingsReady && campaignReady;
  const effectiveTheme = preview ?? campaignTheme ?? settings.theme ?? DEFAULT_THEME;
  const resolved = useMemo(() => resolveTheme(effectiveTheme, { systemDark, settings }), [effectiveTheme, systemDark, settings]);

  useLayoutEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    root.classList.toggle("dark", resolved.appearance === "dark");
    root.style.colorScheme = resolved.appearance;
    for (const name of applied.current) if (!(name in resolved.vars)) root.style.removeProperty(name);
    for (const [name, value] of Object.entries(resolved.vars)) root.style.setProperty(name, value);
    applied.current = new Set(Object.keys(resolved.vars));
    for (const [name, value] of Object.entries(resolved.attrs)) root.setAttribute(name, value);
  }, [resolved, ready]);

  // Cache de démarrage et fond de la fenêtre : seulement pour le thème réellement enregistré (pas pour un aperçu).
  useEffect(() => {
    if (preview || !ready) return;
    try {
      localStorage.setItem(BOOT_KEY, JSON.stringify(buildBootCache(campaignTheme ?? settings.theme, settings)));
    } catch {
      /* stockage indisponible : pas de cache, un flash est possible au prochain démarrage */
    }
    const color = windowBackground(resolved.tokens);
    try {
      window.arcanesTheme?.setWindowBackground?.(color)?.catch?.(() => {});
    } catch {
      /* hors Electron */
    }
  }, [preview, ready, campaignTheme, settings, resolved]);

  const fail = useCallback(
    (error, title) => {
      console.error(`${title} :`, error);
      toast({ variant: "destructive", title, description: "La modification n'a pas été enregistrée." });
    },
    [toast]
  );

  const updateSettings = useCallback(
    async (patch) => {
      try {
        setSettings(keepIfSame(await saveAppSettings(patch)));
      } catch (error) {
        fail(error, "Réglage non enregistré");
      }
    },
    [fail]
  );

  // Ces deux actions laissent remonter l'erreur : la fenêtre d'édition l'affiche et reste ouverte.
  const setDefaultTheme = useCallback(async (theme) => {
    setSettings(keepIfSame(await saveAppSettings({ theme })));
  }, []);

  const setCampaignTheme = useCallback(async (id, theme) => {
    const saved = await saveCampaignTheme(id, theme);
    if (id === getSelectedCampaignId()) setCampaignThemeState(keepIfSame(saved));
  }, []);

  const resetTheme = useCallback(async () => {
    try {
      setSettings(await resetAppSettings());
    } catch (error) {
      fail(error, "Réinitialisation impossible");
    }
  }, [fail]);

  const value = useMemo(
    () => ({
      ready,
      settings,
      effectiveTheme,
      campaignTheme,
      resolved,
      appearance: resolved.appearance,
      updateSettings,
      setDefaultTheme,
      setCampaignTheme,
      previewTheme: setPreview,
      resetTheme,
    }),
    [ready, settings, effectiveTheme, campaignTheme, resolved, updateSettings, setDefaultTheme, setCampaignTheme, resetTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
