// === SECTION IMPORTS ===
import Dexie from "dexie";
import { notifyDataChanged } from "@/lib/context/dataEvents";
import { LOCAL_USER } from "@/api/localUser";

// === SECTION TABLES ===
const BASE_TABLES = [
  "Campaign", "Act", "Scene", "NPC", "Location", "Clue", "RollTable", "GameSession", "Note",
];

// === SECTION RELATION TABLES ===
const RELATION_TABLES = [...BASE_TABLES, "NPCRelation"];
const VERSION_3_TABLES = [...RELATION_TABLES, "GameSheetModel", "GameCharacter", "SkillCatalog", "EquipmentCatalog"];
const VERSION_4_TABLES = [...VERSION_3_TABLES, "SessionPoll"];
export const TABLES = [...VERSION_4_TABLES, "Quest"];

// === SECTION DATABASE INITIALIZATION ===  
export const db = new Dexie("arcanes_scenario");
// La version 1 doit rester déclarée : elle permet de mettre à niveau les bases existantes.
db.version(1).stores(Object.fromEntries(BASE_TABLES.map((t) => [t, "id, campaign_id"])));
db.version(2).stores(Object.fromEntries(RELATION_TABLES.map((t) => [t, "id, campaign_id"])));
db.version(3).stores(Object.fromEntries(VERSION_3_TABLES.map((t) => [t, "id, campaign_id"])));
db.version(4).stores(Object.fromEntries(VERSION_4_TABLES.map((t) => [t, "id, campaign_id"])));
db.version(5).stores(Object.fromEntries(TABLES.map((t) => [t, "id, campaign_id"])));

// Demande au navigateur de ne pas effacer les données automatiquement (au mieux).
try {
  navigator.storage?.persist?.();
} catch {
  /* ignoré */
}

// === SECTION UTILS ===
const uid = () =>
  globalThis.crypto?.randomUUID?.() ||
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  // === SECTION MATCHING ===
const matchValue = (actual, expected) => {
  if (expected && typeof expected === "object" && !Array.isArray(expected)) {
    return Object.entries(expected).every(([op, v]) => {
      switch (op) {
        case "$gte": return actual != null && String(actual) >= String(v);
        case "$gt": return actual != null && String(actual) > String(v);
        case "$lte": return actual != null && String(actual) <= String(v);
        case "$lt": return actual != null && String(actual) < String(v);
        case "$ne": return actual !== v;
        case "$in": return Array.isArray(v) && v.includes(actual);
        case "$regex": {
          if (actual == null) return false;
          try {
            return new RegExp(v, expected.$options || "").test(String(actual));
          } catch {
            return String(actual).toLowerCase().includes(String(v).toLowerCase());
          }
        }
        default: return true;
      }
    });
  }
  if (expected === false) return actual === false || actual == null;
  return actual === expected;
};

// === SECTION MATCHING ===
const matches = (row, query) => Object.entries(query || {}).every(([k, v]) => matchValue(row[k], v));

// === SECTION SORTING ===
const compare = (a, b) => {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "fr", { numeric: true });
};

// === SECTION SORTING FUNCTION ===
const sortRows = (rows, sort) => {
  if (!sort || typeof sort !== "string") return rows;
  const desc = sort.startsWith("-");
  const field = desc ? sort.slice(1) : sort;
  return [...rows].sort((x, y) => (desc ? -1 : 1) * compare(x[field], y[field]));
};

// === SECTION ENTITY FACTORY ===
const makeEntity = (name) => {
  const table = db.table(name);
  // === SECTION SELECT FUNCTION ===

  const select = async (query = {}) => {
    const rows =
      typeof query.campaign_id === "string"
        ? await table.where("campaign_id").equals(query.campaign_id).toArray()
        : await table.toArray();
    return rows.filter((row) => matches(row, query));
  };

  // === SECTION NOT FOUND FUNCTION ===
  const notFound = (id) =>
    Object.assign(new Error(`Entity ${name} with ID ${id} not found`), { status: 404 });

  return {
    async filter(query = {}, options = {}) {
      const opts = typeof options === "string" ? { sort: options } : options || {};
      let items = sortRows(await select(query), opts.sort);
      if (opts.limit) items = items.slice(0, opts.limit);
      return { items };
    },

    // === SECTION LIST FUNCTION ===
    async list(sort, limit) {
      let items = sortRows(await table.toArray(), sort);
      if (limit) items = items.slice(0, limit);
      return items;
    },

    // === SECTION GET FUNCTION ===
    async get(id) {
      const row = await table.get(id);
      if (!row) throw notFound(id);
      return row;
    },

    // === SECTION CREATE FUNCTION ===
    async create(data, options = {}) {
      const now = new Date().toISOString();
      const row = {
        ...data,
        id: uid(),
        created_date: now,
        updated_date: now,
        created_by_id: LOCAL_USER.id,
        created_by: LOCAL_USER.email,
      };

      // === SECTION ADDITIONAL METADATA ===
      await table.add(row);
      if (!options.silent) notifyDataChanged();
      return row;
    },

    // === SECTION UPDATE FUNCTION ===
    async update(id, data, options = {}) {
      const existing = await table.get(id);
      if (!existing) throw notFound(id);
      const row = { ...existing, ...data, id, updated_date: new Date().toISOString() };
      await table.put(row);
      if (!options.silent) notifyDataChanged();
      return row;
    },

    // === SECTION DELETE FUNCTION ===
    async delete(id, options = {}) {
      await table.delete(id);
      if (!options.silent) notifyDataChanged();
      return { success: true };
    },

    // === SECTION DELETE MANY FUNCTION ===
    async deleteMany(query = {}, options = {}) {
      const rows = await select(query);
      await table.bulkDelete(rows.map((r) => r.id));
      if (!options.silent) notifyDataChanged();
      return { deleted: rows.length };
    },

    // === SECTION AGGREGATE FUNCTION ===
    async aggregate({ query = {}, groupBy } = {}) {
      const rows = await select(query);
      const counts = new Map();
      rows.forEach((row) => counts.set(row[groupBy], (counts.get(row[groupBy]) || 0) + 1));
      return { rows: [...counts].map(([key, count]) => ({ [groupBy]: key, count })) };
    },
  };
// === END SECTION ENTITY FACTORY ===
};

// === SECTION FILE READER ===
const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  // === SECTION API ===
export const api = {
  entities: Object.fromEntries(TABLES.map((t) => [t, makeEntity(t)])),
  integrations: {
    Core: {
      // Le fichier est stocké dans la base locale sous forme de données (data URL).
      UploadFile: async ({ file }) => ({ file_url: await readAsDataUrl(file) }),
    },
  },

  // === SECTION INTEGRATIONS ===
  auth: {
    me: async () => LOCAL_USER,
    isAuthenticated: async () => true,
    logout: () => { },
    redirectToLogin: () => { },
  },
};