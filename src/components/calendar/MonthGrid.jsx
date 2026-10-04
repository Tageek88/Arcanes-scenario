import React from "react";
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
import { sessionStatusMeta } from "@/lib/sessionMeta";

const WEEK_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function MonthGrid({ month, sessionsByDate, onSelectDay, onSelectSession }) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/50">
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

          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              onClick={() => onSelectDay(day)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSelectDay(day);
              }}
              className={cn(
                "min-h-[74px] cursor-pointer border-b border-border p-1.5 transition-colors hover:bg-secondary/40 sm:min-h-[116px]",
                !lastColumn && "border-r",
                outside && "bg-background/40"
              )}
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
                {daySessions.slice(0, 3).map((session) => {
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
            </div>
          );
        })}
      </div>
    </div>
  );
}