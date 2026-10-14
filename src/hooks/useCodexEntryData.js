import { useEffect, useState } from "react";
import { api } from "@/api/localClient";
import { useToast } from "@/components/ui/use-toast";

/**
 * Données dont la fenêtre de fiche du Codex a besoin à l'ouverture :
 * - `universeId` : type d'univers de la campagne (pour la génération de noms) ;
 * - `allLocations` : les lieux fournis par la page, sinon chargés ici (PNJ, lieux, indices).
 * @param {{ open: boolean, kind: string, campaignId: string, locations?: any[] }} options
 */
export function useCodexEntryData({ open, kind, campaignId, locations }) {
  const { toast } = useToast();
  const [universeId, setUniverseId] = useState("");
  const [fetchedLocations, setFetchedLocations] = useState(/** @type {any[]} */ ([]));

  useEffect(() => {
    if (!open || !campaignId) return;
    let cancelled = false;
    api.entities.Campaign.get(campaignId)
      .then((c) => { if (!cancelled) setUniverseId(c?.universe_type || ""); })
      .catch(() => { if (!cancelled) setUniverseId(""); });
    return () => { cancelled = true; };
  }, [open, campaignId]);

  useEffect(() => {
    if (locations || !open || (kind !== "location" && kind !== "npc" && kind !== "clue") || !campaignId) return;
    let alive = true;
    api.entities.Location.filter({ campaign_id: campaignId }, { sort: "name", limit: 1000 })
      .then((res) => {
        if (alive) setFetchedLocations(res.items);
      })
      .catch((error) => {
        console.error("Chargement des lieux impossible :", error);
        if (alive) toast({ variant: "destructive", title: "Lieux indisponibles", description: "La liste des lieux n'a pas pu être chargée." });
      });
    return () => {
      alive = false;
    };
  }, [locations, open, kind, campaignId, toast]);

  return { universeId, allLocations: locations ?? fetchedLocations };
}
