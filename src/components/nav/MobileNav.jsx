import React, { useEffect, useState } from "react";
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
  const { activeTab, openTab, tabTarget } = useTabStacks();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Cacher si on scroll vers le bas (et qu'on est assez bas)
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } 
      // Montrer si on scroll vers le haut
      else if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Réinitialiser la visibilité quand on change de page
  useEffect(() => {
    setIsVisible(true);
    setLastScrollY(0);
  }, [location.pathname]);

  return (
    <nav 
      data-tutorial="sidebar" 
      className={cn(
        "glass-panel fixed bottom-0 left-0 right-0 z-40 flex items-stretch justify-around rounded-t-2xl pb-[env(safe-area-inset-bottom)] md:hidden transition-transform duration-300 ease-in-out",
        isVisible ? "translate-y-0" : "translate-y-full"
      )}
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.to;
        return (
          <Link
            key={tab.label}
            to={tabTarget ? tabTarget(tab.to) : tab.to}
            data-tutorial={tab.tutorial}
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
      <Link
        to="/settings"
        data-tutorial="tab-params"
        aria-label="Paramètres"
        className="flex flex-1 flex-col items-center gap-1 py-3 text-muted-foreground"
      >
        <Settings className="h-5 w-5" />
        <span className="font-mono text-xs uppercase tracking-wider">Paramètres</span>
      </Link>
    </nav>
  );
}