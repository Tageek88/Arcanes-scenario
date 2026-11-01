import { createContext, useContext } from "react";
import { resolveTheme } from "@/lib/theme/resolve";
import { DEFAULT_SETTINGS, DEFAULT_THEME } from "@/lib/theme/tokens";

export const ThemeContext = createContext(null);

const NOOP = async () => {};
const FALLBACK = {
  ready: false,
  settings: DEFAULT_SETTINGS,
  effectiveTheme: DEFAULT_THEME,
  campaignTheme: null,
  resolved: resolveTheme(DEFAULT_THEME),
  appearance: "dark",
  updateSettings: NOOP,
  setDefaultTheme: NOOP,
  setCampaignTheme: NOOP,
  previewTheme: () => {},
  resetTheme: NOOP,
};

/** Thème actif et réglages d'apparence. Sans fournisseur : valeurs d'origine, aucune action. */
export const useAppTheme = () => useContext(ThemeContext) || FALLBACK;
