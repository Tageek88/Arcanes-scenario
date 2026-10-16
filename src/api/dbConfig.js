// === SECTION IMPORTS ===
import Dexie from "dexie";

// === SECTION TABLES ===
const BASE_TABLES = [
  "Campaign", "Act", "Scene", "NPC", "Location", "Clue", "RollTable", "GameSession", "Note",
];

const RELATION_TABLES = [...BASE_TABLES, "NPCRelation"];
const VERSION_3_TABLES = [...RELATION_TABLES, "GameSheetModel", "GameCharacter", "SkillCatalog", "EquipmentCatalog"];
const VERSION_4_TABLES = [...VERSION_3_TABLES, "SessionPoll"];
export const TABLES = [...VERSION_4_TABLES, "Quest"];

// === SECTION DATABASE INITIALIZATION ===  
export const db = new Dexie("arcanes_scenario");
db.version(1).stores(Object.fromEntries(BASE_TABLES.map((t) => [t, "id, campaign_id"])));
db.version(2).stores(Object.fromEntries(RELATION_TABLES.map((t) => [t, "id, campaign_id"])));
db.version(3).stores(Object.fromEntries(VERSION_3_TABLES.map((t) => [t, "id, campaign_id"])));
db.version(4).stores(Object.fromEntries(VERSION_4_TABLES.map((t) => [t, "id, campaign_id"])));
db.version(5).stores(Object.fromEntries(TABLES.map((t) => [t, "id, campaign_id"])));

try {
  navigator.storage?.persist?.();
} catch {
  /* ignored */
}
