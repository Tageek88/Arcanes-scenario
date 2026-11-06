// Paramètres : onglets Apparence / Sauvegarde / Impression / Tutoriel (« À propos » reste en bas),
// et icônes des boutons Exporter / Importer inversées dans BackupPanel.
// Usage (racine du projet) : node apply-parametres-onglets.mjs [--check]
// Tout ou rien : si une retouche ne s'applique pas, aucun fichier n'est modifié.
import fs from "node:fs";
import path from "node:path";

const CHECK_ONLY = process.argv.includes("--check");
const root = process.cwd();

const count = (text, needle) => text.split(needle).length - 1;

const load = (relative) => {
  const full = path.join(root, relative);
  if (!fs.existsSync(full)) return { error: `introuvable : ${relative}` };
  const raw = fs.readFileSync(full, "utf8");
  const crlf = raw.includes("\r\n");
  return { full, crlf, text: crlf ? raw.replace(/\r\n/g, "\n") : raw };
};

// Remplace `find` (présent une seule fois) ; sinon renvoie une erreur.
const replaceOnce = (text, find, replace, label, errors) => {
  const n = count(text, find);
  if (n !== 1) {
    errors.push(`${label} : ${n} correspondance(s) au lieu d'une`);
    return text;
  }
  return text.replace(find, () => replace);
};

// Extrait le bloc qui commence à la ligne contenant `start` et finit à `end` (inclus).
const extractBlock = (text, start, end, label, errors) => {
  if (count(text, start) !== 1) {
    errors.push(`${label} : début introuvable ou en double`);
    return null;
  }
  const i = text.indexOf(start);
  const lineStart = text.lastIndexOf("\n", i) + 1;
  const j = text.indexOf(end, i);
  if (j < 0) {
    errors.push(`${label} : fin introuvable`);
    return null;
  }
  return { from: lineStart, to: j + end.length, text: text.slice(lineStart, j + end.length) };
};

const indent = (block, spaces) =>
  block
    .split("\n")
    .map((line) => (line.trim() ? " ".repeat(spaces) + line : line))
    .join("\n");

const problems = [];
const planned = [];

// --- BackupPanel : icônes inversées ---
{
  const file = "src/components/BackupPanel.jsx";
  const loaded = load(file);
  if (loaded.error) problems.push(loaded.error);
  else {
    const errors = [];
    let text = loaded.text;
    text = replaceOnce(text, `<Download className="mr-2 h-4 w-4" /> Exporter`, `<Upload className="mr-2 h-4 w-4" /> Exporter`, `${file} (Exporter)`, errors);
    text = replaceOnce(text, `<Upload className="mr-2 h-4 w-4" /> Importer`, `<Download className="mr-2 h-4 w-4" /> Importer`, `${file} (Importer)`, errors);
    if (errors.length) problems.push(...errors);
    else planned.push({ file, loaded, text });
  }
}

