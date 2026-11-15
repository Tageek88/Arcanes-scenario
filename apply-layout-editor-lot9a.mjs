// apply-layout-editor-lot9a.mjs : lot 9a : la fiche de personnage (éditeur) suit la mise en page du modèle : blocs dans l'ordre de la feuille (attributs avec leurs compétences, informations, cases à cocher).
// Usage, depuis la racine du projet :
//   node apply-layout-editor-lot9a.mjs --dry     (vérifie sans rien écrire)
//   node apply-layout-editor-lot9a.mjs           (applique)
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
if (!fs.existsSync(path.join(root, "src/components/game/GameCharacterEditor.jsx")) || !fs.existsSync(path.join(root, "src/components/game/SheetZonesDialog.jsx")) || !fs.existsSync(path.join(root, "src/components/game/SheetBackgroundDialog.jsx")) || !fs.existsSync(path.join(root, "src/pages/Jeu.jsx"))) {
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
  "GameCharacterEditor.jsx": [
    {
      find: `import { cleanTexts, setText } from "@/lib/meta/textFields";`,
      replace: `import { cleanTexts, setText } from "@/lib/meta/textFields";
import { resolveLayout } from "@/lib/meta/layouts";`,
    },
    {
      find: `  const footer = (
`,
      replace: `  // La mise en page du modèle (par défaut : caractéristiques, informations, cases à cocher).
  const layout = useMemo(() => resolveLayout(model.layouts, model.layoutId, model), [model]);

  // Les trois sortes d'éditeurs de la fiche, rangés ensuite selon la mise en page du modèle (voir \`layout\`).
  const statByName = new Map(model.characteristics.map((item) => [item.name, item]));
  const renderStatEditor = (item) => {
                const values = form.characteristics[item.name] || { value: "", fields: [] };
                const fields = values.fields || [];
                return (
                  <div key={item.name} className="stack-y-2 rounded-lg border border-border p-3">
                    <Label className="font-medium text-foreground">
                      {item.name}
                      {item.parent && <span className="ml-2 text-xs font-normal text-muted-foreground">+ {item.parent}</span>}
                    </Label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <label className="stack-y-1 text-xs text-muted-foreground">
                        Valeur
                        <Input
                          aria-label={\`\${item.name} valeur\`}
                          value={values.value || ""}
                          onChange={(event) => setCharacteristic(item.name, "value", event.target.value)}
                          placeholder="Valeur principale"
                        />
                      </label>
                    </div>

                    <div className="stack-y-2 pt-1">
                      {fields.map((field, fieldIndex) => (
                        <div key={fieldIndex} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.5rem] items-center gap-2">
                          <Input
                            aria-label={\`Nom du champ de \${item.name}\`}
                            value={field.name}
                            onChange={(event) => setCharacteristicField(item.name, fieldIndex, "name", event.target.value)}
                            placeholder="Champ facultatif (ex. Modificateur, Test, Max)"
                          />
                          <Input
                            aria-label={\`\${field.name || "Valeur"} de \${item.name}\`}
                            value={field.value || ""}
                            onChange={(event) => setCharacteristicField(item.name, fieldIndex, "value", event.target.value)}
                            placeholder="Valeur"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={\`Supprimer le champ \${field.name || fieldIndex + 1}\`}
                            onClick={() => removeCharacteristicField(item.name, fieldIndex)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addCharacteristicField(item.name)}
                      >
                        <Plus className="h-4 w-4" /> Champ facultatif
                      </Button>
                    </div>
                    <DiceOverrideField
                      characteristic={item.name}
                      config={model.dice}
                      override={form.dice_override}
                      onChange={(next) => setForm((current) => ({ ...current, dice_override: next }))}
                    />
                  </div>
                );
  };
  const renderTextEditor = (field) => (
              <div key={field.id} className="stack-y-1.5">
                <Label htmlFor={\`text-\${field.id}\`}>{field.name}</Label>
                {field.long ? (
                  <Textarea
                    id={\`text-\${field.id}\`}
                    rows={4}
                    value={form.texts?.[field.id] ?? ""}
                    onChange={(event) => setForm((current) => ({ ...current, texts: setText(current.texts, field.id, event.target.value) }))}
                  />
                ) : (
                  <Input
                    id={\`text-\${field.id}\`}
                    value={form.texts?.[field.id] ?? ""}
                    onChange={(event) => setForm((current) => ({ ...current, texts: setText(current.texts, field.id, event.target.value) }))}
                  />
                )}
              </div>
  );
  const renderTrackEditor = (track) => (
              <TrackBoxes
                key={track.id}
                track={track}
                value={form.checks?.[track.id]}
                onChange={(next) => setForm((current) => ({ ...current, checks: setChecked(current.checks, track.id, next) }))}
              />
  );

  const footer = (
`,
    },
    {
      find: `        {model.characteristics.length > 0 && (
          <section className="stack-y-3">
            <LockedHeading label="Caractéristiques" locked={!!generation.locks.characteristics} onToggle={() => generation.toggleLock("characteristics")} />
            <div className="stack-y-3">
              {model.characteristics.map((item) => {
                const values = form.characteristics[item.name] || { value: "", fields: [] };
                const fields = values.fields || [];
                return (
                  <div key={item.name} className="stack-y-2 rounded-lg border border-border p-3">
                    <Label className="font-medium text-foreground">
                      {item.name}
                      {item.parent && <span className="ml-2 text-xs font-normal text-muted-foreground">+ {item.parent}</span>}
                    </Label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <label className="stack-y-1 text-xs text-muted-foreground">
                        Valeur
                        <Input
                          aria-label={\`\${item.name} valeur\`}
                          value={values.value || ""}
                          onChange={(event) => setCharacteristic(item.name, "value", event.target.value)}
                          placeholder="Valeur principale"
                        />
                      </label>
                    </div>

                    <div className="stack-y-2 pt-1">
                      {fields.map((field, fieldIndex) => (
                        <div key={fieldIndex} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.5rem] items-center gap-2">
                          <Input
                            aria-label={\`Nom du champ de \${item.name}\`}
                            value={field.name}
                            onChange={(event) => setCharacteristicField(item.name, fieldIndex, "name", event.target.value)}
                            placeholder="Champ facultatif (ex. Modificateur, Test, Max)"
                          />
                          <Input
                            aria-label={\`\${field.name || "Valeur"} de \${item.name}\`}
                            value={field.value || ""}
                            onChange={(event) => setCharacteristicField(item.name, fieldIndex, "value", event.target.value)}
                            placeholder="Valeur"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={\`Supprimer le champ \${field.name || fieldIndex + 1}\`}
                            onClick={() => removeCharacteristicField(item.name, fieldIndex)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addCharacteristicField(item.name)}
                      >
                        <Plus className="h-4 w-4" /> Champ facultatif
                      </Button>
                    </div>
                    <DiceOverrideField
                      characteristic={item.name}
                      config={model.dice}
                      override={form.dice_override}
                      onChange={(next) => setForm((current) => ({ ...current, dice_override: next }))}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {model.textFields?.length > 0 && (
          <section className="stack-y-3">
            <h3 className="font-display font-semibold">Informations</h3>
            {model.textFields.map((field) => (
              <div key={field.id} className="stack-y-1.5">
                <Label htmlFor={\`text-\${field.id}\`}>{field.name}</Label>
                {field.long ? (
                  <Textarea
                    id={\`text-\${field.id}\`}
                    rows={4}
                    value={form.texts?.[field.id] ?? ""}
                    onChange={(event) => setForm((current) => ({ ...current, texts: setText(current.texts, field.id, event.target.value) }))}
                  />
                ) : (
                  <Input
                    id={\`text-\${field.id}\`}
                    value={form.texts?.[field.id] ?? ""}
                    onChange={(event) => setForm((current) => ({ ...current, texts: setText(current.texts, field.id, event.target.value) }))}
                  />
                )}
              </div>
            ))}
          </section>
        )}

        {model.tracks?.length > 0 && (
          <section className="stack-y-3">
            <h3 className="font-display font-semibold">Cases à cocher</h3>
            {model.tracks.map((track) => (
              <TrackBoxes
                key={track.id}
                track={track}
                value={form.checks?.[track.id]}
                onChange={(next) => setForm((current) => ({ ...current, checks: setChecked(current.checks, track.id, next) }))}
              />
            ))}
          </section>
        )}`,
      replace: `        {layout.blocks.map((block) => {
          const statBlock = block.kind === "stat-group" || block.kind === "stats";
          const firstStatBlock = statBlock && !layout.blocks.slice(0, layout.blocks.indexOf(block)).some((other) => other.kind === "stat-group" || other.kind === "stats");
          const title = block.title || (block.kind === "stat-group" ? block.stat : block.kind === "stats" ? "Caractéristiques" : block.kind === "texts" ? "Informations" : "Cases à cocher");
          return (
            <section key={block.id} className="stack-y-3">
              {firstStatBlock ? (
                <LockedHeading label={title} locked={!!generation.locks.characteristics} onToggle={() => generation.toggleLock("characteristics")} />
              ) : (
                <h3 className="font-display font-semibold">{title}</h3>
              )}
              {block.kind === "stat-group" && (
                <div className="stack-y-3">
                  {[block.stat, ...block.children].map((name) => (statByName.get(name) ? renderStatEditor(statByName.get(name)) : null))}
                </div>
              )}
              {block.kind === "stats" && <div className="stack-y-3">{block.stats.map((name) => renderStatEditor(statByName.get(name)))}</div>}
              {block.kind === "texts" && block.fields.map((field) => renderTextEditor(field))}
              {block.kind === "tracks" && block.tracks.map((track) => renderTrackEditor(track))}
            </section>
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
