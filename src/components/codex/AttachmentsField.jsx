import React, { useRef, useState } from "react";
import { ExternalLink, FileText, Loader2, Paperclip, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { openAttachment } from "@/lib/services/openAttachment";
import { uploadAttachment } from "@/lib/services/attachments";

const MAX_MB = 10;

export const isImage = (file) => (file?.type || "").startsWith("image/");

export default function AttachmentsField({ value = [], onChange }) {
  const { toast } = useToast();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) return;

    setUploading(true);
    const added = [];
    for (const file of files) {
      const isPdf = file.type === "application/pdf";
      if (!isPdf && !file.type.startsWith("image/")) {
        toast({ variant: "destructive", title: "Format non pris en charge", description: `${file.name} : images et PDF uniquement.` });
        continue;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        toast({ variant: "destructive", title: "Fichier trop lourd", description: `${file.name} dépasse ${MAX_MB} Mo.` });
        continue;
      }
      try {
        added.push(await uploadAttachment(file));
      } catch (error) {
        console.error("Échec du téléversement :", error);
        toast({ variant: "destructive", title: "Téléversement impossible", description: file.name });
      }
    }
    if (added.length > 0) onChange([...(value || []), ...added]);
    setUploading(false);
  };

  const remove = (index) => onChange((value || []).filter((_, i) => i !== index));

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <Label>Cartes et visuels ({(value || []).length})</Label>
        <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Paperclip className="mr-2 h-4 w-4" />}
          {uploading ? "Envoi…" : "Ajouter un fichier"}
        </Button>
      </div>
      <input ref={inputRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={handleFiles} />
      <p className="text-xs text-muted-foreground">Images ou PDF, {MAX_MB} Mo maximum par fichier.</p>

      {(value || []).length > 0 && (
        <ul className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-3">
          {value.map((file, index) => (
            <li key={`${file.url}-${index}`} className="group relative overflow-hidden rounded-lg border border-border bg-secondary/40">
              <button type="button" onClick={() => openAttachment(file)} className="block w-full text-left" title={file.name}>
                {isImage(file) ? (
                  <img src={file.url} alt={file.name} className="h-24 w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-24 flex-col items-center justify-center gap-1 text-muted-foreground">
                    <FileText className="h-6 w-6" />
                    <span className="flex items-center text-xs">Ouvrir le PDF <ExternalLink className="ml-1 h-3 w-3" /></span>
                  </div>
                )}
                <span className="block truncate px-2 py-1 text-xs text-muted-foreground">{file.name}</span>
              </button>
              <button
                type="button"
                aria-label={`Retirer ${file.name}`}
                onClick={() => remove(index)}
                className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-md bg-background/80 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
