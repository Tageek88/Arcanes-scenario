import React from "react";
import { Link2, Pencil, Pin, PinOff, StickyNote, Trash2, Unlink } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useExpandedCard } from "@/lib/context/ExpandedCardContext";

/**
 * @param {{ target?: { kindLabel: string, label: string, missing: boolean } | null, onDetach?: (note: any) => void, onAttach?: (note: any) => void }} props
 * `target` : élément sur lequel le post-it est collé (absent pour une note libre).
 */
export default function NoteCard({ note, target, onEdit, onDelete, onTogglePin, onDetach, onAttach }) {
  const { expanded, cardProps } = useExpandedCard(`note:${note.id}`);
  const updated = note.updated_date
    ? format(new Date(note.updated_date), "d MMM yyyy", { locale: fr })
    : "";

  return (
    <article
      {...cardProps}
      className={cn(
        "w-full max-w-full glass-panel corner-accent flex cursor-pointer flex-col rounded-xl p-4",
        note.pinned && "ring-1 ring-primary/40",
        expanded && "ring-2 ring-primary/50"
      )}
    >
      {target && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "tag max-w-full break-words border",
              target.missing ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-amber-500/40 bg-amber-500/10 text-amber-300"
            )}
          >
            <StickyNote className="mr-1.5 h-3 w-3 shrink-0" />
            {target.kindLabel} · {target.label}
          </span>
        </div>
      )}
      <header className="flex items-start justify-between gap-3">
        <h3 className="font-display text-base leading-snug text-foreground break-words min-w-0 flex-1">{note.title}</h3>
        <button
          type="button"
          title={note.pinned ? "Désépingler la note" : "Épingler la note"}
          aria-label={note.pinned ? "Désépingler la note" : "Épingler la note"}
          onClick={() => onTogglePin(note)}
          className={cn(
            "min-touch grid h-11 w-11 shrink-0 place-items-center rounded-md transition-colors md:h-7 md:w-7",
            note.pinned
              ? "text-primary hover:bg-primary/10"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          {note.pinned ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
        </button>
      </header>

      {note.content ? (
        <p className={cn("mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground", !expanded && "line-clamp-5")}>
          {note.content}
        </p>
      ) : (
        <p className="mt-2 text-sm italic text-muted-foreground/70">Note vide.</p>
      )}

      <footer className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground break-words">
          {updated}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {onAttach && (
            <button
              type="button"
              title={target ? "Changer d'élément" : "Rattacher à un élément"}
              aria-label={target ? "Changer l'élément du post-it" : "Rattacher la note à un élément"}
              onClick={() => onAttach(note)}
              className="min-touch grid h-11 w-11 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:h-7 md:w-7"
            >
              <Link2 className="h-3.5 w-3.5" />
            </button>
          )}
          {target && onDetach && (
            <button
              type="button"
              title="Détacher : en faire une note libre"
              aria-label="Détacher le post-it de son élément"
              onClick={() => onDetach(note)}
              className="min-touch grid h-11 w-11 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:h-7 md:w-7"
            >
              <Unlink className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            title="Modifier la note"
            aria-label="Modifier la note"
            onClick={() => onEdit(note)}
            className="min-touch grid h-11 w-11 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:h-7 md:w-7"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Supprimer la note"
            aria-label="Supprimer la note"
            onClick={() => onDelete(note)}
            className="min-touch grid h-11 w-11 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive md:h-7 md:w-7"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </footer>
    </article>
  );
}
