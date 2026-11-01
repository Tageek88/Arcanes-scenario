import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { hasAutosave, saveNow } from "@/lib/save/autosave";

// The bridge only exists in the installed Windows app (see electron/preload.cjs).
export const hasUpdater = () => typeof window !== "undefined" && !!window.arcanesUpdate;

const IDLE = { phase: "idle", version: "", progress: 0 };

/**
 * Manual update flow: check, then download and install once the user confirmed.
 * phase: idle | checking | uptodate | available | downloading | installing
 */
export default function useAppUpdate() {
  const { toast } = useToast();
  const [state, setState] = useState(IDLE);

  useEffect(() => {
    if (!hasUpdater()) return undefined;
    return window.arcanesUpdate.onProgress((percent) => {
      setState((current) => ({ ...current, progress: Number(percent) || 0 }));
    });
  }, []);

  const fail = useCallback(
    (title, error) => {
      console.error(title, error);
      setState((current) => ({ ...current, phase: current.version ? "available" : "idle", progress: 0 }));
      toast({
        title,
        description: typeof error === "string" ? error : "Une erreur est survenue, réessayez dans un instant.",
        variant: "destructive",
      });
    },
    [toast]
  );

  const check = useCallback(async () => {
    setState({ ...IDLE, phase: "checking" });
    try {
      const result = await window.arcanesUpdate.check();
      if (!result?.ok) {
        fail("Vérification impossible", result?.error);
        return null;
      }
      setState({ phase: result.available ? "available" : "uptodate", version: result.version, progress: 0 });
      return result;
    } catch (error) {
      fail("Vérification impossible", error);
      return null;
    }
  }, [fail]);

  const install = useCallback(async () => {
    setState((current) => ({ ...current, phase: "downloading", progress: 0 }));
    try {
      const downloaded = await window.arcanesUpdate.download();
      if (!downloaded?.ok) return fail("Téléchargement impossible", downloaded?.error);
      setState((current) => ({ ...current, phase: "installing", progress: 100 }));
      // Last backup before the app restarts.
      if (hasAutosave()) {
        const saved = await saveNow({ force: true });
        if (!saved.ok) return fail("Sauvegarde impossible, mise à jour annulée", saved.error);
      }
      const installed = await window.arcanesUpdate.install();
      if (!installed?.ok) return fail("Installation impossible", installed?.error);
    } catch (error) {
      fail("Mise à jour impossible", error);
    }
    return undefined;
  }, [fail]);

  return { ...state, supported: hasUpdater(), check, install };
}
