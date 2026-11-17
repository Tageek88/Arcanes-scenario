// Built-in game systems are read from JSON files (src/data/systems/*.json), exported with « Exporter ce système ».
// The file name gives the id: metro-2033.json -> builtin-metro-2033. Pure: the files are passed in, nothing is read here.
import { parseSystemFile } from "@/lib/meta/gameSystem.js";

export const builtinIdFromPath = (path) => {
  const base = String(path || "").split("/").pop().replace(/\.json$/i, "");
  const slug = base.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug ? `builtin-${slug}` : "";
};

/**
 * Builds the shipped systems from `{ path: text }`. A shipped system never carries a skill or equipment catalog
 * (rights: only layout, positions, dice and names), whatever the file contains. A bad file is reported, never thrown.
 * @returns {{ systems: object[], problems: string[] }}
 */
export function loadBuiltinSystems(files) {
  const systems = [];
  const problems = [];
  const ids = new Set();
  for (const path of Object.keys(files || {}).sort()) {
    const id = builtinIdFromPath(path);
    if (!id) {
      problems.push(`${path} : nom de fichier inutilisable`);
      continue;
    }
    if (ids.has(id)) {
      problems.push(`${path} : identifiant ${id} déjà pris par un autre fichier`);
      continue;
    }
    const content = files[path];
    const result = parseSystemFile(typeof content === "string" ? content : JSON.stringify(content));
    if (!result.ok) {
      problems.push(`${path} : ${result.error}`);
      continue;
    }
    if (result.issues.length > 0) problems.push(`${path} : ${result.issues.join(", ")}`);
    ids.add(id);
    systems.push({
      id,
      builtin: true,
      name: result.system.name,
      description: result.system.description,
      data: { ...result.system.data, skills: [], equipment: [] },
    });
  }
  return { systems, problems };
}
