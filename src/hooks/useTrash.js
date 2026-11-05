import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useDataRefresh } from "@/lib/context/RefreshContext";
import { deleteTrashEntry, emptyTrash, listTrash, MissingCampaignError, purgeExpiredTrash, restoreTrash } from "@/lib/services/trash";

/**
 * Contenu de la corbeille (Paramètres › Corbeille) : liste, restauration, suppression définitive, vidage.
 * Les entrées de plus de 30 jours sont supprimées à l'ouverture.
 */
export function useTrash() {
  const { toast } = useToast();
  const { refreshKey } = useDataRefresh();
  const [entries, setEntries] = useState(/** @type {any[]} */ ([]));
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    purgeExpiredTrash()
      .then(listTrash)
      .then((list) => {
        if (alive) setEntries(list);
      })
      .catch((error) => {
        console.error("Chargement de la corbeille impossible :", error);
        if (alive) toast({ variant: "destructive", title: "Corbeille indisponible", description: "Impossible de lire la corbeille." });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [refreshKey, reload, toast]);

  const run = useCallback(
    async (id, task, success) => {
      setBusyId(id);
      try {
        await task();
        toast({ title: success });
      } catch (error) {
        console.error("Action sur la corbeille impossible :", error);
        toast({
          variant: "destructive",
          title: error instanceof MissingCampaignError ? "Restauration impossible" : "Action impossible",
          description:
            error instanceof MissingCampaignError
              ? "La campagne de cet élément est supprimée : restaurez d'abord la campagne."
              : "Une erreur est survenue, rien n'a été modifié.",
        });
      } finally {
        setBusyId("");
        setReload((n) => n + 1);
      }
    },
    [toast]
  );

  const restore = useCallback((entry) => run(entry.id, () => restoreTrash(entry.id), "Élément restauré"), [run]);
  const remove = useCallback((entry) => run(entry.id, () => deleteTrashEntry(entry.id), "Supprimé définitivement"), [run]);
  const empty = useCallback(() => run("all", emptyTrash, "Corbeille vidée"), [run]);

  return { entries, loading, busyId, restore, remove, empty };
}
