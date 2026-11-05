import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useDataRefresh } from "@/lib/context/RefreshContext";
import { hasDemoCampaign, importDemoCampaign, removeDemoCampaign } from "@/lib/services/demoCampaign";

/** Campagne d'exemple des tutoriels : présence, ajout et suppression (Paramètres › Tutoriel). */
export default function useDemoCampaign() {
  const { toast } = useToast();
  const { refreshKey } = useDataRefresh();
  const [present, setPresent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    hasDemoCampaign()
      .then((value) => alive && setPresent(value))
      .catch((error) => console.error("Lecture de la campagne d'exemple impossible :", error));
    return () => {
      alive = false;
    };
  }, [refreshKey, reload]);

  const run = useCallback(
    async (task, success, failure) => {
      setBusy(true);
      try {
        await task();
        toast({ title: success });
      } catch (error) {
        console.error(failure, error);
        toast({ variant: "destructive", title: failure, description: "Une erreur est survenue, rien n'a été modifié." });
      } finally {
        setBusy(false);
        setReload((value) => value + 1);
      }
    },
    [toast]
  );

  const add = useCallback(() => run(importDemoCampaign, "Campagne d'exemple ajoutée", "Ajout impossible"), [run]);
  const remove = useCallback(() => run(removeDemoCampaign, "Campagne d'exemple supprimée", "Suppression impossible"), [run]);

  return { present, busy, add, remove };
}
