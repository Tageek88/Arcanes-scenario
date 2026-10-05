import React, { useEffect, useState } from "react";
import { api } from "@/api/localClient";
import { Pin, Plus, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
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
import { getSelectedCampaignId, setSelectedCampaignId } from "@/lib/campaignStore";
import { useToast } from "@/components/ui/use-toast";
import { useDataRefresh } from "@/lib/RefreshContext";
import PrintButton from "@/components/print/PrintButton";

const EMPTY = { title: "", content: "", pinned: false };

export default function Notes() {
  const { toast } = useToast();
  const { refreshKey: dataRefreshKey } = useDataRefresh();
  const [campaigns, setCampaigns] = useState([]);
  const [campaignId, setCampaignId] = useState(getSelectedCampaignId());
  const [pinnedNotes, setPinnedNotes] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    const run = async () => {
      const res = await api.entities.Campaign.filter({}, { sort: "-created_date", limit: 100 });
      setCampaigns(res.items);
      const stored = getSelectedCampaignId();
      const valid = res.items.some((c) => c.id === stored) ? stored : res.items[0]?.id || "";
      setCampaignId(valid);
      setSelectedCampaignId(valid);
    };
    run();
  }, [dataRefreshKey]);

  useEffect(() => {
    if (!campaignId) {
      setPinnedNotes([]);
      setNotes([]);
      return;
    }
    let alive = true;
    const run = async () => {
      setLoading(true);
      const [pinnedRes, restRes] = await Promise.all([
        api.entities.Note.filter(
          { campaign_id: campaignId, pinned: true },
          { sort: "-updated_date", limit: 50 }
        ),
        api.entities.Note.filter(
          { campaign_id: campaignId, pinned: false },
          { sort: "-updated_date", limit: 100 }
        ),
      ]);
      if (!alive) return;
      setPinnedNotes(pinnedRes.items);
      setNotes(restRes.items);
      setLoading(false);
    };
    run();
    return () => {
      alive = false;
    };
  }, [campaignId, dataRefreshKey]);

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

  const applyNote = (note, replacedId) => {
    setPinnedNotes((list) => {
      const rest = list.filter((n) => n.id !== note.id && n.id !== replacedId);
      return note.pinned ? [note, ...rest] : rest;
    });
    setNotes((list) => {
      const rest = list.filter((n) => n.id !== note.id && n.id !== replacedId);
      return note.pinned ? rest : [note, ...rest];
    });
  };

  const save = async () => {
    if (!form.title.trim() || !campaignId) return;
    const payload = {
      campaign_id: campaignId,
      title: form.title.trim(),
      content: form.content || "",
      pinned: !!form.pinned,
    };
    const optimistic = {
      ...payload,
      id: form.id || `note-${Date.now()}`,
      updated_date: new Date().toISOString(),
    };
    const previous = { pinnedNotes, notes };
    setSaving(true);
    applyNote(optimistic);
    setOpen(false);
    setForm(EMPTY);
    try {
      const saved = form.id
        ? await api.entities.Note.update(form.id, payload)
        : await api.entities.Note.create(payload);
      if (saved?.id) applyNote({ ...optimistic, ...saved }, optimistic.id);
      toast({ title: form.id ? "Note mise à jour" : "Note créée" });
    } catch {
      setPinnedNotes(previous.pinnedNotes);
      setNotes(previous.notes);
      toast({
        variant: "destructive",
        title: "Enregistrement impossible",
        description: "La note n'a pas été enregistrée.",
      });
    } finally {
      setSaving(false);
    }
  };

  const togglePin = async (note) => {
    const previous = { pinnedNotes, notes };
    const pinned = !note.pinned;
    applyNote({ ...note, pinned });
    try {
      await api.entities.Note.update(note.id, { pinned });
      toast({ title: pinned ? "Note épinglée" : "Note désépinglée" });
    } catch {
      setPinnedNotes(previous.pinnedNotes);
      setNotes(previous.notes);
      toast({
        variant: "destructive",
        title: "Épingle non modifiée",
        description: "La note a repris sa place précédente.",
      });
    }
  };

  const removeNote = async () => {
    const pending = pendingDelete;
    setPendingDelete(null);
    if (!pending) return;
    const previous = { pinnedNotes, notes };
    setPinnedNotes((list) => list.filter((n) => n.id !== pending.id));
    setNotes((list) => list.filter((n) => n.id !== pending.id));
    try {
      await api.entities.Note.delete(pending.id);
      toast({ title: "Note supprimée" });
    } catch {
      setPinnedNotes(previous.pinnedNotes);
      setNotes(previous.notes);
      toast({
        variant: "destructive",
        title: "Suppression impossible",
        description: "La note a été rétablie.",
      });
    }
  };

  const isEmpty = pinnedNotes.length === 0 && notes.length === 0;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:px-8 md:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="tag border border-primary/40 text-primary">Bloc-notes</span>
          <h1 className="mt-3 font-display text-3xl font-bold text-foreground">Notes du MJ</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Consignez les idées, les décisions des joueurs et les fils laissés en suspens, pour ne
            rien perdre d'une séance à l'autre.
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          {campaigns.length > 0 && (
            <Select
              value={campaignId}
              onValueChange={(id) => {
                setCampaignId(id);
                setSelectedCampaignId(id);
              }}
            >
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Campagne" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <PrintButton campaignId={campaignId} preset="notes" />
          <Button onClick={openNew} disabled={!campaignId}>
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