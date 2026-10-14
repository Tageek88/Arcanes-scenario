import React from "react";
import { Link, useLocation } from "react-router-dom";
import { GitBranch, BookMarked, CalendarDays, Dices, StickyNote, Swords, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTabStacks } from "@/lib/context/TabStackContext";

const TABS = [
  { to: "/", label: "Scènes", icon: GitBranch, tutorial: "tab-arborescence" },
  { to: "/codex", label: "Codex", icon: BookMarked, tutorial: "tab-codex" },
  { to: "/calendrier", label: "Agenda", icon: CalendarDays, tutorial: "tab-calendrier" },
  { to: "/tables", label: "Tables", icon: Dices, tutorial: "tab-tables" },
  { to: "/notes", label: "Notes", icon: StickyNote, tutorial: "tab-notes" },
  { to: "/jeu", label: "Jeu", icon: Swords, tutorial: "tab-system" },
];

export default function MobileNav() {
  const { pathname } = useLocation();
  const { activeTab, openTab, tabTarget } = useTabStacks();

  return (
    <nav 
      data-tutorial="sidebar" 
      className="glass-panel fixed bottom-0 left-0 right-0 z-40 flex w-full items-center justify-between px-2 py-2 pb-[calc(0.5rem_+_env(safe-area-inset-bottom))] md:hidden"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.to;
        return (
          <Link
            key={tab.label}
            to={tabTarget ? tabTarget(tab.to) : tab.to}
            data-tutorial={tab.tutorial}
            aria-label={tab.label}
            aria-current={active ? "page" : undefined}
            onClick={(event) => {
              if (!openTab) return;
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              openTab(tab.to);
            }}
            className={cn(
              "flex flex-1 min-w-0 items-center justify-center rounded-lg py-2 transition-colors",
              active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
          </Link>
        );
      })}
      <Link
        to="/settings"
        data-tutorial="tab-params"
        aria-label="Paramètres"
        aria-current={pathname === "/settings" ? "page" : undefined}
        className={cn(
          "flex flex-1 min-w-0 items-center justify-center rounded-lg py-2 transition-colors",
          pathname === "/settings" || pathname.startsWith("/settings/") ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Settings className="h-5 w-5 shrink-0" />
      </Link>
    </nav>
  );
}