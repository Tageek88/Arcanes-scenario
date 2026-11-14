import React, { useEffect, useRef, useState } from "react";
import { RotateCw, Trash2, Upload } from "lucide-react";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { MAX_BACKGROUND_PAGES, SOURCE_ACCEPT, backgroundSizeLabel } from "@/lib/meta/sheetBackground";
import { importSheetFile, rotatePage } from "@/lib/services/sheetImport";
import { loadSheetBackground, removeSheetBackground, saveSheetBackground } from "@/lib/services/sheetBackgroundStore";

/**
 * Fond de la feuille de personnage d'une campagne : importer un PDF ou une image (convertis en pages d'image), tourner une
 * page, retirer une page ou tout le fond. Le fond reste sur cet appareil ; il n'est pas inclus dans les systèmes exportés.
 */
export default function SheetBackgroundDialog({ open, onOpenChange, campaignId }) {
  const { toast } = useToast();
  const fileRef = useRef(null);
  const [pages, setPages] = useState([]);
  const [changed, setChanged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setChanged(false);
    setConfirmRemove(false);
    setLoading(true);
    loadSheetBackground(campaignId)
      .then((loaded) => {
        if (!cancelled) setPages(loaded);
      })
      .catch((error) => {
        console.error("Lecture du fond de feuille impossible :", error);
        if (!cancelled) toast({ variant: "destructive", title: "Lecture impossible", description: "Le fond n'a pas pu être chargé." });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, campaignId]);

  const guard = async (task) => {
    setBusy(true);
    try {
      return await task();
    } catch (error) {
      toast({ variant: "destructive", title: "Action impossible", description: error?.message || "Une erreur est survenue." });
      return undefined;
    } finally {
      setBusy(false);
    }
  };

  const chooseFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const result = await guard(() => importSheetFile(file));
    if (!result) return;
    setPages(result.pages);
    setChanged(true);
    if (result.truncated) toast({ title: "PDF long", description: `Seules les ${MAX_BACKGROUND_PAGES} premières pages sont gardées.` });
  };

  const rotate = async (index) => {
    const rotated = await guard(() => rotatePage(pages[index], 1));
    if (!rotated) return;
    setPages((current) => current.map((page, i) => (i === index ? rotated : page)));
    setChanged(true);
  };

  const removePage = (index) => {
    setPages((current) => current.filter((_, i) => i !== index));
    setChanged(true);
  };

  const save = async () => {
    const saved = await guard(() => saveSheetBackground(campaignId, pages));
    if (!saved) return;
    setPages(saved);
    setChanged(false);
    toast({ title: saved.length ? "Fond enregistré" : "Fond retiré" });
  };

  const removeAll = async () => {
    if (!confirmRemove) {
      setConfirmRemove(true);
      return;
    }
    setConfirmRemove(false);
    await guard(async () => {
      await removeSheetBackground(campaignId);
      setPages([]);
      setChanged(false);
      toast({ title: "Fond retiré" });
    });
  };

  const footer = (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" onClick={() => onOpenChange(false)}>Fermer</Button>
      <Button onClick={save} disabled={busy || !changed}>Enregistrer le fond</Button>
    </div>
  );

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Fond de feuille"
      description="Importez la feuille de personnage de votre jeu (PDF ou image) pour qu'elle serve de fond à la fiche."
      footer={footer}
    >
      <div className="stack-y-4 py-1">
        <p className="text-xs text-muted-foreground">
          Le PDF est converti en images ({MAX_BACKGROUND_PAGES} pages au plus) et reste sur cet appareil ; il n'est pas inclus dans les systèmes exportés.
          Les droits de la feuille appartiennent à son éditeur : importez votre propre exemplaire.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" disabled={busy || !campaignId} onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> {pages.length ? "Remplacer le fond" : "Importer une feuille"}
          </Button>
          <input ref={fileRef} type="file" accept={SOURCE_ACCEPT} className="hidden" onChange={chooseFile} />
          {pages.length > 0 && <span className="text-xs text-muted-foreground">{pages.length} page{pages.length > 1 ? "s" : ""} · {backgroundSizeLabel(pages)}</span>}
          {busy && <span className="text-xs text-muted-foreground">Traitement…</span>}
        </div>

        {loading && pages.length === 0 && <p className="text-sm text-muted-foreground">Chargement…</p>}
        {!loading && pages.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">Aucun fond pour cette campagne.</p>
        )}

        <ul className="stack-y-3">
          {pages.map((page, index) => (
            <li key={page.id} className="stack-y-2 rounded-lg border border-border p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Page {index + 1} · {page.width} × {page.height} px</span>
                <div className="flex items-center">
                  <Button size="icon" variant="ghost" aria-label={`Tourner la page ${index + 1} d'un quart de tour`} disabled={busy} onClick={() => rotate(index)}>
                    <RotateCw className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" aria-label={`Retirer la page ${index + 1}`} disabled={busy} onClick={() => removePage(index)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
              <img src={page.url} alt={`Page ${index + 1} du fond de feuille`} className="mx-auto max-h-96 w-auto max-w-full rounded border border-border bg-white" />
            </li>
          ))}
        </ul>

        {pages.length > 0 && !changed && (
          <div>
            {confirmRemove ? (
              <div className="stack-y-2 rounded-md bg-secondary/50 p-2">
                <p className="text-xs">Retirer tout le fond de cette campagne ? Le fichier d'origine n'est pas conservé.</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" disabled={busy} onClick={removeAll}>Retirer le fond</Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(false)}>Annuler</Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="ghost" disabled={busy} onClick={removeAll}>Retirer tout le fond</Button>
            )}
          </div>
        )}
      </div>
    </ResponsiveDialog>
  );
}
