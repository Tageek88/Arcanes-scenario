import React from "react";
import { useLocation } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useTabStacks } from "@/lib/context/TabStackContext";

const SECTIONS = {
  "/": "Arcanes & Scénarios",
  "/codex": "Codex",
  "/jeu": "Système de jeu",
  "/notes": "Notes de MJ",
  "/tables": "Tables",
  "/calendrier": "Agenda",
  "/settings": "Paramètres",
};

export default function MobileBackBar() {
  const { pathname } = useLocation();
  const { activeTab, openTab } = useTabStacks();

  if (pathname === "/") {
    return (
      <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/90 px-4 py-2 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
        <span className="grid h-6 w-6 place-items-center rounded bg-primary font-display text-xs font-bold text-primary-foreground">
          A
        </span>
        <span className="font-display text-sm font-semibold text-foreground">
          {SECTIONS["/"]}
        </span>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-30 flex items-center gap-1 border-b border-border bg-background/90 px-1 py-1 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
      <button
        type="button"
        aria-label="Retour"
        onClick={() => openTab(activeTab)}
        className="grid h-11 w-11 place-items-center rounded-lg text-muted-foreground transition-colors active:bg-secondary"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        {SECTIONS[pathname] || "Retour"}
      </span>
    </div>
  );
}