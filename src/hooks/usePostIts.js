import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/api/localClient";
import { useToast } from "@/components/ui/use-toast";
import { useDataRefresh } from "@/lib/context/RefreshContext";
import { countNotes, isFreeNote, postItTitle, targetFields } from "@/lib/meta/postit";
import { ensurePartIds } from "@/lib/services/notes";

/**
 * Post-it (notes collées sur un élément) d'une campagne : liste, comptes par élément, ajout, modification, suppression.
 * Les notes libres de la page « Notes de MJ » ne sont pas chargées ici.
 * @param {string} campaignId
 */
export function usePostIts(campaignId) {
  const { toast } = useToast();
  const { refreshKey } = useDataRefresh();
  const [notes, setNotes] = useState(/** @type {any[]} */ ([]));

  useEffect(() => {
    if (!campaignId) {
      setNotes([]);
      return undefined;
    }
    let alive = true;
    api.entities.Note.filter({ campaign_id: campaignId }, { sort: "-updated_date", limit: 5000 })
      .then(({ items }) => { if (alive) setNotes(items.filter((note) => !isFreeNote(note))); })
      .catch((error) => {
        console.error("Chargement des post-it impossible :", error);
        if (alive) toast({ variant: "destructive", title: "Post-it indisponibles", description: "Impossible de charger les post-it de cette campagne." });
      });
    return () => { alive = false; };
  }, [campaignId, refreshKey, toast]);

  const counts = useMemo(() => countNotes(notes), [notes]);

  const run = useCallback(async (task, failure) => {
    try {
      return await task();
    } catch (error) {
      console.error(`${failure.log} :`, error);
      toast({ variant: "destructive", title: failure.title, description: failure.description });
      return null;
    }
  }, [toast]);

  /** Colle un post-it sur une cible. Renvoie vrai en cas de succès. */
  const add = useCallback(async (target, content) => {
    const text = String(content ?? "").trim();
    if (!campaignId || !text) return false;
    const saved = await run(
      () => api.entities.Note.create({ campaign_id: campaignId, title: postItTitle(text), content: text, pinned: false, ...targetFields(target) }),
      { log: "Ajout du post-it impossible", title: "Post-it non enregistré", description: "Le post-it n'a pas été enregistré." }
    );
    if (saved) setNotes((list) => [saved, ...list]);
    return Boolean(saved);
  }, [campaignId, run]);

  const update = useCallback(async (note, content) => {
    const text = String(content ?? "").trim();
    if (!text) return false;
    const saved = await run(
      () => api.entities.Note.update(note.id, { title: postItTitle(text), content: text }),
      { log: "Modification du post-it impossible", title: "Post-it non modifié", description: "Le post-it n'a pas été modifié." }
    );
    if (saved) setNotes((list) => list.map((item) => (item.id === note.id ? { ...item, ...saved } : item)));
    return Boolean(saved);
  }, [run]);

  const remove = useCallback(async (note) => {
    const done = await run(
      async () => { await api.entities.Note.delete(note.id); return true; },
      { log: "Suppression du post-it impossible", title: "Suppression impossible", description: "Le post-it n'a pas été supprimé." }
    );
    if (done) setNotes((list) => list.filter((item) => item.id !== note.id));
    return Boolean(done);
  }, [run]);

  /**
   * Cible d'un post-it sur une compétence ou un équipement qui n'a pas encore d'identifiant : la fiche reçoit ses
   * identifiants (une seule fois), puis la cible est renvoyée. Null en cas d'échec.
   */
  const resolvePart = useCallback(async (kind, id, partKind, index, name) => {
    const lists = await run(
      () => ensurePartIds(kind, id),
      { log: "Identification de la fiche impossible", title: "Post-it impossible", description: "La fiche n'a pas pu être préparée pour recevoir un post-it." }
    );
    if (!lists) return null;
    const list = partKind === "skill" ? lists.skills : lists.equipment;
    const item = list[index]?.name === name ? list[index] : list.find((entry) => entry?.name === name);
    return item?.id ? { kind, id, partKind, partId: item.id } : null;
  }, [run]);

  return { notes, counts, add, update, remove, resolvePart };
}
