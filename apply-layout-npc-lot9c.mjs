// apply-layout-npc-lot9c.mjs : lot 9c (après les lots 7a et 7b) : l'éditeur de fiche de PNJ suit la mise en page du modèle (blocs dans l'ordre de la feuille).
// Usage, depuis la racine du projet :
//   node apply-layout-npc-lot9c.mjs --dry     (vérifie sans rien écrire)
//   node apply-layout-npc-lot9c.mjs           (applique)
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

// Ce lot modifie la fiche de PNJ (NpcSheetFields.jsx).
if (!fs.existsSync(path.join(root, "src/components/codex/NpcSheetFields.jsx")) || !fs.existsSync(path.join(root, "src/components/game/SheetZonesDialog.jsx")) || !fs.existsSync(path.join(root, "src/components/game/SheetBackgroundDialog.jsx")) || !fs.existsSync(path.join(root, "src/pages/Jeu.jsx"))) {
  console.error("Fichiers introuvables (gameSystems, SheetZonesDialog, SheetBackgroundDialog ou Jeu) : le lot 5b et le lot 4 doivent être appliqués.");
  process.exit(1);
}

// Retrouve un fichier du projet par son nom (une seule correspondance attendue sous src/).
function findInSrc(name) {
  const hits = ["src", "tests"].flatMap((dir) =>
    fs.existsSync(path.join(root, dir))
      ? fs.readdirSync(path.join(root, dir), { recursive: true })
          .map(String)
          .filter((file) => path.basename(file) === name && !file.split(path.sep).includes("node_modules"))
          .map((file) => path.join(dir, file))
      : []
  );
  return hits.length === 1 ? hits[0] : null;
}

const NEW_FILES = {
};

