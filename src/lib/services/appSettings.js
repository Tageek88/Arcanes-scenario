import { api, db } from "@/api/localClient";
import { DEFAULT_SETTINGS, SETTINGS_ID } from "@/lib/theme/tokens";
import { sanitizeSettings, validateTheme } from "@/lib/theme/validate";

// Réglages de l'application (table AppSettings, une seule ligne) et thème d'une campagne (champ `theme` de Campaign).
// Une donnée illisible ne fait jamais planter l'application : on revient aux valeurs d'origine et on le signale (EXG-114).

const TABLE = "AppSettings";

/**
 * @returns {Promise<{ settings: typeof DEFAULT_SETTINGS, repaired: boolean }>}
 */
export async function loadAppSettings() {
  const row = await db.table(TABLE).get(SETTINGS_ID);
  return sanitizeSettings(row);
}

/**
 * Enregistre une partie des réglages (le reste est conservé) et renvoie les réglages à jour.
 * @param {Partial<typeof DEFAULT_SETTINGS>} patch
 */
export async function saveAppSettings(patch) {
  return db.transaction("rw", [TABLE], async () => {
    const current = sanitizeSettings(await db.table(TABLE).get(SETTINGS_ID)).settings;
    const { settings } = sanitizeSettings({ ...current, ...patch });
    await db.table(TABLE).put(settings);
    return settings;
  });
}

/** Remet les réglages d'origine (thème par défaut compris). */
export async function resetAppSettings() {
  await db.table(TABLE).delete(SETTINGS_ID);
  return DEFAULT_SETTINGS;
}

/**
 * Thème propre à une campagne, ou null (pas de thème de campagne : le thème par défaut s'applique).
 * @returns {Promise<{ theme: any | null, repaired: boolean }>}
 */
export async function loadCampaignTheme(campaignId) {
  if (!campaignId) return { theme: null, repaired: false };
  let campaign;
  try {
    campaign = await api.entities.Campaign.get(campaignId);
  } catch {
    return { theme: null, repaired: false };
  }
  if (campaign?.theme == null) return { theme: null, repaired: false };
  const { theme, valid } = validateTheme(campaign.theme);
  return { theme, repaired: !valid };
}

/** Enregistre (ou retire, avec null) le thème d'une campagne. */
export async function saveCampaignTheme(campaignId, theme) {
  if (!campaignId) throw new Error("Aucune campagne sélectionnée.");
  const value = theme == null ? null : validateTheme(theme).theme;
  await api.entities.Campaign.update(campaignId, { theme: value });
  return value;
}
