import React, { useEffect, useState } from "react";
import { Download, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import { useToast } from "@/components/ui/use-toast";
import { DEFAULT_LEVEL_NAMES, MAX_LEVELS, MAX_LEVEL_NAME_LENGTH, deriveScale, exportScale, parseScaleJson, sanitizeScale } from "@/lib/generators/npcScale";
import { draftToScale, levelNameProblems, scaleToDraft } from "@/lib/generators/scaleDraft";

const EMPTY_MODEL = { characteristics: [], skillRollModifier: false, levels: [] };

const IMPORT_ERRORS = {
  too_large: "Le fichier est trop volumineux.",
  invalid_json: "Ce fichier n'est pas un JSON valide.",
  wrong_format: "Ce fichier n'est pas un barème exporté par l'application.",
  empty: "Ce barème ne contient aucun niveau exploitable.",
};

// Clé locale stable d'une caractéristique pendant l'édition (le nom peut changer, pas la clé).
let keyCounter = 0;
const nextKey = () => `c${++keyCounter}`;

const downloadJson = (filename, json) => {
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export default function GameSheetModelEditor({ open, onOpenChange, model, characters = [], onSave, saving }) {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY_MODEL);
  const [scaleReport, setScaleReport] = useState("");

  useEffect(() => {
    if (open) {
      const characteristics = (model?.characteristics || []).map((item) => ({ ...item, _key: nextKey() }));
      setForm({
        characteristics,
        skillRollModifier: !!model?.skillRollModifier,
        levels: scaleToDraft(model?.scale, characteristics),
      });
      setScaleReport("");
    }
  }, [open, model]);

  const updateCharacteristic = (index, key, value) => {
    setForm((current) => ({
      ...current,
      characteristics: current.characteristics.map((item, i) =>
        i === index ? { ...item, [key]: value } : item
      ),
    }));
  };

  const removeCharacteristic = (index) => {
    setForm((current) => ({
      ...current,
      characteristics: current.characteristics.filter((_, i) => i !== index),
    }));
  };

  const duplicateNames = new Set(
    form.characteristics
      .map((item) => item.name.trim().toLocaleLowerCase("fr"))
      .filter(Boolean)
  ).size !== form.characteristics.filter((item) => item.name.trim()).length;

  const levelProblems = levelNameProblems(form.levels);
  const namedItems = form.characteristics.filter((item) => item.name.trim());

  const submit = () => {
    const names = form.characteristics.map((item) => item.name.trim()).filter(Boolean);
    if (new Set(names.map((name) => name.toLocaleLowerCase("fr"))).size !== names.length) return;
    if (levelProblems.duplicates) return;
    const characteristics = form.characteristics
      .map(({ _key, ...item }) => ({ ...item, name: item.name.trim() }))
      .filter((item) => item.name);
    onSave({
      characteristics,
      skillRollModifier: !!form.skillRollModifier,
      scale: sanitizeScale(
        draftToScale(form.levels.filter((level) => level.name.trim()), form.characteristics),
        characteristics.map((item) => item.name)
      ),
    });
  };

  const updateLevel = (index, patch) =>
    setForm((current) => ({
      ...current,
      levels: current.levels.map((level, i) => (i === index ? { ...level, ...patch } : level)),
    }));
  const updateRange = (index, key, side, value) =>
    setForm((current) => ({
      ...current,
      levels: current.levels.map((level, i) =>
        i === index
          ? { ...level, ranges: { ...level.ranges, [key]: { min: "", max: "", ...level.ranges[key], [side]: value } } }
          : level
      ),
    }));
  const updateSkills = (index, side, value) =>
    setForm((current) => ({
      ...current,
      levels: current.levels.map((level, i) =>
        i === index ? { ...level, skills: { ...level.skills, [side]: value } } : level
      ),
    }));
  const addLevel = () =>
    setForm((current) => ({
      ...current,
      levels: [...current.levels, { name: "", ranges: {}, skills: { min: "", max: "" } }],
    }));
  const removeLevel = (index) =>
    setForm((current) => ({ ...current, levels: current.levels.filter((_, i) => i !== index) }));

  const applyScale = (scale) =>
    setForm((current) => ({ ...current, levels: scaleToDraft(scale, current.characteristics) }));

  const deriveFromCharacters = () => {
    const names = namedItems.map((item) => item.name.trim());
    const levelNames = form.levels.map((level) => level.name.trim()).filter(Boolean);
    const { scale, report } = deriveScale(characters, names, levelNames.length ? levelNames : DEFAULT_LEVEL_NAMES);
    applyScale(scale);
    const missing = report.withoutData.length ? ` Sans valeur numérique exploitable : ${report.withoutData.join(", ")}.` : "";
    setScaleReport(`Plages calculées à partir de ${report.characters} fiche${report.characters === 1 ? "" : "s"} : à vérifier et à ajuster.${missing}`);
  };

  const exportCurrentScale = () => {
    const scale = sanitizeScale(draftToScale(form.levels, form.characteristics), namedItems.map((item) => item.name.trim()));
    downloadJson("arcanes-bareme-pnj.json", exportScale(scale));
  };

  const importScale = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const result = parseScaleJson(await file.text(), namedItems.map((item) => item.name.trim()));
    if (!result.ok) {
      toast({ variant: "destructive", title: "Import impossible", description: IMPORT_ERRORS[result.error] });
      return;
    }
    applyScale(result.scale);
    const notes = [];
    if (result.ignoredCharacteristics.length) notes.push(`Ignorées (absentes du modèle) : ${result.ignoredCharacteristics.join(", ")}.`);
    if (result.missingCharacteristics.length) notes.push(`Sans plage : ${result.missingCharacteristics.join(", ")}.`);
    setScaleReport(`Barème importé.${notes.length ? ` ${notes.join(" ")}` : ""}`);
  };

  const footer = (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
      <Button onClick={submit} disabled={saving || duplicateNames || levelProblems.duplicates}>
        {saving ? "Enregistrement…" : "Enregistrer le modèle"}
      </Button>
    </div>
  );

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Modèle de fiche de la campagne"
      description="Définissez les colonnes une fois. Les valeurs de chaque personnage restent indépendantes."
      footer={footer}
    >
      <div className="space-y-5 py-1">
        <div className="space-y-3">
          <div>
            <h3 className="font-display font-semibold">Caractéristiques</h3>
            <p className="text-xs text-muted-foreground">Définissez les caractéristiques de la fiche de personnage.</p>
          </div>
          {form.characteristics.map((item, index) => (
            <div key={item._key || index} className="flex items-center gap-2">
              <Input
                data-tutorial="game-model-name"
                className="flex-1"
                aria-label={`Nom de la caractéristique ${index + 1}`}
                value={item.name}
                onChange={(event) => updateCharacteristic(index, "name", event.target.value)}
                placeholder="Ex. Force"
              />
              <Button variant="ghost" size="icon" aria-label={`Supprimer la caractéristique ${index + 1}`} onClick={() => removeCharacteristic(index)}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
          {duplicateNames && <p className="text-xs text-destructive">Chaque caractéristique doit avoir un nom distinct.</p>}
          <Button
            type="button"
            data-tutorial="game-model-name"
            variant="outline"
            size="sm"
            onClick={() => setForm((current) => ({
              ...current,
              characteristics: [...current.characteristics, { _key: nextKey(), name: "" }],
            }))}
          >
            <Plus className="h-4 w-4" /> Ajouter une caractéristique
          </Button>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
          <div>
            <Label>Modificateur de lancer des compétences</Label>
            <p className="text-xs text-muted-foreground">Afficher cette colonne sur les fiches de personnage.</p>
          </div>
          <Switch
            checked={!!form.skillRollModifier}
            onCheckedChange={(value) => setForm((current) => ({ ...current, skillRollModifier: value }))}
          />
        </div>

        <details data-tutorial="game-model-scale" className="space-y-3 rounded-lg border border-border p-3" open={form.levels.length > 0}>
          <summary className="cursor-pointer font-display font-semibold">Barème des PNJ</summary>
          <div className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Fixez, pour chaque niveau de PNJ, la plage de valeurs de chaque caractéristique. Le générateur de PNJ s'en sert pour tirer les valeurs, et le Codex signale les fiches qui s'en écartent. Ces plages sont des repères : rien n'est bloqué.
            </p>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={deriveFromCharacters} disabled={namedItems.length === 0 || characters.length === 0}>
                <Sparkles className="h-4 w-4" /> Dériver des fiches existantes
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={exportCurrentScale} disabled={form.levels.length === 0}>
                <Download className="h-4 w-4" /> Exporter (JSON)
              </Button>
              <Button type="button" variant="outline" size="sm" asChild>
                <label className="cursor-pointer">
                  <Upload className="h-4 w-4" /> Importer (JSON)
                  <input type="file" accept="application/json,.json" className="sr-only" onChange={importScale} />
                </label>
              </Button>
            </div>
            {characters.length === 0 && (
              <p className="text-xs text-muted-foreground">La dérivation s'appuie sur les personnages déjà créés : il n'y en a pas encore dans cette campagne.</p>
            )}
            {scaleReport && <p className="text-xs text-foreground" role="status">{scaleReport}</p>}

            {namedItems.length === 0 && form.levels.length > 0 && (
              <p className="text-xs text-muted-foreground">Ajoutez des caractéristiques au modèle pour saisir leurs plages.</p>
            )}

            {form.levels.map((level, index) => (
              <div key={index} className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <Input
                    aria-label={`Nom du niveau ${index + 1}`}
                    value={level.name}
                    maxLength={MAX_LEVEL_NAME_LENGTH}
                    placeholder="Ex. Faible"
                    onChange={(event) => updateLevel(index, { name: event.target.value })}
                  />
                  <Button type="button" variant="ghost" size="icon" aria-label={`Supprimer le niveau ${index + 1}`} onClick={() => removeLevel(index)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
                {namedItems.map((item) => (
                  <div key={item._key} className="grid grid-cols-[minmax(0,1fr)_5rem_5rem] items-center gap-2">
                    <span className="truncate text-sm">{item.name}</span>
                    <Input
                      inputMode="numeric"
                      aria-label={`${item.name} : minimum du niveau ${level.name || index + 1}`}
                      placeholder="Min"
                      value={level.ranges[item._key]?.min ?? ""}
                      onChange={(event) => updateRange(index, item._key, "min", event.target.value)}
                    />
                    <Input
                      inputMode="numeric"
                      aria-label={`${item.name} : maximum du niveau ${level.name || index + 1}`}
                      placeholder="Max"
                      value={level.ranges[item._key]?.max ?? ""}
                      onChange={(event) => updateRange(index, item._key, "max", event.target.value)}
                    />
                  </div>
                ))}
                <div className="grid grid-cols-[minmax(0,1fr)_5rem_5rem] items-center gap-2">
                  <span className="text-sm text-muted-foreground">Nombre de compétences</span>
                  <Input
                    inputMode="numeric"
                    aria-label={`Compétences : minimum du niveau ${level.name || index + 1}`}
                    placeholder="Min"
                    value={level.skills?.min ?? ""}
                    onChange={(event) => updateSkills(index, "min", event.target.value)}
                  />
                  <Input
                    inputMode="numeric"
                    aria-label={`Compétences : maximum du niveau ${level.name || index + 1}`}
                    placeholder="Max"
                    value={level.skills?.max ?? ""}
                    onChange={(event) => updateSkills(index, "max", event.target.value)}
                  />
                </div>
              </div>
            ))}
            {levelProblems.duplicates && <p className="text-xs text-destructive">Chaque niveau doit avoir un nom distinct.</p>}
            {levelProblems.empty && <p className="text-xs text-muted-foreground">Les niveaux sans nom ne sont pas enregistrés.</p>}

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={addLevel} disabled={form.levels.length >= MAX_LEVELS}>
                <Plus className="h-4 w-4" /> Ajouter un niveau
              </Button>
              {form.levels.length === 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyScale({ levels: DEFAULT_LEVEL_NAMES.map((name) => ({ name, ranges: {} })) })}
                >
                  Niveaux par défaut (faible, standard, élite)
                </Button>
              )}
            </div>
          </div>
        </details>
      </div>
    </ResponsiveDialog>
  );
}
