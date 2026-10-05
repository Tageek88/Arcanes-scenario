import { db, TABLES } from "@/api/localClient";
import { saveNow } from "@/lib/autosave";

export const deleteAccountData = async () => {
  await saveNow({ force: true });
  await db.transaction("rw", TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) await db.table(t).clear();
  });
  await saveNow();
};