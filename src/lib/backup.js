import { db, TABLES } from "@/api/localClient";

const APP_ID = "arcanes-scenario";
const BACKUP_VERSION = 1;
const MAX_BACKUP_SIZE = 500 * 1024 * 1024;

export function validateBackupPayload(parsed) {
  if (!parsed || typeof parsed !== "object") throw new Error("Fichier de sauvegarde invalide.");
  if (parsed.app !== APP_ID) throw new Error("Ce fichier n'est pas une sauvegarde de cette application.");
  if (parsed.version !== BACKUP_VERSION) throw new Error("Version de sauvegarde incompatible.");
  if (!parsed.data || typeof parsed.data !== "object") throw new Error("Contenu de sauvegarde absent.");

  for (const table of TABLES) {
    const rows = parsed.data[table];
    if (rows != null && !Array.isArray(rows)) {
      throw new Error(`Données de sauvegarde invalides pour ${table}.`);
    }
  }
}

export async function buildBackupPayload() {
  const data = {};
  for (const t of TABLES) data[t] = await db.table(t).toArray();
  return { app: APP_ID, version: BACKUP_VERSION, exported_at: new Date().toISOString(), data };
}

export async function restoreFromPayload(parsed) {
  validateBackupPayload(parsed);
  await db.transaction("rw", TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear();
      const rows = parsed.data[t] || [];
      if (rows.length) await db.table(t).bulkPut(rows);
    }
  });
}

export async function exportBackup() {
  const payload = await buildBackupPayload();
  const json = JSON.stringify(payload, null, 2);
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `arcanes-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function importBackup(file) {
  if (!file || !(file instanceof File)) throw new Error("Aucun fichier sélectionné.");
  if (file.size > MAX_BACKUP_SIZE) throw new Error("Le fichier de sauvegarde est trop volumineux.");
  if (!file.name.toLowerCase().endsWith(".json") && file.type && !file.type.includes("json")) {
    throw new Error("Le fichier doit être un JSON valide.");
  }

  let parsed;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error("Le fichier de sauvegarde est invalide ou corrompu.");
  }

  await restoreFromPayload(parsed);
}