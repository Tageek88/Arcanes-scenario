import React, { useState } from "react";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import { TABLE_CATEGORIES } from "@/lib/meta/tableMeta";

export default function TableEditor({ open, onOpenChange, form, setForm, saving, onSave }) {
  const [quick, setQuick] = useState("");
  const entries = form.entries || [];

  const updateEntry = (index, key, value) =>
    setForm((f) => ({
      ...f,
      entries: (f.entries || []).map((entry, i) => (i === index ? { ...entry, [key]: value } : entry)),
    }));

  const addEntry = () =>
    setForm((f) => ({ ...f, entries: [...(f.entries || []), { text: "", weight: 1 }] }));

  const removeEntry = (index) =>
    setForm((f) => ({ ...f, entries: (f.entries || []).filter((_, i) => i !== index) }));

  const parseQuick = () =>
    quick
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

  const addQuickLines = () => {
    const lines = parseQuick();
    if (lines.length === 0) return;
    setForm((f) => ({
      ...f,
      entries: [...(f.entries || []), ...lines.map((text) => ({ text, weight: 1 }))],
    }));
    setQuick("");
  };

  // Les lignes encore présentes dans « Ajout rapide » sont ajoutées à l'enregistrement.
  const saveWithQuick = () => {
    const lines = parseQuick();
    if (lines.length === 0) return onSave();
    setQuick("");
    return onSave({ entries: [...entries, ...lines.map((text) => ({ text, weight: 1 }))] });
  };

  const missingReason = !form.name?.trim() ? "Le nom de la table est obligatoire." : null;

  const footer = (
    <div className="flex flex-col items-end gap-1.5 w-full">
      {missingReason && (
        <div
          role="status"
          aria-live="polite"
          className="relative mb-1 flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-500/15 px-3 py-1.5 text-xs text-amber-300 shadow-md animate-in fade-in slide-in-from-bottom-1"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          <span>{missingReason}</span>
          <div className="absolute -bottom-1 right-8 h-2 w-2 rotate-45 border-b border-r border-amber-500/50 bg-amber-950" />
        </div>
      )}
      <div className="flex justify-end gap-2 w-full">
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Annuler
        </Button>
        <Button onClick={saveWithQuick} disabled={saving || !!missingReason}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  );

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={form.id ? "Modifier la table" : "Nouvelle table aléatoire"}
      description="Listez les résultats possibles, puis tirez au hasard en pleine partie."
      footer={footer}
    >
      <div className="space-y-5 py-1">
        <div className="space-y-2">
          <Label>Nom de la table</Label>
          <Input
            data-tutorial="table-name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ex. Rencontres en forêt"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Select
              value={form.category || "autre"}
              onValueChange={(value) => setForm((f) => ({ ...f, category: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TABLE_CATEGORIES.map((category) => (
                  <SelectItem key={category.key} value={category.key}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={form.description || ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Quand l'utiliser ?"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Entrées ({entries.length})</Label>
            <Button size="sm" variant="ghost" onClick={addEntry} className="text-muted-foreground hover:text-primary">
              <Plus className="mr-1 h-4 w-4" /> Ajouter
            </Button>
          </div>

          {entries.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
              Aucune entrée pour l'instant.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                <span className="flex-1">Résultat</span>
                <span className="w-16 text-center">Poids</span>
                <span className="w-8" />
              </div>
              {entries.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    className="flex-1"
                    value={entry.text || ""}
                    onChange={(e) => updateEntry(index, "text", e.target.value)}
                    placeholder="Ex. Une meute de loups affamés"
                  />
                  <Input
                    className="w-16"
                    type="number"
                    min="1"
                    value={entry.weight ?? 1}
                    onChange={(e) => updateEntry(index, "weight", e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeEntry(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2 rounded-lg border border-border p-3">
          <Label>Ajout rapide</Label>
          <p className="text-xs text-muted-foreground">Collez une liste : une entrée par ligne.</p>
          <Textarea
            rows={3}
            value={quick}
            onChange={(e) => setQuick(e.target.value)}
            placeholder={"Un sanglier blessé\nDes traces de pas fraîches\nUn bûcheron méfiant"}
          />
          <Button size="sm" variant="outline" onClick={addQuickLines} disabled={!quick.trim()}>
            <Plus className="mr-1 h-4 w-4" /> Ajouter ces lignes
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
