import React, { useCallback, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import useConfirm from "@/hooks/useConfirm";
import { useToast } from "@/components/ui/use-toast";
import { checkAndroidUpdate } from "@/lib/services/androidUpdate";

const IDLE = { phase: "idle", version: "", url: "", size: 0, error: "" };

const megabytes = (bytes) => (bytes > 0 ? ` (${(bytes / (1024 * 1024)).toFixed(0)} Mo)` : "");

/**
 * Mise à jour de l'application Android : recherche à la demande, puis téléchargement de l'APK depuis GitHub par le navigateur
 * du téléphone. L'utilisateur ouvre ensuite le fichier téléchargé pour l'installer ; ses données sont conservées.
 */
export default function AndroidUpdatePanel({ currentVersion }) {
  const { toast } = useToast();
  const { confirm, confirmDialog } = useConfirm();
  const [state, setState] = useState(IDLE);

  const download = useCallback(
    async (target) => {
      const accepted = await confirm({
        title: "Télécharger la mise à jour",
        description: `La version ${target.version}${megabytes(target.size)} est disponible (vous utilisez la ${currentVersion}).\nLe fichier est téléchargé depuis GitHub par le navigateur du téléphone. Quand c'est fini, ouvrez-le depuis les notifications ou le dossier Téléchargements pour l'installer : vos données sont conservées. Pensez à exporter une sauvegarde avant.`,
        confirmLabel: "Télécharger",
      });
      if (!accepted) return;
      window.open(target.url, "_blank", "noopener,noreferrer");
      toast({ title: "Téléchargement lancé", description: "Ouvrez le fichier téléchargé pour installer la mise à jour." });
    },
    [confirm, currentVersion, toast]
  );

  const verify = async () => {
    setState({ ...IDLE, phase: "checking" });
    const result = await checkAndroidUpdate(currentVersion);
    if (!result.ok) {
      setState({ ...IDLE, phase: "error", error: result.error });
      return;
    }
    if (!result.available) {
      setState({ ...IDLE, phase: result.noApk ? "noapk" : "uptodate", version: result.version });
      return;
    }
    const next = { phase: "available", version: result.version, url: result.url, size: result.size, error: "" };
    setState(next);
    download(next);
  };

  const message = {
    checking: "Recherche d'une mise à jour…",
    uptodate: "Vous utilisez la dernière version.",
    available: `La version ${state.version} est disponible.`,
    noapk: `La version ${state.version} est publiée, mais son fichier Android n'est pas encore disponible. Réessayez plus tard.`,
    error: `Vérification impossible : ${state.error}`,
  }[state.phase];

  return (
    <div className="mt-3 stack-y-2 border-t border-border pt-3">
      {confirmDialog}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={verify} disabled={state.phase === "checking"}>
          <RefreshCw className="mr-2 h-4 w-4" /> Rechercher les mises à jour
        </Button>
        {state.phase === "available" && (
          <Button type="button" onClick={() => download(state)}>
            <Download className="mr-2 h-4 w-4" /> Télécharger la version {state.version}
          </Button>
        )}
      </div>
      {message && <p className="text-sm text-foreground">{message}</p>}
      <p className="text-xs text-muted-foreground">
        La recherche contacte GitHub uniquement quand vous appuyez : aucune donnée de jeu n'est envoyée. L'installation se fait à la main
        depuis le fichier téléchargé ; Android peut demander d'autoriser l'installation depuis votre navigateur.
      </p>
    </div>
  );
}
