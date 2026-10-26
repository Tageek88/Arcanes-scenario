import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { addMonths, format, parseISO, startOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import { dateKey, sessionStatusMeta } from "@/lib/meta/sessionMeta";
import { NEW_CAMPAIGN } from "@/lib/meta/sessionCampaign";
import PrintButton from "@/components/print/PrintButton";
import SessionPollDialog from "@/components/calendar/SessionPollDialog";
import CampaignSelect from "@/components/common/CampaignSelect";
import { tallyVotes } from "@/lib/services/sessionPolls";
import { useExpandedCardState } from "@/lib/context/ExpandedCardContext";
import { usePageFilter } from "@/lib/context/PageFilterContext";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useScenes } from "@/hooks/useScenes";
import { useGameSessions } from "@/hooks/useGameSessions";
import { useSessionPolls } from "@/hooks/useSessionPolls";


const emptyForm = (date) => ({
  title: "",
  date: date instanceof Date ? format(date, "yyyy-MM-dd") : date || format(new Date(), "yyyy-MM-dd"),
  time: "20:00",
  location: "",
  status: "planifiee",
  notes: "",
  scene_id: "",
});

// Dans la vue « Toutes les campagnes », chaque session porte le nom de sa campagne (affichage seulement, non enregistré).
const withCampaignName = (list, showAll, names) =>
  showAll ? list.map((session) => ({ ...session, campaign_name: names.get(session.campaign_id) || "" })) : list;

export default function Calendrier() {
  const { expandedCardId, setExpandedCardId } = useExpandedCardState();
  const { campaigns, campaignId, selectCampaign } = useCampaigns();
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState("");

  // Vue « Toutes les campagnes » : les sessions de chaque campagne s'affichent ensemble, avec le nom de leur campagne.
  const [showAllStored, setShowAll] = usePageFilter("calendar.allCampaigns", false);
  const showAll = showAllStored === true && campaigns.length > 1;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [pollDialogOpen, setPollDialogOpen] = useState(false);
  const [pollToEdit, setPollToEdit] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [pendingDelete, setPendingDelete] = useState(null);
  const [pendingPollDelete, setPendingPollDelete] = useState(null);

  // Les scènes proposées sont celles de la campagne de la session ouverte (la campagne sélectionnée pour une nouvelle session).
  const sessionCampaignId = form.campaign_id || campaignId;
  const scenes = useScenes(sessionCampaignId === NEW_CAMPAIGN ? "" : sessionCampaignId);
  const rawData = useGameSessions(campaignId, month, { allCampaigns: showAll });
  const { loading, saving, saveSession, deleteSession } = rawData;
  const { polls, deletingPollId, updatePollCard, deletePoll } = useSessionPolls(campaignId);

  const campaignNames = useMemo(() => new Map(campaigns.map((item) => [item.id, item.name])), [campaigns]);
  const sessions = useMemo(() => withCampaignName(rawData.sessions, showAll, campaignNames), [rawData.sessions, showAll, campaignNames]);
  const upcoming = useMemo(() => withCampaignName(rawData.upcoming, showAll, campaignNames), [rawData.upcoming, showAll, campaignNames]);
  const selectedCampaignName = campaignNames.get(campaignId) || "";

  useEffect(() => {
    if (!campaignId) setSelectedDate("");
  }, [campaignId]);

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

  const openEdit = (session) => {
    setForm({
      id: session.id,
      campaign_id: session.campaign_id || campaignId,
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

  const save = () => {
    if (!form.title.trim() || !form.date || !sessionCampaignId) return;
    if (sessionCampaignId === NEW_CAMPAIGN && !form.new_campaign_name?.trim()) return;
    const values = form;
    const campaignName = sessionCampaignId === NEW_CAMPAIGN ? form.new_campaign_name.trim() : campaignNames.get(sessionCampaignId) || "";
    setDialogOpen(false);
    saveSession(values, { campaignName });
  };

  const removeSession = () => {
    const pending = pendingDelete;
    setPendingDelete(null);
    if (pending) deleteSession(pending);
  };

  const confirmPollDelete = () => {
    const poll = pendingPollDelete;
    setPendingPollDelete(null);
    if (poll) deletePoll(poll);
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 px-4 py-6 md:px-8 md:py-8 overflow-x-hidden">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="tag border border-primary/40 text-primary">Agenda du MJ</span>
          <h1 data-tutorial="calendar-title" className="mt-3 font-display text-3xl font-bold text-foreground">Sessions de jeu</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Planifiez vos prochaines parties par date, gardez une trace de celles déjà jouées et
            préparez la scène de chaque séance.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <CampaignSelect
            campaigns={campaigns}
            value={campaignId}
            onValueChange={(id) => {
              selectCampaign(id);
              setSelectedDate("");
            }}
          />
          {campaigns.length > 1 && (
            <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-sm text-foreground">
              <Switch checked={showAll} onCheckedChange={(value) => { setShowAll(value); setSelectedDate(""); }} aria-label="Afficher toutes les campagnes" />
              Toutes les campagnes
            </label>
          )}
          <Button data-tutorial="calendar-poll" variant="outline" onClick={() => setPollDialogOpen(true)} disabled={!campaignId}>
            Sondage des joueurs
          </Button>
          <PrintButton campaignId={campaignId} preset="sessions" />
          <Button data-tutorial="calendar-new" onClick={() => openNew()} disabled={!campaignId}>
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
              <span data-tutorial="calendar-month" className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {loading
                  ? "Chargement…"
                  : `${sessions.length} session${sessions.length > 1 ? "s" : ""} ce mois${showAll ? " (toutes campagnes)" : ""}`}
              </span>
            </div>

            {showAll && selectedCampaignName && (
              <p className="text-xs text-muted-foreground">
                Les nouvelles sessions sont créées dans la campagne « {selectedCampaignName} ». Une session existante reste dans sa campagne.
              </p>
            )}

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
            <div data-tutorial="calendar-upcoming">
              <UpcomingSessions sessions={upcoming} onOpen={openEdit} onAdd={() => openNew()} />
            </div>

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
                            {session.campaign_name && (
                              <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-primary">{session.campaign_name}</span>
                            )}
                          </span>
                          <span className={cn("tag shrink-0 border", meta.badge)}>{meta.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <section data-tutorial="calendar-polls" className="rounded-xl border border-border bg-card/50 p-4">
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
                            onClick={() => setPendingPollDelete(poll)}
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
        campaignName={form.id && campaigns.length > 1 ? campaignNames.get(sessionCampaignId) || "" : ""}
        campaigns={campaigns}
        activeCampaignId={campaignId}
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

      <AlertDialog open={!!pendingPollDelete} onOpenChange={(open) => !open && setPendingPollDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le sondage ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le sondage « {pendingPollDelete?.title} » et toutes ses réponses seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPollDelete}
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
