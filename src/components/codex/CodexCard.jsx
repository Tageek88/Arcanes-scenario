import React from "react";
import { cn } from "@/lib/utils";
import { Link2, Link2Off, Pencil, Trash2 } from "lucide-react";
import { NPC_ATTITUDE } from "@/lib/sceneMeta";
import { Paperclip } from "lucide-react";
import { isImage } from "@/components/codex/AttachmentsField";
import { openAttachment } from "@/lib/openAttachment";

export default function CodexCard({ kind, entry, linked, onEdit, onDelete, onToggleLink }) {
  const attitude = NPC_ATTITUDE[entry.attitude] || NPC_ATTITUDE.neutre;

  return (
    <div className={cn("flex flex-col rounded-xl border bg-card/50 p-4 transition-colors", linked ? "corner-accent border-primary/50" : "border-border")}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-base font-semibold text-foreground">{entry.name}</h3>
        {kind === "npc" && <span className={cn("tag border", attitude.badge)}>{attitude.label}</span>}
        {kind === "clue" && (
          <span className={cn("tag border", entry.discovered ? "border-played/40 bg-played/10 text-played" : "border-border bg-secondary text-muted-foreground")}>
            {entry.discovered ? "Découvert" : "Caché"}
          </span>
        )}
      </div>

      {(entry.role || entry.type) && (
        <span className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {entry.role || entry.type}
        </span>
      )}
      {entry.description && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{entry.description}</p>}

      {(entry.attachments || []).length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {entry.attachments.slice(0, 3).map((file, index) => (
            <button
              type="button"
              key={`${file.url}-${index}`}
              onClick={() => openAttachment(file)}
              title={file.name}
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              {isImage(file) ? (
                <img src={file.url} alt={file.name} className="h-full w-full object-cover" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </button>
          ))}
          {entry.attachments.length > 3 && (
            <span className="tag border border-border text-muted-foreground">
              <Paperclip className="mr-1 h-3 w-3" /> +{entry.attachments.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {onToggleLink && (
          <button
            type="button"
            onClick={() => onToggleLink(kind, entry.id)}
            className={cn("tag min-touch border transition-colors", linked ? "border-primary/50 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground")}
          >
            {linked ? <Link2 className="mr-1.5 h-3 w-3" /> : <Link2Off className="mr-1.5 h-3 w-3" />}
            {linked ? "Lié à la scène" : "Lier à la scène"}
          </button>
        )}
        <button type="button" aria-label={`Modifier ${entry.name}`} onClick={() => onEdit(kind, entry)} className="tag min-touch border border-border text-muted-foreground transition-colors hover:text-foreground">
          <Pencil className="mr-1.5 h-3 w-3" /> Modifier
        </button>
        <button type="button" aria-label={`Supprimer ${entry.name}`} onClick={() => onDelete(kind, entry)} className="tag min-touch border border-border text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive">
          <Trash2 className="mr-1.5 h-3 w-3" /> Supprimer
        </button>
      </div>
    </div>
  );
}