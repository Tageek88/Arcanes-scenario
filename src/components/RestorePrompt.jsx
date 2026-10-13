import React, { useEffect, useState } from "react";
import { db } from "@/api/localClient";
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
import { useToast } from "@/components/ui/use-toast";
import { hasAutosave, saveNow } from "@/lib/save/autosave";
import { restoreFromPayload, validateBackupPayload } from "@/lib/save/backup";

export default function RestorePrompt() {
    const { toast } = useToast();
    const [found, setFound] = useState(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!hasAutosave()) return;
        let alive = true;
        (async () => {
            try {
                if ((await db.table("Campaign").count()) > 0) return;
                const text = await window.arcanesBackup.read("arcanes-courante.json");
                if (!text) return;
                const payload = JSON.parse(text);
                validateBackupPayload(payload);
                const campaigns = payload.data.Campaign?.length || 0;
                if (campaigns > 0 && alive) setFound({ payload, campaigns });
            } catch (error) {
                console.error("Vérification de la sauvegarde automatique :", error);
            }
        })();
        return () => {
            alive = false;
        };
    }, []);

    const restore = async () => {
        setBusy(true);
        try {
            await restoreFromPayload(found.payload);
            await saveNow();
            window.location.reload();
        } catch (error) {
            console.error("Restauration impossible :", error);
            setBusy(false);
            toast({ variant: "destructive", title: "Restauration impossible", description: error?.message });
        }
    };

    // Refus : l'ancienne sauvegarde est archivée (jamais supprimée), puis l'état vide devient la référence.
    const decline = async () => {
        setBusy(true);
        await window.arcanesBackup.archiveCurrent();
        await saveNow();
        setBusy(false);
        setFound(null);
    };

    return (
        <AlertDialog open={!!found} onOpenChange={() => { }}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Sauvegarde automatique trouvée</AlertDialogTitle>
                    <AlertDialogDescription>
                        L'application est vide, mais une sauvegarde automatique contient {found?.campaigns} campagne
                        {found?.campaigns > 1 ? "s" : ""}. Voulez-vous la restaurer ? Si vous refusez, elle est archivée dans
                        le dossier des sauvegardes.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={busy} onClick={decline}>
                        Ne pas restaurer
                    </AlertDialogCancel>
                    <AlertDialogAction
                        disabled={busy}
                        onClick={(e) => {
                            e.preventDefault();
                            restore();
                        }}
                    >
                        {busy ? "En cours…" : "Restaurer"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}