import { useCallback, useEffect, useState } from "react";
import { api } from "@/api/localClient";
import { useToast } from "@/components/ui/use-toast";
import { useDataRefresh } from "@/lib/context/RefreshContext";
import { getSelectedCampaignId, setSelectedCampaignId } from "@/lib/context/campaignStore";

/**
 * Liste des campagnes et campagne sélectionnée (mémorisée entre les pages).
 * `setCampaigns` et `setCampaignId` sont exposés pour la page Home, qui crée,
 * modifie et supprime des campagnes ; les autres pages peuvent les ignorer.
 */
export function useCampaigns() {
  const { toast } = useToast();
  const { refreshKey } = useDataRefresh();
  const [campaigns, setCampaigns] = useState(/** @type {any[]} */ ([]));
  const [campaignId, setCampaignId] = useState(getSelectedCampaignId());

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
  }, [refreshKey, toast]);

  const selectCampaign = useCallback((id) => {
    setCampaignId(id);
    setSelectedCampaignId(id);
  }, []);

  return { campaigns, campaignId, selectCampaign, setCampaigns, setCampaignId };
}