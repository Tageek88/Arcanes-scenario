import { useEffect, useState } from "react";
import { api } from "@/api/localClient";
import { useToast } from "@/components/ui/use-toast";

// La recherche est un texte libre : on neutralise les caractères spéciaux d'expression régulière.
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Éléments du codex affichés dans la barre latérale (PNJ, lieux ou indices),
 * filtrés par recherche et, si demandé, limités à ceux liés à la scène.
 * `setItems` sert aux mises à jour optimistes (cases des indices).
 * @param {string} campaignId
 * @param {string} entity nom de l'entité (NPC, Location, Clue)
 * @param {{ term: string, linkedOnly: boolean, linkedIds: string[], refreshKey: number, limit?: number }} options (limit : 100 par défaut)
 */
export function useCodexList(campaignId, entity, { term, linkedOnly, linkedIds, refreshKey, limit = 100 }) {
  const { toast } = useToast();
  const [items, setItems] = useState(/** @type {any[]} */ ([]));
  const [loading, setLoading] = useState(false);
  const linkedKey = linkedIds.join(",");

  useEffect(() => {
    if (!campaignId) {
      setItems([]);
      return;
    }
    let alive = true;
    const ids = linkedKey ? linkedKey.split(",") : [];
    const run = async () => {
      setLoading(true);
      const query = { campaign_id: campaignId };
      const q = term.trim();
      if (q) query.name = { $regex: escapeRegex(q), $options: "i" };
      if (linkedOnly) {
        if (ids.length === 0) {
          if (alive) {
            setItems([]);
            setLoading(false);
          }
          return;
        }
        query.id = { $in: ids };
      }
      try {
        const res = await api.entities[entity].filter(query, { sort: "name", limit });
        if (alive) setItems(res.items);
      } catch (error) {
        console.error("Chargement du codex impossible :", error);
        if (alive) toast({ variant: "destructive", title: "Codex indisponible", description: "Impossible de charger cette liste." });
      } finally {
        if (alive) setLoading(false);
      }
    };
    const timer = setTimeout(run, term.trim() ? 250 : 0);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [campaignId, entity, term, linkedOnly, refreshKey, linkedKey, limit, toast]);

  return { items, setItems, loading };
}
