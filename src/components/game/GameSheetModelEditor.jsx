import React, { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";

const EMPTY_MODEL = { characteristics: [], skillRollModifier: false };

export default function GameSheetModelEditor({ open, onOpenChange, model, onSave, saving }) {
  const [form, setForm] = useState(EMPTY_MODEL);

  useEffect(() => {
    if (open) {
      setForm({
        characteristics: (model?.characteristics || []).map((item) => ({ ...item })),
        skillRollModifier: !!model?.skillRollModifier,
      });
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

  const submit = () => {
    const names = form.characteristics.map((item) => item.name.trim()).filter(Boolean);
    if (new Set(names.map((name) => name.toLocaleLowerCase("fr"))).size !== names.length) return;
    onSave({
      characteristics: form.characteristics
        .map((item) => ({ ...item, name: item.name.trim() }))
        .filter((item) => item.name),
      skillRollModifier: !!form.skillRollModifier,
    });
  };

  const footer = (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
      <Button onClick={submit} disabled={saving || duplicateNames}>
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
            <p className="text-xs text-muted-foreground">Cochez les colonnes à afficher sur chaque fiche.</p>
          </div>
          <div className="hidden grid-cols-[minmax(10rem,1fr)_repeat(3,5rem)_2.5rem] gap-2 px-2 font-mono text-[10px] uppercase text-muted-foreground sm:grid">
            <span>Nom</span><span className="text-center">Modif.</span><span className="text-center">Test</span><span className="text-center">Max</span><span />
          </div>
          {form.characteristics.map((item, index) => (
            <div key={index} className="grid grid-cols-2 items-center gap-2 rounded-lg border border-border p-2 sm:grid-cols-[minmax(10rem,1fr)_repeat(3,5rem)_2.5rem]">
              <Input
                data-tutorial="game-model-name"
                className="col-span-2 sm:col-span-1"
                aria-label={`Nom de la caractéristique ${index + 1}`}
                value={item.name}
                onChange={(event) => updateCharacteristic(index, "name", event.target.value)}
                placeholder="Ex. Force"
              />
              {[
                ["modifier", "Modificateur"],
                ["test", "Test"],
                ["max", "Maximum"],
              ].map(([field, label]) => (
                <label key={field} className="flex min-h-11 items-center justify-between gap-2 text-xs text-muted-foreground sm:justify-center">
                  <span className="sm:hidden">{label}</span>
                  <input
                    type="checkbox"
                    aria-label={`${label} pour ${item.name || `la caractéristique ${index + 1}`}`}
                    checked={!!item[field]}
                    onChange={(event) => updateCharacteristic(index, field, event.target.checked)}
                    className="h-4 w-4 accent-[hsl(var(--primary))]"
                  />
                </label>
              ))}
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
              characteristics: [...current.characteristics, { name: "", modifier: false, test: false, max: false }],
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
      </div>
    </ResponsiveDialog>
  );
}
