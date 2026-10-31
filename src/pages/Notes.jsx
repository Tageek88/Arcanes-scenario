import React, { useMemo, useState } from "react";
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
import AttachNoteDialog from "@/components/notes/AttachNoteDialog";
import PrintButton from "@/components/print/PrintButton";
import CampaignSelect from "@/components/common/CampaignSelect";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useQuests } from "@/hooks/useQuests";
import QuestSelect from "@/components/common/QuestSelect";
import { useNotes } from "@/hooks/useNotes";
import NotesFilterBar from "@/components/notes/NotesFilterBar";
import { noteTarget } from "@/lib/meta/postit";

const EMPTY = { title: "", content: "", pinned: false };

export default function Notes() {
  const { campaigns, campaignId, selectCampaign } = useCampaigns();
  const { quests, questId, selectQuest } = useQuests(campaignId);
  const { pinnedNotes: allPinned, notes: allNotes, loading, saving, targets, saveNote, togglePin, deleteNote, detach, attach } = useNotes(campaignId);
  const [show, setShow] = useState("all");
  const [element, setElement] = useState("");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [attaching, setAttaching] = useState(null);

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

  // Filtre : notes libres, post-it collés, post-it orphelins, ou ceux d'un élément précis (parties comprises).
  const matches = (note) => {
    const target = noteTarget(note);
    if (show === "free" && target) return false;
    if (show === "postit" && !target) return false;
    if (show === "orphans" && !(target && targets.get(note.id)?.missing)) return false;
    if (element && !(target && `${target.kind}:${target.id}` === element)) return false;
    return true;
  };
  const pinnedNotes = useMemo(() => allPinned.filter(matches), [allPinned, show, element, targets]); // eslint-disable-line react-hooks/exhaustive-deps
  const notes = useMemo(() => allNotes.filter(matches), [allNotes, show, element, targets]); // eslint-disable-line react-hooks/exhaustive-deps
  const everything = [...allPinned, ...allNotes];
  const hasPostIts = everything.some((note) => noteTarget(note));
  const isEmpty = everything.length === 0;
  const nothingShown = !isEmpty && pinnedNotes.length === 0 && notes.length === 0;

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
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <CampaignSelect
            campaigns={campaigns}
            value={campaignId}
            onValueChange={selectCampaign}
          />
          <QuestSelect quests={quests} value={questId} onValueChange={selectQuest} />
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
          {hasPostIts && (
            <NotesFilterBar notes={everything} targets={targets} show={show} onShow={setShow} element={element} onElement={setElement} />
          )}
          {nothingShown && <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Aucune note ne correspond à ce filtre.</p>}
          {pinnedNotes.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary">
                <Pin className="h-3.5 w-3.5" /> Épinglées
              </h2>
              <div className="-m-1 w-[calc(100%+0.5rem)] max-w-none overflow-hidden p-1 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pinnedNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    target={targets.get(note.id)}
                    onEdit={openEdit}
                    onDelete={setPendingDelete}
                    onTogglePin={togglePin}
                    onDetach={detach}
                    onAttach={setAttaching}
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
              <div className="-m-1 w-[calc(100%+0.5rem)] max-w-none overflow-hidden p-1 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {notes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    target={targets.get(note.id)}
                    onEdit={openEdit}
                    onDelete={setPendingDelete}
                    onTogglePin={togglePin}
                    onDetach={detach}
                    onAttach={setAttaching}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <AttachNoteDialog note={attaching} campaignId={campaignId} onClose={() => setAttaching(null)} onAttach={attach} />
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
