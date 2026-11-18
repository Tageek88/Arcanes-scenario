// apply-docs-1.15.3.mjs : notes de version 1.15.3 et documentation (modèle de fiche à la création d'une campagne, initiative des rencontres).
// Usage, depuis la racine du projet :   node apply-docs-1.15.3.mjs --dry    puis    node apply-docs-1.15.3.mjs
// Ajoute une section À LA FIN de AGENTS.md et de PASSATION.md (jamais deux fois : un marqueur est vérifié) et crée Docs/releases/RELEASE-1.15.3.md (jamais écrasé sans --force).
// AGENTS.md est obligatoire ; PASSATION.md est ignoré avec un avertissement s'il est introuvable. Rien n'est écrit si un fichier obligatoire manque.
// Ce script ne change PAS le numéro de version (package.json, README, build.gradle) : à faire à la main.
import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const dry = process.argv.includes("--dry");
const force = process.argv.includes("--force");
const version = "1.15.3";
if (!fs.existsSync(path.join(root, "package.json"))) { console.error("Lancez ce script depuis la racine du projet."); process.exit(1); }
const D = {"agents":"\n## CAMPAIGN SYSTEM CHOICE AND ENCOUNTER INITIATIVE (1.15.3)\n- Campaign creation: `CampaignDialog` has a select « Modèle de fiche (facultatif) » (creation only): Aucun, the built-in systems, then the user's own systems. The choice rides in the form as `sheet_system`, which is NOT a Campaign field: `splitCampaignForm` (`lib/meta/systemChoice.js`) strips it before saving. `applyChosenSystem` in `useCampaignActions` calls `applyChosenSystemToCampaign(systemId, campaignId)` (`lib/services/gameSystems.js`) right after the campaign is created and BEFORE it is selected (builtin ids come from `getBuiltinSystem`, others from `GameSystem.get`). A failure never removes the campaign: destructive toast, the campaign stays without a model. The « system » text is filled with the system name only if empty. Pure helpers: `systemChoices`, `chosenSystemNotice`, `NO_SYSTEM`. Home.jsx `EMPTY_CAMPAIGN` and `openEditCampaign` carry `sheet_system: \"\"`.\n- Encounter initiative (`components/codex/EncounterDialog.jsx`, pure rules in `lib/meta/encounterInitiative.js`): « Lancer » on each combatant row and « Lancer les initiatives manquantes (n) ». The roll goes through `buildRollRequest` + `evaluateRoll` with the system's own dice. Stat used: `InitiativeSetting` selector « Lancer l'initiative avec », stored per campaign in localStorage `arcanes_encounter_initiative:<campaignId>` (`\"\"` = auto: the stat named « Initiative », `\"__manual__\"`, or any stat name). Result: add rule → total; pool → number of successes; under → margin (target − sum). `rollCombatants` never overwrites an initiative already typed; a combatant without a sheet rolls with value 0. A system with no « Initiative » stat (Metro 2033) stays on manual entry on purpose.\n- The light sheet built by `services/encounters.js` now carries `dice_override`, so a per-sheet dice override is honoured. `encounter.js` `setInitiatives` writes several initiatives at once.\n- Tests: `tests/systemChoice.test.js`, `tests/campaignSystemChoice.test.js` (database, PC only), `tests/encounterInitiative.test.js`; `tests/encounterSources.test.js` expects `dice_override` in the sheet keys. The dialogs themselves are not covered by tests.\n","pass":"\n## Version 1.15.3 : choix du système à la création d'une campagne, initiative des rencontres (18/11/2026)\n\n- Lot 14 : à la création d'une campagne, on peut choisir un « Modèle de fiche (facultatif) » (Aucun, systèmes fournis, ses propres systèmes). Le modèle est copié avant que la campagne soit sélectionnée ; si la copie échoue, la campagne reste créée et un message le signale. Testé et commité.\n- Lot 15 : dans une rencontre, « Lancer » (par combattant) et « Lancer les initiatives manquantes » tirent l'initiative avec les dés du système ; sélecteur « Lancer l'initiative avec » par campagne. Une initiative déjà saisie n'est jamais écrasée. Metro 2033 n'a pas de caractéristique Initiative : saisie manuelle conservée (décision de l'utilisateur). Testé et commité.\n- Non vérifié : comportement sous Android ; les dialogues eux-mêmes (pas de tests de composants).\n- Numéro de version et versionCode : 1.15.3 → 253.\n","rel":"## Arcanes & Scénario __V__\n\nUn modèle de fiche dès la création de la campagne, et l'initiative des rencontres tirée avec les dés du système.\n\n### Nouveautés\n\n- **Modèle de fiche à la création** : le formulaire de nouvelle campagne propose « Modèle de fiche (facultatif) » : aucun, un système fourni ou l'un de vos systèmes. La campagne est prête à jouer sans passer par la page Jeu.\n- **Initiative lancée dans les rencontres** : bouton « Lancer » par combattant et « Lancer les initiatives manquantes », avec les dés du système de la campagne.\n- **Choix de la caractéristique** : « Lancer l'initiative avec » (automatique, saisie manuelle ou une caractéristique de votre choix), mémorisé par campagne.\n\n### Améliorations\n\n- Une initiative déjà saisie n'est jamais écrasée par un lancer groupé.\n- Si le modèle choisi ne peut pas être copié, la campagne est quand même créée et un message l'indique.\n\n### Utilisation\n\n- Rencontre : réglez « Lancer l'initiative avec », puis « Lancer les initiatives manquantes ». Un système sans caractéristique « Initiative » (Metro 2033) reste en saisie manuelle, sauf si vous choisissez une autre caractéristique.\n\n### Installation\n\n- Mise à jour depuis Paramètres › À propos, ou installateur / APK de la release.\n\n### À venir\n\n- Choix du modèle depuis le Calendrier, d'autres systèmes fournis, génération aléatoire par système.\n"};
const TARGETS = [
  { name: "AGENTS.md", cands: ["AGENTS.md"], marker: "## CAMPAIGN SYSTEM CHOICE AND ENCOUNTER INITIATIVE", text: D.agents, required: true },
  { name: "PASSATION.md", cands: ["PASSATION.md", "Docs/PASSATION.md"], marker: "## Version 1.15.3 : choix du système à la création d'une campagne", text: D.pass, required: false },
];
const plan = [];
let fail = false;
for (const t of TARGETS) {
  const rel = t.cands.find((c) => fs.existsSync(path.join(root, c)));
  if (!rel) { if (t.required) { console.error("Fichier introuvable : " + t.name); fail = true; } else console.warn("Ignoré (introuvable) : " + t.name); continue; }
  const full = path.join(root, rel);
  const old = fs.readFileSync(full, "utf8");
  if (old.includes(t.marker)) { console.log("Déjà à jour : " + rel); continue; }
  const crlf = old.includes("\r\n");
  let add = t.text.replace(/\r\n/g, "\n");
  if (crlf) add = add.replace(/\n/g, "\r\n");
  const nl = crlf ? "\r\n" : "\n";
  plan.push({ rel, full, out: (old.endsWith("\n") ? old : old + nl) + add });
}
const relFile = path.join(root, "Docs", "releases", "RELEASE-" + version + ".md");
const relExists = fs.existsSync(relFile);
if (relExists && !force) console.warn("Notes de version déjà présentes (--force pour écraser).");
if (fail) { console.error("Rien n'a été écrit."); process.exit(1); }
for (const p of plan) console.log((dry ? "[dry] " : "") + "Ajout en fin de " + p.rel);
if (!relExists || force) console.log((dry ? "[dry] " : "") + "Écriture de Docs/releases/RELEASE-" + version + ".md");
if (dry) { console.log("Aucun fichier modifié (--dry)."); process.exit(0); }
for (const p of plan) fs.writeFileSync(p.full, p.out, "utf8");
if (!relExists || force) { fs.mkdirSync(path.dirname(relFile), { recursive: true }); fs.writeFileSync(relFile, D.rel.replace("__V__", version), "utf8"); }
console.log("Terminé.");
