import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/api/localClient";
import { useToast } from "@/components/ui/use-toast";
import { useDataRefresh } from "@/lib/context/RefreshContext";
import { journalEntries } from "@/lib/meta/sessionJournal";
import { listCampaignSessions, saveSessionJournal } from "@/lib/services/sessionJournal";

/**
 * Séances d'une campagne et leur compte rendu (journal de séance).
 * `all` : toutes les séances ; `entries` : celles qui sont jouées ou ont un compte rendu, les plus récentes d'abord.
 * `names` : PNJ et indices de la campagne (pour choisir ceux de la séance), chargés seulement si `withRefs`.
 */
export function useSessionJournals(campaignId, { withRefs = false } = {}) {
  const { toast } = useToast();
  const { refreshKey } = useDataRefresh();
  const [all, setAll] = useState(/** @type {any[]} */ ([]));
  const [npcs, setNpcs] = useState(/** @type {any[]} */ ([]));
  const [clues, setClues] = useState(/** @type {any[]} */ ([]));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!campaignId) {
      setAll([]);
      return undefined;
    }
    let alive = true;
    setLoading(true);
    listCampaignSessions(campaignId)
      .then((list) => {
        if (alive) setAll(list);
      })
      .catch((error) => {
        console.error("Chargement du journal impossible :", error);
        if (alive) toast({ variant: "destructive", title: "Journal indisponible", description: "Impossible de charger les séances." });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [campaignId, refreshKey, toast]);

  useEffect(() => {
    if (!campaignId || !withRefs) return undefined;
    let alive = true;
    const load = (entity) => api.entities[entity].filter({ campaign_id: campaignId }, { sort: "name", limit: 1000 }).then((res) => res.items);
    Promise.all([load("NPC"), load("Clue")])
      .then(([npcList, clueList]) => {
        if (!alive) return;
        setNpcs(npcList);
        setClues(clueList);
      })
      .catch((error) => console.error("Chargement des PNJ et indices impossible :", error));
    return () => {
      alive = false;
    };
  }, [campaignId, withRefs, refreshKey]);

  const entries = useMemo(() => journalEntries(all), [all]);

  /** @returns {Promise<boolean>} true si le journal a été enregistré */
  const saveJournal = useCallback(
    async (session, journal, markPlayedIds = []) => {
      setSaving(true);
      try {
        await saveSessionJournal(session.id, journal, { markPlayedIds });
        toast({ title: "Journal enregistré" });
        return true;
      } catch (error) {
        console.error("Enregistrement du journal impossible :", error);
        toast({ variant: "destructive", title: "Enregistrement impossible", description: "Le journal n'a pas été enregistré." });
        return false;
      } finally {
        setSaving(false);
      }
    },
    [toast]
  );

  return { all, entries, npcs, clues, loading, saving, saveJournal };
}