const EDITS = {
  "NpcSheetFields.jsx": [
    {
      find: `import React, { useEffect, useRef, useState } from "react";`,
      replace: `import React, { useEffect, useMemo, useRef, useState } from "react";`,
    },
    {
      find: `import { setText } from "@/lib/meta/textFields";
`,
      replace: `import { setText } from "@/lib/meta/textFields";
import { resolveLayout } from "@/lib/meta/layouts";
`,
    },
    {
      find: `  const levelOptions = generator.levelNames.includes(form.level) || !form.level ? generator.levelNames : [form.level, ...generator.levelNames];
`,
      replace: `  const levelOptions = generator.levelNames.includes(form.level) || !form.level ? generator.levelNames : [form.level, ...generator.levelNames];

  // La mise en page du modèle (par défaut : caractéristiques, informations, cases à cocher) range les trois sortes de saisies.
  const layoutStats = names.map((name) => (roll.characteristics || []).find((item) => item.name === name) || { name });
  const layout = useMemo(
    () => resolveLayout(roll.layouts, roll.layoutId, { characteristics: layoutStats, tracks: roll.tracks, textFields: roll.textFields }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roll.layouts, roll.layoutId, roll.characteristics, roll.tracks, roll.textFields, names.join("|")]
  );
  const renderStat = (name) => {
              const range = rangeOf(name);
              const entry = characteristics[name] || {};
              return (
                <div key={name} className="stack-y-2 rounded-lg border border-border p-3">
                  <label className="stack-y-1">
                    <span className="block text-xs font-medium text-foreground">{name}</span>
                    <Input
                      aria-label={\`\${name} valeur\`}
                      value={entry.value ?? ""}
                      placeholder={range ? \`\${range.min} à \${range.max}\` : "Valeur principale"}
                      onChange={(event) => setCharacteristic(name, { value: event.target.value })}
                    />
                  </label>
                  <OptionalFields
                    subject={name}
                    fields={entry.fields || []}
                    suggested={fieldSuggestions[name] || []}
                    onChange={(fields) => setCharacteristic(name, { fields })}
                  />
                  <DiceOverrideField
                    characteristic={name}
                    config={roll.dice}
                    override={form.dice_override}
                    onChange={(next) => set("dice_override", next)}
                  />
                </div>
              );
  };
  const renderText = (field) => (
            <div key={field.id} className="stack-y-1">
              <Label htmlFor={\`npc-text-\${field.id}\`} className="text-xs text-muted-foreground">{field.name}</Label>
              {field.long ? (
                <Textarea
                  id={\`npc-text-\${field.id}\`}
                  rows={3}
                  value={form.texts?.[field.id] ?? ""}
                  onChange={(event) => set("texts", setText(form.texts, field.id, event.target.value))}
                />
              ) : (
                <Input
                  id={\`npc-text-\${field.id}\`}
                  value={form.texts?.[field.id] ?? ""}
                  onChange={(event) => set("texts", setText(form.texts, field.id, event.target.value))}
                />
              )}
            </div>
  );
  const renderTrack = (track) => (
            <TrackBoxes
              key={track.id}
              track={track}
              value={form.checks?.[track.id]}
              onChange={(next) => set("checks", setChecked(form.checks, track.id, next))}
            />
  );
`,
    },
    {
      find: `      {names.length > 0 && (
        <div className="stack-y-2">
          <FieldLabel label="Caractéristiques" locked={!!locks.characteristics} onToggle={() => toggleLock("characteristics")} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {names.map((name) => {
              const range = rangeOf(name);
              const entry = characteristics[name] || {};
              return (
                <div key={name} className="stack-y-2 rounded-lg border border-border p-3">
                  <label className="stack-y-1">
                    <span className="block text-xs font-medium text-foreground">{name}</span>
                    <Input
                      aria-label={\`\${name} valeur\`}
                      value={entry.value ?? ""}
                      placeholder={range ? \`\${range.min} à \${range.max}\` : "Valeur principale"}
                      onChange={(event) => setCharacteristic(name, { value: event.target.value })}
                    />
                  </label>
                  <OptionalFields
                    subject={name}
                    fields={entry.fields || []}
                    suggested={fieldSuggestions[name] || []}
                    onChange={(fields) => setCharacteristic(name, { fields })}
                  />
                  <DiceOverrideField
                    characteristic={name}
                    config={roll.dice}
                    override={form.dice_override}
                    onChange={(next) => set("dice_override", next)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {roll.textFields?.length > 0 && (
        <div className="stack-y-2">
          <Label className="block">Informations</Label>
          {roll.textFields.map((field) => (
            <div key={field.id} className="stack-y-1">
              <Label htmlFor={\`npc-text-\${field.id}\`} className="text-xs text-muted-foreground">{field.name}</Label>
              {field.long ? (
                <Textarea
                  id={\`npc-text-\${field.id}\`}
                  rows={3}
                  value={form.texts?.[field.id] ?? ""}
                  onChange={(event) => set("texts", setText(form.texts, field.id, event.target.value))}
                />
              ) : (
                <Input
                  id={\`npc-text-\${field.id}\`}
                  value={form.texts?.[field.id] ?? ""}
                  onChange={(event) => set("texts", setText(form.texts, field.id, event.target.value))}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {roll.tracks?.length > 0 && (
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
      )}`,
      replace: `      {layout.blocks.map((block) => {
        const statBlock = block.kind === "stat-group" || block.kind === "stats";
        const firstStatBlock = statBlock && !layout.blocks.slice(0, layout.blocks.indexOf(block)).some((other) => other.kind === "stat-group" || other.kind === "stats");
        const title = block.title || (block.kind === "stat-group" ? block.stat : block.kind === "stats" ? "Caractéristiques" : block.kind === "texts" ? "Informations" : "Cases à cocher");
        return (
          <div key={block.id} className="stack-y-2">
            {firstStatBlock ? (
              <FieldLabel label={title} locked={!!locks.characteristics} onToggle={() => toggleLock("characteristics")} />
            ) : (
              <Label className="block">{title}</Label>
            )}
            {statBlock && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(block.kind === "stat-group" ? [block.stat, ...block.children] : block.stats).map((name) => renderStat(name))}
              </div>
            )}
            {block.kind === "texts" && block.fields.map((field) => renderText(field))}
            {block.kind === "tracks" && block.tracks.map((track) => renderTrack(track))}
          </div>
        );
      })}`,
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
