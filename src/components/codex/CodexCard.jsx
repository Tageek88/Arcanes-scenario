import React from "react";
import { cn } from "@/lib/utils";
import { Copy, Link2, Link2Off, MapPin, Paperclip, Pencil, Trash2, Users } from "lucide-react";
import { NPC_ATTITUDE } from "@/lib/meta/sceneMeta";
import { isImage } from "@/components/codex/AttachmentsField";
import { openAttachment } from "@/lib/services/openAttachment";
import { useExpandedCard } from "@/lib/context/ExpandedCardContext";

export default function CodexCard({
  kind,
  entry,
  linked,
  locationLabel,
  relations,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleLink,
}) {
  const attitude = NPC_ATTITUDE[entry.attitude] || NPC_ATTITUDE.neutre;
  const { expanded, cardProps } = useExpandedCard(`codex:${entry.id}`);

  return (
    <div {...cardProps} className={cn("w-full max-w-full flex cursor-pointer flex-col rounded-xl border bg-card/50 p-4 transition-colors overflow-hidden", linked ? "corner-accent border-primary/50" : "border-border", expanded && "ring-2 ring-primary/50")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 overflow-hidden">
          <h3 className="font-display text-base font-semibold text-foreground break-words">{entry.name}</h3>
          {entry.comment && <p className="text-xs italic text-muted-foreground break-words">{entry.comment}</p>}
        </div>
        {kind === "npc" && <span className={cn("tag border shrink-0", attitude.badge)}>{attitude.label}</span>}
        {kind === "clue" && (
          <span className={cn(
            "tag border shrink-0",
            (entry.clue_type === "info" ? entry.known || entry.used : entry.discovered)
              ? "border-played/40 bg-played/10 text-played"
              : "border-border bg-secondary text-muted-foreground"
          )}>
            {entry.clue_type === "info"
              ? `Info · ${entry.known ? "Connue" : "Inconnue"} · ${entry.used ? "Utilisée" : "Non utilisée"}`
              : `Indice · ${entry.discovered ? "Découvert" : "Caché"}`}
          </span>
        )}
      </div>

      {(entry.role || entry.type) && (
        <p className="mt-1 w-full break-all font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {entry.role || entry.type}
        </p>
      )}
      {entry.description && <p className={cn("mt-2 text-sm text-muted-foreground break-words overflow-hidden", !expanded && "line-clamp-3")}>{entry.description}</p>}

      {locationLabel && (
        <p className="mt-2 flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground overflow-hidden">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate break-words">{locationLabel}</span>
        </p>
      )}

      {relations?.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {(expanded ? relations : relations.slice(0, 3)).map((r) => (
            <li key={r.id} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Users className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="truncate break-words overflow-hidden">{r.text}</span>
            </li>
          ))}
          {relations.length > 3 && (
            <li className="pl-[18px] font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              + {relations.length - 3} autre{relations.length - 3 > 1 ? "s" : ""}
            </li>
          )}
        </ul>
      )}

      {(entry.attachments || []).length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(expanded ? entry.attachments : entry.attachments.slice(0, 3)).map((file, index) => (
            <button
              type="button"
              key={`${file.url}-${index}`}
              onClick={() => openAttachment(file)}
              title={file.name}
              className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-secondary/40 text-muted-foreground hover:border-primary/50"
            >
              {isImage(file) ? <img src={file.url} alt={file.name} className="h-full w-full object-cover" loading="lazy" /> : <span className="text-[10px] font-mono uppercase">PDF</span>}
            </button>
          ))}
          {entry.attachments.length > 3 && (
            <span className="tag border border-border text-muted-foreground shrink-0">
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
            className={cn("tag min-touch border transition-colors shrink-0", linked ? "border-primary/50 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:text-foreground")}
          >
            {linked ? <Link2 className="mr-1.5 h-3 w-3" /> : <Link2Off className="mr-1.5 h-3 w-3" />}
            {linked ? "Lié à la scène" : "Lier à la scène"}
          </button>
        )}
        <button type="button" data-tutorial={kind === "npc" ? "codex-edit" : undefined} aria-label={`Modifier ${entry.name}`} onClick={() => onEdit(kind, entry)} className="tag min-touch border border-border text-muted-foreground transition-colors hover:text-foreground shrink-0">
          <Pencil className="mr-1.5 h-3 w-3" /> Modifier
        </button>
        {onDuplicate && (
          <button type="button" aria-label={`Dupliquer ${entry.name}`} onClick={() => onDuplicate(kind, entry)} className="tag min-touch border border-border text-muted-foreground transition-colors hover:text-foreground shrink-0">
            <Copy className="mr-1.5 h-3 w-3" /> Dupliquer
          </button>
        )}
        <button type="button" aria-label={`Supprimer ${entry.name}`} onClick={() => onDelete(kind, entry)} className="tag min-touch border border-border text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive shrink-0">
          <Trash2 className="mr-1.5 h-3 w-3" /> Supprimer
        </button>
      </div>
    </div>
  );
}
