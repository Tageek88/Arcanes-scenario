import React, { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { exportCampaignModelAsSystem } from "@/lib/services/gameSystems";

/**
 * Exporte le modèle de fiche de la campagne comme fichier de système (caractéristiques, pistes, textes, dés, mises en page,
 * positions des valeurs et catalogues). Le fond de feuille n'en fait pas partie : il reste sur l'appareil.
 */
export default function ExportSystemButton({ campaignId, campaignName, disabled = false, className }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      await exportCampaignModelAsSystem(campaignId, campaignName);
      toast({ title: "Système exporté", description: "Le fichier contient le modèle de fiche, les positions des valeurs et les catalogues, pas le fond de feuille." });
    } catch (error) {
      console.error("Export du système impossible :", error);
      toast({ variant: "destructive", title: "Action impossible", description: error?.message || "Une erreur est survenue." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" className={className} disabled={disabled || busy || !campaignId} onClick={run}>
      <Upload className="h-4 w-4" /> Exporter ce système
    </Button>
  );
}
