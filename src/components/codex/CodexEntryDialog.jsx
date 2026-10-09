import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/api/localClient";
import { withDataBatch } from "@/lib/dataEvents";
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
import AttachmentsField from "@/components/codex/AttachmentsField";
import NpcRelations from "@/components/codex/NpcRelations";
import { useToast } from "@/components/ui/use-toast";
import { KIND_META, defaultEntry, duplicateDraft } from "@/lib/codex";
import { NPC_ATTITUDE } from "@/lib/sceneMeta";
import { copyLocationSubtree, descendantIds, parentOptions } from "@/lib/locationTree";
import { copyNpcRelations, loadRelations } from "@/lib/npcRelations";
import { dispatchTutorialAction } from "@/utils/tutorialStorage";
import { Dices } from "lucide-react";
import { canGenerateNames, generateNames } from "@/lib/nameGenerator";

function CopyOption({ checked, onChange, title, hint }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="block text-sm text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
  );
}

export default function CodexEntryDialog({
  open,
  onOpenChange,
  kind,
  campaignId,
  entry,
  onSaved,
  defaultParentId = "",
  defaultLocationId = "",
  duplicateOf = null,
  locations,
}) {
  const { toast } = useToast();
  const [form, setForm] = useState(defaultEntry(kind));
  const [saving, setSaving] = useState(false);
  const [fetchedLocations, setFetchedLocations] = useState([]);
  const [copyRelations, setCopyRelations] = useState(true);
  const [copyChildren, setCopyChildren] = useState(true);
  const [sourceRelationCount, setSourceRelationCount] = useState(0);
  const [universeId, setUniverseId] = useState("");
  const [nameGender, setNameGender] = useState("neutral");
  const allLocations = locations ?? fetchedLocations;
  const meta = KIND_META[kind] || KIND_META.npc;

  useEffect(() => {
    if (!open || kind !== "npc" || !campaignId) return;
    let cancelled = false;
    api.entities.Campaign.get(campaignId)
      .then((c) => { if (!cancelled) setUniverseId(c?.universe_type || ""); })
      .catch(() => { if (!cancelled) setUniverseId(""); });
    return () => { cancelled = true; };
  }, [open, kind, campaignId]);

  const generateName = () => {
    const [name] = generateNames({ universeId, gender: nameGender, withFamily: true });
    if (name) set("name", name);
  };

  useEffect(() => {
    if (!open) return;
    if (entry) setForm({ ...entry });
    else if (duplicateOf) setForm(duplicateDraft(kind, duplicateOf));
    else setForm({
      ...defaultEntry(kind),
      parent_id: kind === "location" ? defaultParentId : "",
      location_id: kind === "npc" || kind === "clue" ? defaultLocationId : "",
    });
    setCopyRelations(true);
    setCopyChildren(true);
  }, [open, kind, entry, defaultParentId, defaultLocationId, duplicateOf]);

  useEffect(() => {
    if (locations || !open || (kind !== "location" && kind !== "npc" && kind !== "clue") || !campaignId) return;
    let alive = true;
    api.entities.Location.filter({ campaign_id: campaignId }, { sort: "name", limit: 1000 }).then((res) => {
      if (alive) setFetchedLocations(res.items);
    });
    return () => {
      alive = false;
    };
  }, [locations, open, kind, campaignId]);

  useEffect(() => {
    if (!open || !duplicateOf || kind !== "npc" || !campaignId) {
      setSourceRelationCount(0);
      return;
    }
    let alive = true;
    loadRelations(campaignId).then((rows) => {
      if (alive) setSourceRelationCount(rows.filter((r) => r.from_id === duplicateOf.id).length);
    });
    return () => {
      alive = false;
    };
  }, [open, duplicateOf, kind, campaignId]);

  const locationChoices = useMemo(
    () => parentOptions(allLocations, kind === "location" ? entry?.id : null),
    [allLocations, kind, entry?.id]
  );

  const childCount = useMemo(
    () => (duplicateOf && kind === "location" ? descendantIds(allLocations, duplicateOf.id).length : 0),
    [duplicateOf, kind, allLocations]
  );

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.name?.trim() || !campaignId) return;
    setSaving(true);
    const payload = {
      campaign_id: campaignId,
      name: form.name.trim(),
      comment: form.comment?.trim() || "",
      attachments: form.attachments || [],
    };
    if (kind === "npc") {
      payload.role = form.role || "";
      payload.description = form.description || "";
      payload.attitude = form.attitude || "neutre";
      payload.location_id = form.location_id || "";
    } else if (kind === "location") {
      payload.type = form.type || "";
      payload.description = form.description || "";
      payload.parent_id = form.parent_id || "";
    } else {
      payload.description = form.description || "";
      payload.clue_type = form.clue_type === "info" ? "info" : "indice";
      payload.discovered = payload.clue_type === "indice" && !!form.discovered;
      payload.known = payload.clue_type === "info" && !!form.known;
      payload.used = payload.clue_type === "info" && !!form.used;
      payload.location_id = form.location_id || "";
    }
    try {
      let created = null;
      await withDataBatch(async () => {
        if (entry?.id) await api.entities[meta.entity].update(entry.id, payload);
        else created = await api.entities[meta.entity].create(payload);

        if (created && duplicateOf) {
          try {
            if (kind === "npc" && copyRelations) await copyNpcRelations(campaignId, duplicateOf.id, created.id);
            if (kind === "location" && copyChildren)
              await copyLocationSubtree(allLocations, duplicateOf.id, created.id);
          } catch (copyError) {
            console.error("Copie incomplète :", copyError);
            toast({
              variant: "destructive",
              title: "Copie incomplète",
              description: "L'élément a été créé, mais ses relations ou sous-lieux n'ont pas tous été copiés.",
            });
          }
        }
      });
      onOpenChange(false);
      if (created) dispatchTutorialAction(`${kind}-created`);
      await onSaved(created);
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
      <Button data-tutorial="codex-cancel" variant="ghost" onClick={() => onOpenChange(false)}>
        Annuler
      </Button>
      <Button onClick={save} disabled={saving || !form.name?.trim()}>
        {saving ? "Enregistrement…" : duplicateOf ? "Créer la copie" : "Enregistrer"}
      </Button>
    </div>
  );

  const title = entry?.id
    ? `Modifier — ${meta.singular}`
    : duplicateOf
      ? `Dupliquer — ${meta.singular}`
      : `Nouveau ${meta.singular}`;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={
        duplicateOf
          ? `Copie de « ${duplicateOf.name} ». Renseignez le commentaire pour distinguer les deux éléments.`
          : undefined
      }
      footer={footer}
    >
      <div className="space-y-4 py-1">
        <div className="space-y-2">
          <Label>{meta.nameLabel}</Label>
          <Input data-tutorial="codex-name" value={form.name || ""} onChange={(e) => set("name", e.target.value)} />
          {kind === "npc" && !entry && canGenerateNames(universeId) && (
            <div className="flex items-center gap-2">
              <Select value={nameGender} onValueChange={setNameGender}>
                <SelectTrigger className="h-8 w-32 text-xs" aria-label="Genre du nom généré">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="neutral">Au hasard</SelectItem>
                  <SelectItem value="male">Masculin</SelectItem>
                  <SelectItem value="female">Féminin</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="sm" onClick={generateName}>
                <Dices className="mr-2 h-4 w-4" /> Génération aléatoire
              </Button>
            </div>
          )}        </div>

        <div className="space-y-2">
          <Label>Commentaire (facultatif)</Label>
          <Input
            value={form.comment || ""}
            onChange={(e) => set("comment", e.target.value)}
            placeholder="Ex. n°2, version corrompue, archétype de garde…"
          />
        </div>

        {duplicateOf && kind === "npc" && (
          <CopyOption
            checked={copyRelations}
            onChange={setCopyRelations}
            title={`Copier aussi les relations (${sourceRelationCount})`}
            hint="Le PNJ dupliqué aura les mêmes relations que l'original avec les autres PNJ. Son lieu d'attribution est conservé."
          />
        )}
        {duplicateOf && kind === "location" && (
          <CopyOption
            checked={copyChildren}
            onChange={setCopyChildren}
            title={`Copier aussi les sous-lieux (${childCount})`}
            hint="Toute l'arborescence sous ce lieu est copiée. Les PNJ qui y sont rattachés ne sont pas copiés."
          />
        )}

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

            <div className="space-y-2">
              <Label>Lieu d'attribution</Label>
              <Select
                value={form.location_id || "_none"}
                onValueChange={(v) => set("location_id", v === "_none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Aucun lieu</SelectItem>
                  {locationChoices.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Où trouve-t-on ce personnage ? Choisissez un lieu de l'arborescence.
              </p>
            </div>
          </>
        )}

        {kind === "location" && (
          <>
            <div className="space-y-2">
              <Label>Type de lieu</Label>
              <Input
                value={form.type || ""}
                onChange={(e) => set("type", e.target.value)}
                placeholder="Ex. Pays, ville, rue, maison, donjon…"
              />
            </div>

            <div className="space-y-2">
              <Label>Lieu parent</Label>
              <Select
                value={form.parent_id || "_none"}
                onValueChange={(v) => set("parent_id", v === "_none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Aucun (lieu de premier niveau)</SelectItem>
                  {locationChoices.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Une ville a pour parent son pays, une rue a pour parent sa ville, etc.
              </p>
            </div>
          </>
        )}

        {kind === "clue" && (
          <>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.clue_type === "info" ? "info" : "indice"}
                onValueChange={(value) => set("clue_type", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="indice">Indice</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Lieu d'attribution</Label>
              <Select
                value={form.location_id || "_none"}
                onValueChange={(value) => set("location_id", value === "_none" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Aucun lieu</SelectItem>
                  {locationChoices.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
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

        {kind === "npc" &&
          (entry?.id ? (
            <NpcRelations npc={entry} campaignId={campaignId} />
          ) : (
            <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
              Enregistrez d'abord ce PNJ pour pouvoir lui ajouter des relations.
            </p>
          ))}

        {kind === "clue" && (form.clue_type !== "info" ? (
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label>Découvert</Label>
              <p className="text-xs text-muted-foreground">Les joueurs ont-ils trouvé cet indice ?</p>
            </div>
            <Switch checked={!!form.discovered} onCheckedChange={(v) => set("discovered", v)} />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label>Connue</Label>
                <p className="text-xs text-muted-foreground">Les joueurs ont-ils cette information ?</p>
              </div>
              <Switch checked={!!form.known} onCheckedChange={(v) => set("known", v)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label>Utilisée</Label>
                <p className="text-xs text-muted-foreground">Le MJ l’a-t-il déjà utilisée en jeu ?</p>
              </div>
              <Switch checked={!!form.used} onCheckedChange={(v) => set("used", v)} />
            </div>
          </>
        ))}
      </div>
    </ResponsiveDialog>
  );
}