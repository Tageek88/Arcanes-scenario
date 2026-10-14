import { cn } from "@/lib/utils";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { sessionStatusMeta } from "@/lib/meta/sessionMeta";
import { Button } from "@/components/ui/button";

const WEEK_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function MonthGrid({
  month,
  sessionsByDate,
  selectedDate,
  onSelectDay,
  onSelectSession,
  onAddSession,
}) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });

  return (
    <div className="w-full max-w-full overflow-hidden rounded-xl border border-border bg-card/50">
      <div className="grid grid-cols-7 border-b border-border">
        {WEEK_DAYS.map((day) => (
          <div
            key={day}
            className="px-1 py-2 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day, index) => {
          const key = format(day, "yyyy-MM-dd");
          const daySessions = sessionsByDate[key] || [];
          const outside = !isSameMonth(day, month);
          const lastColumn = (index + 1) % 7 === 0;
          const expanded = selectedDate === key;

          return (
            <div
              key={key}
              data-expandable-card={`calendar-day:${key}`}
              aria-expanded={expanded}
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                onSelectDay(day);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectDay(day);
                }
              }}
              className={cn(
                "min-h-[74px] cursor-pointer border-b border-border p-1.5 text-left align-top transition-[background-color,box-shadow] hover:bg-secondary/40 sm:min-h-[116px]",
                !lastColumn && "border-r",
                outside && "bg-background/40",
                expanded && "relative z-10 rounded-lg bg-card shadow-lg ring-2 ring-primary/60"
              )}
              aria-label={`${format(day, "d MMMM yyyy")} : ${daySessions.length} session${daySessions.length === 1 ? "" : "s"}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "font-mono text-sm",
                    isToday(day)
                      ? "flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground sm:h-5 sm:w-5"
                      : outside
                        ? "text-muted-foreground/50"
                        : "text-muted-foreground"
                  )}
                >
                  {format(day, "d")}
                </span>
                {daySessions.length > 0 && (
                  <span className="font-mono text-xs text-muted-foreground">
                    {daySessions.length}
                  </span>
                )}
              </div>

              <div className="mt-1 space-y-1">
                {(expanded ? daySessions : daySessions.slice(0, 3)).map((session) => {
                  const meta = sessionStatusMeta(session.status);
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSession(session);
                      }}
                      className={cn(
                        "min-touch flex w-full items-center gap-1.5 rounded border px-1.5 py-1 text-left text-xs transition-opacity hover:opacity-80",
                        meta.badge
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta.dot)} />
                      {session.time && (
                        <span className="shrink-0 font-mono text-xs">{session.time}</span>
                      )}
                      <span className="hidden truncate sm:inline">{session.title}</span>
                    </button>
                  );
                })}
                {daySessions.length > 3 && (
                  <span className="block px-1 font-mono text-xs text-muted-foreground">
                    +{daySessions.length - 3}
                  </span>
                )}
              </div>
              {expanded && (
                <div className="mt-2 space-y-2 border-t border-border pt-2">
                  {daySessions.length === 0 ? (
                    <p className="px-1 text-xs text-muted-foreground">Aucune session prévue ce jour.</p>
                  ) : (
                    daySessions.map((session) => {
                      const meta = sessionStatusMeta(session.status);
                      return (
                        <button
                          key={`detail-${session.id}`}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onSelectSession(session);
                          }}
                          className="block w-full rounded-md border border-border bg-background/80 p-2 text-left hover:border-primary/50"
                        >
                          <span className="flex flex-wrap items-center justify-between gap-1">
                            <span className="font-display text-xs font-semibold text-foreground">
                              {session.time ? `${session.time} · ` : ""}{session.title}
                            </span>
                            <span className={cn("tag border text-[10px]", meta.badge)}>{meta.label}</span>
                          </span>
                          {session.location && <span className="mt-1 block text-xs text-muted-foreground">{session.location}</span>}
                          {session.notes && <span className="mt-1 block whitespace-pre-wrap text-xs text-muted-foreground">{session.notes}</span>}
                        </button>
                      );
                    })
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-full justify-start text-xs"
                    onClick={(event) => {
                      event.stopPropagation();
                      onAddSession(day);
                    }}
                  >
                    + Planifier une session
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
