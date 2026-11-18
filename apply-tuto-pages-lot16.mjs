// apply-tuto-pages-lot16.mjs : lot 16, tutoriel : chaque visite se déroule page par page
// Usage, depuis la racine du projet :
//   node apply-tuto-pages-lot16.mjs --dry     (vérifie sans rien écrire)
//   node apply-tuto-pages-lot16.mjs           (applique)
// Rien n'est écrit tant que toutes les retouches de tous les fichiers ne s'appliquent pas : en cas de problème, le script l'indique et ne touche à rien.
// Les nouveaux fichiers ne sont jamais écrasés sans --force.
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dry = process.argv.includes("--dry");
const force = process.argv.includes("--force");

if (!fs.existsSync(path.join(root, "package.json")) || !fs.existsSync(path.join(root, "src"))) {
  console.error("Lancez ce script depuis la racine du projet (là où se trouve package.json).");
  process.exit(1);
}

// Retrouve un fichier du projet sous src/ ou tests/ : par son nom, ou par un bout de chemin.
function findInSrc(name) {
  const hits = [];
  for (const base of ["src", "tests"]) {
    if (!fs.existsSync(path.join(root, base))) continue;
    for (const entry of fs.readdirSync(path.join(root, base), { recursive: true }).map(String)) {
      const file = path.join(base, entry);
      if (file.split(path.sep).includes("node_modules")) continue;
      const slashed = file.split(path.sep).join("/");
      if (name.includes("/") ? slashed.endsWith(name) : path.basename(file) === name) hits.push(file);
    }
  }
  return hits.length === 1 ? hits[0] : null;
}

const NEW_FILES = {
};

const EDITS = {
  "src/config/tutorials.js": [
    {
      find: `    {
      id: "scene-codex",
      route: "/",
      selector: "aside[data-keep-expanded]",
      side: "left",
      title: "Panneau Codex",
      text: "Quand une scène est sélectionnée, le panneau Codex affiche ses PNJ, lieux et indices sans quitter l'arborescence.",
    },
    {
      id: "npc-relations",`,
      replace: `    {
      id: "scene-codex",
      route: "/",
      selector: "aside[data-keep-expanded]",
      side: "left",
      title: "Panneau Codex",
      text: "Quand une scène est sélectionnée, le panneau Codex affiche ses PNJ, lieux et indices sans quitter l'arborescence.",
    },
    {
      id: "print",
      route: "/",
      target: "home-print",
      title: "Impression d'une page",
      text: "Chaque page imprime son contenu, ou l'exporte en PDF modifiable.",
    },
    {
      id: "npc-relations",`,
    },
    {
      find: `    {
      id: "print",
      route: "/",
      target: "home-print",
      title: "Impression d'une page",
      text: "Chaque page imprime son contenu, ou l'exporte en PDF modifiable.",
    },
    {
      id: "end",
      route: "/",
      title: "Fin de la phase 2",`,
      replace: `    {
      id: "end",
      route: "/",
      title: "Fin de la phase 2",`,
    },
    {
      find: `    {
      id: "acts-rows",
      route: "/settings",
      target: "campaign-layout",
      run: [openTab("Apparence")],
      title: "Actes en lignes",
      text: "Dans Paramètres › Apparence, les actes peuvent s'afficher en colonnes ou en lignes, selon la place dont vous avez besoin. Ce choix est propre à chaque campagne.",
    },
    {
      id: "global-search",
      route: "/",
      selector: 'button[aria-label="Rechercher dans la campagne"]',
      title: "Recherche globale",
      text: "La recherche globale retrouve une scène, un PNJ, un lieu, un indice ou une note dans toute la campagne.",
    },`,
      replace: `    {
      id: "global-search",
      route: "/",
      selector: 'button[aria-label="Rechercher dans la campagne"]',
      title: "Recherche globale",
      text: "La recherche globale retrouve une scène, un PNJ, un lieu, un indice ou une note dans toute la campagne.",
    },`,
    },
    {
      find: `    {
      id: "trash",
      route: "/settings",
      selector: "section.rounded-xl",
      selectorText: "Les éléments supprimés restent",
      run: [openTab("Sauvegarde")],
      title: "Corbeille",
      text: "Ce que vous supprimez reste quelques jours dans la corbeille : vous pouvez le restaurer avec son contenu.",
    },
    {
      id: "autosave",
      route: "/settings",
      target: "section-auto-save",
      run: [openTab("Sauvegarde")],
      title: "Sauvegarde automatique",
      text: "L'application peut enregistrer une copie de vos données à intervalle régulier, sur l'appareil.",
    },
    {
      id: "table-mode",
      route: "/settings",
      target: "game-table-mode",
      run: [openTab("Apparence")],
      title: "Mode table de jeu",
      text: "Le mode table renforce les contrastes, grossit un peu le texte et retire les animations, pour rester lisible à la table de jeu. Désactivé, tout revient comme avant.",
    },`,
      replace: `    {
      id: "acts-rows",
      route: "/settings",
      target: "campaign-layout",
      run: [openTab("Apparence")],
      title: "Actes en lignes",
      text: "Dans Paramètres › Apparence, les actes peuvent s'afficher en colonnes ou en lignes, selon la place dont vous avez besoin. Ce choix est propre à chaque campagne.",
    },
    {
      id: "table-mode",
      route: "/settings",
      target: "game-table-mode",
      run: [openTab("Apparence")],
      title: "Mode table de jeu",
      text: "Le mode table renforce les contrastes, grossit un peu le texte et retire les animations, pour rester lisible à la table de jeu. Désactivé, tout revient comme avant.",
    },
    {
      id: "trash",
      route: "/settings",
      selector: "section.rounded-xl",
      selectorText: "Les éléments supprimés restent",
      run: [openTab("Sauvegarde")],
      title: "Corbeille",
      text: "Ce que vous supprimez reste quelques jours dans la corbeille : vous pouvez le restaurer avec son contenu.",
    },
    {
      id: "autosave",
      route: "/settings",
      target: "section-auto-save",
      run: [openTab("Sauvegarde")],
      title: "Sauvegarde automatique",
      text: "L'application peut enregistrer une copie de vos données à intervalle régulier, sur l'appareil.",
    },`,
    },
  ],
  "tests/tours.test.js": [
    {
      find: `  it("les étapes qui montrent une section des Paramètres ouvrent d'abord son onglet", () => {`,
      replace: `  it("chaque visite se déroule page par page : une page quittée n'est jamais revisitée (sauf l'étape finale)", () => {
    for (const tour of TOURS) {
      for (const mobile of [false, true]) {
        const steps = stepsFor(tour, mobile).slice(0, -1);
        const seen = new Set();
        let current = null;
        for (const step of steps) {
          if (!step.route || step.route === current) continue;
          expect(seen.has(step.route) ? \`\${tour.id}/\${step.id} revient sur \${step.route}\` : step.id).toBe(step.id);
          seen.add(step.route);
          current = step.route;
        }
      }
    }
  });

  it("les étapes qui montrent une section des Paramètres ouvrent d'abord son onglet", () => {`,
    },
  ],
};

