// === SECTION IMPORTS ===
import { db, TABLES, FILE_TABLES } from "./dbConfig";
import { makeEntity } from "./entityFactory";

// === SECTION UTILS ===
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
      UploadFile: async ({ file }) => ({ file_url: await readAsDataUrl(file) }),
    },
  },
  auth: {
    me: async () => (await import("./localUser")).LOCAL_USER,
    isAuthenticated: async () => true,
    logout: () => {},
    redirectToLogin: () => {},
  },
};

// === SECTION RE-EXPORTS (pour compatibilité avec les 24 fichiers existants) ===
export { db, TABLES, FILE_TABLES };
