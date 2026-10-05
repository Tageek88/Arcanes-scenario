import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/api/localClient";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { addMonths, format, parseISO, startOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
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
  const { refreshKey: dataRefreshKey } = useDataRefresh();
  const [campaigns, setCampaigns] = useState([]);
  const [campaignId, setCampaignId] = useState(getSelectedCampaignId());
  const [scenes, setScenes] = useState([]);
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [sessions, setSessions] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const monthKey = format(month, "yyyy-MM");

  useEffect(() => {
    const run = async () => {
      const res = await api.entities.Campaign.filter({}, { sort: "-created_date", limit: 100 });
      setCampaigns(res.items);
      const stored = getSelectedCampaignId();
      const valid = res.items.some((c) => c.id === stored) ? stored : res.items[0]?.id || "";
      setCampaignId(valid);
      setSelectedCampaignId(valid);
    };
    run();
  }, [dataRefreshKey]);

  useEffect(() => {
    if (!campaignId) {
      setScenes([]);
      return;
    }
    let alive = true;
    api.entities.Scene
      .filter({ campaign_id: campaignId }, { sort: "order", limit: 300 })
      .then((res) => {
        if (alive) setScenes(res.items);
      });
    return () => {
      alive = false;
    };
  }, [campaignId, dataRefreshKey]);

  useEffect(() => {
    if (!campaignId) {
      setSessions([]);
      setUpcoming([]);
      return;
    }
    let alive = true;
    const run = async () => {
      setLoading(true);
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
      setLoading(false);
    };
    run();
    return () => {
      alive = false;
    };
  }, [campaignId, monthKey, month, dataRefreshKey]);

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
          {campaigns.length > 0 && (
            <Select
              value={campaignId}
              onValueChange={(id) => {
                setCampaignId(id);
                setSelectedCampaignId(id);
              }}
            >
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Campagne" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <PrintButton campaignId={campaignId} preset="scenes" />
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
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setMonth((m) => subMonths(m, 1))}
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
                  onClick={() => setMonth((m) => addMonths(m, 1))}
                  aria-label="Mois suivant"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setMonth(startOfMonth(new Date()))}>
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
              onSelectDay={openNew}
              onSelectSession={openEdit}
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