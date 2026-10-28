#!/usr/bin/env node
// === INVENTAIRE DES FONCTIONS RÉELLES ===
// Lit le code (src/), sans rien modifier, et écrit un rapport Markdown dans Docs/inventaire-<date>.md :
//   1. fichiers orphelins (jamais importés depuis main.jsx)
//   2. exports jamais utilisés ailleurs
//   3. par page : composants, hooks, tables de données utilisées, boutons et libellés visibles
//   4. comparaison avec Docs/Fonctionnalites.md (et les notes de version) : annoncé mais introuvable / présent mais non documenté
// Les points 2 et 4 sont des indices (analyse par texte, pas par exécution) : ils se vérifient à la main.
//
// Usage : npm run inventaire            (rapport daté, refuse d'écraser un rapport existant)
//         npm run inventaire -- --force (écrase le rapport du jour)
//         node scripts/inventaire.mjs --root chemin/du/projet

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const rootIndex = args.indexOf("--root");
const ROOT = path.resolve(rootIndex >= 0 ? args[rootIndex + 1] : process.cwd());
const SRC = path.join(ROOT, "src");
if (!fs.existsSync(SRC)) {
  console.error(`Dossier src introuvable dans ${ROOT}. Lancez la commande à la racine du projet.`);
  process.exit(1);
}

// ---------- lecture des fichiers ----------
const CODE = /\.(jsx?|mjs|cjs)$/;
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : walk(full);
    return CODE.test(entry.name) ? [full] : [];
  });
}
const rel = (file) => path.relative(ROOT, file).split(path.sep).join("/");
const files = walk(SRC);
const text = new Map(files.map((file) => [file, fs.readFileSync(file, "utf8")]));

function resolveImport(from, spec) {
  let base;
  if (spec.startsWith("@/")) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else return null;
  const tries = [base, ...[".js", ".jsx", ".mjs"].map((ext) => base + ext), ...["index.js", "index.jsx"].map((name) => path.join(base, name))];
  return tries.find((candidate) => text.has(candidate)) || null;
}

