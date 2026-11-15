// apply-layout-print-lot9d.mjs : lot 9d : l'impression d'une fiche en liste (page Jeu, impression multiple et PDF) suit la mise en page du modèle : caractéristiques, informations et cases à cocher dans l'ordre des blocs.
// Usage, depuis la racine du projet :
//   node apply-layout-print-lot9d.mjs --dry     (vérifie sans rien écrire)
//   node apply-layout-print-lot9d.mjs           (applique)
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
if (!fs.existsSync(path.join(root, "src/lib/meta/printModel.js")) || !fs.existsSync(path.join(root, "src/components/game/SheetZonesDialog.jsx")) || !fs.existsSync(path.join(root, "src/components/game/SheetBackgroundDialog.jsx")) || !fs.existsSync(path.join(root, "src/pages/Jeu.jsx"))) {
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
  "PrintSheet.jsx": [
    {
      find: `import { groupEquipment } from "@/lib/meta/equipmentGroups";`,
      replace: `import { groupEquipment } from "@/lib/meta/equipmentGroups";
import { resolveLayout } from "@/lib/meta/layouts";`,
    },
    {
      find: `function CharacterContent({ character, characteristics, skillRollModifier, tracks = [], textFields = [], sheet = null }) {`,
      replace: `function CharacterContent({ character, characteristics, skillRollModifier, tracks = [], textFields = [], sheet = null, layout = null }) {`,
    },
    {
      find: `    const trackLines = trackRows(tracks, character.checks);
    const textLines = textRows(textFields, character.texts).filter((row) => row.value);
    const stats = characteristics.map((definition) => {`,
      replace: `    const stats = characteristics.map((definition) => {`,
    },
    {
      find: `        return { name: definition.name, value: values.value, fields };
    });
`,
      replace: `        return { name: definition.name, value: values.value, fields };
    });
    // Les blocs de la mise en page du modèle (par défaut : caractéristiques, informations, cases à cocher).
    const blocks = (layout?.blocks ? layout : resolveLayout([], "", { characteristics, tracks, textFields })).blocks;
    const statByName = new Map(stats.map((stat) => [stat.name, stat]));
`,
    },
    {
      find: `            {stats.length > 0 && (
                <section className="prt-section">
                    <h2>Caractéristiques</h2>
                    <div className="prt-character-grid">
                        {stats.map((stat) => (
                            <article className="prt-character-stat" key={stat.name}>
                                <h3>{stat.name}</h3>
                                <p>
                                    <strong>Valeur :</strong>{" "}
                                    {hasValue(stat.value) ? stat.value : <span className="prt-blank" />}
                                </p>
                                {stat.fields.map((field, fieldIndex) => (
                                    <p key={\`\${field.name}-\${fieldIndex}\`}>
                                        <strong>{field.name} :</strong>{" "}
                                        {hasValue(field.value) ? field.value : <span className="prt-blank" />}
                                    </p>
                                ))}
                            </article>
                        ))}
                    </div>
                </section>
            )}
            {textLines.length > 0 && (
                <section className="prt-section">
                    <h2>Informations</h2>
                    {textLines.map((row) => (
                        <p key={row.id} style={row.long ? { whiteSpace: "pre-wrap" } : undefined}>
                            <strong>{row.name} :</strong> {row.value}
                        </p>
                    ))}
                </section>
            )}
            {trackLines.length > 0 && (
                <section className="prt-section">
                    <h2>Cases à cocher</h2>
                    {trackLines.map((track) => (
                        <div className="prt-character-item" key={track.id}>
                            <span className="prt-title">{track.name}</span>{" "}
                            {Array.from({ length: track.count }, (_, index) => (index < track.checked ? "☑" : "☐")).join(" ")}
                        </div>
                    ))}
                </section>
            )}`,
      replace: `            {blocks.map((block) => {
                const title = block.title || (block.kind === "stat-group" ? block.stat : block.kind === "stats" ? "Caractéristiques" : block.kind === "texts" ? "Informations" : "Cases à cocher");
                if (block.kind === "stat-group" || block.kind === "stats") {
                    const names = block.kind === "stat-group" ? [block.stat, ...block.children] : block.stats;
                    const list = names.map((name) => statByName.get(name)).filter(Boolean);
                    if (list.length === 0) return null;
                    return (
                        <section className="prt-section" key={block.id}>
                            <h2>{title}</h2>
                            <div className="prt-character-grid">
                                {list.map((stat) => (
                                    <article className="prt-character-stat" key={stat.name}>
                                        <h3>{stat.name}</h3>
                                        <p>
                                            <strong>Valeur :</strong>{" "}
                                            {hasValue(stat.value) ? stat.value : <span className="prt-blank" />}
                                        </p>
                                        {stat.fields.map((field, fieldIndex) => (
                                            <p key={\`\${field.name}-\${fieldIndex}\`}>
                                                <strong>{field.name} :</strong>{" "}
                                                {hasValue(field.value) ? field.value : <span className="prt-blank" />}
                                            </p>
                                        ))}
                                    </article>
                                ))}
                            </div>
                        </section>
                    );
                }
                if (block.kind === "texts") {
                    const lines = textRows(block.fields, character.texts).filter((row) => row.value);
                    if (lines.length === 0) return null;
                    return (
                        <section className="prt-section" key={block.id}>
                            <h2>{title}</h2>
                            {lines.map((row) => (
                                <p key={row.id} style={row.long ? { whiteSpace: "pre-wrap" } : undefined}>
                                    <strong>{row.name} :</strong> {row.value}
                                </p>
                            ))}
                        </section>
                    );
                }
                const lines = trackRows(block.tracks, character.checks);
                if (lines.length === 0) return null;
                return (
                    <section className="prt-section" key={block.id}>
                        <h2>{title}</h2>
                        {lines.map((track) => (
                            <div className="prt-character-item" key={track.id}>
                                <span className="prt-title">{track.name}</span>{" "}
                                {Array.from({ length: track.count }, (_, index) => (index < track.checked ? "☑" : "☐")).join(" ")}
                            </div>
                        ))}
                    </section>
                );
            })}`,
    },
    {
      find: `{block.characters.map(({ character, characteristics, skillRollModifier, tracks, textFields, sheet }) => (`,
      replace: `{block.characters.map(({ character, characteristics, skillRollModifier, tracks, textFields, sheet, layout }) => (`,
    },
    {
      find: `                                textFields={textFields}
                                sheet={sheet}
                            />
                        </article>`,
      replace: `                                textFields={textFields}
                                sheet={sheet}
                                layout={layout}
                            />
                        </article>`,
    },
    {
      find: `const { character, campaignName, characteristics, skillRollModifier, tracks, textFields, sheet } = model;`,
      replace: `const { character, campaignName, characteristics, skillRollModifier, tracks, textFields, sheet, layout } = model;`,
    },
    {
      find: `                    textFields={textFields}
                    sheet={sheet}
                />
            </div>`,
      replace: `                    textFields={textFields}
                    sheet={sheet}
                    layout={layout}
                />
            </div>`,
    },
  ],
  "editablePdf.js": [
    {
      find: `import { groupEquipment } from "@/lib/meta/equipmentGroups";`,
      replace: `import { groupEquipment } from "@/lib/meta/equipmentGroups";
import { resolveLayout } from "@/lib/meta/layouts";`,
    },
    {
      find: `{ character, characteristics, skillRollModifier, tracks = [], textFields = [], sheet = null }] of block.characters.entries()`,
      replace: `{ character, characteristics, skillRollModifier, tracks = [], textFields = [], sheet = null, layout = null }] of block.characters.entries()`,
    },
    {
      find: `                    drawHeading("Caractéristiques", 3);
                    drawCharacteristics(
                        characteristics.map((definition) => {
                            const values = character.characteristics?.[definition.name] || {};
                            const rows = [["Valeur", values.value]];
                            (values.fields || []).forEach((field) => {
                                if (field.name || field.value) rows.push([field.name, field.value]);
                            });
                            return { name: definition.name, rows };
                        })
                    );
                    const textLines = textRows(textFields, character.texts);
                    if (textLines.length) {
                        drawHeading("Informations", 3);
                        for (const row of textLines) {
                            drawField(row.name, row.value, row.long ? { multiline: true, height: 60 } : {});
                        }
                    }
                    const trackLines = trackRows(tracks, character.checks);
                    if (trackLines.length) {
                        drawHeading("Cases à cocher", 3);
                        drawTracks(trackLines);
                    }`,
      replace: `                    // Les blocs de la mise en page du modèle (par défaut : caractéristiques, informations, cases à cocher).
                    const blocks = (layout?.blocks ? layout : resolveLayout([], "", { characteristics, tracks, textFields })).blocks;
                    for (const block of blocks) {
                        const title = block.title || (block.kind === "stat-group" ? block.stat : block.kind === "stats" ? "Caractéristiques" : block.kind === "texts" ? "Informations" : "Cases à cocher");
                        if (block.kind === "stat-group" || block.kind === "stats") {
                            const names = block.kind === "stat-group" ? [block.stat, ...block.children] : block.stats;
                            const definitions = names.map((name) => characteristics.find((definition) => definition.name === name)).filter(Boolean);
                            if (definitions.length === 0) continue;
                            drawHeading(title, 3);
                            drawCharacteristics(
                                definitions.map((definition) => {
                                    const values = character.characteristics?.[definition.name] || {};
                                    const rows = [["Valeur", values.value]];
                                    (values.fields || []).forEach((field) => {
                                        if (field.name || field.value) rows.push([field.name, field.value]);
                                    });
                                    return { name: definition.name, rows };
                                })
                            );
                        } else if (block.kind === "texts") {
                            const textLines = textRows(block.fields, character.texts);
                            if (textLines.length === 0) continue;
                            drawHeading(title, 3);
                            for (const row of textLines) {
                                drawField(row.name, row.value, row.long ? { multiline: true, height: 60 } : {});
                            }
                        } else {
                            const trackLines = trackRows(block.tracks, character.checks);
                            if (trackLines.length === 0) continue;
                            drawHeading(title, 3);
                            drawTracks(trackLines);
                        }
                    }`,
    },
  ],
  "printModel.js": [
    {
      find: `import { sheetForPrint } from "@/lib/meta/sheetZones";`,
      replace: `import { sheetForPrint } from "@/lib/meta/sheetZones";
import { resolveLayout } from "@/lib/meta/layouts";`,
    },
    {
      find: `            ...(printSheet ? { sheet: printSheet } : {}),
        }));`,
      replace: `            ...(printSheet ? { sheet: printSheet } : {}),
            // Mise en page du modèle : les valeurs s'impriment dans l'ordre des blocs de la fiche.
            layout: resolveLayout(gameSheetModel?.layouts, gameSheetModel?.layoutId, gameSheetModel || {}),
        }));`,
    },
  ],
  "Jeu.jsx": [
    {
      find: `            sheet: sheetForPrint(model, printPages),
          }}`,
      replace: `            sheet: sheetForPrint(model, printPages),
            layout: sheetLayout,
          }}`,
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
