import { useState } from "react";
import { api } from "@/api/localClient";
import { useToast } from "@/components/ui/use-toast";
import { setSelectedCampaignId } from "@/lib/context/campaignStore";
import { countCampaignContent, deleteCampaignCascade } from "@/lib/services/campaignDelete";
import { dispatchTutorialAction } from "@/utils/tutorialStorage";

/**
 * Création, modification et suppression (en cascade) des campagnes.
 * @param {{
 *   campaigns: any[],
 *   setCampaigns: (next: any) => void,
 *   setCampaignId: (id: string) => void,
 *   reloadTree: (campaignId: string) => void,
 *   resetActiveScene: () => void,
 * }} deps
 */
export function useCampaignActions({ campaigns, setCampaigns, setCampaignId, reloadTree, resetActiveScene }) {
  const { toast } = useToast();
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [deletingCampaign, setDeletingCampaign] = useState(false);
  const [pendingCampaignDelete, setPendingCampaignDelete] = useState(/** @type {any} */ (null));

  /**
   * @param {any} form
   * @param {string | null} editingId
   * @param {(editing: boolean) => void} onSaved appelé quand le dialogue peut se fermer
   *   (après succès en modification, tout de suite en création : l'écran est mis à jour avant l'enregistrement)
   */
  const saveCampaign = async (form, editingId, onSaved) => {
    setSavingCampaign(true);
    const payload = { ...form, name: form.name.trim() };

    if (editingId) {
      try {
        const updated = await api.entities.Campaign.update(editingId, payload);
        setCampaigns((prev) =>
          prev.map((c) => (c.id === editingId ? { ...c, ...payload, ...(updated || {}) } : c))
        );
        onSaved(true);
        toast({ title: "Campagne mise à jour" });
      } catch (error) {
        console.error("Échec modification campagne :", error);
        toast({
          variant: "destructive",
          title: "Modification impossible",
          description: "La campagne n'a pas été enregistrée.",
        });
      } finally {
        setSavingCampaign(false);
      }
      return;
    }

    const previous = campaigns;
    const optimistic = { ...payload, id: `campaign-${Date.now()}` };
    setCampaigns((prev) => [optimistic, ...prev]);
    onSaved(false);
    try {
      const created = await api.entities.Campaign.create(payload);
      setCampaigns((prev) => prev.map((c) => (c.id === optimistic.id ? created : c)));
      setCampaignId(created.id);
      setSelectedCampaignId(created.id);
      resetActiveScene();
      dispatchTutorialAction("campaign-created");
      toast({ title: "Campagne créée" });
    } catch {
      setCampaigns(previous);
      toast({
        variant: "destructive",
        title: "Création impossible",
        description: "La campagne n'a pas été enregistrée.",
      });
    } finally {
      setSavingCampaign(false);
    }
  };

  /** Ouvre la confirmation de suppression et calcule en arrière-plan ce qui sera supprimé. */
  const requestDelete = async (target) => {
    setPendingCampaignDelete({ campaign: target, counts: null, countError: false });
    try {
      const counts = await countCampaignContent(target.id);
      setPendingCampaignDelete((p) => (p ? { ...p, counts } : p));
    } catch (error) {
      console.error("Comptage impossible :", error);
      setPendingCampaignDelete((p) => (p ? { ...p, counts: [], countError: true } : p));
    }
  };

  const confirmDelete = async () => {
    const target = pendingCampaignDelete?.campaign;
    if (!target) return;
    setDeletingCampaign(true);
    try {
      await deleteCampaignCascade(target.id);
      const remaining = campaigns.filter((c) => c.id !== target.id);
      const nextId = remaining[0]?.id || "";
      setCampaigns(remaining);
      setCampaignId(nextId);
      setSelectedCampaignId(nextId);
      resetActiveScene();
      setPendingCampaignDelete(null);
      toast({ title: "Campagne supprimée", description: `« ${target.name} » et son contenu ont été supprimés.`, duration: 4000 });
    } catch (error) {
      console.error("Échec suppression campagne :", error);
      reloadTree(target.id);
      toast({
        variant: "destructive",
        title: "Suppression incomplète",
        description: "Une partie du contenu a pu être supprimée. Vous pouvez relancer la suppression.",
      });
    } finally {
      setDeletingCampaign(false);
    }
  };

  return {
    savingCampaign,
    deletingCampaign,
    pendingCampaignDelete,
    setPendingCampaignDelete,
    saveCampaign,
    requestDelete,
    confirmDelete,
  };
}