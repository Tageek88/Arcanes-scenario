import React, { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import useConfirm from "@/hooks/useConfirm";

const dateOf = (note) => (note.updated_date ? format(new Date(note.updated_date), "d MMM yyyy", { locale: fr }) : "");

/**
 * Fenêtre des post-it d'un élément : lire, ajouter, modifier, supprimer.
 * @param {{ open: boolean, onOpenChange: (open: boolean) => void, label: string, notes: any[],
 *   onAdd: (content: string) => Promise<boolean>, onUpdate: (note: any, content: string) => Promise<boolean>,
 *   onRemove: (note: any) => Promise<boolean> }} props
 */
export default function PostItDialog({ open, onOpenChange, label, notes, onAdd, onUpdate, onRemove }) {
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);
  const { confirm, confirmDialog, dismiss } = useConfirm();

  useEffect(() => {
    if (open) return;
    setDraft("");
    setEditingId("");
    setEditText("");
    dismiss();
  }, [open, dismiss]);

  const add = async (event) => {
    event.preventDefault();
    if (!draft.trim()) return;
    setSaving(true);
    const ok = await onAdd(draft);
    setSaving(false);
    if (ok) setDraft("");
  };

  const saveEdit = async (note) => {
    if (!editText.trim()) return;
    setSaving(true);
    const ok = await onUpdate(note, editText);
    setSaving(false);
    if (ok) setEditingId("");
  };

  const askRemove = async (note) => {
    const yes = await confirm({
      title: "Supprimer ce post-it ?",
      description: "Il disparaîtra aussi de la page Notes de MJ.",
      confirmLabel: "Supprimer",
      cancelLabel: "Annuler",
    });
    if (yes) await onRemove(note);
  };

  return (
    <>
      <ResponsiveDialog
        open={open}
        onOpenChange={onOpenChange}
        title={`Post-it · ${label}`}
        description="Notes collées sur cet élément. Elles figurent aussi dans la page Notes de MJ."
        footer={<Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Fermer</Button>}
      >
        <div className="space-y-4">
          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun post-it pour le moment.</p>
          ) : (
            <ul className="space-y-2">
              {notes.map((note) => (
                <li key={note.id} className="rounded-lg border border-border bg-card/50 p-3">
                  {editingId === note.id ? (
                    <div className="space-y-2">
                      <Textarea aria-label="Texte du post-it" rows={4} value={editText} onChange={(event) => setEditText(event.target.value)} />
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId("")}>Annuler</Button>
                        <Button type="button" size="sm" onClick={() => saveEdit(note)} disabled={saving || !editText.trim()}>Enregistrer</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="whitespace-pre-wrap break-words text-sm text-foreground">{note.content || note.title}</p>
                        <p className="mt-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">{dateOf(note)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Modifier le post-it" onClick={() => { setEditingId(note.id); setEditText(note.content || note.title || ""); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Supprimer le post-it" onClick={() => askRemove(note)}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={add} className="space-y-2">
            <Label htmlFor="postit-new">Nouveau post-it</Label>
            <Textarea id="postit-new" rows={3} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ce que vous ne voulez pas oublier…" />
            <div className="flex justify-end">
              <Button type="submit" disabled={saving || !draft.trim()}>Coller le post-it</Button>
            </div>
          </form>
        </div>
      </ResponsiveDialog>
      {confirmDialog}
    </>
  );
}
