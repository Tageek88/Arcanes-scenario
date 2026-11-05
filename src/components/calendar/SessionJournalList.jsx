import React from "react";
import { BookOpenText } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { hasJournal, journalExcerpt } from "@/lib/meta/sessionJournal";
import { dateKey, sessionStatusMeta } from "@/lib/meta/sessionMeta";

function shortDate(value) {
  try {
    return format(parseISO(dateKey(value)), "d MMM yyyy", { locale: fr });
  } catch {
    return String(value || "");
  }
}

/** Journal de la campagne : séances jouées ou commencées, les plus récentes d'abord. Un clic ouvre le compte rendu. */
export default function SessionJournalList({ entries, loading, onOpen }) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-4" data-tutorial="calendar-journal">
      <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-foreground">
        <BookOpenText className="h-4 w-4 text-muted-foreground" aria-hidden="true" /> Journal de la campagne
      </h2>
      {entries.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          {loading ? "Chargement…" : "Pas encore de compte rendu. Ouvrez une session, puis « Journal de séance », pour garder la trace de la partie."}
        </p>
      ) : (
        <ul className="mt-3 stack-y-2">
          {entries.map((session) => {
            const meta = sessionStatusMeta(session.status);
            const written = hasJournal(session);
            const excerpt = journalExcerpt(session);
            return (
              <li key={session.id}>
                <button
                  type="button"
                  onClick={() => onOpen(session)}
                  className="flex w-full items-start gap-3 rounded-lg border border-border bg-background/60 p-3 text-left transition-colors hover:border-primary/40"
                >
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", meta.dot)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-sm font-semibold text-foreground">{session.title}</span>
                    <span className="mt-0.5 block font-mono text-xs uppercase tracking-wider text-muted-foreground">{shortDate(session.date)}</span>
                    <span className={cn("mt-1 block text-xs", written ? "text-muted-foreground" : "italic text-muted-foreground")}>
                      {written ? excerpt || "Compte rendu sans résumé." : "Compte rendu à écrire."}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
