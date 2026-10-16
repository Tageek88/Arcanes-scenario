import React, { useRef } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { exportBackup, importBackup } from "@/lib/save/backup";
import { hasAutosave, saveNow } from "@/lib/save/autosave";
import useConfirm from "@/hooks/useConfirm";

export default function BackupPanel() {
  const { toast } = useToast();
  const inputRef = useRef(null);
  const { confirm, confirmDialog } = useConfirm();

  const handleExport = async () => {
    try {
      if (await exportBackup()) toast({ title: "Sauvegarde exportée" });
    } catch (error) {
      console.error("Export impossible :", error);
      toast({ variant: "destructive", title: "Export impossible", description: error?.message });
    }
  };

  // Sans sauvegarde automatique (Android, navigateur), on exporte l'état actuel avant d'écraser quoi que ce soit.
  const exportBeforeImport = async () => {
    try {
      if (await exportBackup()) return true;
    } catch (error) {
      console.error("Export avant import impossible :", error);
      toast({ variant: "destructive", title: "Export impossible", description: error?.message });
    }
    return confirm({
      title: "Export non effectué",
      description: "Vos données actuelles n’ont pas été exportées. Importer quand même ? Elles seront définitivement remplacées.",
      confirmLabel: "Importer quand même",
      cancelLabel: "Annuler l’import",
    });
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const needsExport = !hasAutosave();
    const accepted = await confirm({
      title: "Importer une sauvegarde",
      description: needsExport
        ? "Remplacer toutes les données actuelles par cette sauvegarde ?\nAucune sauvegarde automatique n’existe ici : vos données actuelles vont d’abord être exportées."
        : "Remplacer toutes les données actuelles par cette sauvegarde ?",
      confirmLabel: needsExport ? "Exporter puis remplacer" : "Remplacer",
    });
    if (!accepted) return;
    if (needsExport && !(await exportBeforeImport())) return;
    try {
      await saveNow({ force: true });
      await importBackup(file);
      await saveNow();
      toast({ title: "Sauvegarde importée", description: "Les données ont bien été restaurées." });
      window.location.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Une erreur inattendue est survenue.";
      console.error(error);
      toast({ variant: "destructive", title: "Import impossible", description: message });
    }
  };

  return (
    <>
    <div className="space-y-3 rounded-xl border border-border bg-card/50 p-4">
      <h2 className="font-display text-base font-semibold text-foreground">Export et import manuels</h2>
      <p className="text-sm text-muted-foreground">
        Créez un fichier de sauvegarde à conserver ailleurs (clé USB, cloud), ou restaurez-en un.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" /> Exporter
        </Button>
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" /> Importer
        </Button>
        <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImport} />
      </div>
    </div>
    {confirmDialog}
    </>
  );
}