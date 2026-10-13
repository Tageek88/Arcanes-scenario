// Vérifie ce que le build, le lint et le typecheck ne voient pas :
//  1. imports qui ne pointent vers aucun fichier (y compris dans les fichiers que le build ignore
//     parce qu'ils ne sont importés par personne), avec contrôle de la casse du nom
//  2. fichiers qui utilisent `api` sans l'importer (page blanche à l'exécution)
//  3. informatif : pages qui appellent encore `api` directement (reste à migrer vers un hook)
//
// Usage (à la racine du projet) : node scripts/check-refactor.mjs
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve, relative, sep } from "node:path";

const SRC = resolve("src");
const CODE = /\.(js|jsx|ts|tsx)$/;
const EXT = [".js", ".jsx", ".ts", ".tsx", ".cjs", ".mjs", ".json", ".css"];

const listCache = new Map();
const list = (dir) => {
  if (!listCache.has(dir)) listCache.set(dir, existsSync(dir) ? readdirSync(dir) : []);
  return listCache.get(dir);
};

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return CODE.test(name) ? [full] : [];
  });
}

// Existence avec la casse exacte (Windows ne la distingue pas, Linux et macOS oui).
function fileExistsExact(path) {
  const parts = relative(SRC, path).split(sep);
  let current = SRC;
  for (const part of parts) {
    if (!list(current).includes(part)) return false;
    current = join(current, part);
  }
  return statSync(current).isFile();
}

function resolvesTo(spec, fromFile) {
  const clean = spec.split("?")[0];
  let base;
  if (clean.startsWith("@/")) base = join(SRC, clean.slice(2));
  else if (clean.startsWith(".")) base = resolve(dirname(fromFile), clean);
  else return true; // paquet npm
  const candidates = [base, ...EXT.map((e) => base + e), ...EXT.map((e) => join(base, "index" + e))];
  return candidates.some((c) => c.startsWith(SRC) && existsSync(c) && fileExistsExact(c));
}

const IMPORT_RE = /(?:import|export)\s[^'"]*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|import\s*["']([^"']+)["']/g;
const API_USE = /\bapi\.(entities|auth|integrations)\b|\bapi\[/;
const API_IMPORT = /import\s*\{[^}]*\bapi\b[^}]*\}\s*from/;

const files = walk(SRC);
const unresolved = [];
const missingApiImport = [];
const pagesUsingApi = [];

for (const file of files) {
  const rel = relative(process.cwd(), file);
  const text = readFileSync(file, "utf8");

  for (const match of text.matchAll(IMPORT_RE)) {
    const spec = match[1] || match[2] || match[3];
    if (spec && !resolvesTo(spec, file)) unresolved.push(`${rel}  ->  ${spec}`);
  }

  const isClient = rel.split(sep).join("/").endsWith("src/api/localClient.js");
  if (!isClient && API_USE.test(text)) {
    if (!API_IMPORT.test(text)) missingApiImport.push(rel);
    if (rel.split(sep).join("/").startsWith("src/pages/")) pagesUsingApi.push(rel);
  }
}

const show = (title, items) => {
  console.log(`\n${title} : ${items.length}`);
  items.forEach((item) => console.log(`  - ${item}`));
};

show("1. Imports qui ne pointent vers aucun fichier", unresolved);
show("2. Fichiers qui utilisent `api` sans l'importer", missingApiImport);
show("3. (info) Pages qui appellent encore `api` directement", pagesUsingApi);

console.log(`\n${files.length} fichiers analysés.`);
process.exit(unresolved.length || missingApiImport.length ? 1 : 0);
