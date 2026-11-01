import { useCallback, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useCampaigns } from "@/hooks/useCampaigns";
import { actsAsRows, saveActsAsRows } from "@/lib/services/campaignLayout";

/**
 * Disposition des actes et des scènes d'une campagne (Paramètres > Apparence). La campagne réglée est celle de la liste
 * de cette section : elle commence par la campagne active mais n'en change pas (la sélection de l'application reste intacte).
 * Mise à jour immédiate à l'écran, retour arrière et message si l'enregistrement échoue.
 */
export function useCampaignLayout() {
  const { toast } = useToast();
  const { campaigns, campaignId: activeId, setCampaigns } = useCampaigns();
  const [chosenId, setChosenId] = useState("");
  const campaignId = campaigns.some((item) => item.id === chosenId) ? chosenId : activeId;
  const campaign = campaigns.find((item) => item.id === campaignId) || null;

  const setActsAsRows = useCallback(
    async (value) => {
      if (!campaignId) return;
      const previous = campaigns;
      setCampaigns((list) => list.map((item) => (item.id === campaignId ? { ...item, acts_as_rows: value } : item)));
      try {
        await saveActsAsRows(campaignId, value);
        toast({ title: value ? "Actes en lignes" : "Actes en colonnes", description: campaign?.name });
      } catch (error) {
        console.error("Disposition non enregistrée :", error);
        setCampaigns(previous);
        toast({ variant: "destructive", title: "Disposition non enregistrée", description: "La modification n'a pas été enregistrée." });
      }
    },
    [campaignId, campaign, campaigns, setCampaigns, toast]
  );

  return { campaigns, campaignId, campaign, selectCampaign: setChosenId, actsAsRows: actsAsRows(campaign), setActsAsRows };
}
