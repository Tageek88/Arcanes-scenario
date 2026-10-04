import React, { useRef } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { exportBackup, importBackup } from "@/lib/backup";

export default function BackupPanel() {
  const { toast } = useToast();
  const inputRef = useRef(null);

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!window.confirm("Remplacer toutes les données actuelles par cette sauvegarde ?")) return;
    try {
      await importBackup(file);
      toast({ title: "Sauvegarde importée", description: "Les données ont bien été restaurées." });
      window.location.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Une erreur inattendue est survenue.";
      console.error(error);
      toast({ variant: "destructive", title: "Import impossible", description: message });
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card/50 p-4">
      <h2 className="font-display text-base font-semibold text-foreground">Sauvegarde</h2>
      <p className="text-sm text-muted-foreground">
        Vos données sont stockées uniquement dans ce navigateur. Exportez-les régulièrement.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={exportBackup}>
          <Download className="mr-2 h-4 w-4" /> Exporter
        </Button>
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" /> Importer
        </Button>
        <input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImport} />
      </div>
    </div>
  );
}