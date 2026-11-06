// Visites guidées : les étapes qui montrent une section des Paramètres ouvrent d'abord son onglet
// (Apparence, Sauvegarde, Impression, Tutoriel), et un test le vérifie.
// Prérequis : apply-parametres-onglets.mjs appliqué. Aucun texte de visite n'est modifié.
// Usage (racine du projet) : node apply-tutoriel-onglets.mjs [--check]
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

// Ajoute l'action « clic sur l'onglet » juste après la ligne qui désigne l'élément montré.
const withTab = (line, tabLabel) => ({ find: line, replace: `${line}\n      run: [openTab("${tabLabel}")],` });

const TUTORIAL_EDITS = [
  withTab(`      target: "section-export-import",`, "Sauvegarde"),
  withTab(`      target: "section-appearance",`, "Apparence"),
  withTab(`      target: "campaign-layout",`, "Apparence"),
  withTab(`      selectorText: "Les éléments supprimés restent",`, "Sauvegarde"),
  withTab(`      target: "section-auto-save",`, "Sauvegarde"),
  withTab(`      target: "game-table-mode",`, "Apparence"),
];

const NEW_TEST = `  it("les étapes qui montrent une section des Paramètres ouvrent d'abord son onglet", () => {
    const TAB_OF = {
      "section-appearance": "Apparence",
      "campaign-layout": "Apparence",
      "game-table-mode": "Apparence",
      "section-auto-save": "Sauvegarde",
      "section-export-import": "Sauvegarde",
      "section-clear-data": "Sauvegarde",
      "section-print": "Impression",
      "section-help": "Tutoriel",
    };
    for (const tour of TOURS) {
      for (const step of tour.steps) {
        const expected = TAB_OF[step.target] || (step.selectorText === "Les éléments supprimés restent" ? "Sauvegarde" : null);
        if (!expected) continue;
        const opens = (step.run || []).some(
          (action) => action.demo === "dom.click" && action.args?.selector === '[role="tab"]' && action.args?.text === expected
        );
        expect(opens ? step.id : \`\${tour.id}/\${step.id} n'ouvre pas l'onglet \${expected}\`).toBe(step.id);
      }
    }
  });
});
`;

const TEST_TAIL = `      expect(anchors.has(match[1]) ? match[1] : \`repère introuvable : \${match[1]}\`).toBe(match[1]);
    }
  });
});
`;

const errors = [];
const planned = [];

{
  const file = "src/config/tutorials.js";
  const loaded = load(file);
  if (loaded.error) errors.push(loaded.error);
  else if (loaded.text.includes('openTab("Sauvegarde")')) errors.push(`${file} : déjà modifié`);
  else {
    const text = applyEdits(loaded.text, TUTORIAL_EDITS, file, errors);
    planned.push({ file, loaded, text });
  }
}

{
  const file = "tests/tours.test.js";
  const loaded = load(file);
  if (loaded.error) errors.push(loaded.error);
  else if (loaded.text.includes("ouvrent d'abord son onglet")) errors.push(`${file} : déjà modifié`);
  else {
    const edits = [{ find: TEST_TAIL, replace: TEST_TAIL.replace(/\}\);\n$/, "") + "\n" + NEW_TEST }];
    const text = applyEdits(loaded.text, edits, file, errors);
    planned.push({ file, loaded, text });
  }
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

console.log("\nTerminé. Contrôle : npm test; npm run check; npm run lint; npx eslint src; npm run build");
