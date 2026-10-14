import { useCallback, useEffect, useState } from "react";
import { api } from "@/api/localClient";
import { useToast } from "@/components/ui/use-toast";
import { loadRelations } from "@/lib/services/npcRelations";

/**
 * PNJ d'une campagne et relations entre eux.
 * `reload` relit les deux listes (à appeler après chaque écriture de relation).
 * @param {string} campaignId
 */
export function useNpcRelations(campaignId) {
  const { toast } = useToast();
  const [npcs, setNpcs] = useState(/** @type {any[]} */ ([]));
  const [relations, setRelations] = useState(/** @type {any[]} */ ([]));

  const reload = useCallback(async () => {
    if (!campaignId) {
      setNpcs([]);
      setRelations([]);
      return;
    }
    try {
      const [n, r] = await Promise.all([
        api.entities.NPC.filter({ campaign_id: campaignId }, { sort: "name", limit: 1000 }),
        loadRelations(campaignId),
      ]);
      setNpcs(n.items);
      setRelations(r);
    } catch (error) {
      console.error("Chargement des relations impossible :", error);
      toast({ variant: "destructive", title: "Relations indisponibles", description: "Impossible de charger les PNJ et leurs relations." });
    }
  }, [campaignId, toast]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { npcs, relations, reload };
}
