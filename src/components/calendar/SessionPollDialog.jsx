import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarPlus, Copy, Mail, MessageCircle, Plus, RefreshCw, Trash2 } from "lucide-react";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/api/localClient";
import { withDataBatch } from "@/lib/dataEvents";
import { formatPollDateInput, toPollIsoDate } from "@/lib/pollDates";
import {
  getPollServiceUrl,
  normalizePollServiceUrl,
  pollRequest,
  refreshSessionPoll,
  savePollServiceUrl,
} from "@/lib/sessionPolls";
import { dispatchTutorialAction } from "@/utils/tutorialStorage";

const newSlot = () => ({ date: "", time: "20:00" });
const AVAILABILITY_LABELS = {
  available: "Disponible",
  maybe: "Peut-être",
  unavailable: "Indisponible",
};

const displaySlot = (slot, timezone) => {
  const wallTime = new Date(`${slot.date}T${slot.time}:00Z`);
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(wallTime) + (timezone ? ` (${timezone})` : "");
};

const normalizePlayer = (name) =>
  String(name || "").normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("fr-FR");

const pollDateInput = (value) => {
  const [year, month, day] = value.split("-");
  return formatPollDateInput(`${day}/${month}/${year}`);
};

export default function SessionPollDialog({
  open,
  onOpenChange,
  campaignId,
  pollToEdit,
  onPlanify,
  onPollChange,
}) {
  const { toast } = useToast();
  const [serviceUrl, setServiceUrl] = useState(getPollServiceUrl);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [playerNames, setPlayerNames] = useState("");
  const [slots, setSlots] = useState([newSlot(), newSlot()]);
  const [expiresOn, setExpiresOn] = useState("");
  const [expiryManuallySet, setExpiryManuallySet] = useState(false);
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [polls, setPolls] = useState([]);
  const [busyPoll, setBusyPoll] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingPoll, setEditingPoll] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editLoadError, setEditLoadError] = useState("");

  const parsedPlayers = useMemo(
    () => playerNames.split(/\r?\n/).map((name) => name.normalize("NFKC").trim().replace(/\s+/g, " ")).filter(Boolean),
    [playerNames]
  );

  const saveServiceUrl = () => {
    const normalized = normalizePollServiceUrl(serviceUrl);
    savePollServiceUrl(normalized);
    setServiceUrl(normalized);
    return normalized;
  };

  const resetForm = useCallback(() => {
    setTitle("");
    setComment("");
    setPlayerNames("");
    setSlots([newSlot(), newSlot()]);
    setExpiresOn("");
    setExpiryManuallySet(false);
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  }, []);

  const refreshPoll = async (poll) => {
    setBusyPoll(poll.id);
    try {
      const baseUrl = poll.service_url || saveServiceUrl();
      const updated = await refreshSessionPoll(poll, baseUrl);
      setPolls((current) => current.map((item) => item.id === poll.id ? updated : item));
      onPollChange?.(updated);
    } catch (error) {
      console.error("Actualisation du sondage impossible :", error);
      toast({ variant: "destructive", title: "Résultats indisponibles", description: error.message });
    } finally {
      setBusyPoll("");
    }
  };

  useEffect(() => {
    if (!open || !campaignId) return;
    let alive = true;
    api.entities.SessionPoll.filter({ campaign_id: campaignId }, { sort: "-created_date" })
      .then(async (result) => {
        if (!alive) return;
        setPolls(result.items);
        const baseUrl = getPollServiceUrl();
        for (const poll of result.items) {
          const pollUrl = poll.service_url || baseUrl;
          if (!pollUrl) continue;
          try {
            const updated = await refreshSessionPoll(poll, pollUrl);
            if (alive) setPolls((current) => current.map((item) => item.id === poll.id ? updated : item));
          } catch (error) {
            console.error(`Actualisation du sondage « ${poll.title} » impossible :`, error);
            if (alive) {
              setPolls((current) => current.map((item) =>
                item.id === poll.id ? { ...item, sync_error: error.message } : item
              ));
            }
          }
        }
      })
      .catch((error) => {
        console.error("Chargement des sondages locaux impossible :", error);
        toast({ variant: "destructive", title: "Sondages indisponibles", description: "Les sondages locaux n'ont pas pu être chargés." });
      });
    return () => {
      alive = false;
    };
  }, [open, campaignId, toast]);

  useEffect(() => {
    if (!open || !pollToEdit) {
      if (!pollToEdit) {
        setEditingPoll(null);
        setEditLoadError("");
        setEditLoading(false);
        resetForm();
      }
      return;
    }
    let alive = true;
    setEditingPoll(pollToEdit);
    setEditLoading(true);
    setEditLoadError("");
    const baseUrl = pollToEdit.service_url || getPollServiceUrl();
    pollRequest(baseUrl, `/api/polls/${pollToEdit.poll_id}/results`, {
      headers: { Authorization: `Bearer ${pollToEdit.owner_token}` },
    })
      .then((details) => {
        if (!alive) return;
        const expiryParts = Object.fromEntries(
          new Intl.DateTimeFormat("en-CA", {
            timeZone: details.timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).formatToParts(new Date(details.expiresAt)).map(({ type, value }) => [type, value])
        );
        setServiceUrl(baseUrl);
        setTitle(details.title);
        setComment(details.comment || "");
        setPlayerNames(details.players.join("\n"));
        setSlots(details.slots.map((slot) => ({
          date: pollDateInput(slot.date),
          time: slot.time,
        })));
        setTimezone(details.timezone);
        setExpiresOn(formatPollDateInput(`${expiryParts.day}/${expiryParts.month}/${expiryParts.year}`));
        setEditLoadError("");
      })
      .catch((error) => {
        console.error("Chargement du sondage à modifier impossible :", error);
        if (alive) {
          setEditLoadError(error.message || "Les données du sondage n'ont pas pu être chargées.");
          toast({ variant: "destructive", title: "Modification impossible", description: error.message });
        }
      })
      .finally(() => {
        if (alive) setEditLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, pollToEdit, resetForm, toast]);

  useEffect(() => {
    if (pollToEdit || editingPoll || expiryManuallySet) return;
    const latestSlotDate = slots.reduce((latest, slot) => {
      const date = toPollIsoDate(slot.date);
      return date > latest ? date : latest;
    }, "");
    setExpiresOn(latestSlotDate ? pollDateInput(latestSlotDate) : "");
  }, [editingPoll, expiryManuallySet, pollToEdit, slots]);

  const savePoll = () => withDataBatch(savePollUnbatched);

  const savePollUnbatched = async () => {
    if (!campaignId) return;
    const normalizedPlayers = parsedPlayers.map(normalizePlayer);
    if (!title.trim() || title.trim().length > 120) {
      toast({ variant: "destructive", title: "Titre invalide", description: "Le titre doit contenir de 1 à 120 caractères." });
      return;
    }
    if (parsedPlayers.length === 0 || parsedPlayers.length > 40 ||
        new Set(normalizedPlayers).size !== normalizedPlayers.length) {
      toast({ variant: "destructive", title: "Liste de joueurs invalide", description: "Indiquez de 1 à 40 noms uniques, un par ligne." });
      return;
    }
    if (slots.length < 2 || slots.some((slot) => !toPollIsoDate(slot.date) || !slot.time)) {
      toast({ variant: "destructive", title: "Dates incomplètes ou invalides", description: "Renseignez au moins deux dates au format jj/mm/aaaa et leurs heures." });
      return;
    }
    if (!toPollIsoDate(expiresOn)) {
      toast({ variant: "destructive", title: "Date d'expiration invalide", description: "Choisissez une date valide au format jj/mm/aaaa jusqu'à laquelle le sondage et ses résultats resteront accessibles." });
      return;
    }
    setCreating(true);
    try {
      const baseUrl = saveServiceUrl();
      const normalizedSlots = slots.map((slot) => ({ ...slot, date: toPollIsoDate(slot.date) }));
      const uniqueSlots = new Set(normalizedSlots.map((slot) => `${slot.date}T${slot.time}`));
      if (uniqueSlots.size !== slots.length) throw new Error("Les propositions de date doivent être uniques.");
      const payload = {
        title: title.trim(),
        comment: comment.trim(),
        players: parsedPlayers,
        slots: normalizedSlots,
        timezone,
        expiresOn: toPollIsoDate(expiresOn),
      };
      if (editingPoll) {
        let remoteSaved = false;
        try {
          const response = await pollRequest(baseUrl, `/api/polls/${editingPoll.poll_id}`, {
            method: "PUT",
            headers: { Authorization: `Bearer ${editingPoll.owner_token}` },
            body: JSON.stringify(payload),
          });
          remoteSaved = true;
          const saved = await api.entities.SessionPoll.update(editingPoll.id, {
            title: payload.title,
            comment: payload.comment,
            timezone: payload.timezone,
            expected_players: payload.players,
            expires_at: response.expiresAt,
            slots: [],
            votes: [],
          });
          setPolls((current) => current.map((item) => item.id === saved.id ? saved : item));
          onPollChange?.(saved);
          setEditingPoll(null);
          resetForm();
          onOpenChange(false);
          toast({ title: "Sondage modifié" });
          try {
            const refreshed = await refreshSessionPoll(saved, baseUrl);
            setPolls((current) => current.map((item) => item.id === refreshed.id ? refreshed : item));
            onPollChange?.(refreshed);
          } catch (error) {
            console.error("Actualisation du sondage modifié impossible :", error);
            toast({
              variant: "destructive",
              title: "Sondage modifié, résultats non actualisés",
              description: error.message,
            });
          }
        } catch (error) {
          console.error("Modification du sondage impossible :", error);
          toast({
            variant: "destructive",
            title: remoteSaved ? "Sondage modifié, synchronisation locale impossible" : "Sondage non modifié",
            description: error instanceof TypeError
              ? "Impossible de joindre le service Cloudflare. Vérifiez la connexion; si elle fonctionne, déployez la dernière version du dossier cloudflare, qui autorise la modification des sondages."
              : error.message || "Vérifiez la connexion et la configuration Cloudflare.",
          });
        }
        return;
      }
      const created = await pollRequest(baseUrl, "/api/polls", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const saved = await api.entities.SessionPoll.create({
        campaign_id: campaignId,
        poll_id: created.id,
        title: created.title,
        comment: created.comment,
        public_url: created.publicUrl,
        service_url: baseUrl,
        owner_token: created.ownerToken,
        timezone: created.timezone,
        expected_players: parsedPlayers,
        slots: [],
        votes: [],
        state: "open",
        expires_at: created.expiresAt,
      });
      setPolls((current) => [saved, ...current]);
      onPollChange?.(saved);
      dispatchTutorialAction("poll-created");
      resetForm();
      onOpenChange(false);
      toast({ title: "Sondage créé", description: "Le lien est prêt à être partagé avec les joueurs." });
      await refreshPoll(saved);
    } catch (error) {
      console.error("Création du sondage impossible :", error);
      toast({ variant: "destructive", title: "Sondage non créé", description: error.message || "Vérifiez la connexion et la configuration Cloudflare." });
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async (poll, forDiscord = false) => {
    try {
      await navigator.clipboard.writeText(poll.public_url);
      toast({
        title: forDiscord ? "Lien copié pour Discord" : "Lien copié",
        description: forDiscord ? "Collez-le dans votre conversation Discord." : undefined,
      });
    } catch (error) {
      console.error("Copie du lien impossible :", error);
      toast({ variant: "destructive", title: "Copie impossible", description: "Sélectionnez et copiez le lien affiché." });
    }
  };

  const closePoll = async (poll) => {
    setBusyPoll(poll.id);
    try {
      await pollRequest(poll.service_url, `/api/polls/${poll.poll_id}/close`, {
        method: "POST",
        headers: { Authorization: `Bearer ${poll.owner_token}` },
        body: "{}",
      });
      const updated = await refreshSessionPoll({ ...poll, state: "closed" }, poll.service_url);
      setPolls((current) => current.map((item) => item.id === poll.id ? updated : item));
      onPollChange?.(updated);
      toast({ title: "Sondage clôturé", description: "Les joueurs ne peuvent plus modifier leur réponse." });
    } catch (error) {
      console.error("Clôture du sondage impossible :", error);
      toast({ variant: "destructive", title: "Clôture impossible", description: error.message });
    } finally {
      setBusyPoll("");
    }
  };

  const removePoll = async (poll) => {
    if (!window.confirm(`Supprimer le sondage « ${poll.title} » et ses réponses en ligne ?`)) return;
    setBusyPoll(poll.id);
    try {
      await pollRequest(poll.service_url, `/api/polls/${poll.poll_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${poll.owner_token}` },
      });
      await api.entities.SessionPoll.delete(poll.id);
      setPolls((current) => current.filter((item) => item.id !== poll.id));
      onPollChange?.(null, poll.id);
      toast({ title: "Sondage supprimé" });
    } catch (error) {
      if (error.status === 404) {
        try {
          await api.entities.SessionPoll.delete(poll.id);
          setPolls((current) => current.filter((item) => item.id !== poll.id));
          onPollChange?.(null, poll.id);
          toast({ title: "Référence locale supprimée", description: "Le sondage distant n'existe plus ou a expiré." });
        } catch (localError) {
          console.error("Suppression de la référence locale impossible :", localError);
          toast({ variant: "destructive", title: "Suppression impossible", description: "La référence locale au sondage n'a pas pu être supprimée." });
        }
        return;
      }
      console.error("Suppression du sondage impossible :", error);
      toast({ variant: "destructive", title: "Suppression impossible", description: error.message });
    } finally {
      setBusyPoll("");
    }
  };

  const footer = (
    <div className="flex justify-end">
      <Button variant="ghost" onClick={() => onOpenChange(false)}>Fermer</Button>
    </div>
  );

  return (
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
            <Label htmlFor="poll-service-url">Adresse du site Cloudflare Pages</Label>
            <Input
              id="poll-service-url"
              type="url"
              placeholder="https://votre-projet.pages.dev"
              value={serviceUrl}
              onChange={(event) => setServiceUrl(event.target.value)}
              onBlur={() => {
                if (!serviceUrl.trim()) return;
                try {
                  const normalized = normalizePollServiceUrl(serviceUrl);
                  savePollServiceUrl(normalized);
                  setServiceUrl(normalized);
                } catch {
                  // La validation détaillée est affichée lors de l'enregistrement ou de la création.
                }
              }}
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
                  onChange={(event) => setSlots((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, date: formatPollDateInput(event.target.value) } : item))}
                />
                <Input
                  aria-label={`Heure proposée ${index + 1}`}
                  type="time"
                  value={slot.time}
                  onChange={(event) => setSlots((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, time: event.target.value } : item))}
                />
                <Button type="button" variant="ghost" size="icon" aria-label={`Retirer la date ${index + 1}`} disabled={slots.length <= 2} onClick={() => setSlots((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" disabled={slots.length >= 30} onClick={() => setSlots((current) => [...current, newSlot()])}>
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
              onChange={(event) => {
                setExpiryManuallySet(true);
                setExpiresOn(formatPollDateInput(event.target.value));
              }}
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
                onClick={() => {
                  setEditingPoll(null);
                  setEditLoadError("");
                  resetForm();
                  onOpenChange(false);
                }}
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
                      <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => removePoll(poll)} disabled={busyPoll === poll.id} aria-label="Supprimer le sondage">
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
  );
}
