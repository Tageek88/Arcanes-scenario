// Recherche globale, suite : Codex, Notes, Tables et Calendrier prennent aussi l'élément choisi
// quand leur page est déjà affichée (même principe que Home : compteur `usePendingOpenTick`).
// Prérequis : apply-recherche-mobile.mjs a déjà été appliqué (hook et compteur du searchStore).
// Usage (racine du projet) : node apply-recherche-pages.mjs [--check]
import fs from "node:fs";
import path from "node:path";

const CHECK_ONLY = process.argv.includes("--check");
const root = process.cwd();

const IMPORT_LINE = `import { usePendingOpenTick } from "@/hooks/usePendingOpenTick";`;

const CODE_EDITS = {
  "src/pages/Codex.jsx": [
    {
      find: `import { takePendingOpen } from "@/lib/context/searchStore";`,
      replace: `import { takePendingOpen } from "@/lib/context/searchStore";\n${IMPORT_LINE}`,
    },
    {
      find: `  // Élément choisi dans la recherche globale : même chemin qu'un lien interactif (onglet, dépliage, défilement).
  useEffect(() => {`,
      replace: `  // Élément choisi dans la recherche globale : même chemin qu'un lien interactif (onglet, dépliage, défilement).
  const pendingTick = usePendingOpenTick();
  useEffect(() => {`,
    },
    {
      find: `  }, [campaignId]);`,
      replace: `  }, [campaignId, pendingTick]);`,
    },
  ],
  "src/pages/Notes.jsx": [
    {
      find: `import { takePendingOpen } from "@/lib/context/searchStore";`,
      replace: `import { takePendingOpen } from "@/lib/context/searchStore";\n${IMPORT_LINE}`,
    },
    {
      find: `  // Note choisie dans la recherche globale : on l'ouvre dès qu'elle est chargée.
  useEffect(() => {`,
      replace: `  // Note choisie dans la recherche globale : on l'ouvre dès qu'elle est chargée.
  const pendingTick = usePendingOpenTick();
  useEffect(() => {`,
    },
    {
      find: `  }, [allPinned, allNotes]);`,
      replace: `  }, [allPinned, allNotes, pendingTick]);`,
    },
  ],
  "src/pages/Tables.jsx": [
    {
      find: `import { peekPendingOpen, takePendingOpen } from "@/lib/context/searchStore";`,
      replace: `import { peekPendingOpen, takePendingOpen } from "@/lib/context/searchStore";\n${IMPORT_LINE}`,
    },
    {
      find: `  // Table choisie dans la recherche globale : on l'ouvre dès qu'elle est chargée (le filtre de catégorie est levé si besoin).
  useEffect(() => {`,
      replace: `  // Table choisie dans la recherche globale : on l'ouvre dès qu'elle est chargée (le filtre de catégorie est levé si besoin).
  const pendingTick = usePendingOpenTick();
  useEffect(() => {`,
    },
    {
      find: `  }, [loading, tables, category]);`,
      replace: `  }, [loading, tables, category, pendingTick]);`,
    },
  ],
  "src/pages/Calendrier.jsx": [
    {
      find: `import { takePendingOpen } from "@/lib/context/searchStore";`,
      replace: `import { takePendingOpen } from "@/lib/context/searchStore";\n${IMPORT_LINE}`,
    },
    {
      find: `  // Séance choisie dans la recherche globale : son journal s'ouvre dès que les séances sont chargées.
  useEffect(() => {`,
      replace: `  // Séance choisie dans la recherche globale : son journal s'ouvre dès que les séances sont chargées.
  const pendingTick = usePendingOpenTick();
  useEffect(() => {`,
    },
    {
      find: `  }, [journals.all]);`,
      replace: `  }, [journals.all, pendingTick]);`,
    },
  ],
};

const countOccurrences = (text, needle) => text.split(needle).length - 1;

const load = (relative) => {
  const full = path.join(root, relative);
  if (!fs.existsSync(full)) return { error: `introuvable : ${relative}` };
  const raw = fs.readFileSync(full, "utf8");
  const crlf = raw.includes("\r\n");
  return { full, crlf, text: crlf ? raw.replace(/\r\n/g, "\n") : raw };
};

const applyEdits = (text, edits) => {
  const errors = [];
  let result = text;
  edits.forEach((edit, index) => {
    const n = countOccurrences(result, edit.find);
    if (n !== 1) {
      errors.push(`retouche ${index + 1} : ${n} correspondance(s) au lieu d'une (début : « ${edit.find.split("\n")[0].trim()} »)`);
      return;
    }
    result = result.replace(edit.find, () => edit.replace);
  });
  return errors.length ? { errors } : { text: result };
};

const problems = [];
const planned = [];

// Le hook et le compteur doivent déjà exister (premier script).
if (!fs.existsSync(path.join(root, "src/hooks/usePendingOpenTick.js"))) {
  problems.push("src/hooks/usePendingOpenTick.js introuvable : appliquer d'abord apply-recherche-mobile.mjs");
}
const store = load("src/lib/context/searchStore.js");
if (store.error) problems.push(store.error);
else if (!store.text.includes("subscribePendingOpen")) problems.push("searchStore.js n'a pas le compteur : appliquer d'abord apply-recherche-mobile.mjs");

for (const [relative, edits] of Object.entries(CODE_EDITS)) {
  const loaded = load(relative);
  if (loaded.error) {
    problems.push(loaded.error);
    continue;
  }
  if (loaded.text.includes("usePendingOpenTick")) {
    problems.push(`${relative} : déjà modifié`);
    continue;
  }
  const result = applyEdits(loaded.text, edits);
  if (result.errors) result.errors.forEach((e) => problems.push(`${relative} : ${e}`));
  else planned.push({ relative, loaded, text: result.text });
}

if (problems.length) {
  console.error("Aucun fichier modifié. Problèmes :");
  problems.forEach((p) => console.error(" - " + p));
  process.exit(1);
}

if (CHECK_ONLY) {
  console.log("Vérification réussie : toutes les retouches s'appliquent. Rien n'a été écrit.");
  planned.forEach((p) => console.log(" - " + p.relative));
  process.exit(0);
}

planned.forEach((p) => {
  const out = p.loaded.crlf ? p.text.replace(/\n/g, "\r\n") : p.text;
  fs.writeFileSync(p.loaded.full, out, "utf8"); // UTF-8 sans BOM
  console.log("modifié : " + p.relative);
});

console.log("\nTerminé. Contrôle : npm run check; npm run lint; npx eslint src; npm test; npm run build; npx cap sync android");
