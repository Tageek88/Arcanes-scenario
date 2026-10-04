import React from "react";
import { Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function NoteCard({ note, onEdit, onDelete, onTogglePin }) {
  const updated = note.updated_date
    ? format(new Date(note.updated_date), "d MMM yyyy", { locale: fr })
    : "";

  return (
    <article
      className={cn(
        "glass-panel corner-accent flex flex-col rounded-xl p-4",
        note.pinned && "ring-1 ring-primary/40"
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <h3 className="font-display text-base leading-snug text-foreground">{note.title}</h3>
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
        <p className="mt-2 line-clamp-5 whitespace-pre-wrap text-sm text-muted-foreground">
          {note.content}
        </p>
      ) : (
        <p className="mt-2 text-sm italic text-muted-foreground/70">Note vide.</p>
      )}

      <footer className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3">
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {updated}
        </span>
        <div className="flex items-center gap-1">
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