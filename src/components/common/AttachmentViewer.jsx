import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, Download, ExternalLink, Share2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { openAttachment } from "@/lib/services/openAttachment";
import {
  attachmentBlob,
  copyAttachmentImage,
  downloadAttachment,
  readAttachment,
  shareAttachment,
  viewKind,
} from "@/lib/services/attachmentFile";
import { isNativeApp } from "@/lib/save/nativeShare";

const ZOOM_STEPS = [1, 1.5, 2, 3, 4];
const SWIPE_PX = 60;

/**
 * Visionneuse de pièces jointes : image (zoom) ou PDF, précédent/suivant, enregistrer, partager.
 * @param {{ files: any[], index: number, onIndexChange: (index: number) => void, onClose: () => void }} props
 * `files` vide ou `index` négatif : la visionneuse est fermée.
 */
export default function AttachmentViewer({ files, index, onIndexChange, onClose }) {
  const { toast } = useToast();
  const open = index >= 0 && index < files.length;
  const file = open ? files[index] : null;
  const kind = file ? viewKind(file) : "";
  const [zoom, setZoom] = useState(0);
  const touchX = useRef(null);
  const native = isNativeApp();

  useEffect(() => setZoom(0), [index, open]);

  // Les PDF passent par une URL de blob, libérée à la fermeture ou au changement de fichier.
  const [pdfUrl, setPdfUrl] = useState("");
  useEffect(() => {
    if (kind !== "pdf" || native) {
      setPdfUrl("");
      return undefined;
    }
    const blob = attachmentBlob(file);
    const url = blob ? URL.createObjectURL(blob) : "";
    setPdfUrl(url);
    return () => url && URL.revokeObjectURL(url);
  }, [file, kind, native]);

  const go = useCallback(
    (step) => {
      if (files.length < 2) return;
      onIndexChange((index + step + files.length) % files.length);
    },
    [files.length, index, onIndexChange]
  );

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
      if (event.key === "ArrowLeft") go(-1);
      else if (event.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go]);

  const setStep = (direction) => {
    const current = zoom || 0;
    setZoom(Math.min(ZOOM_STEPS.length - 1, Math.max(0, current + direction)));
  };

  const share = async () => {
    try {
      const result = await shareAttachment(file);
      if (result === "unsupported") {
        if (await copyAttachmentImage(file)) toast({ title: "Image copiée", description: "Collez-la dans une autre application." });
        else toast({ title: "Partage indisponible ici", description: "Utilisez « Enregistrer » pour obtenir le fichier." });
      }
    } catch (error) {
      console.error("Partage impossible :", error);
      toast({ variant: "destructive", title: "Partage impossible", description: "Le fichier n'a pas pu être partagé." });
    }
  };

  const save = () => {
    if (downloadAttachment(file)) toast({ title: "Enregistrement lancé", description: "Le fichier arrive dans vos téléchargements." });
    else toast({ variant: "destructive", title: "Enregistrement impossible", description: "Ce fichier n'est pas lisible." });
  };

  const onTouchStart = (event) => {
    touchX.current = zoom > 0 ? null : event.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (event) => {
    if (touchX.current == null) return;
    const delta = (event.changedTouches[0]?.clientX ?? touchX.current) - touchX.current;
    touchX.current = null;
    if (Math.abs(delta) > SWIPE_PX) go(delta > 0 ? -1 : 1);
  };

  const scale = ZOOM_STEPS[zoom];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        aria-describedby="attachment-viewer-desc"
        className="left-0 top-0 flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 p-0 sm:rounded-none data-[state=closed]:slide-out-to-left-0 data-[state=closed]:slide-out-to-top-0 data-[state=open]:slide-in-from-left-0 data-[state=open]:slide-in-from-top-0"
      >
        {file && (
          <>
            <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3 pr-12">
              <div className="min-w-0 flex-1">
                <DialogTitle className="truncate text-base">{file.name || "Pièce jointe"}</DialogTitle>
                <DialogDescription id="attachment-viewer-desc" className="font-mono text-xs">
                  {index + 1} / {files.length}
                </DialogDescription>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {kind === "image" && (
                  <>
                    <Button type="button" variant="ghost" size="icon" aria-label="Réduire" disabled={zoom === 0} onClick={() => setStep(-1)}><ZoomOut className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" aria-label="Agrandir" disabled={zoom === ZOOM_STEPS.length - 1} onClick={() => setStep(1)}><ZoomIn className="h-4 w-4" /></Button>
                  </>
                )}
                <Button type="button" variant="ghost" size="icon" aria-label="Enregistrer le fichier" title="Enregistrer" onClick={save}><Download className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" size="icon" aria-label="Partager" title="Partager" onClick={share}>
                  {native || !(readAttachment(file)?.mime === "image/png") ? <Share2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </header>

            <div
              className="relative min-h-0 flex-1 bg-black/60"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {kind === "image" && (
                <div className="touch-scroll h-full w-full overflow-auto">
                  <div className="grid min-h-full place-items-center p-2" style={{ width: `${scale * 100}%` }}>
                    <img
                      src={file.url}
                      alt={file.name}
                      draggable={false}
                      onDoubleClick={() => setZoom((current) => (current === 0 ? 2 : 0))}
                      onWheel={(event) => event.ctrlKey && setStep(event.deltaY < 0 ? 1 : -1)}
                      className="max-h-full w-full select-none object-contain"
                      style={zoom === 0 ? { maxHeight: "calc(100dvh - 8rem)" } : undefined}
                    />
                  </div>
                </div>
              )}
              {kind === "pdf" && pdfUrl && <iframe title={file.name} src={pdfUrl} className="h-full w-full bg-white" />}
              {kind === "pdf" && !pdfUrl && (
                <div className="grid h-full place-items-center p-6 text-center">
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Ce PDF s'ouvre dans une autre application.</p>
                    <Button type="button" onClick={share}><Share2 className="mr-2 h-4 w-4" /> Ouvrir avec…</Button>
                  </div>
                </div>
              )}
              {!kind && (
                <div className="grid h-full place-items-center p-6 text-center">
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Ce fichier ne peut pas être affiché ici.</p>
                    <Button type="button" onClick={() => openAttachment(file)}><ExternalLink className="mr-2 h-4 w-4" /> Ouvrir</Button>
                  </div>
                </div>
              )}

              {files.length > 1 && (
                <>
                  <Button type="button" variant="secondary" size="icon" aria-label="Pièce jointe précédente" onClick={() => go(-1)} className="absolute left-2 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full opacity-90"><ChevronLeft className="h-5 w-5" /></Button>
                  <Button type="button" variant="secondary" size="icon" aria-label="Pièce jointe suivante" onClick={() => go(1)} className="absolute right-2 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full opacity-90"><ChevronRight className="h-5 w-5" /></Button>
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
