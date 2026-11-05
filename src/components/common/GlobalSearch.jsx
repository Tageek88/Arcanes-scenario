import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Dices, GitBranch, Layers, MapPin, Puzzle, Search, StickyNote, Users } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import { searchAll } from "@/lib/services/globalSearch";
import { setPendingOpen, subscribeSearchRequest } from "@/lib/context/searchStore";

// Page où se trouve chaque type d'élément, et son icône.
const KINDS = {
  scene: { to: "/", icon: GitBranch },
  act: { to: "/", icon: Layers },
  npc: { to: "/codex", icon: Users },
  location: { to: "/codex", icon: MapPin },
  clue: { to: "/codex", icon: Puzzle },
  note: { to: "/notes", icon: StickyNote },
  table: { to: "/tables", icon: Dices },
  session: { to: "/calendrier", icon: CalendarDays },
};

/**
 * Recherche dans toute la campagne sélectionnée : Ctrl+K (ou Cmd+K), ou le bouton loupe.
 * Choisir un résultat ouvre la page de l'élément, qui l'affiche (voir `searchStore`).
 */
export default function GlobalSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef(null);
  const { data, loading, hasCampaign } = useGlobalSearch(open);

  useEffect(() => {
    const onKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    const stop = subscribeSearchRequest(() => setOpen(true));
    return () => {
      window.removeEventListener("keydown", onKey);
      stop();
    };
  }, []);

  const groups = useMemo(() => searchAll(data, term), [data, term]);
  const flat = useMemo(() => groups.flatMap((group) => group.items), [groups]);

  useEffect(() => setActive(0), [term]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onOpenChange = (next) => {
    setOpen(next);
    if (!next) setTerm("");
  };

  const choose = (item) => {
    if (!item) return;
    setPendingOpen(item.kind, item.id);
    onOpenChange(false);
    navigate(KINDS[item.kind].to);
  };

  const onKeyDown = (event) => {
    if (flat.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (index + 1) % flat.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index - 1 + flat.length) % flat.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(flat[active]);
    }
  };

  let position = -1;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[12%] translate-y-0 gap-0 p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">Recherche dans la campagne</DialogTitle>
        <DialogDescription className="sr-only">
          Tapez pour chercher dans les scènes, actes, PNJ, lieux, indices, notes, tables et séances. Flèches pour choisir, Entrée pour ouvrir.
        </DialogDescription>
        <div className="flex items-center gap-2 border-b border-border px-4 py-3 pr-12">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            autoFocus
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Chercher dans la campagne…"
            role="combobox"
            aria-expanded={flat.length > 0}
            aria-controls="global-search-list"
            aria-activedescendant={flat.length > 0 ? `global-search-${active}` : undefined}
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div ref={listRef} id="global-search-list" role="listbox" className="max-h-[60vh] overflow-y-auto p-2">
          {!hasCampaign && <p className="px-3 py-6 text-center text-sm text-muted-foreground">Aucune campagne sélectionnée.</p>}
          {hasCampaign && !term.trim() && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {loading ? "Chargement…" : "Scènes, actes, PNJ, lieux, indices, notes, tables et séances (journal compris) de la campagne."}
            </p>
          )}
          {hasCampaign && term.trim() && flat.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{loading ? "Chargement…" : "Aucun résultat."}</p>
          )}
          {groups.map((group) => (
            <div key={group.key} role="group" aria-label={group.label} className="mb-1">
              <div className="px-3 pb-1 pt-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                {group.label}
                {group.total > group.items.length ? ` (${group.items.length} sur ${group.total})` : ""}
              </div>
              {group.items.map((item) => {
                position += 1;
                const index = position;
                const Icon = KINDS[item.kind].icon;
                return (
                  <button
                    key={`${item.kind}:${item.id}`}
                    type="button"
                    role="option"
                    id={`global-search-${index}`}
                    data-index={index}
                    aria-selected={index === active}
                    onMouseMove={() => setActive(index)}
                    onClick={() => choose(item)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition-colors",
                      index === active ? "bg-primary/15 text-foreground" : "text-foreground/90 hover:bg-secondary"
                    )}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {item.title}
                        {item.detail && <span className="ml-2 font-normal text-muted-foreground">{item.detail}</span>}
                      </span>
                      {item.snippet && <span className="block truncate text-xs text-muted-foreground">{item.snippet}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="hidden border-t border-border px-4 py-2 text-xs text-muted-foreground md:block">
          ↑ ↓ choisir · Entrée ouvrir · Échap fermer
        </div>
      </DialogContent>
    </Dialog>
  );
}
