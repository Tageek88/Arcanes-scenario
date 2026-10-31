import { compareVersions, versionOfPath } from "@/lib/meta/releaseNotes";

// Les notes de version sont embarquées dans l'application au moment de la compilation.
const FILES = import.meta.glob("/Docs/releases/RELEASE-*.md", { query: "?raw", import: "default", eager: true });

/** Versions qui ont une note, de la plus récente à la plus ancienne. */
export const RELEASE_VERSIONS = Object.keys(FILES)
  .map((path) => versionOfPath(path))
  .filter(Boolean)
  .sort((a, b) => compareVersions(b, a));

/** Texte Markdown de la note d'une version, ou "" si elle n'existe pas. */
export function releaseNoteText(version) {
  const path = Object.keys(FILES).find((key) => versionOfPath(key) === version);
  return path ? String(FILES[path] || "") : "";
}
