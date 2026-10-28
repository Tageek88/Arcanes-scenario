import React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import LinkPicker from "@/components/home/LinkPicker";
import { SCENE_STATUS } from "@/lib/meta/sceneMeta";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";

export default function SceneEditor({
  open,
  onOpenChange,
  form,
  setField,
  toggleId,
  quests = [],
  acts,
  scenes,
  npcs,
  locations,
  clues,
  editingId,
  saving,
  onSave,
}) {
  // Actes et scènes proposés : ceux de la quête choisie dans le formulaire.
  const questActs = acts.filter((a) => a.quest_id === form.quest_id);
  const otherScenes = scenes.filter((s) => s.id !== editingId && s.quest_id === form.quest_id);
  const changeQuest = (questId) => {
    setField("quest_id", questId);
    setField("act_id", "");
    setField("next_scene_ids", []);
  };
  const missingReason = !form.title?.trim() ? "Le titre de la scène est obligatoire." : null;

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
      title={editingId ? "Modifier la scène" : "Nouvelle scène"}
      description="Décrivez la scène, son statut et ses ramifications."
      footer={footer}
    >
      <div className="space-y-5 py-1">
        <div className="space-y-2">
          <Label>Titre</Label>
          <Input
            data-tutorial="scene-title"
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            placeholder="Ex. La crypte oubliée"
          />
        </div>

        <div className={quests.length > 0 ? "grid grid-cols-1 gap-3 sm:grid-cols-4" : "grid grid-cols-1 gap-3 sm:grid-cols-3"}>
          {quests.length > 0 && (
            <div className="space-y-2">
              <Label>Quête</Label>
              <Select value={form.quest_id || ""} onValueChange={changeQuest}>
                <SelectTrigger aria-label="Quête de la scène">
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  {quests.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Acte</Label>
            <Select value={form.act_id || "_none"} onValueChange={(v) => setField("act_id", v === "_none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Sans acte</SelectItem>
                {questActs.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Statut</Label>
            <Select value={form.status} onValueChange={(v) => setField("status", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SCENE_STATUS).map(([key, meta]) => (
                  <SelectItem key={key} value={key}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Ordre</Label>
            <Input
              type="number"
              value={form.order}
              onChange={(e) => setField("order", e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
          <div className="space-y-1">
            <Label htmlFor="scene-recurring">Scène récurrente</Label>
            <p className="text-xs text-muted-foreground">
              Une copie est placée dans chacune des autres quêtes, et dans les quêtes créées ensuite. Les copies sont indépendantes : modifier ou supprimer l'une ne change pas les autres.
            </p>
          </div>
          <Switch id="scene-recurring" checked={!!form.recurring} onCheckedChange={(value) => setField("recurring", value)} />
        </div>

        <div className="space-y-2">
          <Label>Résumé</Label>
          <Textarea
            rows={3}
            value={form.summary}
            onChange={(e) => setField("summary", e.target.value)}
            placeholder="Ce qui se joue dans cette scène…"
          />
        </div>

        <div className="space-y-2">
          <Label>Notes du MJ</Label>
          <Textarea
            rows={3}
            value={form.gm_notes}
            onChange={(e) => setField("gm_notes", e.target.value)}
            placeholder="Indices cachés, jets, ambiance, PNJ de fond…"
          />
        </div>

        <LinkPicker
          label="Branches suivantes"
          items={otherScenes}
          selected={form.next_scene_ids}
          onToggle={(id) => toggleId("next_scene_ids", id)}
          emptyText="Aucune autre scène dans cette quête."
        />
        <LinkPicker
          label="PNJ liés"
          items={npcs}
          selected={form.npc_ids}
          onToggle={(id) => toggleId("npc_ids", id)}
          emptyText="Aucun PNJ dans le codex."
        />
        <LinkPicker
          label="Lieux liés"
          items={locations}
          selected={form.location_ids}
          onToggle={(id) => toggleId("location_ids", id)}
          emptyText="Aucun lieu dans le codex."
        />
        <LinkPicker
          label="Indices & infos liés"
          items={clues}
          selected={form.clue_ids}
          onToggle={(id) => toggleId("clue_ids", id)}
          emptyText="Aucun indice dans le codex."
        />
      </div>
    </ResponsiveDialog>
  );
}
