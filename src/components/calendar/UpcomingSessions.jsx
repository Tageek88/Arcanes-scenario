import React from "react";
import { cn } from "@/lib/utils";
import { CalendarPlus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { dateKey, sessionStatusMeta } from "@/lib/sessionMeta";

export default function UpcomingSessions({ sessions, onOpen, onAdd }) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold text-foreground">Prochaines sessions</h2>
        <Button size="sm" variant="ghost" onClick={onAdd} className="text-muted-foreground hover:text-primary">
          <CalendarPlus className="mr-1 h-4 w-4" /> Planifier
        </Button>
      </div>

      {sessions.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          Aucune session à venir. Cliquez sur une date du calendrier pour en planifier une.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {sessions.map((session) => {
            const meta = sessionStatusMeta(session.status);
            let label = "";
            try {
              label = format(parseISO(dateKey(session.date)), "EEE d MMM", { locale: fr });
            } catch {
              label = session.date;
            }
            return (
              <li key={session.id}>
                <button
                  type="button"
                  onClick={() => onOpen(session)}
                  className="flex w-full items-center gap-3 rounded-lg border border-border bg-background/60 p-3 text-left transition-colors hover:border-primary/40"
                >
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", meta.dot)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-sm font-semibold text-foreground">
                      {session.title}
                    </span>
                    <span className="mt-0.5 block font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      {label}
                      {session.time ? ` · ${session.time}` : ""}
                      {session.location ? ` · ${session.location}` : ""}
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