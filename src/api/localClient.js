import Dexie from "dexie";

const BASE_TABLES = [
  "Campaign", "Act", "Scene", "NPC", "Location", "Clue", "RollTable", "GameSession", "Note",
];

const RELATION_TABLES = [...BASE_TABLES, "NPCRelation"];
export const TABLES = [...RELATION_TABLES, "GameSheetModel", "GameCharacter", "SkillCatalog", "EquipmentCatalog"];

export const LOCAL_USER = { id: "local-user", email: "local@arcanes", full_name: "MJ", role: "admin" };

export const db = new Dexie("arcanes_scenario");
// La version 1 doit rester déclarée : elle permet de mettre à niveau les bases existantes.
db.version(1).stores(Object.fromEntries(BASE_TABLES.map((t) => [t, "id, campaign_id"])));
db.version(2).stores(Object.fromEntries(RELATION_TABLES.map((t) => [t, "id, campaign_id"])));
db.version(3).stores(Object.fromEntries(TABLES.map((t) => [t, "id, campaign_id"])));

// Demande au navigateur de ne pas effacer les données automatiquement (au mieux).
try {
  navigator.storage?.persist?.();
} catch {
  /* ignoré */
}

const uid = () =>
  globalThis.crypto?.randomUUID?.() ||
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

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

const matches = (row, query) => Object.entries(query || {}).every(([k, v]) => matchValue(row[k], v));

const compare = (a, b) => {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "fr", { numeric: true });
};

const sortRows = (rows, sort) => {
  if (!sort || typeof sort !== "string") return rows;
  const desc = sort.startsWith("-");
  const field = desc ? sort.slice(1) : sort;
  return [...rows].sort((x, y) => (desc ? -1 : 1) * compare(x[field], y[field]));
};

const makeEntity = (name) => {
  const table = db.table(name);

  const select = async (query = {}) => {
    const rows =
      typeof query.campaign_id === "string"
        ? await table.where("campaign_id").equals(query.campaign_id).toArray()
        : await table.toArray();
    return rows.filter((row) => matches(row, query));
  };

  const notFound = (id) =>
    Object.assign(new Error(`Entity ${name} with ID ${id} not found`), { status: 404 });

  return {
    async filter(query = {}, options = {}) {
      const opts = typeof options === "string" ? { sort: options } : options || {};
      let items = sortRows(await select(query), opts.sort);
      if (opts.limit) items = items.slice(0, opts.limit);
      return { items };
    },
    async list(sort, limit) {
      let items = sortRows(await table.toArray(), sort);
      if (limit) items = items.slice(0, limit);
      return items;
    },
    async get(id) {
      const row = await table.get(id);
      if (!row) throw notFound(id);
      return row;
    },
    async create(data) {
      const now = new Date().toISOString();
      const row = {
        ...data,
        id: uid(),
        created_date: now,
        updated_date: now,
        created_by_id: LOCAL_USER.id,
        created_by: LOCAL_USER.email,
      };
      await table.add(row);
      return row;
    },
    async update(id, data) {
      const existing = await table.get(id);
      if (!existing) throw notFound(id);
      const row = { ...existing, ...data, id, updated_date: new Date().toISOString() };
      await table.put(row);
      return row;
    },
    async delete(id) {
      await table.delete(id);
      return { success: true };
    },
    async deleteMany(query = {}) {
      const rows = await select(query);
      await table.bulkDelete(rows.map((r) => r.id));
      return { deleted: rows.length };
    },
    async aggregate({ query = {}, groupBy } = {}) {
      const rows = await select(query);
      const counts = new Map();
      rows.forEach((row) => counts.set(row[groupBy], (counts.get(row[groupBy]) || 0) + 1));
      return { rows: [...counts].map(([key, count]) => ({ [groupBy]: key, count })) };
    },
  };
};

const readAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export const api = {
  entities: Object.fromEntries(TABLES.map((t) => [t, makeEntity(t)])),
  integrations: {
    Core: {
      // Le fichier est stocké dans la base locale sous forme de données (data URL).
      UploadFile: async ({ file }) => ({ file_url: await readAsDataUrl(file) }),
    },
  },
  auth: {
    me: async () => LOCAL_USER,
    isAuthenticated: async () => true,
    logout: () => { },
    redirectToLogin: () => { },
  },
};