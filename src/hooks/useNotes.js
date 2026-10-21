import { useEffect, useRef, useState } from "react";
import { api } from "@/api/localClient";
import { useToast } from "@/components/ui/use-toast";
import { useDataRefresh } from "@/lib/context/RefreshContext";
import { dispatchTutorialAction } from "@/utils/tutorialStorage";

export function useNotes(campaignId) {
  const { toast } = useToast();
  const { refreshKey } = useDataRefresh();
  const [pinnedNotes, setPinnedNotes] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const loadedFor = useRef("");

  useEffect(() => {
    if (!campaignId) {
      setPinnedNotes([]);
      setNotes([]);
      setLoading(false);
      return;
    }
    let alive = true;
    const initial = loadedFor.current !== campaignId;
    if (initial) {
      setPinnedNotes([]);
      setNotes([]);
    }
    const run = async () => {
      if (initial) setLoading(true);
      try {
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
        loadedFor.current = campaignId;
      } catch (error) {
        console.error("Chargement des notes impossible :", error);
        if (alive) toast({ variant: "destructive", title: "Notes indisponibles", description: "Impossible de charger les notes de cette campagne." });
      } finally {
        if (alive && initial) setLoading(false);
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, [campaignId, refreshKey, toast]);

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

  const restore = (previous) => {
    setPinnedNotes(previous.pinnedNotes);
    setNotes(previous.notes);
  };

  const saveNote = async (form) => {
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
    try {
      const saved = form.id
        ? await api.entities.Note.update(form.id, payload)
        : await api.entities.Note.create(payload);
      if (saved?.id) applyNote({ ...optimistic, ...saved }, optimistic.id);
      if (!form.id) dispatchTutorialAction("note-created");
      toast({ title: form.id ? "Note mise à jour" : "Note créée" });
    } catch {
      restore(previous);
      toast({ variant: "destructive", title: "Enregistrement impossible", description: "La note n'a pas été enregistrée." });
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
      restore(previous);
      toast({ variant: "destructive", title: "Épingle non modifiée", description: "La note a repris sa place précédente." });
    }
  };

  const deleteNote = async (note) => {
    const previous = { pinnedNotes, notes };
    setPinnedNotes((list) => list.filter((n) => n.id !== note.id));
    setNotes((list) => list.filter((n) => n.id !== note.id));
    try {
      await api.entities.Note.delete(note.id);
      toast({ title: "Note supprimée" });
    } catch {
      restore(previous);
      toast({ variant: "destructive", title: "Suppression impossible", description: "La note a été rétablie." });
    }
  };

  return { pinnedNotes, notes, loading, saving, saveNote, togglePin, deleteNote };
}

