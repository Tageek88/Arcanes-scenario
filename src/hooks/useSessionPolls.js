import { useEffect, useState } from "react";
import { api } from "@/api/localClient";
import { useToast } from "@/components/ui/use-toast";
import { useDataRefresh } from "@/lib/context/RefreshContext";
import { getPollServiceUrl, refreshSessionPoll } from "@/lib/services/sessionPolls";
import { removeSessionPoll } from "@/lib/services/polls/remote";

/**
 * Sondages de date ouverts d'une campagne.
 * - à l'ouverture / au changement de campagne : relecture locale puis actualisation réseau
 * - à chaque changement de données : relecture locale uniquement (sans réseau)
 */
export function useSessionPolls(campaignId) {
  const { toast } = useToast();
  const { refreshKey } = useDataRefresh();
  const [polls, setPolls] = useState([]);
  const [deletingPollId, setDeletingPollId] = useState("");

  useEffect(() => {
    if (!campaignId) {
      setPolls([]);
      return;
    }
    const serviceUrl = getPollServiceUrl();
    let alive = true;
    const refreshPolls = async () => {
      try {
        const { items } = await api.entities.SessionPoll.filter({ campaign_id: campaignId }, { limit: 100 });
        if (alive) setPolls(items.filter((poll) => poll.state === "open"));
        let failed = 0;
        for (const poll of items) {
          const pollUrl = poll.service_url || serviceUrl;
          if (!pollUrl) continue;
          try {
            const updated = await refreshSessionPoll(poll, pollUrl);
            if (alive) {
              setPolls((current) => updated.state === "open"
                ? [updated, ...current.filter((item) => item.id !== updated.id)]
                : current.filter((item) => item.id !== updated.id));
            }
          } catch (error) {
            failed += 1;
            console.error(`Actualisation du sondage « ${poll.title} » impossible :`, error);
          }
        }
        if (alive && failed > 0) {
          toast({
            variant: "destructive",
            title: "Certains sondages n'ont pas été actualisés",
            description: "Le calendrier local reste disponible. Vérifiez la connexion et actualisez les sondages plus tard.",
          });
        }
      } catch (error) {
        console.error("Synchronisation des sondages impossible :", error);
        if (alive) {
          toast({
            variant: "destructive",
            title: "Synchronisation des sondages impossible",
            description: "Le calendrier local reste disponible.",
          });
        }
      }
    };
    refreshPolls();
    return () => {
      alive = false;
    };
  }, [campaignId, toast]);

  // Relecture locale (sans appel réseau) à chaque changement de données.
  useEffect(() => {
    if (!campaignId) return;
    let alive = true;
    api.entities.SessionPoll.filter({ campaign_id: campaignId }, { limit: 100 })
      .then(({ items }) => {
        if (alive) setPolls(items.filter((poll) => poll.state === "open"));
      })
      .catch((error) => console.error("Rechargement des sondages impossible :", error));
    return () => {
      alive = false;
    };
  }, [campaignId, refreshKey]);

  const updatePollCard = (poll, removedId) => {
    if (!poll || poll.state !== "open") {
      setPolls((current) => current.filter((item) => item.id !== (poll?.id || removedId)));
      return;
    }
    setPolls((current) => [poll, ...current.filter((item) => item.id !== poll.id)]);
  };

  /** Supprime le sondage (service distant puis référence locale). La confirmation est demandée par la page. */
  const deletePoll = async (poll) => {
    setDeletingPollId(poll.id);
    try {
      const { remoteMissing } = await removeSessionPoll(poll);
      setPolls((current) => current.filter((item) => item.id !== poll.id));
      toast(remoteMissing
        ? { title: "Référence locale supprimée", description: "Le sondage distant a déjà expiré ou été supprimé." }
        : { title: "Sondage supprimé" });
    } catch (error) {
      console.error("Suppression du sondage impossible :", error);
      toast({ variant: "destructive", title: "Suppression impossible", description: error.message });
    } finally {
      setDeletingPollId("");
    }
  };

  return { polls, deletingPollId, updatePollCard, deletePoll };
}