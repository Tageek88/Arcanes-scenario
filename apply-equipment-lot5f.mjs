// apply-equipment-lot5f.mjs : lot 5f : bouton Dupliquer sur chaque objet d'équipement ; quand le type change, message Compléter / Ignorer pour ajouter les champs connus du catalogue d'équipement (plus de remplacement silencieux).
// Usage, depuis la racine du projet :
//   node apply-equipment-lot5f.mjs --dry     (vérifie sans rien écrire)
//   node apply-equipment-lot5f.mjs           (applique)
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

// Ce lot s'appuie sur le lot 5e (armes et protections).
if (!fs.existsSync(path.join(root, "tests/sheetZonesEquipment.test.js"))) {
  console.error("Appliquez d'abord le lot 5e (fichier absent : tests/sheetZonesEquipment.test.js).");
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
      find: `import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";`,
      replace: `import React, { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";`,
    },
    {
      find: `  const prepareEquipmentFields = (index) => {
    const item = form.equipment[index];
    if (!item?.type) return;
    const names = fieldNamesForType(item.type);
    if (!names.length) return;
    setEquipment(index, (current) => ({
      fields: names.map((name) => ({
        name,
        value: normalize(current.type) === normalize(item.type)
          ? current.fields?.find((field) => field.name === name)?.value || ""
          : "",
      })),
    }));
  };`,
      replace: `  // Type d'équipement au moment où on entre dans son champ, et types dont on a refusé les champs (par objet) : on ne repose pas la question.
  const typeAtFocus = useRef({});
  const ignoredTypeFields = useRef(new Set());

  // Quand le type d'un objet change, propose d'ajouter les champs que le catalogue d'équipement connaît pour ce type (sans rien écraser).
  const offerTypeFields = async (index) => {
    const item = form.equipment[index];
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
    setEquipment(index, (current) => {
      const have = new Set((current.fields || []).map((field) => normalize(field.name)));
      return { fields: [...(current.fields || []), ...missing.filter((name) => !have.has(normalize(name))).map((name) => ({ name, value: "" }))] };
    });
  };

  // Copie un objet (valeurs comprises) juste après lui : pratique pour une seconde arme du même genre.
  const duplicateEquipment = (index) => {
    ignoredTypeFields.current.clear();
    setForm((current) => {
      const source = current.equipment[index];
      if (!source) return current;
      const copy = { ...source, fields: structuredClone(source.fields || []) };
      return { ...current, equipment: [...current.equipment.slice(0, index + 1), copy, ...current.equipment.slice(index + 1)] };
    });
  };`,
    },
    {
      find: `                      list={\`equipment-types-\${index}\`}
                      value={item.type || ""}
                      onChange={(event) => {
                        const type = event.target.value;
                        setEquipment(index, (current) => ({
                          type,
                          fields: normalize(current.type) === normalize(type)
                            ? current.fields
                            : fieldNamesForType(type).map((name) => ({ name, value: "" })),
                        }));
                      }}
                      onBlur={() => prepareEquipmentFields(index)}`,
      replace: `list={\`equipment-types-\${index}\`}
                      value={item.type || ""}
                      onFocus={() => {
                        typeAtFocus.current[index] = item.type || "";
                      }}
                      onChange={(event) => setEquipment(index, { type: event.target.value })}
                      onBlur={() => offerTypeFields(index)}`,
    },
    {
      find: `                <Button type="button" variant="ghost" size="icon" aria-label={\`Supprimer l'équipement \${item.name || index + 1}\`} onClick={() => setForm((current) => ({ ...current, equipment: current.equipment.filter((_, i) => i !== index) }))}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>`,
      replace: `                <div className="flex">
                  <Button type="button" variant="ghost" size="icon" aria-label={\`Dupliquer l'équipement \${item.name || index + 1}\`} onClick={() => duplicateEquipment(index)}>
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" aria-label={\`Supprimer l'équipement \${item.name || index + 1}\`} onClick={() => { ignoredTypeFields.current.clear(); setForm((current) => ({ ...current, equipment: current.equipment.filter((_, i) => i !== index) })); }}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>`,
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
