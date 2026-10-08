import React from "react";

import { Link } from "react-router-dom";
import { GitBranch, BookMarked, CalendarDays, Dices, StickyNote, Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTabStacks } from "@/lib/TabStackContext";

const TABS = [
  { to: "/", label: "Scènes", icon: GitBranch },
  { to: "/codex", label: "Codex", icon: BookMarked },
  { to: "/calendrier", label: "Agenda", icon: CalendarDays },
  { to: "/tables", label: "Tables", icon: Dices },
  { to: "/notes", label: "Notes", icon: StickyNote },
  { to: "/jeu", label: "Jeu", icon: Swords },
];

export default function MobileNav() {
  const { activeTab, openTab, tabTarget } = useTabStacks();

  return (
    <nav className="glass-panel fixed bottom-0 left-0 right-0 z-40 flex items-stretch justify-around rounded-t-2xl pb-[env(safe-area-inset-bottom)] md:hidden">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.to;
        return (
          <Link
            key={tab.label}
            to={tabTarget ? tabTarget(tab.to) : tab.to}
            aria-current={active ? "page" : undefined}
            onClick={(event) => {
              if (!openTab) return;
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              openTab(tab.to);
            }}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-3",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="font-mono text-xs uppercase tracking-wider">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}