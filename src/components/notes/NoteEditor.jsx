import React from "react";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export default function NoteEditor({ open, onOpenChange, form, setForm, saving, onSave, isEditing }) {
  const footer = (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" onClick={() => onOpenChange(false)}>
        Annuler
      </Button>
      <Button onClick={onSave} disabled={saving || !form.title.trim()}>
        {saving ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </div>
  );

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Modifier la note" : "Nouvelle note"}
      description="Consignez ce que vous ne voulez pas oublier en cours de partie."
      footer={footer}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="note-title">Titre</Label>
          <Input
            id="note-title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Ex. Le complot des Cendres"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="note-content">Contenu</Label>
          <Textarea
            id="note-content"
            rows={10}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="Indices semés, réactions des joueurs, idées à creuser…"
            className="min-h-[200px]"
          />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
          <div>
            <p className="text-sm text-foreground">Épingler cette note</p>
            <p className="text-xs text-muted-foreground">Elle restera en haut de votre bloc-notes.</p>
          </div>
          <Switch
            checked={!!form.pinned}
            onCheckedChange={(value) => setForm({ ...form, pinned: value })}
          />
        </div>
      </div>
    </ResponsiveDialog>
  );
}