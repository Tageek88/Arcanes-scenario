// apply-export-system-lot8a.mjs : lot 8a : bouton « Exporter ce système » dans les fenêtres « Fond de feuille » et « Placer les valeurs » : exporte le modèle de la campagne (positions comprises) en fichier, sans passer par la liste des systèmes.
// Usage, depuis la racine du projet :
//   node apply-export-system-lot8a.mjs --dry     (vérifie sans rien écrire)
//   node apply-export-system-lot8a.mjs           (applique)
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
if (!fs.existsSync(path.join(root, "src/lib/services/gameSystems.js")) || !fs.existsSync(path.join(root, "src/components/game/SheetZonesDialog.jsx")) || !fs.existsSync(path.join(root, "src/components/game/SheetBackgroundDialog.jsx")) || !fs.existsSync(path.join(root, "src/pages/Jeu.jsx"))) {
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
  "src/components/game/ExportSystemButton.jsx": `import React, { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { exportCampaignModelAsSystem } from "@/lib/services/gameSystems";

/**
 * Exporte le modèle de fiche de la campagne comme fichier de système (caractéristiques, pistes, textes, dés, mises en page,
 * positions des valeurs et catalogues). Le fond de feuille n'en fait pas partie : il reste sur l'appareil.
 */
export default function ExportSystemButton({ campaignId, campaignName, disabled = false, className }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      await exportCampaignModelAsSystem(campaignId, campaignName);
      toast({ title: "Système exporté", description: "Le fichier contient le modèle de fiche, les positions des valeurs et les catalogues, pas le fond de feuille." });
    } catch (error) {
      console.error("Export du système impossible :", error);
      toast({ variant: "destructive", title: "Action impossible", description: error?.message || "Une erreur est survenue." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" className={className} disabled={disabled || busy || !campaignId} onClick={run}>
      <Download className="h-4 w-4" /> Exporter ce système
    </Button>
  );
}
`,
};

const EDITS = {
  "gameSystems.js": [
    {
      find: `export async function saveCampaignModelAsSystem(campaignId, info) {
  const row = await modelOf(campaignId);
  if (!row) throw new Error("Cette campagne n'a pas de modèle de fiche.");
  // Le système emporte aussi les compétences et équipements du catalogue de la campagne.
  const [skills, equipment] = await Promise.all([
    api.entities.SkillCatalog.filter({ campaign_id: campaignId }, { limit: 1000 }),
    api.entities.EquipmentCatalog.filter({ campaign_id: campaignId }, { limit: 1000 }),
  ]);
  const data = cleanSystemData({ ...row, skills: skills.items, equipment: equipment.items });
  if (data.characteristics.length === 0) throw new Error("Le modèle de cette campagne n'a aucune caractéristique.");
  return createSystem(info, data);
}`,
      replace: `export async function saveCampaignModelAsSystem(campaignId, info) {
  return createSystem(info, await campaignSystemData(campaignId));
}

// Les données d'un système prises dans une campagne : son modèle de fiche, plus les compétences et équipements de son catalogue.
async function campaignSystemData(campaignId) {
  const row = await modelOf(campaignId);
  if (!row) throw new Error("Cette campagne n'a pas de modèle de fiche.");
  const [skills, equipment] = await Promise.all([
    api.entities.SkillCatalog.filter({ campaign_id: campaignId }, { limit: 1000 }),
    api.entities.EquipmentCatalog.filter({ campaign_id: campaignId }, { limit: 1000 }),
  ]);
  const data = cleanSystemData({ ...row, skills: skills.items, equipment: equipment.items });
  if (data.characteristics.length === 0) throw new Error("Le modèle de cette campagne n'a aucune caractéristique.");
  return data;
}

/** Exporte le modèle d'une campagne en fichier de système, sans l'enregistrer dans la liste des systèmes. */
export async function exportCampaignModelAsSystem(campaignId, name) {
  const data = await campaignSystemData(campaignId);
  return exportGameSystem({ name: String(name || "").trim() || "Système de jeu", description: "", data });
}`,
    },
  ],
  "SheetBackgroundDialog.jsx": [
    {
      find: `import { Button } from "@/components/ui/button";
`,
      replace: `import { Button } from "@/components/ui/button";
import ExportSystemButton from "@/components/game/ExportSystemButton";
`,
    },
    {
      find: `export default function SheetBackgroundDialog({ open, onOpenChange, campaignId, onPlaceValues }) {`,
      replace: `export default function SheetBackgroundDialog({ open, onOpenChange, campaignId, campaignName, onPlaceValues }) {`,
    },
    {
      find: `              <Crosshair className="h-4 w-4" /> Placer les valeurs
            </Button>
          )}`,
      replace: `              <Crosshair className="h-4 w-4" /> Placer les valeurs
            </Button>
          )}
          <ExportSystemButton campaignId={campaignId} campaignName={campaignName} disabled={busy} />`,
    },
  ],
  "SheetZonesDialog.jsx": [
    {
      find: `import { Button } from "@/components/ui/button";
`,
      replace: `import { Button } from "@/components/ui/button";
import ExportSystemButton from "@/components/game/ExportSystemButton";
`,
    },
    {
      find: `export default function SheetZonesDialog({ open, onOpenChange, campaignId, model, zones, onSave, saving }) {`,
      replace: `export default function SheetZonesDialog({ open, onOpenChange, campaignId, campaignName, model, zones, onSave, saving }) {`,
    },
    {
      find: `          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fermer</Button>
          <Button onClick={save} disabled={saving || !changed}>Enregistrer le placement</Button>`,
      replace: `          <ExportSystemButton campaignId={campaignId} campaignName={campaignName} disabled={saving || changed} />
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fermer</Button>
          <Button onClick={save} disabled={saving || !changed}>Enregistrer le placement</Button>`,
    },
  ],
  "Jeu.jsx": [
    {
      find: `        campaignId={campaignId}
        onPlaceValues={() => {`,
      replace: `        campaignId={campaignId}
        campaignName={campaign?.name}
        onPlaceValues={() => {`,
    },
    {
      find: `<SheetZonesDialog open={zonesOpen} onOpenChange={setZonesOpen} campaignId={campaignId} model={model}`,
      replace: `<SheetZonesDialog open={zonesOpen} onOpenChange={setZonesOpen} campaignId={campaignId} campaignName={campaign?.name} model={model}`,
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
