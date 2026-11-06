// Visites guidées : contours mieux choisis, et halo orange autour des fenêtres de dialogue pendant une visite.
//  - Phase 1, « Actes et scènes » : entoure une colonne d'acte (ou l'acte, sur téléphone) au lieu du titre de la page.
//  - Phase 2, « Une scène ouverte » : entoure le bouton « Liées à la scène » du panneau Codex.
//  - Phase 3, « Recherche globale » : entoure la loupe (sa position) et n'ouvre plus la fenêtre de recherche.
//  - Halo : pendant une visite, <html> porte data-tutorial-tour ; index.css entoure d'un halo les dialogues ouverts.
// Aucun texte de visite n'est modifié.
// Usage (racine du projet) : node apply-tutoriel-ajustements.mjs [--check]
import fs from "node:fs";
import path from "node:path";

const CHECK_ONLY = process.argv.includes("--check");
const root = process.cwd();

const count = (text, needle) => text.split(needle).length - 1;

const load = (relative) => {
  const full = path.join(root, relative);
  if (!fs.existsSync(full)) return { error: `introuvable : ${relative}` };
  const raw = fs.readFileSync(full, "utf8");
  const crlf = raw.includes("\r\n");
  return { full, crlf, text: crlf ? raw.replace(/\r\n/g, "\n") : raw };
};

const applyEdits = (text, edits, file, errors) => {
  let result = text;
  edits.forEach(({ find, replace }, index) => {
    const n = count(result, find);
    if (n !== 1) {
      errors.push(`${file} : retouche ${index + 1} : ${n} correspondance(s) au lieu d'une (« ${find.trim().split("\n")[0]} »)`);
      return;
    }
    result = result.replace(find, () => replace);
  });
  return result;
};

const FILES = [
  {
    file: "src/config/tutorials.js",
    done: `target: "act-column"`,
    edits: [
      {
        find: `        id: "acts-scenes",\n        route: "/",\n        target: "home-title",`,
        replace: `        id: "acts-scenes",\n        route: "/",\n        target: "act-column",`,
      },
      {
        find: `      id: "scene-open",\n      route: "/",\n      selector: SCENE,`,
        replace: `      id: "scene-open",\n      route: "/",\n      target: "codex-linked-filter",`,
      },
      {
        find: `      selector: 'input[placeholder^="Chercher dans la campagne"]',`,
        replace: `      selector: 'button[aria-label="Rechercher dans la campagne"]',`,
      },
      {
        find: `      run: [{ demo: "dom.click", args: { selector: 'button[aria-label="Rechercher dans la campagne"]', blur: true } }],\n      undo: CLOSE_DIALOG,\n`,
        replace: ``,
      },
    ],
  },
  {
    file: "src/components/codex/CodexSidebar.jsx",
    done: `data-tutorial="codex-linked-filter"`,
    edits: [
      {
        find: `            aria-label={linkedOnly ? "Afficher tout le codex" : "N'afficher que les éléments liés à la scène"}`,
        replace: `            data-tutorial="codex-linked-filter"\n            aria-label={linkedOnly ? "Afficher tout le codex" : "N'afficher que les éléments liés à la scène"}`,
      },
    ],
  },
  {
    file: "src/components/home/ActColumn.jsx",
    done: `data-tutorial="act-column"`,
    edits: [
      {
        find: `    <div ref={columnRef} className={cn(`,
        replace: `    <div ref={columnRef} data-tutorial="act-column" className={cn(`,
      },
    ],
  },
  {
    file: "src/components/home/MobileSceneList.jsx",
    done: `data-tutorial="act-column"`,
    edits: [
      {
        find: `            className="rounded-xl border border-border bg-card/50 px-4"`,
        replace: `            data-tutorial="act-column"\n            className="rounded-xl border border-border bg-card/50 px-4"`,
      },
    ],
  },
  {
    file: "src/components/Tutorial/TutorialProvider.jsx",
    done: `data-tutorial-tour`,
    edits: [
      {
        find: `  const step = steps[index] ?? null;\n`,
        replace: `  const step = steps[index] ?? null;

  // Pendant une visite, <html> porte un repère : index.css entoure d'un halo les fenêtres de dialogue ouvertes.
  useEffect(() => {
    if (!tourId) return undefined;
    const html = document.documentElement;
    html.setAttribute("data-tutorial-tour", tourId);
    return () => html.removeAttribute("data-tutorial-tour");
  }, [tourId]);
`,
      },
    ],
  },
];

// Ajouté à la FIN de index.css (hors des couches : sinon la règle serait écrasée par shadow-lg des fenêtres).
const CSS_MARK = "Visite guidée : halo";
const CSS_BLOCK = `
/* ${CSS_MARK} autour de la fenêtre de dialogue ouverte (repère posé sur <html> par TutorialProvider). */
html[data-tutorial-tour] [role="dialog"][data-state="open"],
html[data-tutorial-tour] [role="alertdialog"][data-state="open"] {
  box-shadow: 0 0 0 3px hsl(var(--warning)), 0 0 28px 8px hsl(var(--warning) / 0.55);
}
`;

const errors = [];
const planned = [];

for (const { file, done, edits } of FILES) {
  const loaded = load(file);
  if (loaded.error) {
    errors.push(loaded.error);
    continue;
  }
  if (loaded.text.includes(done)) {
    errors.push(`${file} : déjà modifié`);
    continue;
  }
  const text = applyEdits(loaded.text, edits, file, errors);
  planned.push({ file, loaded, text });
}

{
  const file = "src/index.css";
  const loaded = load(file);
  if (loaded.error) errors.push(loaded.error);
  else if (loaded.text.includes(CSS_MARK)) errors.push(`${file} : déjà modifié`);
  else planned.push({ file, loaded, text: loaded.text.replace(/\s*$/, "\n") + CSS_BLOCK });
}

if (errors.length) {
  console.error("Aucun fichier modifié. Problèmes :");
  errors.forEach((e) => console.error(" - " + e));
  process.exit(1);
}

if (CHECK_ONLY) {
  console.log("Vérification réussie : toutes les retouches s'appliquent. Rien n'a été écrit.");
  planned.forEach((p) => console.log(" - " + p.file));
  process.exit(0);
}

planned.forEach((p) => {
  const out = p.loaded.crlf ? p.text.replace(/\n/g, "\r\n") : p.text;
  fs.writeFileSync(p.loaded.full, out, "utf8"); // UTF-8 sans BOM
  console.log("modifié : " + p.file);
});

console.log("\nTerminé. Contrôle : npm test; npm run check; npm run lint; npx eslint src; npm run build; npx cap sync android");
