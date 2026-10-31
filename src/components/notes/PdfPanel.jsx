import React, { useRef, useState } from "react";
import { FileText, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import useConfirm from "@/hooks/useConfirm";
import { useAttachmentViewer } from "@/hooks/useAttachmentViewer";
import { useCampaignDocuments } from "@/hooks/useCampaignDocuments";
import { MAX_PDF_MB, formatSize } from "@/lib/meta/campaignDocument";

const dateOf = (item) => (item.created_date ? format(new Date(item.created_date), "d MMM yyyy", { locale: fr }) : "");

/**
 * Onglet « PDF » des Notes de MJ : PDF de la campagne gardés dans l'application pour les relire ou les saisir plus tard.
 * @param {{ campaignId: string }} props
 */
export default function PdfPanel({ campaignId }) {
  const { documents, loading, busy, addFiles, rename, remove, readFile } = useCampaignDocuments(campaignId);
  const viewer = useAttachmentViewer();
  const { confirm, confirmDialog } = useConfirm();
  const inputRef = useRef(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", comment: "" });
  const [opening, setOpening] = useState("");

  const pick = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length) await addFiles(files);
  };

  const open = async (document) => {
    setOpening(document.id);
    const file = await readFile(document);
    setOpening("");
    if (file) viewer.open([file], 0);
  };

  const startEdit = (document) => {
    setEditing(document);
    setForm({ name: document.name || "", comment: document.comment || "" });
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    if (!editing) return;
    if (await rename(editing, form)) setEditing(null);
  };

  const askRemove = async (document) => {
    const ok = await confirm({
      title: "Supprimer ce PDF ?",
      description: `« ${document.name} » sera retiré de la campagne. Le fichier d'origine n'est pas touché.`,
      confirmLabel: "Supprimer",
      cancelLabel: "Annuler",
    });
    if (ok) remove(document);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Gardez ici les PDF de la campagne pour les relire ou les saisir plus tard. {MAX_PDF_MB} Mo maximum par fichier.
        </p>
        <Button type="button" disabled={!campaignId || busy} onClick={() => inputRef.current?.click()}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          {busy ? "Envoi…" : "Ajouter un PDF"}
        </Button>
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={pick} />
      </div>

      {!campaignId ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Créez une campagne depuis l'arborescence pour y ajouter des PDF.
        </div>
      ) : loading && documents.length === 0 ? (
        <p className="py-10 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">Chargement…</p>
      ) : documents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <FileText className="mx-auto h-7 w-7 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Aucun PDF pour cette campagne.</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((document) => (
            <li key={document.id} className="glass-panel flex flex-col rounded-xl p-4">
              <button
                type="button"
                onClick={() => open(document)}
                disabled={opening === document.id}
                className="flex min-w-0 items-start gap-3 text-left"
                title="Ouvrir le PDF"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-border bg-secondary/40 text-primary">
                  {opening === document.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words font-display text-sm font-semibold text-foreground">{document.name}</span>
                  <span className="block font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    {formatSize(document.size)} · {dateOf(document)}
                  </span>
                </span>
              </button>
              {document.comment && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{document.comment}</p>}
              <div className="mt-3 flex items-center justify-end gap-1">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Modifier ${document.name}`} onClick={() => startEdit(document)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={`Supprimer ${document.name}`} onClick={() => askRemove(document)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ResponsiveDialog
        open={!!editing}
        onOpenChange={(isOpen) => !isOpen && setEditing(null)}
        title="Modifier le PDF"
        description={editing?.file_name ? `Fichier : ${editing.file_name}` : undefined}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Annuler</Button>
            <Button type="submit" form="pdf-edit-form" disabled={!form.name.trim()}>Enregistrer</Button>
          </>
        }
      >
        <form id="pdf-edit-form" onSubmit={saveEdit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="pdf-name">Nom</Label>
            <Input id="pdf-name" value={form.name} onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pdf-comment">Commentaire</Label>
            <Textarea id="pdf-comment" rows={4} value={form.comment} onChange={(event) => setForm((f) => ({ ...f, comment: event.target.value }))} placeholder="Par exemple : à saisir, chapitre 3…" />
          </div>
        </form>
      </ResponsiveDialog>

      {confirmDialog}
      {viewer.viewer}
    </div>
  );
}
