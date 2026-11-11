import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useDataRefresh } from "@/lib/context/RefreshContext";
import { loadEncounterSources } from "@/lib/services/encounters";

const EMPTY = { npcs: [], characters: [], characteristics: [] };

/**
 * PNJ, personnages et caractéristiques du modèle de fiche d'une campagne, pour ajouter des combattants depuis les fiches.
 * @param {string} campaignId
 * @param {{ enabled?: boolean }} [options] `enabled: false` évite de charger tant que la fenêtre n'est pas ouverte
 */
export function useEncounterSources(campaignId, { enabled = true } = {}) {
  const { toast } = useToast();
  const { refreshKey } = useDataRefresh();
  const [sources, setSources] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSources(EMPTY);
  }, [campaignId]);

  useEffect(() => {
    if (!campaignId || !enabled) return undefined;
    let alive = true;
    setLoading(true);
    loadEncounterSources(campaignId)
      .then((loaded) => {
        if (alive) setSources(loaded);
      })
      .catch((error) => {
        console.error("Chargement des fiches pour la rencontre impossible :", error);
        if (alive) toast({ variant: "destructive", title: "Fiches indisponibles", description: "Impossible de charger les PNJ et les personnages." });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [campaignId, enabled, refreshKey, toast]);

  return { ...sources, loading };
}
