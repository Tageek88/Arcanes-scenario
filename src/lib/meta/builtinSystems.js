// Game systems shipped with the application (no artwork: only names, links, rules and a layout).
// A shipped system has the same shape as a saved one ({ id, name, description, data }) plus `builtin: true`;
// the user copies it into a campaign or into their own systems, then adapts it freely.
// They are read from the JSON files of src/data/systems (see Docs/Ajouter-un-systeme.md): to ship a system, drop its export there.
import { loadBuiltinSystems } from "@/lib/meta/builtinFiles.js";

const files = import.meta.glob("../../data/systems/*.json", { query: "?raw", import: "default", eager: true });
const loaded = loadBuiltinSystems(files);

/** Files of src/data/systems that could not be used (empty when everything is fine). */
export const BUILTIN_PROBLEMS = loaded.problems;
for (const problem of BUILTIN_PROBLEMS) console.error("Système fourni ignoré : " + problem);

export const BUILTIN_SYSTEMS = loaded.systems;

/** A shipped system by id, or null. */
export const getBuiltinSystem = (id) => BUILTIN_SYSTEMS.find((system) => system.id === id) || null;
