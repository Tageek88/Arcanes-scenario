// apply-passation-correctif.mjs : corrige PASSATION.md déjà mis à jour (la 1.12.2 est incluse dans la 1.13.0 ; rencontre testée avant la release).
// À lancer depuis la racine du projet (le dossier qui contient PASSATION.md) :  node apply-passation-correctif.mjs
//
// Le script vérifie tous les repères AVANT d'écrire : si un seul manque ou apparaît plusieurs fois, il s'arrête
// sans rien changer. Il ne touche à aucun autre fichier et ne lance aucune commande git.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const FILE = "PASSATION.md";
const ROOT = process.cwd();

// [repère, remplacement] : chaque repère doit apparaître exactement une fois.
const PATCHES = [
  [
    "après 1.12.1 et 1.12.2 (voir le tableau). La 1.12.0",
    "après 1.12.1 ; la 1.12.2 (faite le 07/11, non publiée à part) y est incluse (voir le tableau). La 1.12.0",
  ],
  [
    "| 1.12.2 | **Faite** (07/11/2026). Mise à jour Android intégrée :",
    "| 1.12.2 | **Faite** (07/11/2026), **non publiée à part** : gardée pour être testée en situation réelle (mise à jour d'une version à la suivante), donc livrée dans la 1.13.0. Mise à jour Android intégrée :",
  ],
  [
    "ni d'ajout depuis les PNJ. Voir `AGENTS.md` (ENCOUNTER TRACKER) |",
    "ni d'ajout depuis les PNJ. Inclut aussi la 1.12.2 (mise à jour Android intégrée). Voir `AGENTS.md` (ENCOUNTER TRACKER) |",
  ],
  [
    "testé à la main par l'utilisateur (07/11/2026, « tout fonctionne ») puis publié ; l'affichage sur téléphone n'a pas été confirmé séparément. Les règles",
    "affichage testé à la main par l'utilisateur avant la release (07/11/2026) et fonctionnel. Les règles",
  ],
];

// === VÉRIFICATIONS ===
const full = join(ROOT, FILE);
if (!existsSync(full)) {
  console.error(`Fichier introuvable : ${FILE}. Lancez ce script depuis la racine du projet.`);
  process.exit(1);
}
let text = readFileSync(full, "utf8");
const bom = text.startsWith("﻿");
if (bom) text = text.slice(1);
const crlf = text.includes("\r\n");
const eol = (value) => (crlf ? value.replace(/\r?\n/g, "\r\n") : value);
const convert = (value) => eol(value.replace(/\\n/g, "\n"));

const problems = [];
PATCHES.forEach(([from, to], index) => {
  const anchor = convert(from);
  const count = text.split(anchor).length - 1;
  if (count !== 1) {
    problems.push(`repère n°${index + 1} trouvé ${count} fois (il en faut exactement 1) : ${JSON.stringify(from.slice(0, 70))}`);
    return;
  }
  text = text.replace(anchor, () => convert(to));
});

if (problems.length > 0) {
  console.error(`Rien n'a été modifié. Problèmes trouvés dans ${FILE} :`);
  for (const problem of problems) console.error(" - " + problem);
  process.exit(1);
}

// === ÉCRITURE (UTF-8 sans BOM, sauf s'il y en avait un) ===
writeFileSync(full, (bom ? "﻿" : "") + text, "utf8");
console.log(`modifié  ${FILE} (${PATCHES.length} retouches)`);
