import { useEffect, useMemo, useState } from "react";
import { api } from "@/api/localClient";
import { useToast } from "@/components/ui/use-toast";
import { useDataRefresh } from "@/lib/context/RefreshContext";
import { useQuests } from "@/hooks/useQuests";

/**
 * Scènes d'une campagne, triées par ordre. Rechargées à chaque changement de données.
 * Chaque scène porte `in_quest` (elle appartient à la quête active de la campagne) et, quand la campagne
 * a plusieurs quêtes, `quest_title`. Une scène sans quête (anciennes données) compte pour la première.
 */
export function useScenes(campaignId) {
  const { toast } = useToast();
  const { refreshKey } = useDataRefresh();
  const { quests, quest } = useQuests(campaignId);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!campaignId) {
      setRows([]);
      return;
    }
    let alive = true;
    setRows([]);
    api.entities.Scene
      .filter({ campaign_id: campaignId }, { sort: "order", limit: 300 })
      .then((res) => {
        if (alive) setRows(res.items);
      })
      .catch((error) => {
        console.error("Chargement des scènes impossible :", error);
        if (alive) toast({ variant: "destructive", title: "Scènes indisponibles", description: "Impossible de charger les scènes de cette campagne." });
      });
    return () => {
      alive = false;
    };
  }, [campaignId, refreshKey, toast]);

  return useMemo(() => {
    if (quests.length === 0) return rows.map((scene) => ({ ...scene, in_quest: true }));
    const titles = new Map(quests.map((q) => [q.id, q.title]));
    return rows.map((scene) => {
      const questId = scene.quest_id || quests[0].id;
      return {
        ...scene,
        in_quest: questId === quest?.id,
        quest_title: quests.length > 1 ? titles.get(questId) || "" : "",
      };
    });
  }, [rows, quests, quest]);
}
