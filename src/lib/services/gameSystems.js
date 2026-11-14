import { api } from "@/api/localClient";
import { missingFromCatalog } from "@/lib/services/gameCatalog";
import { isNativeApp, shareTextFile } from "@/lib/save/nativeShare";
import {
  MAX_SYSTEMS,
  cleanSystemData,
  cleanSystemInfo,
  exportSystemFile,
  modelFieldsFromSystem,
  parseSystemFile,
  systemFileName,
} from "@/lib/meta/gameSystem";
import { getBuiltinSystem } from "@/lib/meta/builtinSystems";

// Systèmes de jeu enregistrés hors campagne : un modèle de fiche réutilisable d'une campagne à l'autre, et partageable
// par fichier. Un système ne contient jamais de personnages ni de contenu de campagne (voir `lib/meta/gameSystem.js`).

const modelOf = async (campaignId) => (await api.entities.GameSheetModel.filter({ campaign_id: campaignId }, { limit: 1 })).items[0] || null;

/** Les systèmes enregistrés, par nom. */
export const listGameSystems = () => api.entities.GameSystem.list("name");

async function createSystem(info, data) {
  const existing = await api.entities.GameSystem.list(undefined, MAX_SYSTEMS + 1);
  if (existing.length >= MAX_SYSTEMS) throw new Error(`Limite atteinte : ${MAX_SYSTEMS} systèmes au plus.`);
  return api.entities.GameSystem.create({ ...cleanSystemInfo(info), data });
}

/** Enregistre le modèle de fiche d'une campagne comme système (une copie : la campagne n'est pas modifiée). */
export async function saveCampaignModelAsSystem(campaignId, info) {
  const row = await modelOf(campaignId);
  if (!row) throw new Error("Cette campagne n'a pas de modèle de fiche.");
  // Le système emporte aussi les compétences et équipements du catalogue de la campagne.
  const [skills, equipment] = await Promise.all([
    api.entities.SkillCatalog.filter({ campaign_id: campaignId }, { limit: 1000 }),
    api.entities.EquipmentCatalog.filter({ campaign_id: campaignId }, { limit: 1000 }),
  ]);
  const data = cleanSystemData({ ...row, skills: skills.items, equipment: equipment.items });
  if (data.characteristics.length === 0) throw new Error("Le modèle de cette campagne n'a aucune caractéristique.");
  return createSystem(info, data);
}

/**
 * Copie un système dans une campagne : son modèle de fiche est créé, ou remplacé s'il existe. Les personnages ne sont pas
 * touchés : ils gardent leurs valeurs, mais seules les caractéristiques de même nom s'affichent. Les compétences et
 * équipements du système sont ajoutés au catalogue de la campagne ; ceux qui y sont déjà (même nom) ne sont ni modifiés ni doublés.
 * @returns {Promise<{ replaced: boolean, skills: number, equipment: number }>} `skills` et `equipment` : entrées ajoutées au catalogue
 */
export async function applyGameSystemToCampaign(systemId, campaignId) {
  return applySystemDataToCampaign(await api.entities.GameSystem.get(systemId), campaignId);
}

/** Même copie pour un système déjà lu (enregistré ou fourni avec l'application). */
export async function applySystemDataToCampaign(system, campaignId) {
  const fields = modelFieldsFromSystem(system);
  if (fields.characteristics.length === 0) throw new Error("Ce système ne contient aucune caractéristique.");
  // Les catalogues ne font pas partie de la ligne du modèle : ils vont dans les catalogues de la campagne.
  const { skills, equipment, ...modelFields } = fields;
  const existing = await modelOf(campaignId);
  if (existing) await api.entities.GameSheetModel.update(existing.id, modelFields);
  else await api.entities.GameSheetModel.create({ campaign_id: campaignId, ...modelFields });
  return { replaced: Boolean(existing), ...(await addCatalogItems(campaignId, skills, equipment)) };
}

/** Ajoute aux catalogues de la campagne les compétences et équipements qui n'y sont pas (comparaison sans tenir compte de la casse). */
async function addCatalogItems(campaignId, skills, equipment) {
  const [skillRes, equipmentRes] = await Promise.all([
    api.entities.SkillCatalog.filter({ campaign_id: campaignId }, { limit: 1000 }),
    api.entities.EquipmentCatalog.filter({ campaign_id: campaignId }, { limit: 1000 }),
  ]);
  const newSkills = missingFromCatalog(skillRes.items.map((item) => item.name), skills);
  const newEquipment = missingFromCatalog(equipmentRes.items.map((item) => item.name), equipment);
  for (const skill of newSkills) await api.entities.SkillCatalog.create({ campaign_id: campaignId, ...skill });
  for (const item of newEquipment) await api.entities.EquipmentCatalog.create({ campaign_id: campaignId, ...item });
  return { skills: newSkills.length, equipment: newEquipment.length };
}

const builtinOrThrow = (id) => {
  const system = getBuiltinSystem(id);
  if (!system) throw new Error("Ce système fourni n'existe plus.");
  return system;
};

/** Copie un système fourni avec l'application dans une campagne (voir `applyGameSystemToCampaign`). */
export async function applyBuiltinSystemToCampaign(id, campaignId) {
  return applySystemDataToCampaign(builtinOrThrow(id), campaignId);
}

/** Ajoute un système fourni à ceux de l'utilisateur, pour l'adapter ou l'exporter. */
export async function copyBuiltinSystem(id) {
  const system = builtinOrThrow(id);
  return createSystem(system, cleanSystemData(system.data));
}

/** Change le nom et la description d'un système. */
export const updateGameSystemInfo = (id, info) => api.entities.GameSystem.update(id, cleanSystemInfo(info));

/** Supprime un système (les campagnes qui l'ont utilisé gardent leur copie). */
export const deleteGameSystem = (id) => api.entities.GameSystem.delete(id);

/** Lit un fichier de système choisi par l'utilisateur et l'enregistre. Ne lève pas d'erreur : { ok, system, issues, error }. */
export async function importGameSystemFromFile(file) {
  if (!file) return { ok: false, system: null, issues: [], error: "Aucun fichier sélectionné." };
  try {
    const result = parseSystemFile(await file.text(), file.size);
    if (!result.ok) return result;
    const system = await createSystem(result.system, result.system.data);
    return { ...result, system };
  } catch (error) {
    console.error("Import du système de jeu impossible :", error);
    return { ok: false, system: null, issues: [], error: error?.message || "Le fichier n'a pas pu être lu." };
  }
}

/** Remet un système à l'utilisateur sous forme de fichier JSON (partage sur Android, téléchargement ailleurs). */
export async function exportGameSystem(system) {
  const text = exportSystemFile(system);
  const fileName = systemFileName(system?.name);
  if (isNativeApp()) {
    try {
      return await shareTextFile(text, fileName, "Système de jeu Arcanes & Scénario");
    } catch (error) {
      console.warn("Échec du partage natif, tentative via téléchargement :", error);
    }
  }
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
