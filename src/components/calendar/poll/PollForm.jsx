import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Formulaire de création / modification d'un sondage. Tout l'état vient de useSessionPollManager. */
export default function PollForm({ form, campaignId }) {
  const {
    title, setTitle, comment, setComment, playerNames, setPlayerNames, timezone, setTimezone,
    slots, changeSlotDate, changeSlotTime, removeSlot, addSlot,
    expiresOn, changeExpiresOn,
    editingPoll, editLoading, editLoadError, creating,
    savePoll, cancelEdit,
  } = form;

  return (
    <section className="space-y-4 rounded-lg border border-border p-3">
      <h3 className="font-display text-base font-semibold text-foreground">
        {editingPoll ? "Modifier le sondage" : "Créer un sondage"}
      </h3>
      {editLoading && <p className="text-sm text-muted-foreground">Chargement des données du sondage…</p>}
      {editLoadError && <p className="text-sm text-destructive">{editLoadError}</p>}
      <div className="space-y-2">
        <Label htmlFor="poll-title-input">Nom de la session</Label>
        <Input data-tutorial="poll-title" id="poll-title-input" value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder="Ex. Session 5 — La tour oubliée" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="poll-comment">Commentaire visible par les participants (facultatif)</Label>
        <Textarea
          id="poll-comment"
          rows={3}
          maxLength={1000}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Ajoutez des précisions sur la séance ou le choix des dates…"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="poll-players">Joueurs attendus (un nom par ligne)</Label>
        <Textarea id="poll-players" rows={4} value={playerNames} onChange={(event) => setPlayerNames(event.target.value)} placeholder={"Léa\nMarc\nNora"} />
        <p className="text-xs text-muted-foreground">Les joueurs choisiront un nom dans cette liste. Un même nom met à jour sa réponse.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="poll-timezone">Fuseau horaire du MJ</Label>
        <Input id="poll-timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} placeholder="Europe/Paris" />
      </div>
      <div className="space-y-2">
        <Label>Dates et heures proposées (heure du MJ)</Label>
        {slots.map((slot, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              aria-label={`Date proposée ${index + 1}`}
              type="text"
              inputMode="numeric"
              placeholder="jj/mm/aaaa"
              maxLength={10}
              value={slot.date}
              onChange={(event) => changeSlotDate(index, event.target.value)}
            />
            <Input
              aria-label={`Heure proposée ${index + 1}`}
              type="time"
              value={slot.time}
              onChange={(event) => changeSlotTime(index, event.target.value)}
            />
            <Button type="button" variant="ghost" size="icon" aria-label={`Retirer la date ${index + 1}`} disabled={slots.length <= 2} onClick={() => removeSlot(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" disabled={slots.length >= 30} onClick={addSlot}>
          <Plus className="mr-2 h-4 w-4" /> Ajouter une date
        </Button>
      </div>
      <div className="space-y-2">
        <Label htmlFor="poll-expires-on">Conserver le sondage et ses résultats jusqu'au (heure du MJ)</Label>
        <Input
          id="poll-expires-on"
          type="text"
          inputMode="numeric"
          placeholder="jj/mm/aaaa"
          maxLength={10}
          value={expiresOn}
          onChange={(event) => changeExpiresOn(event.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          Après la clôture, les joueurs pourront toujours consulter les dates et le récapitulatif des réponses jusqu'à cette date incluse.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={savePoll} disabled={creating || editLoading || !!editLoadError || !campaignId}>
          {creating ? "Enregistrement…" : editingPoll ? "Enregistrer les modifications" : "Créer le sondage"}
        </Button>
        {editingPoll && (
          <Button type="button" variant="outline" onClick={cancelEdit}>
            Annuler
          </Button>
        )}
      </div>
    </section>
  );
}
