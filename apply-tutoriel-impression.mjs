// Visite phase 2, étape « Impression d'une page » : met en surbrillance le bouton Imprimer de l'accueil.
// Le bouton est enveloppé d'un <span data-tutorial="home-print"> (Home.jsx), et l'étape le cible par ce repère.
// Usage (racine du projet) : node apply-tutoriel-impression.mjs [--check]
import fs from "node:fs";
import path from "node:path";

const CHECK = process.argv.includes("--check");
const count = (t, n) => t.split(n).length - 1;
const FILES = [
  {
    file: "src/pages/Home.jsx",
    done: `data-tutorial="home-print"`,
    find: `          <PrintButton campaignId={campaignId} preset="scenes" />\n`,
    replace: `          <span data-tutorial="home-print" className="inline-flex">\n            <PrintButton campaignId={campaignId} preset="scenes" />\n          </span>\n`,
  },
  {
    file: "src/config/tutorials.js",
    done: `target: "home-print"`,
    find: `      id: "print",\n      route: "/",\n      selector: 'button[title^="Imprimer"]',`,
    replace: `      id: "print",\n      route: "/",\n      target: "home-print",`,
  },
];

const errors = [];
const plan = [];
for (const f of FILES) {
  const full = path.join(process.cwd(), f.file);
  if (!fs.existsSync(full)) { errors.push(`introuvable : ${f.file}`); continue; }
  const raw = fs.readFileSync(full, "utf8");
  const crlf = raw.includes("\r\n");
  const text = crlf ? raw.replace(/\r\n/g, "\n") : raw;
  if (text.includes(f.done)) { errors.push(`${f.file} : déjà modifié`); continue; }
  const n = count(text, f.find);
  if (n !== 1) { errors.push(`${f.file} : ${n} correspondance(s) au lieu d'une`); continue; }
  plan.push({ f, full, crlf, text: text.replace(f.find, () => f.replace) });
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