let failures = 0;
const done = [];
const writes = [];

for (const [file, content] of Object.entries(NEW_FILES)) {
  const target = path.join(root, file);
  if (fs.existsSync(target) && !force) {
    console.error("EXISTE DÉJÀ : " + file + " (relancez avec --force pour l'écraser)");
    failures += 1;
    continue;
  }
  writes.push({ target, text: content });
  done.push("créé      " + file);
}

for (const [name, edits] of Object.entries(EDITS)) {
  const file = findInSrc(name);
  if (!file) {
    console.error("INTROUVABLE (ou plusieurs) sous src/ : " + name);
    failures += 1;
    continue;
  }
  const original = fs.readFileSync(path.join(root, file), "utf8");
  const crlf = original.includes("\r\n");
  let text = crlf ? original.replace(/\r\n/g, "\n") : original;
  let ok = true;
  edits.forEach((edit, index) => {
    const expected = edit.count ?? 1;
    const found = text.split(edit.find).length - 1;
    if (found !== expected) {
      console.error(file + " : retouche " + (index + 1) + " non appliquée (" + found + " occurrence(s) trouvée(s), " + expected + " attendue(s)) :");
      console.error("    " + edit.find.split("\n")[0].trim());
      ok = false;
      return;
    }
    text = text.split(edit.find).join(edit.replace);
  });
  if (!ok) {
    console.error(file + " : laissé INTACT.");
    failures += 1;
    continue;
  }
  writes.push({ target: path.join(root, file), text: crlf ? text.replace(/\n/g, "\r\n") : text });
  done.push("modifié   " + file + " (" + edits.length + " retouche" + (edits.length > 1 ? "s" : "") + ")");
}

if (failures > 0) {
  console.error("\n" + failures + " problème(s) : RIEN n'a été écrit.");
  process.exit(1);
}
if (!dry) {
  for (const { target, text } of writes) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text, "utf8");
  }
}
console.log((dry ? "[--dry : rien n'a été écrit]\n" : "") + done.join("\n"));
console.log("\nTerminé. Ensuite : npm run check; npm run lint; npm test; npm run build");
