import React from "react";
import { CalendarPlus, Copy, Mail, MessageCircle, Plus, RefreshCw, Trash2, Edit2 } from "lucide-react";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSessionPollManager } from "@/hooks/useSessionPollManager";
import { AVAILABILITY_LABELS, displaySlot, normalizePlayer } from "@/lib/services/polls/pollForm";

export default function SessionPollDialog({
  open,
  onOpenChange,
  campaignId,
  pollToEdit,
  onPlanify,
  onPollChange,
}) {
  const {
    serviceUrl, setServiceUrl, editingServiceUrl, setEditingServiceUrl, commitServiceUrl,
    title, setTitle, comment, setComment, playerNames, setPlayerNames, timezone, setTimezone,
    slots, changeSlotDate, changeSlotTime, removeSlot, addSlot,
    expiresOn, changeExpiresOn,
    editingPoll, editLoading, editLoadError, creating,
    savePoll, cancelEdit,
    polls, busyPoll, refreshPoll, copyLink, closePoll,
    pendingPollRemoval, setPendingPollRemoval, confirmPollRemoval,
  } = useSessionPollManager({ open, onOpenChange, campaignId, pollToEdit, onPollChange });

  const footer = (
    <div className="flex justify-end">
      <Button variant="ghost" onClick={() => onOpenChange(false)}>Fermer</Button>
    </div>
  );

  return (
    <>
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Sondages des joueurs"
      description="Les campagnes restent sur cet appareil. Seuls le sondage, les dates proposées, les noms et les disponibilités sont envoyés à Cloudflare."
      footer={footer}
    >
      <div className="max-h-[70vh] space-y-6 overflow-y-auto py-1">
        <section className="space-y-3 rounded-lg border border-border p-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="poll-service-url">Adresse du site Cloudflare Pages</Label>
              {!editingServiceUrl && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingServiceUrl(true)}
                  aria-label="Modifier l'adresse Cloudflare"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Input
              id="poll-service-url"
              type="url"
              placeholder="https://votre-projet.pages.dev"
              value={serviceUrl}
              onChange={(event) => setServiceUrl(event.target.value)}
              onBlur={commitServiceUrl}
              disabled={!editingServiceUrl}
              className={!editingServiceUrl ? "bg-muted text-muted-foreground" : ""}
            />
            <p className="text-xs text-muted-foreground">
              Cette adresse est mémorisée localement et peut être remplacée par celle de votre déploiement.
            </p>
          </div>
        </section>

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
              <Button
                type="button"
                variant="outline"
                onClick={cancelEdit}
              >
                Annuler
              </Button>
            )}
          </div>
        </section>

        {polls.length > 0 && (
          <section className="space-y-3">
            <h3 className="font-display text-base font-semibold text-foreground">Sondages de cette campagne</h3>
            {polls.map((poll) => {
              const votesByName = new Map((poll.votes || []).map((vote) => [normalizePlayer(vote.name), vote]));
              const slotsForPoll = poll.slots || [];
              return (
                <article key={poll.id} className="space-y-3 rounded-lg border border-border bg-card/50 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="font-display font-semibold text-foreground">{poll.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {poll.state === "closed" ? "Clôturé · résultats consultables jusqu'au" : "Ouvert · résultats consultables jusqu'au"}{" "}
                        {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: poll.timezone || "UTC" }).format(new Date(poll.expires_at))}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Button type="button" size="sm" variant="ghost" onClick={() => refreshPoll(poll)} disabled={busyPoll === poll.id} aria-label="Actualiser les résultats">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => copyLink(poll)} aria-label="Copier le lien">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${poll.title} — indiquez vos disponibilités : ${poll.public_url}`)}`, "_blank", "noopener,noreferrer")} aria-label="Partager sur WhatsApp">
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => window.open(`mailto:?subject=${encodeURIComponent(poll.title)}&body=${encodeURIComponent(`Indiquez vos disponibilités : ${poll.public_url}`)}`, "_blank", "noopener,noreferrer")} aria-label="Partager par courriel">
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => copyLink(poll, true)} aria-label="Partager sur Discord">
                        Discord
                      </Button>
                      {poll.state === "open" && (
                        <Button type="button" size="sm" variant="outline" onClick={() => closePoll(poll)} disabled={busyPoll === poll.id}>
                          Clôturer
                        </Button>
                      )}
                      <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => setPendingPollRemoval(poll)} disabled={busyPoll === poll.id} aria-label="Supprimer le sondage">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Input aria-label={`Lien du sondage ${poll.title}`} readOnly value={poll.public_url} onFocus={(event) => event.target.select()} />
                  {poll.sync_error && <p className="text-sm text-destructive">{poll.sync_error}</p>}
                  {slotsForPoll.length > 0 && (
                    <div className="max-w-full overflow-x-auto">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="p-2">Joueur attendu</th>
                            {slotsForPoll.map((slot) => <th key={slot.id} className="min-w-32 p-2">{displaySlot(slot, poll.timezone)}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {(poll.expected_players || []).map((name) => {
                            const vote = votesByName.get(normalizePlayer(name));
                            return (
                              <tr key={name} className="border-b border-border/60">
                                <th className="p-2 font-medium text-foreground">{name}</th>
                                {slotsForPoll.map((slot) => (
                                  <td key={slot.id} className="p-2 text-muted-foreground">
                                    {vote?.choices?.[slot.id] ? AVAILABILITY_LABELS[vote.choices[slot.id]] : "Sans réponse"}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {slotsForPoll.map((slot) => (
                    <Button key={`plan-${slot.id}`} type="button" size="sm" variant="outline" onClick={() => onPlanify(poll, slot)}>
                      <CalendarPlus className="mr-2 h-4 w-4" /> Planifier le {displaySlot(slot, poll.timezone)}
                    </Button>
                  ))}
                </article>
              );
            })}
          </section>
        )}
      </div>
    </ResponsiveDialog>

    <AlertDialog open={!!pendingPollRemoval} onOpenChange={(next) => !next && setPendingPollRemoval(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer le sondage ?</AlertDialogTitle>
          <AlertDialogDescription>
            Le sondage « {pendingPollRemoval?.title} » et ses réponses en ligne seront définitivement supprimés.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmPollRemoval}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
