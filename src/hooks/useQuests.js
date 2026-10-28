import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useDataRefresh } from "@/lib/context/RefreshContext";
import { getSelectedQuestId, setSelectedQuestId, subscribeQuestSelection } from "@/lib/context/questStore";
import { loadQuests } from "@/lib/services/quests";

/**
 * Quêtes d'une campagne et quête sélectionnée (mémorisée par campagne, partagée entre les pages).
 * `quest` est la quête retenue : la mémorisée si elle existe encore, sinon la première.
 * `storedQuestId` est le choix brut, utile à la page Home qui gère elle-même la création de quêtes.
 */
export function useQuests(campaignId) {
  const { toast } = useToast();
  const { refreshKey } = useDataRefresh();
  const [quests, setQuests] = useState(/** @type {any[]} */ ([]));
  const [stored, setStored] = useState(() => getSelectedQuestId(campaignId));

  useEffect(() => {
    setStored(getSelectedQuestId(campaignId));
    return subscribeQuestSelection((changedCampaignId) => {
      if (changedCampaignId === campaignId) setStored(getSelectedQuestId(campaignId));
    });
  }, [campaignId]);

  useEffect(() => {
    if (!campaignId) {
      setQuests([]);
      return undefined;
    }
    let alive = true;
    loadQuests(campaignId)
      .then((items) => {
        if (alive) setQuests(items);
      })
      .catch((error) => {
        console.error("Chargement des quêtes impossible :", error);
        if (alive) toast({ variant: "destructive", title: "Quêtes indisponibles", description: "Impossible de charger les quêtes de cette campagne." });
      });
    return () => {
      alive = false;
    };
  }, [campaignId, refreshKey, toast]);

  const quest = useMemo(() => quests.find((q) => q.id === stored) || quests[0] || null, [quests, stored]);
  const selectQuest = useCallback((id) => setSelectedQuestId(campaignId, id), [campaignId]);

  return { quests, quest, questId: quest?.id || "", storedQuestId: stored, selectQuest };
}
