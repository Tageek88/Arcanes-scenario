import React, { useEffect, useState } from "react";
import { api } from "@/api/localClient";
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
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import { KIND_META, defaultEntry } from "@/lib/codex";
import { NPC_ATTITUDE } from "@/lib/sceneMeta";
import AttachmentsField from "@/components/codex/AttachmentsField";
import { useToast } from "@/components/ui/use-toast";

export default function CodexEntryDialog({ open, onOpenChange, kind, campaignId, entry, onSaved }) {
  const [form, setForm] = useState(defaultEntry(kind));
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const meta = KIND_META[kind] || KIND_META.npc;

  useEffect(() => {
    if (open) setForm(entry ? { ...entry } : defaultEntry(kind));
  }, [open, kind, entry]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
  if (!form.name?.trim() || !campaignId) return;
  setSaving(true);
  const payload = {
    campaign_id: campaignId,
    name: form.name.trim(),
    attachments: form.attachments || [],
  };
  if (kind === "npc") {
    payload.role = form.role || "";
    payload.description = form.description || "";
    payload.attitude = form.attitude || "neutre";
  } else if (kind === "location") {
    payload.type = form.type || "";
    payload.description = form.description || "";
  } else {
    payload.description = form.description || "";
    payload.discovered = !!form.discovered;
  }
  try {
    if (entry?.id) await api.entities[meta.entity].update(entry.id, payload);
    else await api.entities[meta.entity].create(payload);
    onOpenChange(false);
    onSaved();
  } catch (error) {
    console.error("Échec enregistrement :", error);
    toast({
      variant: "destructive",
      title: "Enregistrement impossible",
      description: "L'élément n'a pas été enregistré.",
    });
  } finally {
    setSaving(false);
  }
};

  const footer = (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" onClick={() => onOpenChange(false)}>
        Annuler
      </Button>
      <Button onClick={save} disabled={saving || !form.name?.trim()}>
        {saving ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </div>
  );

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={entry?.id ? `Modifier — ${meta.singular}` : `Nouveau ${meta.singular}`}
      footer={footer}
    >
      <div className="space-y-4 py-1">
        <div className="space-y-2">
          <Label>{meta.nameLabel}</Label>
          <Input value={form.name || ""} onChange={(e) => set("name", e.target.value)} />
        </div>

        {kind === "npc" && (
          <>
            <div className="space-y-2">
              <Label>Rôle</Label>
              <Input
                value={form.role || ""}
                onChange={(e) => set("role", e.target.value)}
                placeholder="Ex. Aubergiste, espion, garde du corps…"
              />
            </div>
            <div className="space-y-2">
              <Label>Attitude</Label>
              <Select value={form.attitude || "neutre"} onValueChange={(v) => set("attitude", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(NPC_ATTITUDE).map(([key, opt]) => (
                    <SelectItem key={key} value={key}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {kind === "location" && (
          <div className="space-y-2">
            <Label>Type de lieu</Label>
            <Input
              value={form.type || ""}
              onChange={(e) => set("type", e.target.value)}
              placeholder="Ex. Ville, donjon, forêt, temple…"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            rows={4}
            value={form.description || ""}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>
        
        <AttachmentsField value={form.attachments || []} onChange={(files) => set("attachments", files)} />

        {kind === "clue" && (
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label>Indice découvert</Label>
              <p className="text-xs text-muted-foreground">Les joueurs ont-ils déjà trouvé cet indice ?</p>
            </div>
            <Switch checked={!!form.discovered} onCheckedChange={(v) => set("discovered", v)} />
          </div>
        )}
      </div>
    </ResponsiveDialog>
  );
}