// --- Settings : onglets ---
{
  const file = "src/pages/Settings.jsx";
  const loaded = load(file);
  if (loaded.error) problems.push(loaded.error);
  else if (loaded.text.includes("SettingsTabBar")) problems.push(`${file} : déjà modifié`);
  else {
    const errors = [];
    let text = loaded.text;

    // Blocs existants, repris tels quels (ils sont seulement décalés d'un niveau).
    const print = extractBlock(text, `<section data-tutorial="section-print"`, `</section>`, "section Impression", errors);
    const clear = extractBlock(text, `<section data-tutorial="section-clear-data"`, `</section>`, "section Effacer les données", errors);
    const dialog = extractBlock(text, `<AlertDialog open={open} onOpenChange={setOpen}>`, `</AlertDialog>`, "fenêtre de confirmation d'effacement", errors);
    const regionStart = extractBlock(text, `<AppearanceSection />`, `<AppearanceSection />`, "début de la zone", errors);
    const regionEnd = extractBlock(text, `<TrashPanel campaigns={campaigns} />`, `<TrashPanel campaigns={campaigns} />`, "fin de la zone", errors);
    for (const anchor of [
      `<div data-tutorial="section-auto-save"><AutosavePanel /></div>`,
      `<div data-tutorial="section-export-import"><BackupPanel /></div>`,
      `<div data-tutorial="section-help"><TutorialCenter /></div>`,
    ]) {
      if (count(text, anchor) !== 1) errors.push(`repère introuvable : ${anchor}`);
    }

    if (!errors.length) {
      const region = text.slice(regionStart.from, regionEnd.to);
      if (!region.includes(print.text) || !region.includes(clear.text) || !region.includes(dialog.text)) {
        errors.push("les blocs ne sont pas dans la zone attendue (fichier différent de celui lu)");
      }
    }

    if (!errors.length) {
      const newRegion = [
        ``,
        `      <SettingsTabBar value={tab} onChange={setTab} />`,
        ``,
        `      {tab === "appearance" && <AppearanceSection />}`,
        ``,
        `      {tab === "backup" && (`,
        `        <>`,
        `          <div data-tutorial="section-auto-save"><AutosavePanel /></div>`,
        `          <div data-tutorial="section-export-import"><BackupPanel /></div>`,
        ``,
        indent(clear.text, 4),
        ``,
        `          <TrashPanel campaigns={campaigns} />`,
        `        </>`,
        `      )}`,
        ``,
        `      {tab === "print" && (`,
        indent(print.text, 2),
        `      )}`,
        ``,
        `      {tab === "tutorial" && <div data-tutorial="section-help"><TutorialCenter /></div>}`,
        ``,
        dialog.text,
      ].join("\n");
      text = text.slice(0, regionStart.from) + newRegion + text.slice(regionEnd.to);

      text = replaceOnce(
        text,
        `import { useCampaigns } from "@/hooks/useCampaigns";`,
        `import { useCampaigns } from "@/hooks/useCampaigns";\nimport { usePageFilter } from "@/lib/context/PageFilterContext";`,
        `${file} (import)`,
        errors
      );

      text = replaceOnce(
        text,
        `export default function Settings() {`,
        `const SETTINGS_TABS = [
  { id: "appearance", label: "Apparence" },
  { id: "backup", label: "Sauvegarde" },
  { id: "print", label: "Impression" },
  { id: "tutorial", label: "Tutoriel" },
];

/** Barre d'onglets des Paramètres (même style que celle de la page Jeu). */
function SettingsTabBar({ value, onChange }) {
  return (
    <div role="tablist" aria-label="Rubriques des paramètres" className="flex flex-wrap gap-2">
      {SETTINGS_TABS.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          onClick={() => onChange(item.id)}
          className={\`tag min-touch border transition-colors \${value === item.id ? "border-primary/50 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground"}\`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export default function Settings() {`,
        `${file} (composant d'onglets)`,
        errors
      );

      text = replaceOnce(
        text,
        `  const [notesOpen, setNotesOpen] = useState(false);`,
        `  const [notesOpen, setNotesOpen] = useState(false);
  // Onglet mémorisé ; une valeur inconnue retombe sur Apparence.
  const [storedTab, setTab] = usePageFilter("settings.tab", "appearance");
  const tab = SETTINGS_TABS.some((item) => item.id === storedTab) ? storedTab : "appearance";`,
        `${file} (état de l'onglet)`,
        errors
      );
    }

    if (errors.length) problems.push(...errors.map((e) => `${file} : ${e}`));
    else planned.push({ file, loaded, text });
  }
}

if (problems.length) {
  console.error("Aucun fichier modifié. Problèmes :");
  problems.forEach((p) => console.error(" - " + p));
  process.exit(1);
}

if (CHECK_ONLY) {
  console.log("Vérification réussie : toutes les retouches s'appliquent. Rien n'a été écrit.");
  planned.forEach((p) => console.log(" - " + p.file));
  process.exit(0);
}

planned.forEach((p) => {
  const out = p.loaded.crlf ? p.text.replace(/\n/g, "\r\n") : p.text;
  fs.writeFileSync(p.loaded.full, out, "utf8"); // UTF-8 sans BOM
  console.log("modifié : " + p.file);
});

console.log("\nTerminé. Contrôle : npm run check; npm run lint; npx eslint src; npm test; npm run build; npx cap sync android");
