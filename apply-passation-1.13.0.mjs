// apply-passation-1.13.0.mjs : met PASSATION.md à jour (versions 1.12.1, 1.12.2 et 1.13.0 ; la 1.12.2 est incluse dans la 1.13.0).
// À lancer depuis la racine du projet (le dossier qui contient PASSATION.md) :  node apply-passation-1.13.0.mjs
//
// Le script vérifie tous les repères AVANT d'écrire : si un seul manque ou apparaît plusieurs fois, il s'arrête
// sans rien changer. Il ne touche à aucun autre fichier et ne lance aucune commande git.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const FILE = "PASSATION.md";
const ROOT = process.cwd();

// [repère, remplacement] : chaque repère doit apparaître exactement une fois. "\\n" = fin de ligne du fichier.
const PATCHES = [
  [
    "# Passation - Arcanes & Scénario (état au 05/11/2026, version 1.12.0 publiée)",
    "# Passation - Arcanes & Scénario (état au 08/11/2026, version 1.13.0 publiée)",
  ],
  ["schéma v1 à v7)", "schéma v1 à v9)"],
  [
    "**État au 05/11/2026.** Dernière version publiée : **1.12.0** (tag `v1.12.0`), tutoriel interactif en trois phases (voir le tableau et `Docs/Tutoriel.md`).",
    "**État au 08/11/2026.** Dernière version publiée : **1.13.0** (suivi de rencontre : initiative, points de vie, tour de jeu), après 1.12.1 ; la 1.12.2 (faite le 07/11, non publiée à part) y est incluse (voir le tableau). La 1.12.0 avait apporté le tutoriel interactif en trois phases (`Docs/Tutoriel.md`).",
  ],
  ["useTables, plus `useConfirm`", "useTables, useEncounters, plus `useConfirm`"],
  [
    "| suite (à décider) | Suivi d'initiative et de PV ; échange d'icônes ; impression du journal ; décaler les dates de l'exemple si besoin |",
    "| 1.12.1 | **Publiée** (07/11/2026) (tag `v1.12.1`). Recherche globale mobile corrigée ; Paramètres en onglets (Apparence, Sauvegarde, Impression, Tutoriel) ; icônes Exporter/Importer inversées ; ajustements des visites guidées (attente entre les étapes 3 et 4 de la phase 2, contour de l'étape 5 de la phase 1 en « actes en lignes », couleur orange du halo : vérifiés par l'utilisateur) |\\n" +
      "| 1.12.2 | **Faite** (07/11/2026), **non publiée à part** : gardée pour être testée en situation réelle (mise à jour d'une version à la suivante), donc livrée dans la 1.13.0. Mise à jour Android intégrée : l'application télécharge elle-même l'APK et ouvre l'installateur d'Android (le téléchargement par le navigateur du téléphone restait bloqué). Correction validée le 08/11/2026 en passant de la 1.12.2 à la 1.13.0. Voir `AGENTS.md` (ANDROID UPDATE AND SIGNING) |\\n" +
      "| 1.13.0 | **Publiée** (08/11/2026). Suivi de rencontre : bouton aux deux épées à côté de « Codex du MJ » (`CodexSidebar.jsx`) qui ouvre `EncounterDialog.jsx` ; table `Encounter` (`db.version(9)`, plusieurs rencontres par campagne, dans la cascade de suppression, la corbeille et les sauvegardes) ; règles pures `lib/meta/encounter.js`, service `lib/services/encounters.js`, hook `useEncounters`. Initiative saisie à la main, PV bornés entre 0 et le maximum (sans PV max, PV non suivis), combattant à 0 PV grisé mais pas sauté, tour suivant et round. Pas d'impression, de recherche globale, de tirage de dés ni d'ajout depuis les PNJ. Inclut aussi la 1.12.2 (mise à jour Android intégrée). Voir `AGENTS.md` (ENCOUNTER TRACKER) |\\n" +
      "| suite (à décider) | Tirage de dés pour l'initiative ; ajout de combattants depuis les PNJ et les personnages ; impression du journal de séance ; décaler les dates de l'exemple si besoin |",
  ],
  [
    "1. **Signature de l'installateur Windows : en attente de SignPath.** L'utilisateur a choisi SignPath Foundation",
    "1. **Signature de l'installateur Windows : demande SignPath Foundation refusée le 05/11/2026, à redéposer plus tard.** Plan prévu si une demande aboutit. L'utilisateur avait choisi SignPath Foundation",
  ],
  [
    "3. Lancer `npm run typecheck` (`tsc -p jsconfig.json`), jamais exécuté, et décider de ce qu'on en fait.",
    "3. `npm run typecheck` (`tsc -p jsconfig.json`) : 23 erreurs « implicit any » (`lib/meta/codex.js`, `lib/meta/inventory.js`), aucune décision prise.",
  ],
  [
    "- Tutoriel 1.12.0 : les trois phases testées",
    "- Suivi de rencontre 1.13.0 : affichage testé à la main par l'utilisateur avant la release (07/11/2026) et fonctionnel. Les règles pures (`tests/encounter.test.js`) ont tourné chez Claude avec une maquette de Vitest, les tests de base de données (`tests/encounterService.test.js`) chez l'utilisateur seulement. Claude n'a jamais vu l'interface.\\n\\n" +
      "- Mise à jour Android intégrée (1.12.2) : testée de bout en bout par l'utilisateur (de la 1.12.2 à la 1.13.0, 08/11/2026).\\n\\n" +
      "- Tutoriel 1.12.0 : les trois phases testées",
  ],
  [
    "- `tsc -p jsconfig.json` (`npm run typecheck`) n'a pas été exécuté.",
    "- `npm run typecheck` : exécuté depuis, 23 erreurs « implicit any » (`lib/meta/codex.js`, `lib/meta/inventory.js`), sans décision.",
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
