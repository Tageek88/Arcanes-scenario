// apply-tracks-lot1b.mjs : lot 1b, cases à cocher des fiches de PNJ (saisie, Codex) et impression de plusieurs personnages ou PNJ.
// Usage, depuis la racine du projet :
//   node apply-tracks-lot1b.mjs --dry     (vérifie sans rien écrire)
//   node apply-tracks-lot1b.mjs           (applique)
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

// Retrouve un fichier du projet par son nom (une seule correspondance attendue sous src/).
function findInSrc(name) {
  const hits = fs.readdirSync(path.join(root, "src"), { recursive: true })
    .map(String)
    .filter((file) => path.basename(file) === name && !file.split(path.sep).includes("node_modules"));
  return hits.length === 1 ? path.join("src", hits[0]) : null;
}

const NEW_FILES = {
};

const EDITS = {
  "NpcSheetFields.jsx": [
    {
      find: `import { linkedCharacteristic } from "@/lib/meta/diceLinks";`,
      replace: `import { linkedCharacteristic } from "@/lib/meta/diceLinks";
import TrackBoxes from "@/components/game/TrackBoxes";
import { setChecked } from "@/lib/meta/tracks";`,
    },
    {
      find: `      <div className="stack-y-2">
        <FieldLabel label="Compétences" locked={!!locks.skills} onToggle={() => toggleLock("skills")} />`,
      replace: `      {roll.tracks?.length > 0 && (
        <div className="stack-y-2">
          <Label className="block">Cases à cocher</Label>
          {roll.tracks.map((track) => (
            <TrackBoxes
              key={track.id}
              track={track}
              value={form.checks?.[track.id]}
              onChange={(next) => set("checks", setChecked(form.checks, track.id, next))}
            />
          ))}
        </div>
      )}

      <div className="stack-y-2">
        <FieldLabel label="Compétences" locked={!!locks.skills} onToggle={() => toggleLock("skills")} />`,
    },
  ],
  "useRollSetup.js": [
    {
      find: `import { skillLinkMap, skillModifierMap } from "@/lib/meta/diceLinks";`,
      replace: `import { skillLinkMap, skillModifierMap } from "@/lib/meta/diceLinks";
import { cleanTracks } from "@/lib/meta/tracks";`,
    },
    {
      find: `const EMPTY = { dice: null, links: {}, modifiers: {} };`,
      replace: `const EMPTY = { dice: null, links: {}, modifiers: {}, tracks: [] };`,
    },
    {
      find: `  ]).then(([models, skills]) => ({ dice: cleanDiceConfig(models.items[0]?.dice), links: skillLinkMap(skills.items), modifiers: skillModifierMap(skills.items) }));`,
      replace: `  ]).then(([models, skills]) => ({
    dice: cleanDiceConfig(models.items[0]?.dice),
    links: skillLinkMap(skills.items),
    modifiers: skillModifierMap(skills.items),
    // Pistes de cases à cocher du modèle : lues avec le réglage des dés, pour les fiches de PNJ et du Codex.
    tracks: cleanTracks(models.items[0]?.tracks),
  }));`,
    },
  ],
  "CodexEntryDetails.jsx": [
    {
      find: `import RollButton from "@/components/game/RollButton";`,
      replace: `import RollButton from "@/components/game/RollButton";
import TrackBoxes from "@/components/game/TrackBoxes";`,
    },
    {
      find: `function Skills({ skills, owner, sheet, setup }) {`,
      replace: `/** Cases à cocher du modèle de la campagne, avec celles cochées sur la fiche (lecture seule). */
function Tracks({ tracks, checks }) {
  const rows = list(tracks);
  if (rows.length === 0) return null;
  return (
    <Section title="Cases à cocher :">
      <div className="stack-y-1">
        {rows.map((track) => (
          <TrackBoxes key={track.id} track={track} value={checks?.[track.id]} />
        ))}
      </div>
    </Section>
  );
}

function Skills({ skills, owner, sheet, setup }) {`,
    },
    {
      find: `          <Characteristics characteristics={entry.characteristics} owner={owner} sheet={entry} setup={setup} />`,
      replace: `          <Characteristics characteristics={entry.characteristics} owner={owner} sheet={entry} setup={setup} />
          <Tracks tracks={setup.tracks} checks={entry.checks} />`,
      count: 2,
    },
  ],
  "printModel.js": [
    {
      find: `import { cleanJournal, journalEntries } from "@/lib/meta/sessionJournal";`,
      replace: `import { cleanJournal, journalEntries } from "@/lib/meta/sessionJournal";
import { trackRows } from "@/lib/meta/tracks";`,
    },
    {
      find: `    const inventory = cleanInventory(npc.inventory).map(inventoryPrintLine);
    return { lines, stats, skills, equipment, inventory };`,
      replace: `    const inventory = cleanInventory(npc.inventory).map(inventoryPrintLine);
    // Cases cochées (stress, radiations…) : seules les pistes entamées sont imprimées, sous la forme « Stress : 2/5 ».
    trackRows(gameSheetModel?.tracks, npc.checks)
        .filter((track) => track.checked > 0)
        .forEach((track) => lines.push(\`\${track.name} : \${track.checked}/\${track.count}\`));
    return { lines, stats, skills, equipment, inventory };`,
    },
    {
      find: `            skillRollModifier: !!gameSheetModel?.skillRollModifier,`,
      replace: `            skillRollModifier: !!gameSheetModel?.skillRollModifier,
            // Pistes de cases à cocher du modèle, pour imprimer les cases cochées de chaque fiche.
            ...(gameSheetModel?.tracks?.length ? { tracks: gameSheetModel.tracks } : {}),`,
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
