import React, { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import LinkPicker from "@/components/home/LinkPicker";
import useConfirm from "@/hooks/useConfirm";
import { JOURNAL_LIMITS, cleanJournal, scenesToMarkPlayed } from "@/lib/meta/sessionJournal";
import { dateKey } from "@/lib/meta/sessionMeta";

const toggle = (list, id) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);

function formatDate(value) {
  try {
    return format(parseISO(dateKey(value)), "EEEE d MMMM yyyy", { locale: fr });
  } catch {
    return String(value || "");
  }
}

/**
 * Compte rendu d'une séance : résumé, scènes jouées, PNJ rencontrés, indices découverts, à retenir pour la suite.
 * Les scènes cochées encore en brouillon peuvent être passées en « joué » : une confirmation est demandée à l'enregistrement.
 * @param {{ session: any, scenes: any[], npcs: any[], clues: any[], saving: boolean, onSave: (session: any, journal: any, markPlayedIds: string[]) => Promise<boolean> }} props
 */
export default function SessionJournalDialog({ open, onOpenChange, session, scenes, npcs, clues, saving, onSave }) {
  const { confirm, confirmDialog } = useConfirm();
  const [draft, setDraft] = useState(() => cleanJournal(null));

  useEffect(() => {
    if (open) setDraft(cleanJournal(session?.journal));
    // Le brouillon repart du journal enregistré à chaque ouverture, pas à chaque rechargement des données.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, session?.id]);

  const sceneItems = useMemo(
    () => scenes.map((scene) => ({ id: scene.id, title: scene.quest_title ? `${scene.title} · ${scene.quest_title}` : scene.title })),
    [scenes]
  );

  const save = async () => {
    if (!session) return;
    const toMark = scenesToMarkPlayed(draft.scene_ids, scenes);
    let markIds = [];
    if (toMark.length > 0) {
      const names = toMark.map((scene) => `« ${scene.title} »`).join(", ");
      const yes = await confirm({
        title: toMark.length > 1 ? `Marquer ces ${toMark.length} scènes comme jouées ?` : "Marquer cette scène comme jouée ?",
        description: `${names} ${toMark.length > 1 ? "passeront" : "passera"} de « Brouillon » à « Joué » dans l'arborescence.`,
        confirmLabel: "Marquer comme jouées",
        cancelLabel: "Non, garder le statut",
      });
      if (yes) markIds = toMark.map((scene) => scene.id);
    }
    if (await onSave(session, draft, markIds)) onOpenChange(false);
  };

  const footer = (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" onClick={() => onOpenChange(false)}>
        Annuler
      </Button>
      <Button onClick={save} disabled={saving || !session}>
        {saving ? "Enregistrement…" : "Enregistrer le journal"}
      </Button>
    </div>
  );

  return (
    <>
      <ResponsiveDialog
        open={open}
        onOpenChange={onOpenChange}
        title={session ? `Journal — ${session.title}` : "Journal de séance"}
        description={session ? formatDate(session.date) : ""}
        footer={footer}
      >
        <div className="stack-y-4 py-1">
          <div className="stack-y-2">
            <Label htmlFor="journal-summary">Ce qui s'est passé</Label>
            <Textarea
              id="journal-summary"
              rows={7}
              maxLength={JOURNAL_LIMITS.summary}
              value={draft.summary}
              onChange={(event) => setDraft((d) => ({ ...d, summary: event.target.value }))}
              placeholder="Le résumé de la séance, les décisions des joueurs, les moments forts…"
            />
          </div>
          <LinkPicker
            label="Scènes jouées"
            items={sceneItems}
            selected={draft.scene_ids}
            onToggle={(id) => setDraft((d) => ({ ...d, scene_ids: toggle(d.scene_ids, id) }))}
            emptyText="Cette campagne n'a pas encore de scène."
          />
          <LinkPicker
            label="PNJ rencontrés"
            items={npcs}
            selected={draft.npc_ids}
            onToggle={(id) => setDraft((d) => ({ ...d, npc_ids: toggle(d.npc_ids, id) }))}
            emptyText="Cette campagne n'a pas encore de PNJ."
          />
          <LinkPicker
            label="Indices découverts"
            items={clues}
            selected={draft.clue_ids}
            onToggle={(id) => setDraft((d) => ({ ...d, clue_ids: toggle(d.clue_ids, id) }))}
            emptyText="Cette campagne n'a pas encore d'indice."
          />
          <div className="stack-y-2">
            <Label htmlFor="journal-next">À retenir pour la suite</Label>
            <Textarea
              id="journal-next"
              rows={3}
              maxLength={JOURNAL_LIMITS.next}
              value={draft.next}
              onChange={(event) => setDraft((d) => ({ ...d, next: event.target.value }))}
              placeholder="Fils laissés ouverts, promesses faites, ce qu'il faut préparer pour la prochaine fois…"
            />
          </div>
        </div>
      </ResponsiveDialog>
      {confirmDialog}
    </>
  );
}
