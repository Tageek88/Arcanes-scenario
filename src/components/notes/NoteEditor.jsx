import React from "react";
import { AlertCircle } from "lucide-react";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export default function NoteEditor({ open, onOpenChange, form, setForm, saving, onSave, isEditing }) {
  const missingReason = !form.title?.trim() ? "Le titre de la note est obligatoire." : null;

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
        <Button onClick={onSave} disabled={saving || !!missingReason}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
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
            data-tutorial="note-title"
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
