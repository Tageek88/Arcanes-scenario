import { useEffect, useRef, useState } from "react";
import { addMonths, format, startOfMonth } from "date-fns";
import { api } from "@/api/localClient";
import { useToast } from "@/components/ui/use-toast";
import { useDataRefresh } from "@/lib/context/RefreshContext";
import { dispatchTutorialAction } from "@/utils/tutorialStorage";

/**
 * Sessions de jeu d'une campagne : celles du mois affiché et les 6 prochaines.
 * @param {string} campaignId
 * @param {Date} month premier jour du mois affiché
 */
export function useGameSessions(campaignId, month) {
  const { toast } = useToast();
  const { refreshKey } = useDataRefresh();
  const [sessions, setSessions] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const loadedFor = useRef("");

  const monthKey = format(month, "yyyy-MM");

  useEffect(() => {
    if (!campaignId) {
      setSessions([]);
      setUpcoming([]);
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
  }, [campaignId, monthKey, month, refreshKey, toast]);

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

  /** Enregistrement optimiste : la liste est mise à jour tout de suite, puis rétablie en cas d'échec. */
  const saveSession = async (form) => {
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
    try {
      const saved = form.id
        ? await api.entities.GameSession.update(form.id, payload)
        : await api.entities.GameSession.create(payload);
      if (saved?.id) applySession(saved, optimistic.id);
      if (!form.id) dispatchTutorialAction("session-created");
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

  const deleteSession = async (session) => {
    const previous = { sessions, upcoming };
    setSessions((list) => list.filter((s) => s.id !== session.id));
    setUpcoming((list) => list.filter((s) => s.id !== session.id));
    try {
      await api.entities.GameSession.delete(session.id);
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

  return { sessions, upcoming, loading, saving, saveSession, deleteSession };
}
