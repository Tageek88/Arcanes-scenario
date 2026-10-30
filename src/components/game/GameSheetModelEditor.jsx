import React, { useEffect, useState } from "react";
import { Download, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import { useToast } from "@/components/ui/use-toast";
import { DEFAULT_LEVEL_NAMES, MAX_LEVELS, MAX_LEVEL_NAME_LENGTH, deriveScale, exportScale, parseScaleJson, sanitizeScale } from "@/lib/generators/npcScale";
import { MAX_EQUIPMENT_PER_PC, sanitizePcScale } from "@/lib/generators/pcScale";
import { draftToPcScale, draftToScale, levelNameProblems, pcScaleToDraft, scaleToDraft } from "@/lib/generators/scaleDraft";

const EMPTY_COUNT = { min: "", max: "" };
const EMPTY_MODEL = { characteristics: [], skillRollModifier: false, levels: [], pc: { ranges: {}, skills: EMPTY_COUNT, equipment: EMPTY_COUNT } };

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

export default function GameSheetModelEditor({ open, onOpenChange, model, characters = [], npcs = [], onSave, saving }) {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY_MODEL);
  const [scaleReport, setScaleReport] = useState("");
  const [pcReport, setPcReport] = useState("");

  useEffect(() => {
    if (open) {
      const characteristics = (model?.characteristics || []).map((item) => ({ ...item, _key: nextKey() }));
      setForm({
        characteristics,
        skillRollModifier: !!model?.skillRollModifier,
        levels: scaleToDraft(model?.scale, characteristics),
        pc: pcScaleToDraft(model?.pcScale, characteristics),
      });
      setScaleReport("");
      setPcReport("");
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

  const addCharacteristicFieldName = (charIndex) => {
    setForm((current) => ({
      ...current,
      characteristics: current.characteristics.map((item, i) =>
        i === charIndex
          ? { ...item, field_names: [...(item.field_names || []), ""] }
          : item
      ),
    }));
  };

  const updateCharacteristicFieldName = (charIndex, fieldNameIndex, value) => {
    setForm((current) => ({
      ...current,
      characteristics: current.characteristics.map((item, i) =>
        i === charIndex
          ? {
              ...item,
              field_names: (item.field_names || []).map((fn, fni) =>
                fni === fieldNameIndex ? value : fn
              ),
            }
          : item
      ),
    }));
  };

  const removeCharacteristicFieldName = (charIndex, fieldNameIndex) => {
    setForm((current) => ({
      ...current,
      characteristics: current.characteristics.map((item, i) =>
        i === charIndex
          ? {
              ...item,
              field_names: (item.field_names || []).filter((_, fni) => fni !== fieldNameIndex),
            }
          : item
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
  const hasPcDraft = Object.keys(form.pc.ranges).length > 0 || Boolean(form.pc.skills?.min || form.pc.skills?.max || form.pc.equipment?.min || form.pc.equipment?.max);

  const submit = () => {
    const names = form.characteristics.map((item) => item.name.trim()).filter(Boolean);
    if (new Set(names.map((name) => name.toLocaleLowerCase("fr"))).size !== names.length) return;
    if (levelProblems.duplicates) return;
    const characteristics = form.characteristics
      .map(({ _key, ...item }) => ({
        ...item,
        name: item.name.trim(),
        field_names: (item.field_names || []).map((fn) => String(fn || "").trim()).filter(Boolean),
      }))
      .filter((item) => item.name);
    onSave({
      characteristics,
      skillRollModifier: !!form.skillRollModifier,
      scale: sanitizeScale(
        draftToScale(form.levels.filter((level) => level.name.trim()), form.characteristics),
        characteristics.map((item) => item.name)
      ),
      pcScale: sanitizePcScale(draftToPcScale(form.pc, form.characteristics), characteristics.map((item) => item.name)),
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

  const updatePcRange = (key, side, value) =>
    setForm((current) => ({
      ...current,
      pc: { ...current.pc, ranges: { ...current.pc.ranges, [key]: { min: "", max: "", ...current.pc.ranges[key], [side]: value } } },
    }));
  const updatePcCount = (kind, side, value) =>
    setForm((current) => ({ ...current, pc: { ...current.pc, [kind]: { ...current.pc[kind], [side]: value } } }));

  // Plages observées sur les personnages existants (de la valeur la plus basse à la plus haute) : un point de départ à ajuster.
  const derivePcScale = () => {
    const names = namedItems.map((item) => item.name.trim());
    const { scale, report } = deriveScale(characters, names, ["Personnage joueur"]);
    const level = scale.levels[0];
    const equipmentCounts = characters.map((character) => (character.equipment || []).filter((item) => item.name?.trim()).length);
    const equipment = equipmentCounts.length && Math.max(...equipmentCounts) > 0
      ? { min: Math.min(...equipmentCounts), max: Math.max(...equipmentCounts) }
      : null;
    setForm((current) => ({ ...current, pc: pcScaleToDraft({ ranges: level?.ranges || {}, skills: level?.skills, equipment }, current.characteristics) }));
    const missing = report.withoutData.length ? ` Sans valeur numérique exploitable : ${report.withoutData.join(", ")}.` : "";
    setPcReport(`Plages des personnages joueurs calculées à partir de ${report.characters} fiche${report.characters === 1 ? "" : "s"} : à vérifier et à ajuster.${missing}`);
  };

  const applyScale = (scale) =>
    setForm((current) => ({ ...current, levels: scaleToDraft(scale, current.characteristics) }));

  const deriveFromCharacters = () => {
    const names = namedItems.map((item) => item.name.trim());
    const levelNames = form.levels.map((level) => level.name.trim()).filter(Boolean);
    const { scale, report } = deriveScale(npcs, names, levelNames.length ? levelNames : DEFAULT_LEVEL_NAMES);
    applyScale(scale);
    const missing = report.withoutData.length ? ` Sans valeur numérique exploitable : ${report.withoutData.join(", ")}.` : "";
    setScaleReport(`Plages calculées à partir de ${report.characters} fiche${report.characters === 1 ? "" : "s"} de PNJ : à vérifier et à ajuster.${missing}`);
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
        <details data-tutorial="game-model-characteristics" className="rounded-lg border border-border p-3" open>
          <summary className="cursor-pointer font-display font-semibold">Caractéristiques</summary>
          <div className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">Définissez les caractéristiques et leurs champs facultatifs proposés sur les fiches.</p>
          {form.characteristics.map((item, index) => (
            <div key={item._key || index} className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <Input
                  data-tutorial="game-model-name"
                  className="flex-1 font-medium"
                  aria-label={`Nom de la caractéristique ${index + 1}`}
                  value={item.name}
                  onChange={(event) => updateCharacteristic(index, "name", event.target.value)}
                  placeholder="Ex. Force"
                />
                <Button variant="ghost" size="icon" aria-label={`Supprimer la caractéristique ${index + 1}`} onClick={() => removeCharacteristic(index)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>

              <div className="space-y-1.5 pl-2 border-l-2 border-border/60">
                <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Champs facultatifs proposés :</p>
                {(item.field_names || []).map((fieldName, fieldIndex) => (
                  <div key={fieldIndex} className="flex items-center gap-2">
                    <Input
                      className="flex-1 text-xs"
                      aria-label={`Nom du champ facultatif ${fieldIndex + 1} pour ${item.name || index + 1}`}
                      value={fieldName}
                      onChange={(event) => updateCharacteristicFieldName(index, fieldIndex, event.target.value)}
                      placeholder="Ex. Modificateur, Test, Maximum"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeCharacteristicFieldName(index, fieldIndex)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-primary"
                  onClick={() => addCharacteristicFieldName(index)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Champ facultatif proposé
                </Button>
              </div>
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
        </details>

        <details data-tutorial="game-model-scale" className="space-y-3 rounded-lg border border-border p-3" open={form.levels.length > 0}>
          <summary className="cursor-pointer font-display font-semibold">Barème des PNJ</summary>
          <div className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Fixez, pour chaque niveau de PNJ, la plage de valeurs de chaque caractéristique. Le générateur de PNJ s'en sert pour tirer les valeurs, et le Codex signale les fiches qui s'en écartent. Ces plages sont des repères : rien n'est bloqué.
            </p>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={deriveFromCharacters} disabled={namedItems.length === 0 || npcs.length === 0}>
                <Sparkles className="h-4 w-4" /> Dériver des fiches de PNJ
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
            {npcs.length === 0 && (
              <p className="text-xs text-muted-foreground">La dérivation s'appuie sur les fiches de PNJ déjà créées dans le Codex : il n'y en a pas encore dans cette campagne.</p>
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

        <details data-tutorial="game-model-pc-scale" className="space-y-3 rounded-lg border border-border p-3" open={hasPcDraft}>
          <summary className="cursor-pointer font-display font-semibold">Barème des personnages joueurs</summary>
          <div className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Fixez la plage de valeurs de chaque caractéristique d'un personnage joueur, et le nombre de compétences et d'équipements. Le générateur de personnages s'en sert pour tirer une fiche, que vous pouvez relancer ou verrouiller champ par champ. Ces plages sont des repères : rien n'est bloqué.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={derivePcScale} disabled={namedItems.length === 0 || characters.length === 0}>
                <Sparkles className="h-4 w-4" /> Dériver des fiches de personnages
              </Button>
            </div>
            {characters.length === 0 && (
              <p className="text-xs text-muted-foreground">La dérivation s'appuie sur les personnages déjà créés : il n'y en a pas encore dans cette campagne.</p>
            )}
            {pcReport && <p className="text-xs text-foreground" role="status">{pcReport}</p>}
            {namedItems.length === 0 && <p className="text-xs text-muted-foreground">Ajoutez des caractéristiques au modèle pour saisir leurs plages.</p>}
            {namedItems.map((item) => (
              <div key={item._key} className="grid grid-cols-[minmax(0,1fr)_5rem_5rem] items-center gap-2">
                <span className="truncate text-sm">{item.name}</span>
                <Input
                  inputMode="numeric"
                  aria-label={`${item.name} : minimum d'un personnage joueur`}
                  placeholder="Min"
                  value={form.pc.ranges[item._key]?.min ?? ""}
                  onChange={(event) => updatePcRange(item._key, "min", event.target.value)}
                />
                <Input
                  inputMode="numeric"
                  aria-label={`${item.name} : maximum d'un personnage joueur`}
                  placeholder="Max"
                  value={form.pc.ranges[item._key]?.max ?? ""}
                  onChange={(event) => updatePcRange(item._key, "max", event.target.value)}
                />
              </div>
            ))}
            {[["skills", "Nombre de compétences", "Compétences"], ["equipment", "Nombre d'équipements", "Équipements"]].map(([kind, label, short]) => (
              <div key={kind} className="grid grid-cols-[minmax(0,1fr)_5rem_5rem] items-center gap-2">
                <span className="text-sm text-muted-foreground">{label}</span>
                <Input
                  inputMode="numeric"
                  aria-label={`${short} : minimum d'un personnage joueur`}
                  placeholder="Min"
                  value={form.pc[kind]?.min ?? ""}
                  onChange={(event) => updatePcCount(kind, "min", event.target.value)}
                />
                <Input
                  inputMode="numeric"
                  aria-label={`${short} : maximum d'un personnage joueur`}
                  placeholder="Max"
                  value={form.pc[kind]?.max ?? ""}
                  onChange={(event) => updatePcCount(kind, "max", event.target.value)}
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Compétences : 20 au plus ; équipements : {MAX_EQUIPMENT_PER_PC} au plus.</p>
          </div>
        </details>
      </div>
    </ResponsiveDialog>
  );
}
