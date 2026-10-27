import React, { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import useConfirm from "@/hooks/useConfirm";

const plural = (count, one, many) => `${count} ${count > 1 ? many : one}`;

/** Choix de la quête affichée, avec création, renommage et suppression. */
export default function QuestBar({ quests, quest, actCount, sceneCount, onSelect, onCreate, onRename, onDelete }) {
  const { confirm, confirmDialog } = useConfirm();
  const [dialog, setDialog] = useState(/** @type {null | { mode: "create" | "rename", name: string }} */ (null));
  const [saving, setSaving] = useState(false);

  const openCreate = () => setDialog({ mode: "create", name: quests.length === 0 ? "Quête principale" : "" });
  const openRename = () => quest && setDialog({ mode: "rename", name: quest.title || "" });

  const submit = async () => {
    const name = dialog?.name.trim();
    if (!name || saving) return;
    setSaving(true);
    const ok = dialog.mode === "create" ? await onCreate(name) : await onRename(quest.id, name);
    setSaving(false);
    if (ok) setDialog(null);
  };

  const requestDelete = async () => {
    if (!quest) return;
    const content = `${plural(actCount, "acte", "actes")} et ${plural(sceneCount, "scène", "scènes")}`;
    const accepted = await confirm({
      title: `Supprimer la quête « ${quest.title} » ?`,
      description: `${content} de cette quête seront définitivement supprimés, y compris les copies de scènes récurrentes qu'elle contient. Les autres quêtes ne sont pas modifiées.`,
      confirmLabel: "Supprimer",
    });
    if (accepted) onDelete(quest);
  };

  return (
    <div data-tutorial="quest-bar" className="mb-4 flex flex-wrap items-center gap-2">
      <Label className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Quête</Label>
      {quest ? (
        <Select value={quest.id} onValueChange={onSelect}>
          <SelectTrigger className="w-[220px] max-w-full" aria-label="Quête affichée">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {quests.map((q) => (
              <SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span className="text-sm text-muted-foreground">Aucune quête</span>
      )}
      {quest && (
        <>
          <Button variant="ghost" size="icon" className="min-touch" aria-label="Renommer la quête" onClick={openRename}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="min-touch text-destructive hover:text-destructive" aria-label="Supprimer la quête" onClick={requestDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}
      <Button variant="outline" size="sm" className="min-touch" onClick={openCreate}>
        <Plus className="mr-2 h-4 w-4" /> Nouvelle quête
      </Button>

      <ResponsiveDialog
        open={!!dialog}
        onOpenChange={(open) => !open && !saving && setDialog(null)}
        title={dialog?.mode === "rename" ? "Renommer la quête" : "Nouvelle quête"}
        description={
          dialog?.mode === "rename"
            ? "Le nouveau titre remplace l'ancien."
            : "La quête reçoit une copie de chaque scène récurrente de la campagne."
        }
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button variant="ghost" onClick={() => setDialog(null)} disabled={saving}>Annuler</Button>
            <Button onClick={submit} disabled={saving || !dialog?.name.trim()}>
              {saving ? "Enregistrement…" : dialog?.mode === "rename" ? "Renommer" : "Créer"}
            </Button>
          </div>
        }
      >
        <div className="space-y-2 py-1">
          <Label htmlFor="quest-name">Titre</Label>
          <Input
            id="quest-name"
            autoFocus
            value={dialog?.name || ""}
            onChange={(e) => setDialog((d) => ({ ...d, name: e.target.value }))}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
            placeholder="Ex. Quête principale"
          />
        </div>
      </ResponsiveDialog>
      {confirmDialog}
    </div>
  );
}
