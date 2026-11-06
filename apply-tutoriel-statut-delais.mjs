// Visite phase 2 : (1) étape « État d'une scène » sur téléphone : entoure le bouton d'état (« Brouillon »...) de la scène,
// comme sur ordinateur ; (2) bulles plus rapides : repli de recherche 1,2 s -> 0,6 s, suivi de l'élément toutes les 100 ms.
// Usage (racine du projet) : node apply-tutoriel-statut-delais.mjs [--check]
import fs from "node:fs";
import path from "node:path";

const CHECK = process.argv.includes("--check");
const count = (t, n) => t.split(n).length - 1;
const FILES = [
  {
    file: "src/components/home/SwipeSceneRow.jsx",
    done: `title="Changer le statut"`,
    edits: [
      {
        find: `<button type="button" onClick={() => onToggleStatus(scene)} className={cn("tag border", meta.badge)}>`,
        replace: `<button type="button" title="Changer le statut" onClick={() => onToggleStatus(scene)} className={cn("tag border", meta.badge)}>`,
      },
    ],
  },
  {
    file: "src/config/tutorials.js",
    done: `selector: \`\${SCENE} button[title="Changer le statut"]\`,\n      title: "État d'une scène",\n      text: "Chaque scène a un état : brouillon, jouée ou clé. Sur téléphone`,
    edits: [
      {
        find: `      id: "scene-status-mobile",\n      only: "mobile",\n      route: "/",\n      selector: SCENE,`,
        replace: `      id: "scene-status-mobile",\n      only: "mobile",\n      route: "/",\n      selector: \`\${SCENE} button[title="Changer le statut"]\`,`,
      },
    ],
  },
  {
    file: "src/components/Tutorial/TutorialOverlay.jsx",
    done: `const SEARCH_GRACE_MS = 600;`,
    edits: [
      { find: `const SEARCH_GRACE_MS = 1200;`, replace: `const SEARCH_GRACE_MS = 600;` },
      { find: `const REVEAL_RETRIES = 10;`, replace: `const REVEAL_RETRIES = 20;` },
      { find: `    const timer = setInterval(measure, 200);`, replace: `    const timer = setInterval(measure, 100);` },
      { find: `on vérifie pendant 2 s qu'il`, replace: `on vérifie pendant 2 s (20 contrôles) qu'il` },
    ],
  },
];

const errors = [];
const plan = [];
for (const f of FILES) {
  const full = path.join(process.cwd(), f.file);
  if (!fs.existsSync(full)) { errors.push(`introuvable : ${f.file}`); continue; }
  const raw = fs.readFileSync(full, "utf8");
  const crlf = raw.includes("\r\n");
  let text = crlf ? raw.replace(/\r\n/g, "\n") : raw;
  if (text.includes(f.done)) { errors.push(`${f.file} : déjà modifié`); continue; }
  f.edits.forEach((e, i) => {
    const n = count(text, e.find);
    if (n !== 1) { errors.push(`${f.file} : retouche ${i + 1} : ${n} correspondance(s) au lieu d'une`); return; }
    text = text.replace(e.find, () => e.replace);
  });
  plan.push({ f, full, crlf, text });
}
if (errors.length) {
  console.error("Aucun fichier modifié. Problèmes :");
  errors.forEach((e) => console.error(" - " + e));
  process.exit(1);
}
if (CHECK) { console.log("Vérification réussie. Rien n'a été écrit."); process.exit(0); }
for (const p of plan) {
  fs.writeFileSync(p.full, p.crlf ? p.text.replace(/\n/g, "\r\n") : p.text, "utf8");
  console.log("modifié : " + p.f.file);
}
console.log("\nTerminé. Contrôle : npm test; npm run check; npm run lint; npm run build");
