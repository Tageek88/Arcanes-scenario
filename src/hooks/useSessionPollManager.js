import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { withDataBatch } from "@/lib/context/dataEvents";
import { formatPollDateInput } from "@/lib/services/polls/pollDates";
import {
  buildPollPayload,
  defaultExpiryInput,
  newSlot,
  parsePlayerNames,
  pollDateInput,
  validatePollForm,
} from "@/lib/services/polls/pollForm";
import { createLocalPoll, listCampaignPolls, updateLocalPoll } from "@/lib/services/polls/store";
import {
  closeRemotePoll,
  createRemotePoll,
  fetchPollDetails,
  pollServiceUrlOf,
  removeSessionPoll,
  updateRemotePoll,
} from "@/lib/services/polls/remote";
import {
  getPollServiceUrl,
  normalizePollServiceUrl,
  refreshSessionPoll,
  savePollServiceUrl,
} from "@/lib/services/sessionPolls";
import { dispatchTutorialAction } from "@/utils/tutorialStorage";

/**
 * État et actions de la fenêtre « Sondages des joueurs » :
 * formulaire (création / modification), liste des sondages de la campagne, actualisation, clôture, suppression.
 * La fenêtre ne s'occupe plus que de l'affichage.
 */
export function useSessionPollManager({ open, onOpenChange, campaignId, pollToEdit, onPollChange }) {
  const { toast } = useToast();
  const [serviceUrl, setServiceUrl] = useState(getPollServiceUrl);
  const [editingServiceUrl, setEditingServiceUrl] = useState(false);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [playerNames, setPlayerNames] = useState("");
  const [slots, setSlots] = useState([newSlot(), newSlot()]);
  const [expiresOn, setExpiresOn] = useState("");
  const [expiryManuallySet, setExpiryManuallySet] = useState(false);
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [polls, setPolls] = useState([]);
  const [busyPoll, setBusyPoll] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingPoll, setEditingPoll] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editLoadError, setEditLoadError] = useState("");
  const [pendingPollRemoval, setPendingPollRemoval] = useState(null);

  const parsedPlayers = useMemo(() => parsePlayerNames(playerNames), [playerNames]);

  const saveServiceUrl = () => {
    const normalized = normalizePollServiceUrl(serviceUrl);
    savePollServiceUrl(normalized);
    setServiceUrl(normalized);
    return normalized;
  };

  const resetForm = useCallback(() => {
    setTitle("");
    setComment("");
    setPlayerNames("");
    setSlots([newSlot(), newSlot()]);
    setExpiresOn("");
    setExpiryManuallySet(false);
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  }, []);

  const refreshPoll = async (poll) => {
    setBusyPoll(poll.id);
    try {
      const baseUrl = poll.service_url || saveServiceUrl();
      const updated = await refreshSessionPoll(poll, baseUrl);
      setPolls((current) => current.map((item) => item.id === poll.id ? updated : item));
      onPollChange?.(updated);
    } catch (error) {
      console.error("Actualisation du sondage impossible :", error);
      toast({ variant: "destructive", title: "Résultats indisponibles", description: error.message });
    } finally {
      setBusyPoll("");
    }
  };

  useEffect(() => {
    if (!open || !campaignId) return;
    let alive = true;
    listCampaignPolls(campaignId)
      .then(async (items) => {
        if (!alive) return;
        setPolls(items);
        const baseUrl = getPollServiceUrl();
        for (const poll of items) {
          const pollUrl = poll.service_url || baseUrl;
          if (!pollUrl) continue;
          try {
            const updated = await refreshSessionPoll(poll, pollUrl);
            if (alive) {
              setPolls((current) => current.map((item) => item.id === poll.id ? updated : item));
              onPollChange?.(updated);
            }
          } catch (error) {
            console.error(`Actualisation du sondage « ${poll.title} » impossible :`, error);
            if (alive) {
              setPolls((current) => current.map((item) =>
                item.id === poll.id ? { ...item, sync_error: error.message } : item
              ));
            }
          }
        }
      })
      .catch((error) => {
        console.error("Chargement des sondages locaux impossible :", error);
        toast({ variant: "destructive", title: "Sondages indisponibles", description: "Les sondages locaux n'ont pas pu être chargés." });
      });
    return () => {
      alive = false;
    };
  // onPollChange n'est pas stable : l'actualisation ne doit se relancer qu'à l'ouverture ou au changement de campagne.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, campaignId, toast]);

  useEffect(() => {
    if (!open || !pollToEdit) {
      if (!pollToEdit) {
        setEditingPoll(null);
        setEditLoadError("");
        setEditLoading(false);
        resetForm();
      }
      return;
    }
    let alive = true;
    setEditingPoll(pollToEdit);
    setEditLoading(true);
    setEditLoadError("");
    const baseUrl = pollServiceUrlOf(pollToEdit);
    fetchPollDetails(pollToEdit, baseUrl)
      .then((details) => {
        if (!alive) return;
        const expiryParts = Object.fromEntries(
          new Intl.DateTimeFormat("en-CA", {
            timeZone: details.timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).formatToParts(new Date(details.expiresAt)).map(({ type, value }) => [type, value])
        );
        setServiceUrl(baseUrl);
        setTitle(details.title);
        setComment(details.comment || "");
        setPlayerNames(details.players.join("\n"));
        setSlots(details.slots.map((slot) => ({
          date: pollDateInput(slot.date),
          time: slot.time,
        })));
        setTimezone(details.timezone);
        setExpiresOn(formatPollDateInput(`${expiryParts.day}/${expiryParts.month}/${expiryParts.year}`));
        setEditLoadError("");
      })
      .catch((error) => {
        console.error("Chargement du sondage à modifier impossible :", error);
        if (alive) {
          setEditLoadError(error.message || "Les données du sondage n'ont pas pu être chargées.");
          toast({ variant: "destructive", title: "Modification impossible", description: error.message });
        }
      })
      .finally(() => {
        if (alive) setEditLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, pollToEdit, resetForm, toast]);

  useEffect(() => {
    if (pollToEdit || editingPoll || expiryManuallySet) return;
    setExpiresOn(defaultExpiryInput(slots));
  }, [editingPoll, expiryManuallySet, pollToEdit, slots]);

  const savePoll = () => withDataBatch(savePollUnbatched);

  const savePollUnbatched = async () => {
    if (!campaignId) return;
    const problem = validatePollForm({ title, players: parsedPlayers, slots, expiresOn });
    if (problem) {
      toast({ variant: "destructive", ...problem });
      return;
    }
    setCreating(true);
    try {
      const baseUrl = saveServiceUrl();
      const payload = buildPollPayload({ title, comment, players: parsedPlayers, slots, timezone, expiresOn });
      if (editingPoll) {
        let remoteSaved = false;
        try {
          const response = await updateRemotePoll(baseUrl, editingPoll, payload);
          remoteSaved = true;
          const saved = await updateLocalPoll(editingPoll.id, {
            title: payload.title,
            comment: payload.comment,
            timezone: payload.timezone,
            expected_players: payload.players,
            expires_at: response.expiresAt,
            slots: [],
            votes: [],
          });
          setPolls((current) => current.map((item) => item.id === saved.id ? saved : item));
          onPollChange?.(saved);
          setEditingPoll(null);
          resetForm();
          onOpenChange(false);
          toast({ title: "Sondage modifié" });
          try {
            const refreshed = await refreshSessionPoll(saved, baseUrl);
            setPolls((current) => current.map((item) => item.id === refreshed.id ? refreshed : item));
            onPollChange?.(refreshed);
          } catch (error) {
            console.error("Actualisation du sondage modifié impossible :", error);
            toast({
              variant: "destructive",
              title: "Sondage modifié, résultats non actualisés",
              description: error.message,
            });
          }
        } catch (error) {
          console.error("Modification du sondage impossible :", error);
          toast({
            variant: "destructive",
            title: remoteSaved ? "Sondage modifié, synchronisation locale impossible" : "Sondage non modifié",
            description: error instanceof TypeError
              ? "Impossible de joindre le service Cloudflare. Vérifiez la connexion; si elle fonctionne, déployez la dernière version du dossier cloudflare, qui autorise la modification des sondages."
              : error.message || "Vérifiez la connexion et la configuration Cloudflare.",
          });
        }
        return;
      }
      const created = await createRemotePoll(baseUrl, payload);
      const saved = await createLocalPoll({
        campaign_id: campaignId,
        poll_id: created.id,
        title: created.title,
        comment: created.comment,
        public_url: created.publicUrl,
        service_url: baseUrl,
        owner_token: created.ownerToken,
        timezone: created.timezone,
        expected_players: parsedPlayers,
        slots: [],
        votes: [],
        state: "open",
        expires_at: created.expiresAt,
      });
      setPolls((current) => [saved, ...current]);
      onPollChange?.(saved);
      dispatchTutorialAction("poll-created");
      resetForm();
      onOpenChange(false);
      toast({ title: "Sondage créé", description: "Le lien est prêt à être partagé avec les joueurs." });
      await refreshPoll(saved);
    } catch (error) {
      console.error("Création du sondage impossible :", error);
      toast({ variant: "destructive", title: "Sondage non créé", description: error.message || "Vérifiez la connexion et la configuration Cloudflare." });
    } finally {
      setCreating(false);
    }
  };

  const commitServiceUrl = () => {
    const url = serviceUrl.trim();
    if (!url) {
      const defaultUrl = getPollServiceUrl();
      setServiceUrl(defaultUrl);
      savePollServiceUrl(defaultUrl);
      setEditingServiceUrl(false);
      return;
    }
    try {
      const normalized = normalizePollServiceUrl(url);
      savePollServiceUrl(normalized);
      setServiceUrl(normalized);
      setEditingServiceUrl(false);
    } catch {
      // La validation détaillée est affichée lors de l'enregistrement ou de la création.
    }
  };

  const changeSlotDate = (index, value) =>
    setSlots((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, date: formatPollDateInput(value) } : item));
  const changeSlotTime = (index, value) =>
    setSlots((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, time: value } : item));
  const removeSlot = (index) => setSlots((current) => current.filter((_, itemIndex) => itemIndex !== index));
  const addSlot = () => setSlots((current) => [...current, newSlot()]);

  const changeExpiresOn = (value) => {
    setExpiryManuallySet(true);
    setExpiresOn(formatPollDateInput(value));
  };

  const cancelEdit = () => {
    setEditingPoll(null);
    setEditLoadError("");
    resetForm();
    onOpenChange(false);
  };

  const copyLink = async (poll, forDiscord = false) => {
    try {
      await navigator.clipboard.writeText(poll.public_url);
      toast({
        title: forDiscord ? "Lien copié pour Discord" : "Lien copié",
        description: forDiscord ? "Collez-le dans votre conversation Discord." : undefined,
      });
    } catch (error) {
      console.error("Copie du lien impossible :", error);
      toast({ variant: "destructive", title: "Copie impossible", description: "Sélectionnez et copiez le lien affiché." });
    }
  };

  const closePoll = async (poll) => {
    setBusyPoll(poll.id);
    try {
      await closeRemotePoll(poll);
      const updated = await refreshSessionPoll({ ...poll, state: "closed" }, pollServiceUrlOf(poll));
      setPolls((current) => current.map((item) => item.id === poll.id ? updated : item));
      onPollChange?.(updated);
      toast({ title: "Sondage clôturé", description: "Les joueurs ne peuvent plus modifier leur réponse." });
    } catch (error) {
      console.error("Clôture du sondage impossible :", error);
      toast({ variant: "destructive", title: "Clôture impossible", description: error.message });
    } finally {
      setBusyPoll("");
    }
  };

  const removePoll = async (poll) => {
    setBusyPoll(poll.id);
    try {
      const { remoteMissing } = await removeSessionPoll(poll);
      setPolls((current) => current.filter((item) => item.id !== poll.id));
      onPollChange?.(null, poll.id);
      toast(remoteMissing
        ? { title: "Référence locale supprimée", description: "Le sondage distant n'existe plus ou a expiré." }
        : { title: "Sondage supprimé" });
    } catch (error) {
      console.error("Suppression du sondage impossible :", error);
      toast({ variant: "destructive", title: "Suppression impossible", description: error.message });
    } finally {
      setBusyPoll("");
    }
  };

  const confirmPollRemoval = () => {
    const poll = pendingPollRemoval;
    setPendingPollRemoval(null);
    if (poll) removePoll(poll);
  };

  return {
    // adresse du service
    serviceUrl, setServiceUrl, editingServiceUrl, setEditingServiceUrl, commitServiceUrl,
    // formulaire
    title, setTitle, comment, setComment, playerNames, setPlayerNames, timezone, setTimezone,
    slots, changeSlotDate, changeSlotTime, removeSlot, addSlot,
    expiresOn, changeExpiresOn,
    editingPoll, editLoading, editLoadError, creating,
    savePoll, cancelEdit,
    // sondages de la campagne
    polls, busyPoll, refreshPoll, copyLink, closePoll,
    pendingPollRemoval, setPendingPollRemoval, confirmPollRemoval,
  };
}
