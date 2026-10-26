import { useEffect, useRef, useState } from "react";
import { addMonths, format, startOfMonth } from "date-fns";
import { api } from "@/api/localClient";
import { useToast } from "@/components/ui/use-toast";
import { useDataRefresh } from "@/lib/context/RefreshContext";
import { withDataBatch } from "@/lib/context/dataEvents";
import { NEW_CAMPAIGN } from "@/lib/meta/sessionCampaign";
import { dispatchTutorialAction } from "@/utils/tutorialStorage";

/**
 * Sessions de jeu d'une campagne : celles du mois affiché et les 6 prochaines.
 * Avec `allCampaigns`, celles de toutes les campagnes (chaque session garde son `campaign_id`).
 * @param {string} campaignId campagne sélectionnée (celle des nouvelles sessions)
 * @param {Date} month premier jour du mois affiché
 * @param {{ allCampaigns?: boolean }} [options]
 */
export function useGameSessions(campaignId, month, { allCampaigns = false } = {}) {
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
    const contextKey = `${allCampaigns ? "*" : campaignId}|${monthKey}`;
    const scope = allCampaigns ? {} : { campaign_id: campaignId };
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
            { ...scope, date: { $gte: start, $lt: nextMonth } },
            { sort: "date", limit: 300 }
          ),
          api.entities.GameSession.filter(
            { ...scope, date: { $gte: today } },
            { sort: "date", limit: 6 }
          ),
        ]);
        if (!alive) return;
        setSessions(monthRes.items);
        setUpcoming(upcomingRes.items);
        loadedFor.current = contextKey;
      } catch (error) {
        console.error("Chargement des sessions impossible :", error);
        if (alive) toast({ variant: "destructive", title: "Sessions indisponibles", description: "Impossible de charger le calendrier." });
      } finally {
        if (alive && initial) setLoading(false);
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, [campaignId, allCampaigns, monthKey, month, refreshKey, toast]);

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

  /**
   * Enregistrement optimiste : la liste est mise à jour tout de suite, puis rétablie en cas d'échec.
   * Une nouvelle session peut viser une autre campagne que celle affichée, ou une campagne à créer
   * (`campaign_id` = NEW_CAMPAIGN et `new_campaign_name` : la campagne est créée vierge, avec la session).
   * @param {Record<string, any>} form
   * @param {{ campaignName?: string }} [options] nom de la campagne visée, pour le message de confirmation
   */
  const saveSession = async (form, { campaignName = "" } = {}) => {
    const targetId = form.campaign_id || campaignId;
    const newName = String(form.new_campaign_name || "").trim();
    if (targetId === NEW_CAMPAIGN && !newName) return;
    setSaving(true);
    const payload = {
      // Une session existante reste dans sa campagne, même quand on la modifie depuis une autre.
      campaign_id: targetId,
      title: form.title.trim(),
      date: form.date,
      time: form.time || "",
      location: form.location || "",
      status: form.status || "planifiee",
      notes: form.notes || "",
      scene_id: form.scene_id || "",
    };
    // La liste affichée ne change que si la session y a sa place (vue complète, ou campagne affichée).
    const shown = allCampaigns || targetId === campaignId;
    const optimistic = { ...payload, id: form.id || `session-${Date.now()}` };
    const previous = { sessions, upcoming };
    if (shown) applySession(optimistic);
    let saved;
    let createdCampaign = null;
    try {
      await withDataBatch(async () => {
        if (targetId === NEW_CAMPAIGN) {
          createdCampaign = await api.entities.Campaign.create({ name: newName, system: "", summary: "", universe_type: "arcanes" });
          payload.campaign_id = createdCampaign.id;
        }
        saved = form.id
          ? await api.entities.GameSession.update(form.id, payload)
          : await api.entities.GameSession.create(payload);
      });
      if (shown && saved?.id) applySession(saved, optimistic.id);
      if (!form.id) dispatchTutorialAction("session-created");
      const where = createdCampaign ? newName : campaignName;
      toast(
        createdCampaign
          ? { title: "Session planifiée", description: `Campagne « ${newName} » créée, vierge, avec cette session.` }
          : !shown && where
            ? { title: "Session planifiée", description: `Dans la campagne « ${where} » (affichez toutes les campagnes pour la voir ici).` }
            : { title: form.id ? "Session mise à jour" : "Session planifiée" }
      );
    } catch (error) {
      console.error("Enregistrement de la session impossible :", error);
      if (shown) {
        setSessions(previous.sessions);
        setUpcoming(previous.upcoming);
      }
      // Pas de campagne vide laissée derrière si la session n'a pas pu être enregistrée.
      if (createdCampaign) await api.entities.Campaign.delete(createdCampaign.id).catch(() => {});
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
