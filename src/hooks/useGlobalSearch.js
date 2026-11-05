import { useEffect, useState } from "react";
import { api } from "@/api/localClient";
import { useToast } from "@/components/ui/use-toast";
import { getSelectedCampaignId } from "@/lib/context/campaignStore";

const EMPTY = { scenes: [], acts: [], npcs: [], locations: [], clues: [], notes: [], tables: [], sessions: [] };
const LIMIT = 1000;

/**
 * Contenu de la campagne sélectionnée, chargé à chaque ouverture de la recherche
 * (les données peuvent avoir changé depuis la dernière fois).
 * @param {boolean} open la fenêtre de recherche est ouverte
 */
export function useGlobalSearch(open) {
  const { toast } = useToast();
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [hasCampaign, setHasCampaign] = useState(true);

  useEffect(() => {
    if (!open) return undefined;
    const campaignId = getSelectedCampaignId();
    setHasCampaign(!!campaignId);
    if (!campaignId) {
      setData(EMPTY);
      return undefined;
    }
    let alive = true;
    setLoading(true);
    const load = (entity) => api.entities[entity].filter({ campaign_id: campaignId }, { limit: LIMIT }).then((res) => res.items);
    Promise.all(["Scene", "Act", "NPC", "Location", "Clue", "Note", "RollTable", "GameSession"].map(load))
      .then(([scenes, acts, npcs, locations, clues, notes, tables, sessions]) => {
        if (alive) setData({ scenes, acts, npcs, locations, clues, notes, tables, sessions });
      })
      .catch((error) => {
        console.error("Chargement de la recherche impossible :", error);
        if (alive) toast({ variant: "destructive", title: "Recherche indisponible", description: "Impossible de charger le contenu de la campagne." });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, toast]);

  return { data, loading, hasCampaign };
}
