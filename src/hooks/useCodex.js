import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/api/localClient";
import { withDataBatch } from "@/lib/context/dataEvents";
import { useToast } from "@/components/ui/use-toast";
import { useDataRefresh } from "@/lib/context/RefreshContext";
import { CODEX_TABS, KIND_META } from "@/lib/meta/codex";
import { deleteLocation } from "@/lib/services/locationTree";
import { deleteNpcRelations, loadRelations } from "@/lib/services/npcRelations";

/**
 * Données du codex pour un onglet (PNJ, lieux, indices...) d'une campagne :
 * éléments de l'onglet, tous les lieux (pour la hiérarchie), relations entre PNJ.
 * `refresh()` force un rechargement (après une création, une modification...).
 * @param {string} campaignId
 * @param {string} tab clé de l'onglet actif
 */
export function useCodex(campaignId, tab) {
  const { toast } = useToast();
  const { refreshKey: dataRefreshKey } = useDataRefresh();
  const [items, setItems] = useState([]);
  const [allLocations, setAllLocations] = useState([]);
  const [relations, setRelations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const loadedFor = useRef("");

  const kind = CODEX_TABS.find((t) => t.key === tab) || CODEX_TABS[0];

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!campaignId) {
      setItems([]);
      setLoading(false);
      return;
    }
    let alive = true;
    const contextKey = `${campaignId}|${kind.entity}`;
    const initial = loadedFor.current !== contextKey;
    const run = async () => {
      if (initial) {
        setLoading(true);
        setItems([]);
      }
      try {
        const res = await api.entities[kind.entity].filter(
          { campaign_id: campaignId },
          { sort: "name", limit: 1000 }
        );
        if (alive) {
          setItems(res.items);
          loadedFor.current = contextKey;
        }
      } catch (error) {
        console.error("Chargement du codex impossible :", error);
        if (alive) toast({ variant: "destructive", title: "Codex indisponible", description: "Impossible de charger les éléments de cette campagne." });
      } finally {
        if (alive && initial) setLoading(false);
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, [campaignId, kind.entity, refreshKey, dataRefreshKey, toast]);

  useEffect(() => {
    if (!campaignId) {
      setAllLocations([]);
      return;
    }
    let alive = true;
    setAllLocations([]);
    api.entities.Location.filter({ campaign_id: campaignId }, { sort: "name", limit: 1000 })
      .then((res) => {
        if (alive) setAllLocations(res.items);
      })
      .catch((error) => {
        console.error("Chargement des lieux impossible :", error);
        if (alive) toast({ variant: "destructive", title: "Lieux indisponibles", description: "Impossible de charger la hiérarchie des lieux." });
      });
    return () => {
      alive = false;
    };
  }, [campaignId, refreshKey, dataRefreshKey, toast]);

  useEffect(() => {
    if (!campaignId || tab !== "npc") {
      setRelations([]);
      return;
    }
    let alive = true;
    setRelations([]);
    loadRelations(campaignId)
      .then((rows) => {
        if (alive) setRelations(rows);
      })
      .catch((error) => {
        console.error("Chargement des relations impossible :", error);
        if (alive) toast({ variant: "destructive", title: "Relations indisponibles", description: "Les relations entre PNJ n'ont pas pu être chargées." });
      });
    return () => {
      alive = false;
    };
  }, [campaignId, tab, refreshKey, dataRefreshKey, toast]);

  /**
   * @param {{ kind: string, entry: any }} pending élément à supprimer
   * @param {string} mode "promote" ou "cascade" (lieux uniquement)
   */
  const deleteEntry = async (pending, mode) => {
    try {
      await withDataBatch(async () => {
        if (pending.kind === "location") {
          await deleteLocation(pending.entry, items, mode);
        } else {
          if (pending.kind === "npc") await deleteNpcRelations(pending.entry.campaign_id, pending.entry.id);
          await api.entities[KIND_META[pending.kind].entity].delete(pending.entry.id);
        }
      });
      refresh();
      toast({ title: "Élément supprimé" });
    } catch (error) {
      console.error("Suppression impossible :", error);
      refresh();
      toast({
        variant: "destructive",
        title: "Suppression impossible",
        description: "Une erreur est survenue, la liste a été rechargée.",
      });
    }
  };

  return { items, allLocations, relations, loading, refresh, deleteEntry };
}