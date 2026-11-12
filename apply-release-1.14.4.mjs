// Préparation de la version 1.14.4 (combattants ajoutés depuis les PNJ et les personnages, filtre de scène retiré
// de l'onglet Personnages du panneau Codex) : documentation, note de version, badge, version Android.
// À lancer depuis la racine du projet : node apply-release-1.14.4.mjs
// Tout ou rien : si une retouche ne s'applique pas, aucun fichier n'est modifié.
// Le package.json se met à jour à part : npm version 1.14.4 --no-git-tag-version
import fs from "node:fs";

const RELEASE_FILE = "Docs/releases/RELEASE-1.14.4.md";

const edits = {
  "README.md": [
    [`version-1.14.3-d4a63c`, `version-1.14.4-d4a63c`],
    [
      `bouton aux deux épées), avec tour de jeu et round.`,
      `bouton aux deux épées), avec tour de jeu et round ; les combattants s'ajoutent à la main ou depuis les PNJ et les personnages.`,
    ],
  ],
  "android/app/build.gradle": [
    [`versionCode 243`, `versionCode 244`],
    [`versionName "1.14.3"`, `versionName "1.14.4"`],
  ],
  "Docs/Fonctionnalites.md": [
    [
      `PNJ, lieux, indices et informations, et personnages joueurs ;`,
      `PNJ, lieux, indices et informations, et personnages joueurs (l'onglet Personnages montre toujours toutes les fiches : il n'a pas de filtre par scène) ;`,
    ],
    [
      `- Une rencontre compte 60 combattants au plus.`,
      `- Une rencontre compte 60 combattants au plus.
- Ajout depuis les fiches : le bloc « Ajouter depuis les PNJ et les personnages » ajoute un PNJ ou un personnage d'un clic (recherche par nom), autant de fois que le champ « Nombre » ; s'il y en a plusieurs, ils sont numérotés (« Garde 1 », « Garde 2 »…) à la suite de ceux déjà présents. Le bouton « PNJ de la scène » ajoute d'un coup les PNJ de la scène sélectionnée.
- Les PV max viennent de la caractéristique choisie dans « Caractéristique des PV » (le premier nombre de sa valeur ; ce choix est retenu par campagne sur l'appareil) ; l'initiative reste à saisir. Une pastille « PNJ » ou « PJ » indique l'origine du combattant ; renommer ou supprimer la fiche ne modifie pas la rencontre.`,
    ],
  ],
  "AGENTS.md": [
    [
      `## TAILWIND 4`,
      `## ENCOUNTER: COMBATANTS FROM SHEETS (1.14.4)
- A combatant may carry \`source: { kind: "npc" | "character", id }\` (\`cleanSource\` in \`lib/meta/encounter.js\`; the key is absent otherwise, so old rows and old tests are unchanged). It is an informational link only: renaming or deleting the sheet never changes the encounter, and the row shows a « PNJ » / « PJ » badge. Opening the sheet from the encounter is not done.
- Pure rules in \`lib/meta/encounter.js\`: \`hpFromCharacteristic\` (first integer of a characteristic's value; 0, empty or no number = HP not tracked), \`numberedNames\` (same base name: the bare name when alone, otherwise « Garde 1 », « Garde 2 »… continuing after the ones already present), \`addFromSources\` (entries \`{ kind, id, name, hpMax, ids }\`). The ids are created ONCE by \`useEncounters.addFromSheets\`, because \`apply\` runs the mutator twice (screen, then saving): the mutator must stay pure.
- Loading: \`loadEncounterSources\` (\`lib/services/encounters.js\`: light NPC and character rows, without attachments, plus the characteristic names of the sheet model) and \`hooks/useEncounterSources.js\`. UI: \`AddFromSheets\` in \`EncounterDialog.jsx\` (collapsible block, \`OwnerPicker\`, field « Nombre », shortcut « PNJ de la scène » fed by \`sceneNpcIds\` from \`CodexSidebar\`). The characteristic that gives the max HP is remembered per campaign in localStorage (\`arcanes_encounter_hp:<campaignId>\`): a display setting, not in backups.
- Codex side panel: the « Liées à la scène » filter does not apply to the Characters tab (\`linkedFilterOn\` in \`CodexSidebar.jsx\`): it hid the player sheets. The « Lier » buttons of the rows stay.
- Tests: \`tests/encounterSources.test.js\`.

## TAILWIND 4`,
    ],
  ],
  "architecture.md": [
    [
      `## Plateformes`,
      `## Version 1.14.4 : combattants depuis les fiches

- Un combattant peut garder un lien (\`source\`) avec le PNJ ou le personnage dont il vient ; règles pures dans \`lib/meta/encounter.js\` (\`cleanSource\`, \`hpFromCharacteristic\`, \`numberedNames\`, \`addFromSources\`). Chargement : \`loadEncounterSources\` (\`lib/services/encounters.js\`) et \`hooks/useEncounterSources.js\` ; ajout : \`useEncounters.addFromSheets\`. Interface : bloc repliable \`AddFromSheets\` de \`EncounterDialog\`, raccourci « PNJ de la scène » alimenté par \`CodexSidebar\`. Pas de nouvelle \`db.version\`.
- Panneau Codex de l'arborescence : plus de filtre « Liées à la scène » sur l'onglet Personnages. Tests : \`tests/encounterSources.test.js\`.

## Plateformes`,
    ],
  ],
};

