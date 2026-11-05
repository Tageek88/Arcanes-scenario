// === SECTION IMPORTS ===
import Dexie from "dexie";

// === SECTION TABLES ===
const BASE_TABLES = [
  "Campaign", "Act", "Scene", "NPC", "Location", "Clue", "RollTable", "GameSession", "Note",
];

const RELATION_TABLES = [...BASE_TABLES, "NPCRelation"];
const VERSION_3_TABLES = [...RELATION_TABLES, "GameSheetModel", "GameCharacter", "SkillCatalog", "EquipmentCatalog"];
const VERSION_4_TABLES = [...VERSION_3_TABLES, "SessionPoll"];
const VERSION_5_TABLES = [...VERSION_4_TABLES, "Quest"];
// PDF de campagne : les informations (CampaignDocument) et le contenu du fichier (CampaignDocumentFile) sont dans deux
// tables, pour que la liste n'ait jamais à charger les fichiers (jusqu'à 50 Mo chacun).
const VERSION_6_TABLES = [...VERSION_5_TABLES, "CampaignDocument", "CampaignDocumentFile"];
// Réglages de l'application (thème par défaut, accessibilité) : une seule ligne, sans campagne.
const VERSION_7_TABLES = [...VERSION_6_TABLES, "AppSettings"];
// Corbeille : copie des éléments supprimés, gardés 30 jours (voir `trashCapture.js`).
export const TABLES = [...VERSION_7_TABLES, "Trash"];
// Tables dont le contenu n'est pas supprimé avec la campagne (la corbeille garde justement ce qu'elle a supprimé).
export const NON_CAMPAIGN_TABLES = ["Campaign", "AppSettings", "Trash"];
// Tables propres à cet appareil : ni dans les sauvegardes, ni dans la sauvegarde automatique, et une restauration les laisse intactes.
export const LOCAL_ONLY_TABLES = ["Trash"];
// Tables lourdes : exclues de la sauvegarde automatique, laissées intactes par une restauration qui ne les contient pas.
export const FILE_TABLES = ["CampaignDocumentFile"];

// === SECTION DATABASE INITIALIZATION ===  
export const db = new Dexie("arcanes_scenario");
db.version(1).stores(Object.fromEntries(BASE_TABLES.map((t) => [t, "id, campaign_id"])));
db.version(2).stores(Object.fromEntries(RELATION_TABLES.map((t) => [t, "id, campaign_id"])));
db.version(3).stores(Object.fromEntries(VERSION_3_TABLES.map((t) => [t, "id, campaign_id"])));
db.version(4).stores(Object.fromEntries(VERSION_4_TABLES.map((t) => [t, "id, campaign_id"])));
db.version(5).stores(Object.fromEntries(VERSION_5_TABLES.map((t) => [t, "id, campaign_id"])));
db.version(6).stores(Object.fromEntries(VERSION_6_TABLES.map((t) => [t, "id, campaign_id"])));
db.version(7).stores(Object.fromEntries(VERSION_7_TABLES.map((t) => [t, "id, campaign_id"])));
db.version(8).stores(Object.fromEntries(TABLES.map((t) => [t, "id, campaign_id"])));

try {
  navigator.storage?.persist?.();
} catch {
  /* ignored */
}
