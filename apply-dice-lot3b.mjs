// apply-dice-lot3b.mjs : correctif du lot 3 (lancer de dés, fiches de PNJ et de personnage).
//  - NpcSheetFields reçoit la campagne de CodexEntryDialog : sans cela, le lien « Caractéristique liée » et le dé
//    personnalisé restaient cachés sur le formulaire d'un NOUVEAU PNJ (le formulaire n'a pas encore de campaign_id)
//  - le lien « Caractéristique liée » n'apparaît plus quand le lancer de dés est désactivé dans le modèle
//    (comme le dé personnalisé, qui était déjà masqué dans ce cas)
// Prérequis : lots 2 et 3 appliqués. Lancer depuis le dossier qui contient package.json :  node apply-dice-lot3b.mjs
// Option --check : vérifie sans rien écrire. Tout ou rien : si une ancre manque, rien n'est modifié.
import fs from "node:fs";
import path from "node:path";

const CHECK = process.argv.includes("--check");
const PATCHES = [
  {
    "path": "src/components/codex/NpcSheetFields.jsx",
    "marker": "campaignId || generator.context?.campaignId",
    "edits": [
      {
        "find": "generator: any, generation: any }} props",
        "replace": "generator: any, generation: any, campaignId?: string }} props"
      },
      {
        "find": "export default function NpcSheetFields({ form, set, generator, generation }) {",
        "replace": "export default function NpcSheetFields({ form, set, generator, generation, campaignId = \"\" }) {"
      },
      {
        "find": "const roll = useRollSetup(generator.context?.campaignId || form.campaign_id || \"\");",
        "replace": "const roll = useRollSetup(campaignId || generator.context?.campaignId || form.campaign_id || \"\");"
      },
      {
        "find": "{roll.dice && names.length > 0 && (",
        "replace": "{roll.dice?.enabled && names.length > 0 && ("
      }
    ]
  },
  {
    "path": "src/components/codex/CodexEntryDialog.jsx",
    "marker": "generation={generation} campaignId={campaignId}",
    "edits": [
      {
        "find": "<NpcSheetFields form={form} set={set} generator={generator} generation={generation} />",
        "replace": "<NpcSheetFields form={form} set={set} generator={generator} generation={generation} campaignId={campaignId} />"
      }
    ]
  },
  {
    "path": "src/components/game/GameCharacterEditor.jsx",
    "marker": "model.dice?.enabled",
    "edits": [
      {
        "find": "{model.dice && characteristicNames.length > 0 && (",
        "replace": "{model.dice?.enabled && characteristicNames.length > 0 && ("
      }
    ]
  }
];

if (!fs.existsSync("package.json") || !fs.existsSync("src")) {
  console.error("Lance ce script depuis le dossier qui contient package.json.");
  process.exit(1);
}

const problems = [];
const writes = [];
for (const patch of PATCHES) {
  const target = path.resolve(patch.path);
  if (!fs.existsSync(target)) { problems.push("fichier introuvable : " + patch.path); continue; }
  const raw = fs.readFileSync(target, "utf8");
  if (raw.charCodeAt(0) === 0xfeff) { problems.push("BOM présent (à retirer) : " + patch.path); continue; }
  const crlf = raw.includes("\r\n");
  let text = raw.replace(/\r\n/g, "\n");
  if (text.includes(patch.marker)) { console.log("déjà appliqué : " + patch.path); continue; }
  let ok = true;
  patch.edits.forEach((edit, index) => {
    const count = text.split(edit.find).length - 1;
    if (count !== 1) {
      ok = false;
      problems.push(patch.path + " : ancre " + (index + 1) + " trouvée " + count + " fois (attendu : 1) → " + JSON.stringify(edit.find.slice(0, 80)));
      return;
    }
    text = text.replace(edit.find, () => edit.replace);
  });
  if (ok) writes.push({ rel: patch.path, target, data: Buffer.from(crlf ? text.replace(/\n/g, "\r\n") : text, "utf8") });
}
if (problems.length) {
  console.error("Rien n'a été modifié :");
  problems.forEach((p) => console.error(" - " + p));
  process.exit(1);
}
for (const item of writes) {
  if (!CHECK) fs.writeFileSync(item.target, item.data);
  console.log((CHECK ? "à écrire : " : "écrit : ") + item.rel);
}
console.log(CHECK ? "Vérification réussie (rien d'écrit)." : "Terminé. Ensuite : npm run check ; npm run lint ; npx eslint src ; npm test ; npm run build");
