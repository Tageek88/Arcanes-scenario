import { useSyncExternalStore } from "react";
import { db, TABLES } from "@/api/localClient";
import { buildBackupPayload } from "@/lib/save/backup";

const DEBOUNCE_MS = 2000;
const MAX_WAIT_MS = 20000;

export const hasAutosave = () => typeof window !== "undefined" && !!window.arcanesBackup;

// ---------- État observable (pour l'affichage dans les Paramètres) ----------

let status = { supported: hasAutosave(), state: "idle", savedAt: null, error: "" };
const listeners = new Set();

const setStatus = (patch) => {
    status = { ...status, ...patch };
    listeners.forEach((listener) => listener());
};

const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

export const useAutosaveStatus = () => useSyncExternalStore(subscribe, () => status);

// ---------- Écriture ----------

let chain = Promise.resolve();

function write(options) {
    chain = chain.then(async () => {
        setStatus({ state: "saving" });
        try {
            const payload = await buildBackupPayload();
            const result = await window.arcanesBackup.write(JSON.stringify(payload), options);
            if (!result?.ok) throw new Error(result?.error || "Écriture impossible.");
            setStatus({ state: "ok", savedAt: result.savedAt, error: "" });
            return result;
        } catch (error) {
            console.error("Sauvegarde automatique :", error);
            const message = error?.message || String(error);
            setStatus({ state: "error", error: message });
            return { ok: false, error: message };
        }
    });
    return chain;
}

let timer = null;
let firstChangeAt = 0;

export function scheduleAutosave() {
    if (!hasAutosave()) return;
    const now = Date.now();
    if (!firstChangeAt) firstChangeAt = now;
    clearTimeout(timer);
    const wait = Math.min(DEBOUNCE_MS, Math.max(0, firstChangeAt + MAX_WAIT_MS - now));
    timer = setTimeout(() => {
        timer = null;
        firstChangeAt = 0;
        write({});
    }, wait);
}

// Écrit tout de suite. { force: true } ajoute aussi un instantané daté.
export async function saveNow(options = {}) {
    if (!hasAutosave()) return { ok: false, error: "Indisponible hors du programme Windows." };
    clearTimeout(timer);
    timer = null;
    firstChangeAt = 0;
    return write(options);
}

let initialized = false;

export function initAutosave() {
    if (initialized || !hasAutosave()) return;
    initialized = true;
    TABLES.forEach((name) => {
        const table = db.table(name);
        table.hook("creating", () => {
            scheduleAutosave();
        });
        table.hook("updating", () => {
            scheduleAutosave();
        });
        table.hook("deleting", () => {
            scheduleAutosave();
        });
    });
}