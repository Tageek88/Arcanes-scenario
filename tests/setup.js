// Chargé avant chaque fichier de test : simule IndexedDB, puis vide toutes les tables avant chaque test.
import "fake-indexeddb/auto";
import { beforeEach } from "vitest";
import { db, TABLES } from "@/api/localClient";

beforeEach(async () => {
  for (const table of TABLES) await db.table(table).clear();
});
