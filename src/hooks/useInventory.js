import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useDataRefresh } from "@/lib/context/RefreshContext";
import { catalogFromInventories } from "@/lib/meta/inventory";
import {
  addInventoryItem, loadOwners, removeInventoryItem, setInventoryQuantity, transferInventoryItem,
} from "@/lib/services/inventory";

/**
 * Inventaires d'une campagne : propriétaires (personnages et PNJ) avec leurs objets, et les actions qui les modifient.
 * Les écrans se rechargent seuls après chaque écriture (signal de la couche de données).
 * @param {string} campaignId
 * @param {{ enabled?: boolean }} [options] `enabled: false` évite de charger tant que l'écran n'est pas affiché
 */
export function useInventory(campaignId, { enabled = true } = {}) {
  const { toast } = useToast();
  const { refreshKey } = useDataRefresh();
  const [owners, setOwners] = useState(/** @type {any[]} */ ([]));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!campaignId || !enabled) {
      setOwners([]);
      return undefined;
    }
    let alive = true;
    setLoading(true);
    loadOwners(campaignId)
      .then((rows) => { if (alive) setOwners(rows); })
      .catch((error) => {
        console.error("Chargement des inventaires impossible :", error);
        if (alive) toast({ variant: "destructive", title: "Inventaires indisponibles", description: "Impossible de charger les inventaires de cette campagne." });
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [campaignId, enabled, refreshKey, toast]);

  const run = useCallback(async (task, failure) => {
    try {
      await task();
      return true;
    } catch (error) {
      console.error(`${failure.log} :`, error);
      toast({ variant: "destructive", title: failure.title, description: failure.description });
      return false;
    }
  }, [toast]);

  const addItem = useCallback(async (owner, item) => {
    const ok = await run(() => addInventoryItem(owner, item), {
      log: "Ajout à l'inventaire impossible", title: "Objet non ajouté", description: "L'objet n'a pas été ajouté à l'inventaire.",
    });
    if (ok) toast({ title: "Objet ajouté", description: `« ${item.name} » est dans l'inventaire.` });
    return ok;
  }, [run, toast]);

  const setQuantity = useCallback((owner, itemId, quantity) => run(() => setInventoryQuantity(owner, itemId, quantity), {
    log: "Changement de quantité impossible", title: "Quantité non enregistrée", description: "La quantité n'a pas été modifiée.",
  }), [run]);

  const removeItem = useCallback(async (owner, itemId) => {
    const ok = await run(() => removeInventoryItem(owner, itemId), {
      log: "Suppression de l'objet impossible", title: "Suppression impossible", description: "L'objet n'a pas été retiré de l'inventaire.",
    });
    if (ok) toast({ title: "Objet retiré" });
    return ok;
  }, [run, toast]);

  const giveItem = useCallback(async (from, to, item, quantity) => {
    try {
      const { given, name } = await transferInventoryItem(from, to, item.id, quantity);
      toast({ title: "Objet donné", description: `${given > 1 ? `${given} × ` : ""}« ${name} » → ${to.name || "nouveau propriétaire"}.` });
      return true;
    } catch (error) {
      console.error("Don de l'objet impossible :", error);
      toast({ variant: "destructive", title: "Objet non donné", description: "L'objet n'a pas changé de propriétaire." });
      return false;
    }
  }, [toast]);

  return { owners, loading, addItem, setQuantity, removeItem, giveItem };
}

/**
 * Objets déjà utilisés dans les inventaires de la campagne, proposés à la saisie d'un nouvel objet.
 * (L'équipement du catalogue n'y figure pas : c'est une autre liste.)
 * @param {string} campaignId
 * @returns {{ name: string, fieldNames: string[] }[]}
 */
export function useInventoryCatalog(campaignId) {
  const { owners } = useInventory(campaignId);
  return useMemo(() => catalogFromInventories(owners.map((owner) => owner.inventory)), [owners]);
}