const releaseNotes = `## Arcanes & Scénario 1.14.4

Le suivi de rencontre peut maintenant s'alimenter directement depuis vos PNJ et vos personnages.

### Nouveautés

- **Ajouter des combattants depuis les fiches** : dans la fenêtre de rencontre, le bloc « Ajouter depuis les PNJ et les personnages » ajoute un PNJ ou un personnage d'un clic, avec une recherche par nom. Le champ « Nombre » ajoute plusieurs exemplaires d'un coup, numérotés (« Garde 1 », « Garde 2 »…).
- **PNJ de la scène** : un bouton ajoute en une fois tous les PNJ de la scène sélectionnée dans l'arborescence.
- **PV depuis la fiche** : « Caractéristique des PV » choisit la caractéristique dont la valeur donne les PV max du combattant. Le choix est retenu pour chaque campagne sur l'appareil ; l'initiative reste à saisir.
- **Origine du combattant** : une pastille « PNJ » ou « PJ » marque les combattants venus d'une fiche.

### Corrections

- **Panneau Codex, onglet Personnages** : le filtre « Liées à la scène » ne s'applique plus à cet onglet, il cachait les fiches des joueurs.

### Utilisation

Arborescence › bouton aux deux épées › « Ajouter depuis les PNJ et les personnages ».
`;

const results = {};
const problems = [];
for (const [file, steps] of Object.entries(edits)) {
  if (!fs.existsSync(file)) {
    problems.push(`${file} : fichier introuvable (lancer depuis la racine du projet)`);
    continue;
  }
  const raw = fs.readFileSync(file, "utf8");
  const crlf = raw.includes("\r\n");
  const text = raw.replace(/\r\n/g, "\n");
  let next = text;
  steps.forEach(([oldText, newText], index) => {
    if (next.includes(newText)) return; // déjà appliqué
    const count = next.split(oldText).length - 1;
    if (count !== 1) {
      problems.push(`${file} : retouche ${index + 1} trouvée ${count} fois (attendu : 1)`);
      return;
    }
    next = next.replace(oldText, () => newText);
  });
  results[file] = { crlf, text: next, changed: next !== text };
}

if (!fs.existsSync("Docs/releases")) problems.push("Docs/releases : dossier introuvable (lancer depuis la racine du projet)");

if (problems.length) {
  console.error("Aucun fichier modifié. Problèmes :");
  problems.forEach((p) => console.error(" - " + p));
  process.exit(1);
}

for (const [file, { crlf, text, changed }] of Object.entries(results)) {
  if (!changed) {
    console.log(`= ${file} (déjà à jour)`);
    continue;
  }
  fs.writeFileSync(file, crlf ? text.replace(/\n/g, "\r\n") : text, "utf8");
  console.log(`+ ${file}`);
}

if (fs.existsSync(RELEASE_FILE)) {
  console.log(`= ${RELEASE_FILE} (existe déjà, laissé tel quel)`);
} else {
  fs.writeFileSync(RELEASE_FILE, releaseNotes, "utf8");
  console.log(`+ ${RELEASE_FILE}`);
}
