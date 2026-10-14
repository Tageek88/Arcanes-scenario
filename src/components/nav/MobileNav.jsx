import React, { useEffect, useState, useRef } from "react";
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
  const lastScrollY = useRef(0);
  const scrollThreshold = 150; // Seulement après 150px de scroll

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const scrollDiff = currentScrollY - lastScrollY.current;
          
          // Cacher seulement si on descend significativement et qu'on est assez bas
          if (scrollDiff > 5 && currentScrollY > scrollThreshold) {
            setIsVisible(false);
          } 
          // Montrer si on monte ou si on est en haut
          else if (scrollDiff < -5 || currentScrollY < scrollThreshold) {
            setIsVisible(true);
          }
          
          lastScrollY.current = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Réinitialiser la visibilité quand on change de page
  useEffect(() => {
    setIsVisible(true);
    lastScrollY.current = 0;
  }, [location.pathname]);

  return (
    <nav 
      data-tutorial="sidebar" 
      className={cn(
        "glass-panel fixed bottom-0 left-0 right-0 z-40 flex items-stretch justify-around rounded-t-2xl pb-[env(safe-area-inset-bottom)] md:hidden",
        "transition-all duration-300 ease-in-out will-change-transform",
        isVisible 
          ? "translate-y-0 opacity-100" 
          : "translate-y-[calc(100%+env(safe-area-inset-bottom))] opacity-0"
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