import React from "react";
import { Trash2 } from "lucide-react";
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
import { SESSION_STATUS_ORDER, SESSION_STATUS } from "@/lib/meta/sessionMeta";
import { NEW_CAMPAIGN } from "@/lib/meta/sessionCampaign";
import { dispatchTutorialAction } from "@/utils/tutorialStorage";

export default function SessionDialog({
  open,
  onOpenChange,
  form,
  setForm,
  scenes,
  saving,
  onSave,
  isEditing,
  onDelete,
  campaignName = "",
  campaigns = [],
  activeCampaignId = "",
}) {
  // Une nouvelle session peut aller dans une autre campagne, ou dans une campagne vierge créée à l'enregistrement.
  const campaignValue = form.campaign_id || activeCampaignId;
  const creatingCampaign = !isEditing && campaignValue === NEW_CAMPAIGN;
  const chooseCampaign = (value) =>
    setForm((f) => ({ ...f, campaign_id: value, scene_id: "" }));

  const footer = (
    <div className="flex items-center justify-between gap-2">
      <div>
        {isEditing && onDelete && (
          <Button
            variant="ghost"
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" /> Supprimer
          </Button>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Annuler
        </Button>
        <Button onClick={onSave} disabled={saving || !form.title.trim() || !form.date || (creatingCampaign && !form.new_campaign_name?.trim())}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  );

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? "Modifier la session" : "Nouvelle session"}
      description={
        campaignName
          ? `Campagne « ${campaignName} ». Fixez la date, l'heure et le contenu de votre prochaine partie.`
          : "Fixez la date, l'heure et le contenu de votre prochaine partie."
      }
      footer={footer}
    >
      <div className="space-y-4 py-1">
        {!isEditing && (
          <div className="space-y-2">
            <Label>Campagne</Label>
            <Select value={campaignValue || NEW_CAMPAIGN} onValueChange={chooseCampaign}>
              <SelectTrigger data-tutorial="session-campaign">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
                <SelectItem value={NEW_CAMPAIGN}>＋ Nouvelle campagne…</SelectItem>
              </SelectContent>
            </Select>
            {creatingCampaign && (
              <>
                <Input
                  aria-label="Nom de la nouvelle campagne"
                  value={form.new_campaign_name || ""}
                  onChange={(e) => setForm((f) => ({ ...f, new_campaign_name: e.target.value }))}
                  placeholder="Nom de la nouvelle campagne"
                />
                <p className="text-xs text-muted-foreground">Une campagne vierge portant ce nom sera créée avec la session.</p>
              </>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label>Titre de la session</Label>
          <Input
            data-tutorial="session-title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Ex. Session 4 — La crypte"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={form.date || ""}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Heure</Label>
            <Input
              type="time"
              value={form.time || ""}
              onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Lieu</Label>
            <Input
              value={form.location || ""}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="Ex. Chez Léa, en ligne…"
            />
          </div>
          <div className="space-y-2">
            <Label>Statut</Label>
            <Select
              value={form.status || "planifiee"}
              onValueChange={(value) => setForm((f) => ({ ...f, status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SESSION_STATUS_ORDER.map((key) => (
                  <SelectItem key={key} value={key}>
                    {SESSION_STATUS[key].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Scène prévue</Label>
          <Select
            value={form.scene_id || "_none"}
            onValueChange={(value) => {
              setForm((f) => ({ ...f, scene_id: value === "_none" ? "" : value }));
              if (value !== "_none") dispatchTutorialAction("session-scene-selected");
            }}
          >
            <SelectTrigger data-tutorial="calendar-scenario">
              <SelectValue placeholder="Aucune scène" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Aucune scène</SelectItem>
              {scenes.map((scene) => (
                <SelectItem key={scene.id} value={scene.id}>
                  {scene.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Notes de préparation</Label>
          <Textarea
            rows={3}
            value={form.notes || ""}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Ce qu'il faut préparer, rappels, matériel…"
          />
        </div>
      </div>
    </ResponsiveDialog>
  );
}