const IMPORT_RE = /(?:import|export)\s+(?:[^'"()]*?\s+from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;
const graph = new Map(); // fichier -> Set(fichiers importés)
const importedNames = new Map(); // fichier cible -> Set(noms importés ailleurs)
for (const [file, source] of text) {
  const targets = new Set();
  for (const match of source.matchAll(IMPORT_RE)) {
    const target = resolveImport(file, match[1] || match[2]);
    if (target) targets.add(target);
  }
  graph.set(file, targets);
  for (const match of source.matchAll(/import\s+([^'"]+?)\s+from\s+["']([^"']+)["']/g)) {
    const target = resolveImport(file, match[2]);
    if (!target) continue;
    const set = importedNames.get(target) || new Set();
    const clause = match[1];
    if (/^\*\s+as/.test(clause)) set.add("*");
    const def = clause.match(/^([A-Za-z_$][\w$]*)\s*(,|$)/);
    if (def) set.add("default");
    for (const named of (clause.match(/\{([^}]*)\}/)?.[1] || "").split(",")) {
      const name = named.trim().split(/\s+as\s+/)[0].trim();
      if (name) set.add(name);
    }
    importedNames.set(target, set);
  }
  for (const match of source.matchAll(/export\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/g)) {
    const target = resolveImport(file, match[2]);
    if (!target) continue;
    const set = importedNames.get(target) || new Set();
    for (const named of match[1].split(",")) set.add(named.trim().split(/\s+as\s+/)[0].trim());
    importedNames.set(target, set);
  }
}

// ---------- 1. orphelins ----------
const entries = ["main.jsx", "main.js"].map((name) => path.join(SRC, name)).filter((file) => text.has(file));
const reached = new Set(entries);
const queue = [...entries];
while (queue.length) {
  for (const next of graph.get(queue.pop()) || []) {
    if (!reached.has(next)) { reached.add(next); queue.push(next); }
  }
}
const orphans = files.filter((file) => !reached.has(file)).map(rel).sort();

// ---------- 2. exports inutilisés ----------
const unusedExports = [];
for (const file of files) {
  if (!reached.has(file)) continue;
  const used = importedNames.get(file) || new Set();
  if (used.has("*")) continue;
  const names = [];
  for (const match of text.get(file).matchAll(/^export\s+(?:async\s+)?(?:function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/gm)) names.push(match[1]);
  for (const match of text.get(file).matchAll(/^export\s*\{([^}]*)\}\s*;?\s*$/gm)) {
    for (const part of match[1].split(",")) { const n = part.trim().split(/\s+as\s+/).pop().trim(); if (n) names.push(n); }
  }
  for (const name of names) {
    if (used.has(name)) continue;
    // utilisé dans son propre fichier = export inutile mais pas du code mort ; on ne le signale pas
    const own = text.get(file).match(new RegExp(`\\b${name.replace(/\$/g, "\\$")}\\b`, "g")) || [];
    if (own.length > 1) continue;
    unusedExports.push(`${rel(file)} → ${name}`);
  }
}
unusedExports.sort();

// ---------- 3. pages ----------
const pageFiles = files.filter((file) => rel(file).startsWith("src/pages/") && /\.jsx$/.test(file)).sort();
const closure = (start) => {
  const seen = new Set([start]);
  const stack = [start];
  while (stack.length) for (const next of graph.get(stack.pop()) || []) if (!seen.has(next)) { seen.add(next); stack.push(next); }
  return seen;
};
const entityRe = /(?:api\.entities|entities)\.([A-Z][A-Za-z]+)/g;
const labelRe = /(?:title|aria-label|label|placeholder)=["']([^"'{}]{3,60})["']|>\s*([A-ZÀ-Ý][^<>{}\n]{2,60}?)\s*</g;
const pages = pageFiles.map((file) => {
  const set = closure(file);
  const used = [...set];
  const entities = new Set();
  const labels = new Set();
  for (const f of used) {
    for (const m of text.get(f).matchAll(entityRe)) entities.add(m[1]);
    if (f === file || rel(f).startsWith("src/components/")) {
      for (const m of text.get(f).matchAll(labelRe)) labels.add((m[1] || m[2]).trim());
    }
  }
  return {
    name: path.basename(file, ".jsx"),
    file: rel(file),
    components: used.filter((f) => rel(f).startsWith("src/components/") && !rel(f).includes("/ui/")).map(rel).sort(),
    hooks: used.filter((f) => rel(f).startsWith("src/hooks/")).map(rel).sort(),
    services: used.filter((f) => rel(f).startsWith("src/lib/services/")).map(rel).sort(),
    entities: [...entities].sort(),
    labels: [...labels].sort((a, b) => a.localeCompare(b, "fr")),
  };
});

// ---------- 4. comparaison avec la documentation ----------
const norm = (value) => String(value).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const STOP = new Set("avec dans pour cette comme leurs entre aussi sans plus sont mais tout tous elle elles vous nous leur ainsi ceux celui peut peuvent doit doivent depuis chaque autre autres selon vers lors ensuite apres avant etre avoir fait faire fonction fonctions page pages application appli permet permettent possible rapide simple nouveau nouvelle nouveaux".split(" "));
const words = (line) => [...new Set(norm(line).match(/[a-z0-9]{5,}/g) || [])].filter((w) => !STOP.has(w));
const corpus = norm([...text.values()].join("\n"));

const docPath = ["Docs/Fonctionnalites.md", "docs/Fonctionnalites.md", "Docs/fonctionnalites.md"].map((p) => path.join(ROOT, p)).find((p) => fs.existsSync(p));
const releaseFiles = [];
for (const dir of ["Docs", "docs", "."]) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) continue;
  for (const name of fs.readdirSync(full)) if (/^(RELEASE|CHANGELOG|release-notes)/i.test(name) && /\.md$/i.test(name)) releaseFiles.push(path.join(full, name));
}
const claims = [];
for (const source of [docPath, ...releaseFiles].filter(Boolean)) {
  for (const raw of fs.readFileSync(source, "utf8").split(/\r?\n/)) {
    const line = raw.replace(/^[\s>*\-+\d.)]+/, "").replace(/[*_`#]/g, "").trim();
    if (!/^\s*([-*+]|\d+[.)])\s+/.test(raw) || line.length < 12) continue;
    const significant = words(line);
    if (significant.length < 2) continue;
    const found = significant.filter((w) => corpus.includes(w)).length;
    claims.push({ source: path.basename(source), line, ratio: found / significant.length, missing: significant.filter((w) => !corpus.includes(w)) });
  }
}
const missing = claims.filter((claim) => claim.ratio < 0.5).sort((a, b) => a.ratio - b.ratio);

const docNorm = docPath ? norm(fs.readFileSync(docPath, "utf8")) : "";
const undocumented = [];
if (docPath) {
  for (const page of pages) {
    const absent = page.labels.filter((label) => {
      const ws = words(label);
      return ws.length > 0 && ws.every((w) => !docNorm.includes(w));
    });
    if (absent.length) undocumented.push({ page: page.name, labels: absent });
  }
}

// ---------- rapport ----------
const today = new Date().toISOString().slice(0, 10);
const out = [];
const list = (items, empty = "_Aucun._") => (items.length ? items.map((item) => `- ${item}`) : [empty]);
out.push(`# Inventaire des fonctions réelles — ${today}`, "");
out.push(`Généré par \`scripts/inventaire.mjs\` : ${files.length} fichiers lus dans \`src/\`. Rien n'a été modifié.`);
out.push("Les sections 2 et 4 sont des **indices** à vérifier à la main (analyse du texte du code, pas exécution).", "");
out.push("## Résumé", "");
out.push(`- Fichiers orphelins : **${orphans.length}**`, `- Exports jamais utilisés ailleurs : **${unusedExports.length}**`);
out.push(`- Pages : **${pages.length}**`);
out.push(docPath ? `- Annoncé dans les docs mais introuvable dans le code : **${missing.length}** sur ${claims.length} lignes lues` : "- Docs/Fonctionnalites.md introuvable : comparaison ignorée");
out.push(docPath ? `- Libellés présents dans l'interface mais absents de Fonctionnalites.md : **${undocumented.reduce((n, p) => n + p.labels.length, 0)}**` : "", "");
out.push("## 1. Fichiers orphelins", "", "Jamais importés, directement ou non, depuis `src/main.jsx` : à supprimer ou à brancher.", "", ...list(orphans), "");
out.push("## 2. Exports jamais utilisés ailleurs", "", "Peut être du code mort (à confirmer : un export utilisé seulement par un test ou par un script n'est pas vu).", "", ...list(unusedExports), "");
out.push("## 3. Pages : ce que chacune utilise", "");
for (const page of pages) {
  out.push(`### ${page.name}  (\`${page.file}\`)`, "");
  out.push(`- Données : ${page.entities.join(", ") || "aucune"}`);
  out.push(`- Hooks : ${page.hooks.map((h) => path.basename(h, ".js")).join(", ") || "aucun"}`);
  out.push(`- Services : ${page.services.map((s) => path.basename(s, ".js")).join(", ") || "aucun"}`);
  out.push(`- ${page.components.length} composants`);
  out.push(`- Libellés visibles (titres, boutons, aides) : ${page.labels.join(" · ") || "aucun repéré"}`, "");
}
out.push("## 4. Comparaison avec la documentation", "");
if (docPath) {
  out.push(`Sources lues : ${[docPath, ...releaseFiles].map((p) => `\`${rel(p)}\``).join(", ")}.`, "");
  out.push("### Annoncé mais introuvable (mots-clés absents du code)", "", "Une ligne ressort ici si moins de la moitié de ses mots importants existe dans le code. À tester, ou à corriger dans la doc.", "");
  out.push(...list(missing.map((c) => `[${c.source}] ${c.line}  — mots absents : ${c.missing.join(", ")}`)), "");
  out.push("### Présent dans l'interface mais non documenté", "");
  out.push(...(undocumented.length ? undocumented.flatMap((u) => [`- **${u.page}** : ${u.labels.join(" · ")}`]) : ["_Aucun._"]), "");
} else {
  out.push("`Docs/Fonctionnalites.md` introuvable : placez-le dans `Docs/` puis relancez.", "");
}

const dir = path.join(ROOT, "Docs");
fs.mkdirSync(dir, { recursive: true });
const target = path.join(dir, `inventaire-${today}.md`);
if (fs.existsSync(target) && !flag("--force")) {
  console.error(`Le rapport ${rel(target)} existe déjà : rien n'a été écrit. Relancez avec --force pour l'écraser.`);
  process.exit(2);
}
fs.writeFileSync(target, out.join("\n"), "utf8");
console.log(`Rapport écrit : ${rel(target)}`);
console.log(`Orphelins : ${orphans.length} · exports inutilisés : ${unusedExports.length} · annoncé introuvable : ${docPath ? missing.length : "n/a"}`);
console.log("Pour une vérification plus poussée des orphelins : npx madge --orphans src");
