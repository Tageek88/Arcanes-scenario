import React, { useCallback, useEffect, useState } from "react";
import { Folder, FolderOpen, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { hasAutosave, saveNow, useAutosaveStatus } from "@/lib/save/autosave";
import { restoreFromPayload, validateBackupPayload } from "@/lib/save/backup";

const KIND_LABEL = { current: "Courante", auto: "Automatique", archive: "Archive", other: "Autre" };

const when = (t) => new Date(t).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "medium" });
const sizeOf = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} Mo` : `${Math.max(1, Math.round(n / 1024))} Ko`);

export default function AutosavePanel() {
    const { toast } = useToast();
    const status = useAutosaveStatus();
    const [info, setInfo] = useState(null);
    const [busy, setBusy] = useState(false);

    const refresh = useCallback(async () => {
        if (!hasAutosave()) return;
        try {
            setInfo(await window.arcanesBackup.info());
        } catch (error) {
            console.error(error);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh, status.savedAt]);

    if (!hasAutosave()) {
        return (
            <section className="space-y-2 rounded-xl border border-border bg-card/50 p-4">
                <h2 className="font-display text-base font-semibold text-foreground">Sauvegarde automatique</h2>
                <p className="text-sm text-muted-foreground">
                    Disponible dans le programme Windows (installateur ou <code>npm run electron</code>), pas dans le
                    navigateur.
                </p>
            </section>
        );
    }

    const saveManual = async () => {
        setBusy(true);
        const result = await saveNow({ force: true });
        setBusy(false);
        toast(
            result.ok
                ? { title: "Sauvegarde effectuée" }
                : { variant: "destructive", title: "Sauvegarde impossible", description: result.error }
        );
    };

    const chooseFolder = async () => {
        const folder = await window.arcanesBackup.chooseFolder();
        if (!folder) return;
        await saveNow({ force: true });
        await refresh();
        toast({ title: "Dossier modifié", description: "Les anciennes sauvegardes restent dans l'ancien dossier." });
    };

    const restore = async (file) => {
        if (
            !window.confirm(
                `Remplacer toutes les données actuelles par la sauvegarde du ${when(file.mtime)} ?\nL'état actuel sera d'abord conservé dans une sauvegarde.`
            )
        )
            return;
        setBusy(true);
        try {
            // Lecture d'abord : l'instantané ci-dessous peut supprimer la plus ancienne version.
            const text = await window.arcanesBackup.read(file.name);
            if (!text) throw new Error("Fichier introuvable.");
            const payload = JSON.parse(text);
            validateBackupPayload(payload);
            await saveNow({ force: true });
            await restoreFromPayload(payload);
            await saveNow();
            window.location.reload();
        } catch (error) {
            console.error("Restauration impossible :", error);
            setBusy(false);
            toast({ variant: "destructive", title: "Restauration impossible", description: error?.message });
        }
    };

    const statusText =
        status.state === "saving"
            ? "Enregistrement en cours…"
            : status.state === "error"
                ? `Erreur : ${status.error}`
                : status.savedAt
                    ? `Dernière sauvegarde : ${when(status.savedAt)}`
                    : "En attente de la première modification.";

    const files = (info?.files || []).slice(0, 12);

    return (
        <section className="space-y-3 rounded-xl border border-border bg-card/50 p-4">
            <h2 className="font-display text-base font-semibold text-foreground">Sauvegarde automatique</h2>
            <p className="text-sm text-muted-foreground">
                Vos données sont enregistrées dans un fichier après chaque modification, avec des versions datées.
                Les images sont incluses : le fichier peut être volumineux.
            </p>
            <p className={status.state === "error" ? "text-sm text-destructive" : "text-sm text-foreground"}>
                {statusText}
            </p>
            {info?.folder && (
                <p className="break-all font-mono text-xs text-muted-foreground">Dossier : {info.folder}</p>
            )}
            <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={saveManual} disabled={busy}>
                    <Save className="mr-2 h-4 w-4" /> Sauvegarder maintenant
                </Button>
                <Button type="button" variant="outline" onClick={chooseFolder} disabled={busy}>
                    <Folder className="mr-2 h-4 w-4" /> Changer le dossier
                </Button>
                <Button type="button" variant="outline" onClick={() => window.arcanesBackup.openFolder()}>
                    <FolderOpen className="mr-2 h-4 w-4" /> Ouvrir le dossier
                </Button>
            </div>

            {files.length > 0 && (
                <ul className="max-h-64 space-y-1.5 overflow-y-auto pt-1">
                    {files.map((file) => (
                        <li
                            key={file.name}
                            className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/60 p-2 text-xs"
                        >
                            <span className="min-w-0">
                                <span className="block font-mono uppercase tracking-wider text-muted-foreground">
                                    {KIND_LABEL[file.kind]}
                                </span>
                                <span className="block text-foreground">
                                    {when(file.mtime)} · {sizeOf(file.size)}
                                </span>
                            </span>
                            {file.kind !== "current" && (
                                <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => restore(file)}>
                                    <RotateCcw className="mr-1 h-3.5 w-3.5" /> Restaurer
                                </Button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}