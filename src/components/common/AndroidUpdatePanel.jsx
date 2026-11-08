import React, { useCallback, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import useConfirm from "@/hooks/useConfirm";
import { useToast } from "@/components/ui/use-toast";
import { checkAndroidUpdate } from "@/lib/services/androidUpdate";
import { canInstallInApp, downloadApk, installApk } from "@/lib/services/apkUpdate";

const IDLE = { phase: "idle", version: "", url: "", size: 0, error: "", progress: 0 };

const megabytes = (bytes) => (bytes > 0 ? " (" + (bytes / (1024 * 1024)).toFixed(0) + " Mo)" : "");

/**
 * Mise à jour de l'application Android : recherche à la demande, puis téléchargement de l'APK par l'application elle-même
 * et ouverture de l'installateur d'Android (un seul appui sur « Installer »). Une application sans le plugin natif
 * retombe sur l'ancien chemin : téléchargement par le navigateur, puis ouverture du fichier à la main.
 */
export default function AndroidUpdatePanel({ currentVersion }) {
  const { toast } = useToast();
  const { confirm, confirmDialog } = useConfirm();
  const [state, setState] = useState(IDLE);

  const install = useCallback(async (target) => {
    try {
      await installApk();
      setState({ ...target, phase: "ready" });
    } catch (error) {
      if (error?.code === "permission") {
        setState({ ...target, phase: "permission" });
        return;
      }
      console.error("Installation de la mise à jour impossible :", error);
      setState({ ...IDLE, phase: "error", error: error?.message || "installation impossible." });
    }
  }, []);

  const download = useCallback(
    async (target) => {
      const inApp = canInstallInApp();
      const accepted = await confirm({
        title: "Installer la mise à jour",
        description: inApp
          ? "La version " + target.version + megabytes(target.size) + " est disponible (vous utilisez la " + currentVersion + ").\nL'application la télécharge, puis l'écran d'installation d'Android s'ouvre : appuyez sur Installer. Vos données sont conservées. Pensez à exporter une sauvegarde avant."
          : "La version " + target.version + megabytes(target.size) + " est disponible (vous utilisez la " + currentVersion + ").\nLe fichier est téléchargé depuis GitHub par le navigateur du téléphone. Quand c'est fini, ouvrez-le depuis les notifications ou le dossier Téléchargements pour l'installer : vos données sont conservées. Pensez à exporter une sauvegarde avant.",
        confirmLabel: inApp ? "Mettre à jour" : "Télécharger",
      });
      if (!accepted) return;
      if (!inApp) {
        window.open(target.url, "_blank", "noopener,noreferrer");
        toast({ title: "Téléchargement lancé", description: "Ouvrez le fichier téléchargé pour installer la mise à jour." });
        return;
      }
      setState({ ...target, phase: "downloading", progress: 0 });
      try {
        await downloadApk(target.url, ({ received, total }) =>
          setState((current) => (current.phase === "downloading" ? { ...current, progress: total > 0 ? received / total : 0 } : current))
        );
      } catch (error) {
        console.error("Téléchargement de la mise à jour impossible :", error);
        setState({ ...IDLE, phase: "error", error: error?.message || "téléchargement impossible." });
        return;
      }
      await install(target);
    },
    [confirm, currentVersion, install, toast]
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
    const next = { ...IDLE, phase: "available", version: result.version, url: result.url, size: result.size };
    setState(next);
    download(next);
  };

  const message = {
    checking: "Recherche d'une mise à jour…",
    uptodate: "Vous utilisez la dernière version.",
    available: "La version " + state.version + " est disponible.",
    downloading: "Téléchargement de la version " + state.version + " : " + Math.round(state.progress * 100) + " %",
    ready: "L'écran d'installation d'Android est ouvert : appuyez sur Installer. Si vous l'avez fermé, rouvrez-le avec le bouton ci-dessous.",
    permission: "Android demande d'abord d'autoriser Arcanes & Scénario à installer des applications. Activez l'autorisation dans l'écran qui vient de s'ouvrir, revenez ici, puis appuyez sur « Installer la version " + state.version + " ».",
    noapk: "La version " + state.version + " est publiée, mais son fichier Android n'est pas encore disponible. Réessayez plus tard.",
    error: "Mise à jour impossible : " + state.error,
  }[state.phase];

  const percent = Math.round(state.progress * 100);

  return (
    <div className="mt-3 stack-y-2 border-t border-border pt-3">
      {confirmDialog}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={verify} disabled={state.phase === "checking" || state.phase === "downloading"}>
          <RefreshCw className="mr-2 h-4 w-4" /> Rechercher les mises à jour
        </Button>
        {state.phase === "available" && (
          <Button type="button" onClick={() => download(state)}>
            <Download className="mr-2 h-4 w-4" /> Mettre à jour vers la version {state.version}
          </Button>
        )}
        {(state.phase === "permission" || state.phase === "ready") && (
          <Button type="button" onClick={() => install(state)}>
            <Download className="mr-2 h-4 w-4" /> Installer la version {state.version}
          </Button>
        )}
      </div>
      {state.phase === "downloading" && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Téléchargement de la mise à jour">
          <div className="h-full bg-primary transition-[width]" style={{ width: percent + "%" }} />
        </div>
      )}
      {message && <p className="text-sm text-foreground">{message}</p>}
      <p className="text-xs text-muted-foreground">
        La recherche contacte GitHub uniquement quand vous appuyez : aucune donnée de jeu n'est envoyée. Android demande une confirmation
        avant chaque installation et peut demander, une seule fois, d'autoriser l'installation depuis cette application.
      </p>
    </div>
  );
}
