import React from "react";
import { Link, useLocation } from "react-router-dom";
import { GitBranch, BookMarked, CalendarDays, Dices, StickyNote, Settings, Swords } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/", label: "Arborescence", icon: GitBranch, tutorial: "tab-arborescence" },
  { to: "/codex", label: "Codex", icon: BookMarked, tutorial: "tab-codex" },
  { to: "/calendrier", label: "Calendrier", icon: CalendarDays, tutorial: "tab-calendrier" },
  { to: "/tables", label: "Tables", icon: Dices, tutorial: "tab-tables" },
  { to: "/notes", label: "Notes", icon: StickyNote, tutorial: "tab-notes" },
  { to: "/jeu", label: "Jeu", icon: Swords, tutorial: "tab-system" },
];

export default function SideRail() {
  const { pathname } = useLocation();

  return (
    <aside data-tutorial="sidebar" className="glass-panel fixed bottom-[calc(0.75rem_+_env(safe-area-inset-bottom))] left-[calc(0.75rem_+_env(safe-area-inset-left))] top-[calc(0.75rem_+_env(safe-area-inset-top))] z-40 hidden w-12 flex-col items-center gap-2 rounded-xl py-3 md:flex">
      <Link
        to="/"
        title="Arcanes & Scénarios"
        className="mb-1 grid h-8 w-8 place-items-center rounded-md bg-primary font-display text-sm font-bold text-primary-foreground"
      >
        A
      </Link>
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.to;
        return (
          <Link
            key={item.label}
            to={item.to}
            title={item.label}
            data-tutorial={item.tutorial}
            className={cn(
              "grid h-11 w-11 place-items-center rounded-lg transition-colors",
              active
                ? "bg-primary/15 text-primary ring-1 ring-primary/40"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
          </Link>
        );
      })}
      <div className="mt-auto">
        <Link
          to="/settings"
          title="Paramètres"
          data-tutorial="tab-params"
          className={cn(
            "grid h-11 w-11 place-items-center rounded-lg transition-colors",
            pathname === "/settings"
              ? "bg-primary/15 text-primary ring-1 ring-primary/40"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          <Settings className="h-5 w-5" />
        </Link>
      </div>
    </aside>
  );
}