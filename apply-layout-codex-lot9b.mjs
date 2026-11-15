// apply-layout-codex-lot9b.mjs : lot 9b : la fiche du Codex (PNJ et personnages) suit la mise en page du modèle : blocs dans l'ordre de la feuille ; les cases cochées de tous les blocs partagent le même état.
// Usage, depuis la racine du projet :
//   node apply-layout-codex-lot9b.mjs --dry     (vérifie sans rien écrire)
//   node apply-layout-codex-lot9b.mjs           (applique)
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
if (!fs.existsSync(path.join(root, "src/components/codex/CodexEntryDetails.jsx")) || !fs.existsSync(path.join(root, "src/components/game/SheetZonesDialog.jsx")) || !fs.existsSync(path.join(root, "src/components/game/SheetBackgroundDialog.jsx")) || !fs.existsSync(path.join(root, "src/pages/Jeu.jsx"))) {
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
  "useRollSetup.js": [
    {
      find: `const EMPTY = { dice: null, links: {}, modifiers: {}, tracks: [], parents: {}, textFields: [] };`,
      replace: `const EMPTY = { dice: null, links: {}, modifiers: {}, tracks: [], parents: {}, textFields: [], layouts: [], layoutId: "", characteristics: [] };`,
    },
    {
      find: `    parents: statParentMap(models.items[0]?.characteristics),
`,
      replace: `    parents: statParentMap(models.items[0]?.characteristics),
    // Mise en page de la fiche et caractéristiques (nom, lien, champs) : le Codex range les fiches comme la carte de Jeu.
    layouts: Array.isArray(models.items[0]?.layouts) ? models.items[0].layouts : [],
    layoutId: models.items[0]?.layoutId || "",
    characteristics: (Array.isArray(models.items[0]?.characteristics) ? models.items[0].characteristics : []).map((item) => ({
      name: item.name,
      parent: item.parent || "",
      field_names: Array.isArray(item.field_names) ? item.field_names : [],
    })),
`,
    },
  ],
  "CodexEntryDetails.jsx": [
    {
      find: `import React, { useEffect, useState } from "react";`,
      replace: `import React, { useEffect, useMemo, useState } from "react";`,
    },
    {
      find: `import { useRollSetup } from "@/hooks/useRollSetup";`,
      replace: `import { useRollSetup } from "@/hooks/useRollSetup";
import { resolveLayout } from "@/lib/meta/layouts";`,
    },
    {
      find: `function Characteristics({ characteristics, owner, sheet, setup }) {
  const entries = Object.entries(characteristics && typeof characteristics === "object" ? characteristics : {});`,
      replace: `function Characteristics({ characteristics, owner, sheet, setup, only, title = "Caractéristiques :" }) {
  const values = characteristics && typeof characteristics === "object" ? characteristics : {};
  // \`only\` : les caractéristiques d'un bloc de la mise en page, dans son ordre ; sinon toutes celles de la fiche.
  const entries = only ? only.filter((name) => Object.hasOwn(values, name)).map((name) => [name, values[name]]) : Object.entries(values);`,
    },
    {
      find: `    <Section title="Caractéristiques :">`,
      replace: `    <Section title={title}>`,
    },
    {
      find: `/**
 * Cases à cocher du modèle de la campagne, cochables ici même : la fiche (PNJ ou personnage) est enregistrée à chaque clic,
 * sans ouvrir son formulaire. L'affichage suit tout de suite ; en cas d'échec, la case revient et un message l'indique.
 */
function Tracks({ kind, entry, tracks }) {
  const { toast } = useToast();
  const [checks, setChecks] = useState(entry.checks);
  useEffect(() => {
    setChecks(entry.checks);
  }, [entry.checks]);
  const rows = list(tracks);
  const entity = KIND_META[kind]?.entity;
  if (rows.length === 0) return null;

  const change = async (track, next) => {
    const previous = checks;
    const updated = setChecked(checks, track.id, next);
    setChecks(updated);
    try {
      await api.entities[entity].update(entry.id, { checks: cleanChecks(updated, rows) });
    } catch (error) {
      console.error("Enregistrement des cases cochées impossible :", error);
      setChecks(previous);
      toast({ variant: "destructive", title: "Cases non enregistrées", description: "Les cases cochées n’ont pas été enregistrées." });
    }
  };

  return (
    <Section title="Cases à cocher :">
      <div className="stack-y-1">
        {rows.map((track) => (
          <TrackBoxes
            key={track.id}
            track={track}
            value={checks?.[track.id]}
            onChange={entity && entry.id ? (next) => change(track, next) : undefined}
          />
        ))}
      </div>
    </Section>
  );
}`,
      replace: `/**
 * Cases à cocher du modèle de la campagne, cochables ici même : la fiche (PNJ ou personnage) est enregistrée à chaque clic,
 * sans ouvrir son formulaire. L'affichage suit tout de suite ; en cas d'échec, la case revient et un message l'indique.
 * L'état est commun à tous les blocs de la fiche (une même fiche peut répartir ses pistes dans plusieurs blocs) :
 * \`tracks\` = toutes les pistes du modèle, c'est elles qui servent au nettoyage de l'enregistrement.
 */
function useEntryChecks(kind, entry, tracks) {
  const { toast } = useToast();
  const [checks, setChecks] = useState(entry.checks);
  useEffect(() => {
    setChecks(entry.checks);
  }, [entry.checks]);
  const rows = list(tracks);
  const entity = KIND_META[kind]?.entity;

  const change = async (track, next) => {
    const previous = checks;
    const updated = setChecked(checks, track.id, next);
    setChecks(updated);
    try {
      await api.entities[entity].update(entry.id, { checks: cleanChecks(updated, rows) });
    } catch (error) {
      console.error("Enregistrement des cases cochées impossible :", error);
      setChecks(previous);
      toast({ variant: "destructive", title: "Cases non enregistrées", description: "Les cases cochées n’ont pas été enregistrées." });
    }
  };

  return { checks, change: entity && entry.id ? change : undefined };
}

function Tracks({ tracks, checks, onChange, title = "Cases à cocher :" }) {
  const rows = list(tracks);
  if (rows.length === 0) return null;
  return (
    <Section title={title}>
      <div className="stack-y-1">
        {rows.map((track) => (
          <TrackBoxes
            key={track.id}
            track={track}
            value={checks?.[track.id]}
            onChange={onChange ? (next) => onChange(track, next) : undefined}
          />
        ))}
      </div>
    </Section>
  );
}

/**
 * Caractéristiques, textes et cases à cocher d'une fiche, rangés selon la mise en page du modèle de la campagne
 * (par défaut : caractéristiques, informations, cases à cocher). Sans caractéristique dans le modèle, l'ancien affichage.
 */
function SheetBlocks({ kind, entry, owner, setup }) {
  const { checks, change } = useEntryChecks(kind, entry, setup.tracks);
  const layout = useMemo(
    () => resolveLayout(setup.layouts, setup.layoutId, { characteristics: setup.characteristics, tracks: setup.tracks, textFields: setup.textFields }),
    [setup.layouts, setup.layoutId, setup.characteristics, setup.tracks, setup.textFields]
  );
  const known = list(setup.characteristics).length > 0;
  if (!known) {
    return (
      <>
        <Characteristics characteristics={entry.characteristics} owner={owner} sheet={entry} setup={setup} />
        <Texts fields={setup.textFields} texts={entry.texts} />
        <Tracks tracks={setup.tracks} checks={checks} onChange={change} />
      </>
    );
  }
  return layout.blocks.map((block) => {
    if (block.kind === "stat-group") {
      return <Characteristics key={block.id} characteristics={entry.characteristics} only={[block.stat, ...block.children]} title={\`\${block.title || block.stat} :\`} owner={owner} sheet={entry} setup={setup} />;
    }
    if (block.kind === "stats") {
      return <Characteristics key={block.id} characteristics={entry.characteristics} only={block.stats} title={\`\${block.title || "Caractéristiques"} :\`} owner={owner} sheet={entry} setup={setup} />;
    }
    if (block.kind === "texts") return <Texts key={block.id} fields={block.fields} texts={entry.texts} title={\`\${block.title || "Informations"} :\`} />;
    return <Tracks key={block.id} tracks={block.tracks} checks={checks} onChange={change} title={\`\${block.title || "Cases à cocher"} :\`} />;
  });
}`,
    },
    {
      find: `function Texts({ fields, texts }) {`,
      replace: `function Texts({ fields, texts, title = "Informations :" }) {`,
    },
    {
      find: `    <Section title="Informations :">`,
      replace: `    <Section title={title}>`,
    },
    {
      find: `          <Characteristics characteristics={entry.characteristics} owner={owner} sheet={entry} setup={setup} />
          <Texts fields={setup.textFields} texts={entry.texts} />
          <Tracks kind={kind} entry={entry} tracks={setup.tracks} />
`,
      replace: `          <SheetBlocks kind={kind} entry={entry} owner={owner} setup={setup} />
`,
      count: 2,
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
