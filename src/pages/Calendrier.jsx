import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/api/localClient";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { addMonths, format, parseISO, startOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import MonthGrid from "@/components/calendar/MonthGrid";
import SessionDialog from "@/components/calendar/SessionDialog";
import UpcomingSessions from "@/components/calendar/UpcomingSessions";
import { dateKey, sessionStatusMeta } from "@/lib/sessionMeta";
import { getSelectedCampaignId, setSelectedCampaignId } from "@/lib/campaignStore";
import { useToast } from "@/components/ui/use-toast";
import { useDataRefresh } from "@/lib/RefreshContext";
import PrintButton from "@/components/print/PrintButton";
import SessionPollDialog from "@/components/calendar/SessionPollDialog";
import CampaignSelect from "@/components/common/CampaignSelect";
import { getPollServiceUrl, pollRequest, refreshSessionPoll, tallyVotes } from "@/lib/sessionPolls";
import { useExpandedCardState } from "@/lib/ExpandedCardContext";


const emptyForm = (date) => ({
  title: "",
  date: date instanceof Date ? format(date, "yyyy-MM-dd") : date || format(new Date(), "yyyy-MM-dd"),
  time: "20:00",
  location: "",
  status: "planifiee",
  notes: "",
  scene_id: "",
});

export default function Calendrier() {
  const { toast } = useToast();
  const { expandedCardId, setExpandedCardId } = useExpandedCardState();
  const { refreshKey: dataRefreshKey } = useDataRefresh();
  const [campaigns, setCampaigns] = useState([]);
  const [campaignId, setCampaignId] = useState(getSelectedCampaignId());
  const [scenes, setScenes] = useState([]);
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [sessions, setSessions] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [polls, setPolls] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [pollDialogOpen, setPollDialogOpen] = useState(false);
  const [pollToEdit, setPollToEdit] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deletingPollId, setDeletingPollId] = useState("");
  const loadedFor = useRef("");

  const monthKey = format(month, "yyyy-MM");

  useEffect(() => {
    if (!campaignId) {
      setPolls([]);
      return;
    }
    const serviceUrl = getPollServiceUrl();
    let alive = true;
    const refreshPolls = async () => {
      try {
        const { items } = await api.entities.SessionPoll.filter({ campaign_id: campaignId }, { limit: 100 });
        if (alive) setPolls(items.filter((poll) => poll.state === "open"));
        let failed = 0;
        for (const poll of items) {
          const pollUrl = poll.service_url || serviceUrl;
          if (!pollUrl) continue;
          try {
            const updated = await refreshSessionPoll(poll, pollUrl);
            if (alive) {
              setPolls((current) => updated.state === "open"
                ? [updated, ...current.filter((item) => item.id !== updated.id)]
                : current.filter((item) => item.id !== updated.id));
            }
          } catch (error) {
            failed += 1;
            console.error(`Actualisation du sondage « ${poll.title} » impossible :`, error);
          }
        }
        if (alive && failed > 0) {
          toast({
            variant: "destructive",
            title: "Certains sondages n'ont pas été actualisés",
            description: "Le calendrier local reste disponible. Vérifiez la connexion et actualisez les sondages plus tard.",
          });
        }
      } catch (error) {
        console.error("Synchronisation des sondages impossible :", error);
        if (alive) {
          toast({
            variant: "destructive",
            title: "Synchronisation des sondages impossible",
            description: "Le calendrier local reste disponible.",
          });
        }
      }
    };
    refreshPolls();
    return () => {
      alive = false;
    };
  }, [campaignId, toast]);

  // Relecture locale (sans appel réseau) à chaque changement de données.
  useEffect(() => {
    if (!campaignId) return;
    let alive = true;
    api.entities.SessionPoll.filter({ campaign_id: campaignId }, { limit: 100 })
      .then(({ items }) => {
        if (alive) setPolls(items.filter((poll) => poll.state === "open"));
      })
      .catch((error) => console.error("Rechargement des sondages impossible :", error));
    return () => {
      alive = false;
    };
  }, [campaignId, dataRefreshKey]);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const res = await api.entities.Campaign.filter({}, { sort: "-created_date", limit: 100 });
        if (!alive) return;
        setCampaigns(res.items);
        const stored = getSelectedCampaignId();
        const valid = res.items.some((c) => c.id === stored) ? stored : res.items[0]?.id || "";
        setCampaignId(valid);
        setSelectedCampaignId(valid);
      } catch (error) {
        console.error("Chargement des campagnes impossible :", error);
        if (alive) toast({ variant: "destructive", title: "Campagnes indisponibles", description: "Impossible de charger les campagnes locales." });
      }
    };
    run();
    return () => { alive = false; };
  }, [dataRefreshKey, toast]);

  useEffect(() => {
    if (!campaignId) {
      setScenes([]);
      return;
    }
    let alive = true;
    setScenes([]);
    api.entities.Scene
      .filter({ campaign_id: campaignId }, { sort: "order", limit: 300 })
      .then((res) => {
        if (alive) setScenes(res.items);
      })
      .catch((error) => {
        console.error("Chargement des scènes impossible :", error);
        if (alive) toast({ variant: "destructive", title: "Scènes indisponibles", description: "Impossible de charger les scènes de cette campagne." });
      });
    return () => {
      alive = false;
    };
  }, [campaignId, dataRefreshKey, toast]);

  useEffect(() => {
    if (!campaignId) {
      setSessions([]);
      setUpcoming([]);
      setSelectedDate("");
      return;
    }
    let alive = true;
    const contextKey = `${campaignId}|${monthKey}`;
    const initial = loadedFor.current !== contextKey;
    if (initial) {
      setSessions([]);
      setUpcoming([]);
    }
    const run = async () => {
      if (initial) setLoading(true);
      try {
        const start = format(startOfMonth(month), "yyyy-MM-dd");
        const nextMonth = format(addMonths(startOfMonth(month), 1), "yyyy-MM-dd");
        const today = format(new Date(), "yyyy-MM-dd");
        const [monthRes, upcomingRes] = await Promise.all([
          api.entities.GameSession.filter(
            { campaign_id: campaignId, date: { $gte: start, $lt: nextMonth } },
            { sort: "date", limit: 300 }
          ),
          api.entities.GameSession.filter(
            { campaign_id: campaignId, date: { $gte: today } },
            { sort: "date", limit: 6 }
          ),
        ]);
        if (!alive) return;
        setSessions(monthRes.items);
        setUpcoming(upcomingRes.items);
        loadedFor.current = contextKey;
      } catch (error) {
        console.error("Chargement des sessions impossible :", error);
        if (alive) toast({ variant: "destructive", title: "Sessions indisponibles", description: "Impossible de charger le calendrier de cette campagne." });
      } finally {
        if (alive && initial) setLoading(false);
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, [campaignId, monthKey, month, dataRefreshKey, toast]);

  const sessionsByDate = useMemo(() => {
    const map = {};
    sessions.forEach((session) => {
      const key = dateKey(session.date);
      if (!key) return;
      map[key] = [...(map[key] || []), session];
    });
    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")));
    });
    return map;
  }, [sessions]);

  const openNew = (date) => {
    setForm(emptyForm(date));
    setDialogOpen(true);
  };

  const selectCalendarDay = (day) => {
    const key = format(day, "yyyy-MM-dd");
    const next = selectedDate === key ? "" : key;
    setSelectedDate(next);
    setExpandedCardId(next ? `calendar-day:${next}` : null);
  };

  useEffect(() => {
    if (!expandedCardId?.startsWith("calendar-day:")) setSelectedDate("");
  }, [expandedCardId]);

  const updatePollCard = (poll, removedId) => {
    if (!poll || poll.state !== "open") {
      setPolls((current) => current.filter((item) => item.id !== (poll?.id || removedId)));
      return;
    }
    setPolls((current) => [poll, ...current.filter((item) => item.id !== poll.id)]);
  };

  const deletePoll = async (poll) => {
    if (!window.confirm(`Supprimer le sondage « ${poll.title} » et toutes ses réponses ?`)) return;
    setDeletingPollId(poll.id);
    try {
      await pollRequest(poll.service_url || getPollServiceUrl(), `/api/polls/${poll.poll_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${poll.owner_token}` },
      });
      await api.entities.SessionPoll.delete(poll.id);
      setPolls((current) => current.filter((item) => item.id !== poll.id));
      toast({ title: "Sondage supprimé" });
    } catch (error) {
      if (error.status === 404) {
        try {
          await api.entities.SessionPoll.delete(poll.id);
          setPolls((current) => current.filter((item) => item.id !== poll.id));
          toast({ title: "Référence locale supprimée", description: "Le sondage distant a déjà expiré ou été supprimé." });
        } catch (localError) {
          console.error("Suppression de la référence locale au sondage impossible :", localError);
          toast({ variant: "destructive", title: "Suppression impossible", description: "La référence locale au sondage n'a pas pu être supprimée." });
        }
      } else {
        console.error("Suppression du sondage impossible :", error);
        toast({ variant: "destructive", title: "Suppression impossible", description: error.message });
      }
    } finally {
      setDeletingPollId("");
    }
  };

  const openEdit = (session) => {
    setForm({
      id: session.id,
      title: session.title || "",
      date: dateKey(session.date),
      time: session.time || "",
      location: session.location || "",
      status: session.status || "planifiee",
      notes: session.notes || "",
      scene_id: session.scene_id || "",
    });
    setDialogOpen(true);
  };

  const planifyPollSlot = (poll, slot) => {
    setForm({
      ...emptyForm(slot.date),
      title: poll.title,
      time: slot.time,
    });
    setPollDialogOpen(false);
    setDialogOpen(true);
  };

  const applySession = (session, replacedId) => {
    setSessions((list) => {
      const rest = list.filter((s) => s.id !== session.id && s.id !== replacedId);
      const inMonth = String(session.date || "").slice(0, 7) === monthKey;
      return inMonth
        ? [...rest, session].sort((a, b) => String(a.date).localeCompare(String(b.date)))
        : rest;
    });
    setUpcoming((list) => {
      const rest = list.filter((s) => s.id !== session.id && s.id !== replacedId);
      const isUpcoming = String(session.date || "") >= format(new Date(), "yyyy-MM-dd");
      return isUpcoming
        ? [...rest, session].sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(0, 6)
        : rest;
    });
  };

  const save = async () => {
    if (!form.title.trim() || !form.date || !campaignId) return;
    setSaving(true);
    const payload = {
      campaign_id: campaignId,
      title: form.title.trim(),
      date: form.date,
      time: form.time || "",
      location: form.location || "",
      status: form.status || "planifiee",
      notes: form.notes || "",
      scene_id: form.scene_id || "",
    };
    const optimistic = { ...payload, id: form.id || `session-${Date.now()}` };
    const previous = { sessions, upcoming };
    applySession(optimistic);
    setDialogOpen(false);
    try {
      const saved = form.id
        ? await api.entities.GameSession.update(form.id, payload)
        : await api.entities.GameSession.create(payload);
      if (saved?.id) applySession(saved, optimistic.id);
      toast({ title: form.id ? "Session mise à jour" : "Session planifiée" });
    } catch {
      setSessions(previous.sessions);
      setUpcoming(previous.upcoming);
      toast({
        variant: "destructive",
        title: "Enregistrement impossible",
        description: "La session n'a pas été enregistrée.",
      });
    } finally {
      setSaving(false);
    }
  };

  const removeSession = async () => {
    const pending = pendingDelete;
    setPendingDelete(null);
    if (!pending) return;
    const previous = { sessions, upcoming };
    setSessions((list) => list.filter((s) => s.id !== pending.id));
    setUpcoming((list) => list.filter((s) => s.id !== pending.id));
    try {
      await api.entities.GameSession.delete(pending.id);
      toast({ title: "Session supprimée" });
    } catch {
      setSessions(previous.sessions);
      setUpcoming(previous.upcoming);
      toast({
        variant: "destructive",
        title: "Suppression impossible",
        description: "La session a été rétablie.",
      });
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 px-4 py-6 md:px-8 md:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="tag border border-primary/40 text-primary">Agenda du MJ</span>
          <h1 className="mt-3 font-display text-3xl font-bold text-foreground">Sessions de jeu</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Planifiez vos prochaines parties par date, gardez une trace de celles déjà jouées et
            préparez la scène de chaque séance.
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <CampaignSelect
            campaigns={campaigns}
            value={campaignId}
            onValueChange={(id) => {
              setCampaignId(id);
              setSelectedCampaignId(id);
              setSelectedDate("");
            }}
          />
          <Button variant="outline" onClick={() => setPollDialogOpen(true)} disabled={!campaignId}>
            Sondage des joueurs
          </Button>
          <PrintButton campaignId={campaignId} preset="sessions" />
          <Button onClick={() => openNew()} disabled={!campaignId}>
            <Plus className="mr-2 h-4 w-4" /> Nouvelle session
          </Button>
        </div>
      </header>

      {!campaignId ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Créez une campagne depuis l'arborescence pour planifier vos sessions.
        </div>
      ) : (
        <div
          className="grid gap-6 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]"
          onClick={() => setSelectedDate("")}
        >
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setSelectedDate("");
                    setMonth((m) => subMonths(m, 1));
                  }}
                  aria-label="Mois précédent"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="min-w-[150px] text-center font-display text-lg font-semibold capitalize text-foreground">
                  {format(month, "LLLL yyyy", { locale: fr })}
                </h2>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setSelectedDate("");
                    setMonth((m) => addMonths(m, 1));
                  }}
                  aria-label="Mois suivant"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => {
                  setSelectedDate("");
                  setMonth(startOfMonth(new Date()));
                }}>
                  Aujourd'hui
                </Button>
              </div>
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {loading
                  ? "Chargement…"
                  : `${sessions.length} session${sessions.length > 1 ? "s" : ""} ce mois`}
              </span>
            </div>

            <MonthGrid
              month={month}
              sessionsByDate={sessionsByDate}
              selectedDate={selectedDate}
              onSelectDay={selectCalendarDay}
              onSelectSession={openEdit}
              onAddSession={openNew}
            />
          </section>

          <div className="space-y-6">
            <UpcomingSessions sessions={upcoming} onOpen={openEdit} onAdd={() => openNew()} />

            {sessions.length > 0 && (
              <div className="rounded-xl border border-border bg-card/50 p-4">
                <h2 className="font-display text-sm font-semibold text-foreground">
                  Ce mois-ci
                </h2>
                <ul className="mt-3 space-y-2">
                  {sessions.map((session) => {
                    const meta = sessionStatusMeta(session.status);
                    const day = dateKey(session.date);
                    return (
                      <li key={session.id}>
                        <button
                          type="button"
                          onClick={() => openEdit(session)}
                          className="flex w-full items-center gap-3 rounded-lg border border-border bg-background/60 p-2.5 text-left transition-colors hover:border-primary/40"
                        >
                          <span className="w-14 shrink-0 font-mono text-xs uppercase text-muted-foreground">
                            {day ? format(parseISO(day), "dd/MM") : "—"}
                          </span>
                          <span className="min-w-0 flex-1 truncate font-display text-sm text-foreground">
                            {session.title}
                          </span>
                          <span className={cn("tag shrink-0 border", meta.badge)}>{meta.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <section className="rounded-xl border border-border bg-card/50 p-4">
              <h2 className="font-display text-sm font-semibold text-foreground">Sondages en cours</h2>
              {polls.length === 0 ? (
                <p className="mt-3 rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  Aucun sondage en cours pour cette campagne.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {polls.map((poll) => (
                    <li key={poll.id} className="rounded-lg border border-border bg-background/60 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <a
                          href={poll.public_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-display text-sm font-semibold text-foreground underline decoration-primary/50 underline-offset-4 hover:text-primary"
                        >
                          {poll.title}
                        </a>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            aria-label={`Modifier le sondage ${poll.title}`}
                            onClick={() => {
                              setPollToEdit(poll);
                              setPollDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            aria-label={`Supprimer le sondage ${poll.title}`}
                            disabled={deletingPollId === poll.id}
                            onClick={() => deletePoll(poll)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {`Réponses reçues : ${(poll.votes || []).length}/${(poll.expected_players || []).length}`} · jusqu'au{" "}
                        {new Intl.DateTimeFormat("fr-FR", {
                          dateStyle: "medium",
                          timeZone: poll.timezone || "UTC",
                        }).format(new Date(poll.expires_at))}
                      </p>
                      {(poll.slots || []).map((slot) => {
                        const counts = tallyVotes(poll.votes, slot.id);
                        return (
                          <div key={slot.id} className="mt-2 rounded-md border border-border/70 bg-card/40 px-2 py-1.5">
                            <p className="text-xs font-medium text-foreground">
                              {new Intl.DateTimeFormat("fr-FR", {
                                dateStyle: "medium",
                                timeStyle: "short",
                                timeZone: "UTC",
                              }).format(new Date(`${slot.date}T${slot.time}:00Z`))}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                              <span className="text-green-500">Présent : {counts.available}</span>
                              <span className="text-amber-500">Peut-être : {counts.maybe}</span>
                              <span className="text-muted-foreground">Indisponible : {counts.unavailable}</span>
                            </div>
                          </div>
                        );
                      })}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}

      <SessionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        form={form}
        setForm={setForm}
        scenes={scenes}
        saving={saving}
        onSave={save}
        isEditing={!!form.id}
        onDelete={() => {
          setDialogOpen(false);
          setPendingDelete(form);
        }}
      />

      <SessionPollDialog
        open={pollDialogOpen}
        onOpenChange={(open) => {
          setPollDialogOpen(open);
          if (!open) setPollToEdit(null);
        }}
        campaignId={campaignId}
        pollToEdit={pollToEdit}
        onPlanify={planifyPollSlot}
        onPollChange={updatePollCard}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              La session « {pendingDelete?.title} » sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeSession}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}