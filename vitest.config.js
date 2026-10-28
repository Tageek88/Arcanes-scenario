import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Configuration des tests : séparée de vite.config.js (pas de plugin React, pas de navigateur).
// IndexedDB est simulé par fake-indexeddb : les vraies fonctions de src/ tournent sur une vraie base Dexie, en mémoire.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    setupFiles: ["./tests/setup.js"],
    restoreMocks: true,
  },
});
