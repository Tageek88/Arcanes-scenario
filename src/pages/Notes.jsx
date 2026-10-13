import React, { useState } from "react";
import { Pin, Plus, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import NoteCard from "@/components/notes/NoteCard";
import NoteEditor from "@/components/notes/NoteEditor";
import PrintButton from "@/components/print/PrintButton";
import CampaignSelect from "@/components/common/CampaignSelect";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useNotes } from "@/hooks/useNotes";

const EMPTY = { title: "", content: "", pinned: false };

export default function Notes() {
  const { campaigns, campaignId, selectCampaign } = useCampaigns();
  const { pinnedNotes, notes, loading, saving, saveNote, togglePin, deleteNote } = useNotes(campaignId);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [pendingDelete, setPendingDelete] = useState(null);

  const openNew = () => {
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (note) => {
    setForm({
      id: note.id,
      title: note.title || "",
      content: note.content || "",
      pinned: !!note.pinned,
    });
    setOpen(true);
  };

  const save = () => {
    if (!form.title.trim() || !campaignId) return;
    const values = form;
    setOpen(false);
    setForm(EMPTY);
    saveNote(values);
  };

  const removeNote = () => {
    const pending = pendingDelete;
    setPendingDelete(null);
    if (pending) deleteNote(pending);
  };

  const isEmpty = pinnedNotes.length === 0 && notes.length === 0;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="tag border border-primary/40 text-primary">Bloc-notes</span>
          <h1 data-tutorial="notes-title" className="mt-3 font-display text-3xl font-bold text-foreground">Notes du MJ</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Consignez les idées, les décisions des joueurs et les fils laissés en suspens, pour ne
            rien perdre d'une séance à l'autre.
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <CampaignSelect
            campaigns={campaigns}
            value={campaignId}
            onValueChange={selectCampaign}
          />
          <PrintButton campaignId={campaignId} preset="notes" />
          <Button data-tutorial="notes-new" onClick={openNew} disabled={!campaignId}>
            <Plus className="mr-2 h-4 w-4" /> Nouvelle note
          </Button>
        </div>
      </header>

      {!campaignId ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Créez une campagne depuis l'arborescence pour commencer votre bloc-notes.
        </div>
      ) : loading ? (
        <p className="py-10 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Chargement…
        </p>
      ) : isEmpty ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <StickyNote className="mx-auto h-7 w-7 text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Aucune note pour le moment.</p>
          <Button className="mt-5" onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" /> Nouvelle note
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {pinnedNotes.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary">
                <Pin className="h-3.5 w-3.5" /> Épinglées
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pinnedNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onEdit={openEdit}
                    onDelete={setPendingDelete}
                    onTogglePin={togglePin}
                  />
                ))}
              </div>
            </section>
          )}

          {notes.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {pinnedNotes.length > 0 ? "Autres notes" : "Toutes les notes"}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {notes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onEdit={openEdit}
                    onDelete={setPendingDelete}
                    onTogglePin={togglePin}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <NoteEditor
        open={open}
        onOpenChange={setOpen}
        form={form}
        setForm={setForm}
        saving={saving}
        onSave={save}
        isEditing={!!form.id}
      />

      <AlertDialog open={!!pendingDelete} onOpenChange={(isOpen) => !isOpen && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              La note « {pendingDelete?.title} » sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={removeNote}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
