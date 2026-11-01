import React from "react";
import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import useConfirm from "@/hooks/useConfirm";
import useAppUpdate from "@/hooks/useAppUpdate";

export default function UpdatePanel({ currentVersion }) {
  const { supported, phase, version, progress, check, install } = useAppUpdate();
  const { confirm, confirmDialog } = useConfirm();

  if (!supported) return null;

  const askInstall = async (target) => {
    const accepted = await confirm({
      title: "Installer la mise à jour",
      description: `La version ${target} est disponible (vous utilisez la ${currentVersion}).\nElle sera téléchargée depuis GitHub, puis l'application redémarrera. Vos données sont sauvegardées avant le redémarrage.`,
      confirmLabel: "Télécharger et installer",
    });
    if (accepted) install();
  };

  const verify = async () => {
    const result = await check();
    if (result?.available) askInstall(result.version);
  };

  const busy = phase === "checking" || phase === "downloading" || phase === "installing";
  const message = {
    checking: "Recherche d'une mise à jour…",
    uptodate: "Vous utilisez la dernière version.",
    available: `La version ${version} est disponible.`,
    downloading: `Téléchargement de la version ${version} : ${progress} %`,
    installing: "Installation en cours, l'application va redémarrer…",
  }[phase];

  return (
    <div className="mt-3 stack-y-2 border-t border-border pt-3">
      {confirmDialog}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={verify} disabled={busy}>
          <RefreshCw className="mr-2 h-4 w-4" /> Vérifier les mises à jour
        </Button>
        {phase === "available" && (
          <Button type="button" onClick={() => askInstall(version)}>
            <Download className="mr-2 h-4 w-4" /> Installer la version {version}
          </Button>
        )}
      </div>
      {message && <p className="text-sm text-foreground">{message}</p>}
      {phase === "downloading" && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        La vérification contacte GitHub uniquement quand vous cliquez : aucune donnée de jeu n'est envoyée.
      </p>
    </div>
  );
}
