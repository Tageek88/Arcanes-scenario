import React from "react";
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
import LinkPicker from "@/components/home/LinkPicker";
import { SCENE_STATUS } from "@/lib/sceneMeta";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";

export default function SceneEditor({
  open,
  onOpenChange,
  form,
  setField,
  toggleId,
  acts,
  scenes,
  npcs,
  locations,
  clues,
  editingId,
  saving,
  onSave,
}) {
  const otherScenes = scenes.filter((s) => s.id !== editingId);

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
      title={editingId ? "Modifier la scène" : "Nouvelle scène"}
      description="Décrivez la scène, son statut et ses ramifications."
      footer={footer}
    >
      <div className="space-y-5 py-1">
        <div className="space-y-2">
          <Label>Titre</Label>
          <Input
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            placeholder="Ex. La crypte oubliée"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Acte</Label>
            <Select value={form.act_id || "_none"} onValueChange={(v) => setField("act_id", v === "_none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Sans acte</SelectItem>
                {acts.map((a) => (
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
          emptyText="Aucune autre scène dans cette campagne."
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