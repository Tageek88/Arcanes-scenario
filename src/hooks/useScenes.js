import { useEffect, useState } from "react";
import { api } from "@/api/localClient";
import { useToast } from "@/components/ui/use-toast";
import { useDataRefresh } from "@/lib/context/RefreshContext";

/** Scènes d'une campagne, triées par ordre. Rechargées à chaque changement de données. */
export function useScenes(campaignId) {
  const { toast } = useToast();
  const { refreshKey } = useDataRefresh();
  const [scenes, setScenes] = useState([]);

  useEffect(() => {
    if (!campaignId) {
      setScenes([]);
      return;
    }
    let alive = true;
    setScenes([]);
    api.entities.Scene
      .filter({ campaign_id: campaignId }, { sort: "order", limit: 300 })
      .then((res) => {
        if (alive) setScenes(res.items);
      })
      .catch((error) => {
        console.error("Chargement des scènes impossible :", error);
        if (alive) toast({ variant: "destructive", title: "Scènes indisponibles", description: "Impossible de charger les scènes de cette campagne." });
      });
    return () => {
      alive = false;
    };
  }, [campaignId, refreshKey, toast]);

  return scenes;
}
