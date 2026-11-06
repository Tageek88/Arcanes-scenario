// Recherche globale : l'élément choisi s'ouvre aussi quand la page est déjà affichée (mobile),
// et l'acte replié qui contient la scène se rouvre.
// Usage (racine du projet) : node apply-recherche-mobile.mjs [--check]
// --check : vérifie que toutes les retouches s'appliquent, sans rien écrire.
import fs from "node:fs";
import path from "node:path";

const CHECK_ONLY = process.argv.includes("--check");
const root = process.cwd();

const HOOK_PATH = "src/hooks/usePendingOpenTick.js";
const HOOK_CONTENT = `import { useSyncExternalStore } from "react";
import { getPendingVersion, subscribePendingOpen } from "@/lib/context/searchStore";

/** Change à chaque élément choisi dans la recherche globale : à mettre dans les dépendances de l'effet qui le prend. */
export function usePendingOpenTick() {
  return useSyncExternalStore(subscribePendingOpen, getPendingVersion);
}
`;

// Chaque retouche : { find, replace } ; \`find\` doit apparaître exactement une fois.
const CODE_EDITS = {
  "src/lib/context/searchStore.js": [
    {
      find: `export const setPendingOpen = (kind, id) => {
  pending = { kind, id, at: Date.now() };
};`,
      replace: `// Compteur incrémenté à chaque nouvelle demande : une page déjà affichée (ou gardée en mémoire par la pile
// d'onglets) peut ainsi relancer son effet même si ses données n'ont pas changé.
let pendingVersion = 0;
const pendingListeners = new Set();

export const subscribePendingOpen = (listener) => {
  pendingListeners.add(listener);
  return () => pendingListeners.delete(listener);
};

export const getPendingVersion = () => pendingVersion;

export const setPendingOpen = (kind, id) => {
  pending = { kind, id, at: Date.now() };
  pendingVersion += 1;
  pendingListeners.forEach((listener) => listener());
};`,
    },
  ],
  "src/pages/Home.jsx": [
    {
      find: `import { takePendingOpen } from "@/lib/context/searchStore";`,
      replace: `import { takePendingOpen } from "@/lib/context/searchStore";
import { usePendingOpenTick } from "@/hooks/usePendingOpenTick";`,
    },
    {
      find: `  // Scène ou acte choisi dans la recherche globale : on affiche sa quête, puis on déplie la scène.
  useEffect(() => {`,
      replace: `  // Scène ou acte choisi dans la recherche globale : on affiche sa quête, puis on déplie la scène.
  const pendingTick = usePendingOpenTick();
  useEffect(() => {`,
    },
    {
      find: `  }, [allScenes, allActs]);`,
      replace: `  }, [allScenes, allActs, pendingTick]);`,
    },
  ],
  "src/components/home/MobileSceneList.jsx": [
    {
      find: `import React from "react";`,
      replace: `import React, { useEffect, useState } from "react";`,
    },
    {
      find: `  if (groups.length === 0) {`,
      replace: `  // Actes repliés par la personne : tout est déplié par défaut.
  const [closedGroups, setClosedGroups] = useState([]);
  const openGroups = groups.map((g) => g.id).filter((id) => !closedGroups.includes(id));

  // Une scène sélectionnée (par exemple depuis la recherche) rouvre son acte s'il était replié.
  useEffect(() => {
    if (!activeSceneId) return;
    const group = groups.find((g) => g.scenes.some((s) => s.id === activeSceneId));
    if (group) setClosedGroups((current) => (current.includes(group.id) ? current.filter((id) => id !== group.id) : current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSceneId]);

  if (groups.length === 0) {`,
    },
    {
      find: `<Accordion type="multiple" defaultValue={groups.map((g) => g.id)} className="stack-y-3">`,
      replace: `<Accordion
        type="multiple"
        value={openGroups}
        onValueChange={(next) => setClosedGroups(groups.map((g) => g.id).filter((id) => !next.includes(id)))}
        className="stack-y-3"
      >`,
    },
  ],
};

// Documentation : si une retouche ne s'applique pas, on l'ignore avec un avertissement.
const DOC_EDITS = {
  "AGENTS.md": [
    {
      find: "UI helper (no data access): `useConfirm`.",
      replace: "UI helpers (no data access): `useConfirm`, `usePendingOpenTick` (changes at each item chosen in the global search, so an already displayed page re-runs its `takePendingOpen` effect).",
    },
  ],
  "architecture.md": [
    {
      find: 'H_UI["useConfirm<br/>(confirmations, sans données)"]',
      replace: 'H_UI["useConfirm, usePendingOpenTick<br/>(sans données)"]',
    },
  ],
};

const countOccurrences = (text, needle) => text.split(needle).length - 1;

// Lit un fichier, travaille en LF, mémorise ses fins de ligne d'origine.
const load = (relative) => {
  const full = path.join(root, relative);
  if (!fs.existsSync(full)) return { error: `introuvable : ${relative}` };
  const raw = fs.readFileSync(full, "utf8");
  const crlf = raw.includes("\r\n");
  return { full, crlf, text: crlf ? raw.replace(/\r\n/g, "\n") : raw, hadBom: raw.charCodeAt(0) === 0xfeff };
};

// Applique les retouches d'un fichier ; renvoie { text } ou { errors }.
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

const write = (loaded, text) => {
  const out = loaded.crlf ? text.replace(/\n/g, "\r\n") : text;
  fs.writeFileSync(loaded.full, out, "utf8"); // UTF-8 sans BOM
};

// --- Code : tout ou rien ---
const problems = [];
const planned = [];

for (const [relative, edits] of Object.entries(CODE_EDITS)) {
  const loaded = load(relative);
  if (loaded.error) {
    problems.push(loaded.error);
    continue;
  }
  const result = applyEdits(loaded.text, edits);
  if (result.errors) result.errors.forEach((e) => problems.push(`${relative} : ${e}`));
  else planned.push({ relative, loaded, text: result.text });
}

const hookFull = path.join(root, HOOK_PATH);
if (fs.existsSync(hookFull)) problems.push(`${HOOK_PATH} existe déjà : rien n'est écrasé`);

if (problems.length) {
  console.error("Aucun fichier modifié. Problèmes :");
  problems.forEach((p) => console.error(" - " + p));
  process.exit(1);
}

if (CHECK_ONLY) {
  console.log("Vérification réussie : toutes les retouches s'appliquent. Rien n'a été écrit.");
  planned.forEach((p) => console.log(" - " + p.relative));
  console.log(" - " + HOOK_PATH + " (nouveau)");
  process.exit(0);
}

planned.forEach((p) => {
  write(p.loaded, p.text);
  console.log("modifié : " + p.relative);
});
fs.writeFileSync(hookFull, HOOK_CONTENT, "utf8");
console.log("créé    : " + HOOK_PATH);

// --- Documentation : au mieux ---
for (const [relative, edits] of Object.entries(DOC_EDITS)) {
  const loaded = load(relative);
  if (loaded.error) {
    console.warn("doc ignorée (" + loaded.error + ")");
    continue;
  }
  const result = applyEdits(loaded.text, edits);
  if (result.errors) {
    console.warn(`doc ignorée : ${relative} (${result.errors.join(" ; ")}) : à compléter à la main`);
    continue;
  }
  write(loaded, result.text);
  console.log("modifié : " + relative);
}

console.log("\nTerminé. Contrôle : npm run check; npm run lint; npx eslint src; npm test; npm run build; npx cap sync android");
