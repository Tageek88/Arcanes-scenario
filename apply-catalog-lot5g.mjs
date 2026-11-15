// apply-catalog-lot5g.mjs : lot 5g : catalogue d'équipement — bouton Dupliquer (copie à renommer) et rappel des champs connus du type avec le choix Compléter / Ignorer.
// Usage, depuis la racine du projet :
//   node apply-catalog-lot5g.mjs --dry     (vérifie sans rien écrire)
//   node apply-catalog-lot5g.mjs           (applique)
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

// Ce lot modifie le panneau du catalogue du jeu (GameCatalogPanel.jsx).
if (!fs.existsSync(path.join(root, "src/components/game/GameCatalogPanel.jsx"))) {
  console.error("Fichier introuvable : src/components/game/GameCatalogPanel.jsx.");
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
  "GameCatalogPanel.jsx": [
    {
      find: `import React, { useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";`,
      replace: `import React, { useMemo, useRef, useState } from "react";
import { Copy, Pencil, Plus, Search, Trash2, X } from "lucide-react";`,
    },
    {
      find: `import { useGameCatalog } from "@/hooks/useGameCatalog";`,
      replace: `import { useGameCatalog } from "@/hooks/useGameCatalog";
import useConfirm from "@/hooks/useConfirm";`,
    },
    {
      find: `  const [pendingDelete, setPendingDelete] = useState(null);
`,
      replace: `  const [pendingDelete, setPendingDelete] = useState(null);
  const { confirm, confirmDialog } = useConfirm();
  // Type de l'équipement au moment où on entre dans le champ « Type » : on ne propose les champs que si le type a changé.
  const typeAtFocus = useRef("");
`,
    },
    {
      find: `  const setFieldName = (index, value) => setDraft((current) => ({`,
      replace: `  // Une copie (nom « … (copie) », même type et mêmes champs) s'ouvre dans la fenêtre d'ajout, pour être renommée avant d'être enregistrée.
  const openDuplicate = (item) => setDraft({
    id: undefined,
    name: \`\${item.name || ""} (copie)\`.slice(0, 120),
    roll_modifier: item.roll_modifier || "",
    characteristic: item.characteristic || "",
    type: item.type || "",
    field_names: [...(item.field_names || (item.fields || []).map((field) => field.name))],
  });

  // Champs que les autres équipements du catalogue ont pour ce type.
  const fieldsKnownForType = (type, ownId) => [...new Set(
    items
      .filter((item) => item.id !== ownId && searchable(item.type).trim() === searchable(type).trim())
      .flatMap((item) => item.field_names || (item.fields || []).map((field) => field.name))
      .map((name) => String(name || "").trim())
      .filter(Boolean)
  )];

  // Quand le type change, propose d'ajouter les champs connus pour ce type (sans rien retirer).
  const offerTypeFields = async () => {
    const type = String(draft?.type || "").trim();
    if (!type || searchable(typeAtFocus.current).trim() === searchable(type)) return;
    const present = new Set(draft.field_names.map((name) => searchable(name).trim()).filter(Boolean));
    const missing = fieldsKnownForType(type, draft.id).filter((name) => !present.has(searchable(name)));
    if (!missing.length) return;
    const accepted = await confirm({
      title: "Champs connus pour ce type",
      description: \`Les autres équipements de type « \${type} » ont les champs : \${missing.join(", ")}. Les ajouter à celui-ci ?\`,
      confirmLabel: "Compléter",
      cancelLabel: "Ignorer",
    });
    if (!accepted) return;
    setDraft((current) => {
      if (!current) return current;
      const have = new Set(current.field_names.map((name) => searchable(name).trim()));
      return { ...current, field_names: [...current.field_names, ...missing.filter((name) => !have.has(searchable(name)))] };
    });
  };

  const setFieldName = (index, value) => setDraft((current) => ({`,
    },
    {
      find: `                    <Button size="icon" variant="ghost" aria-label={\`Modifier \${item.name}\`} onClick={() => openEdit(item)}>`,
      replace: `                    <Button size="icon" variant="ghost" aria-label={\`Dupliquer \${item.name}\`} onClick={() => openDuplicate(item)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label={\`Modifier \${item.name}\`} onClick={() => openEdit(item)}>`,
    },
    {
      find: `                    id="catalog-type"
                    value={draft.type}
                    onChange={(event) => setDraft({ ...draft, type: event.target.value })}`,
      replace: `                    id="catalog-type"
                    value={draft.type}
                    onFocus={() => {
                      typeAtFocus.current = draft.type;
                    }}
                    onChange={(event) => setDraft({ ...draft, type: event.target.value })}
                    onBlur={offerTypeFields}`,
    },
    {
      find: `      <AlertDialog open={!!pendingDelete}`,
      replace: `      {confirmDialog}

      <AlertDialog open={!!pendingDelete}`,
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
