// apply-npc-equipment-lot7a.mjs : lot 7a : fiche de PNJ, équipement : bouton Dupliquer, « Arme » et « Protection » toujours proposés comme types, et rappel des champs connus du catalogue quand on choisit un type (Compléter ou Ignorer).
// Usage, depuis la racine du projet :
//   node apply-npc-equipment-lot7a.mjs --dry     (vérifie sans rien écrire)
//   node apply-npc-equipment-lot7a.mjs           (applique)
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
if (!fs.existsSync(path.join(root, "src/components/codex/NpcSheetFields.jsx")) || !fs.existsSync(path.join(root, "src/hooks/useConfirm.jsx"))) {
  console.error("Fichiers introuvables : NpcSheetFields.jsx ou useConfirm.jsx.");
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
      find: `import React, { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";`,
      replace: `import React, { useEffect, useRef, useState } from "react";
import { Copy, Plus, X } from "lucide-react";`,
    },
    {
      find: `import { setText } from "@/lib/meta/textFields";
`,
      replace: `import { setText } from "@/lib/meta/textFields";
import useConfirm from "@/hooks/useConfirm";
`,
    },
    {
      find: `  const { locks, toggleLock } = generation;
`,
      replace: `  const { locks, toggleLock } = generation;
  const { confirm, confirmDialog } = useConfirm();
`,
    },
    {
      find: `  const equipmentTypes = [...new Set(equipmentPool.map((item) => item.type).filter(Boolean))];`,
      replace: `  // « Arme » et « Protection » sont toujours proposés : la feuille les place séparément.
  const equipmentTypes = [...new Set(["Arme", "Protection", ...equipmentPool.map((item) => item.type).filter(Boolean)])];`,
    },
    {
      find: `  const levelOptions = generator.levelNames.includes(form.level)`,
      replace: `  // Type d'équipement au moment où on entre dans son champ, et types dont on a refusé les champs (par objet) : on ne repose pas la question.
  const typeAtFocus = useRef({});
  const ignoredTypeFields = useRef(new Set());
  // Quand le type d'un objet change, propose d'ajouter les champs que le catalogue d'équipement connaît pour ce type (sans rien écraser).
  const offerTypeFields = async (index) => {
    const item = equipment[index];
    const type = String(item?.type || "").trim();
    const before = typeAtFocus.current[index];
    typeAtFocus.current[index] = undefined;
    if (!type || normalize(before) === normalize(type)) return;
    const key = \`\${index}|\${normalize(type)}\`;
    if (ignoredTypeFields.current.has(key)) return;
    const present = new Set((item.fields || []).map((field) => normalize(field.name)));
    const missing = fieldNamesForType(type).filter((name) => !present.has(normalize(name)));
    if (!missing.length) return;
    const accepted = await confirm({
      title: "Champs connus pour ce type",
      description: \`Le catalogue d’équipement connaît pour le type « \${type} » les champs : \${missing.join(", ")}. Les ajouter à cet objet ?\`,
      confirmLabel: "Compléter",
      cancelLabel: "Ignorer",
    });
    if (!accepted) {
      ignoredTypeFields.current.add(key);
      return;
    }
    setEquipment(index, { fields: [...(item.fields || []), ...missing.map((name) => ({ name, value: "" }))] });
  };
  // Copie un objet (valeurs comprises) juste après lui : pratique pour une seconde arme du même genre.
  const duplicateEquipment = (index) => {
    const source = equipment[index];
    if (!source) return;
    ignoredTypeFields.current.clear();
    const copy = { ...source, fields: (source.fields || []).map((field) => ({ ...field })) };
    set("equipment", [...equipment.slice(0, index + 1), copy, ...equipment.slice(index + 1)]);
  };
  const removeEquipment = (index) => {
    ignoredTypeFields.current.clear();
    set("equipment", equipment.filter((_, i) => i !== index));
  };
  const levelOptions = generator.levelNames.includes(form.level)`,
    },
    {
      find: `                value={item.type || ""}
                placeholder="Type"
                onChange={(event) => setEquipment(index, { type: event.target.value })}
              />
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={\`Retirer l'équipement \${index + 1}\`} onClick={() => set("equipment", equipment.filter((_, i) => i !== index))}>
                <X className="h-4 w-4" />
              </Button>`,
      replace: `                value={item.type || ""}
                placeholder="Type"
                onFocus={() => {
                  typeAtFocus.current[index] = item.type || "";
                }}
                onChange={(event) => setEquipment(index, { type: event.target.value })}
                onBlur={() => offerTypeFields(index)}
              />
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={\`Dupliquer l'équipement \${item.name || index + 1}\`} onClick={() => duplicateEquipment(index)}>
                <Copy className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={\`Retirer l'équipement \${index + 1}\`} onClick={() => removeEquipment(index)}>
                <X className="h-4 w-4" />
              </Button>`,
    },
    {
      find: `        </div>
      )}
    </>
  );
}`,
      replace: `        </div>
      )}
      {confirmDialog}
    </>
  );
}`,
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
