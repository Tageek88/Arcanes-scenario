import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import BackupPanel from "@/components/BackupPanel";
import { deleteAccountData } from "@/lib/accountData";
import { setSelectedCampaignId } from "@/lib/campaignStore";
import { useToast } from "@/components/ui/use-toast";
import PrintButton from "@/components/print/PrintButton";
import { getSelectedCampaignId } from "@/lib/campaignStore";
import AutosavePanel from "@/components/AutosavePanel";

export default function Settings() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccountData();
      setSelectedCampaignId("");
      window.location.reload();
    } catch (error) {
      console.error("Effacement impossible :", error);
      setDeleting(false);
      setOpen(false);
      toast({
        title: "Effacement impossible",
        description: "Une erreur est survenue, réessayez dans un instant.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <header>
        <span className="tag border border-primary/40 text-primary">Configuration</span>
        <h1 className="mt-3 font-display text-3xl font-bold text-foreground">Paramètres</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Sauvegardez vos données de jeu ou repartez de zéro. Tout est stocké dans ce navigateur.
        </p>
      </header>
      <AutosavePanel />
      <BackupPanel />

      <section className="space-y-3 rounded-xl border border-border bg-card/50 p-4">
        <h2 className="font-display text-base font-semibold text-foreground">Impression</h2>
        <p className="text-sm text-muted-foreground">
          Imprimez ou exportez en PDF éditable les scènes, indices, lieux, PNJ, notes et fiches de personnages de la campagne sélectionnée.
        </p>
        <PrintButton
          campaignId={getSelectedCampaignId()}
          preset="all"
          label="Choisir les éléments"
          allowPdfExport
        />
      </section>

      <section className="rounded-xl border border-destructive/40 bg-destructive/[0.06] p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="space-y-1">
            <h2 className="font-display text-lg font-semibold text-foreground">Effacer toutes les données</h2>
            <p className="text-sm text-muted-foreground">
              Cette action supprime définitivement toutes les données de ce navigateur : campagnes,
              actes, scènes, PNJ, lieux, indices, personnages, modèles et catalogues de jeu,
              tables aléatoires, sessions et notes.
            </p>
            <Button
              variant="destructive"
              className="mt-3"
              onClick={() => setOpen(true)}
              disabled={deleting}
            >
              {deleting ? "Effacement..." : "Effacer toutes les données"}
            </Button>
          </div>
        </div>
      </section>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l’effacement</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes vos données seront supprimées de ce navigateur.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Effacement..." : "Oui, tout effacer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <section className="rounded-xl border border-border bg-card/50 p-4">
        <h2 className="font-display text-base font-semibold text-foreground">À propos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Arcanes &amp; Scénario · version{" "}
          <span className="font-mono text-foreground">{__APP_VERSION__}</span>
        </p>
      </section>
    </div>
  );
}
