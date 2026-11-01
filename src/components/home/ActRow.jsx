import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Plus, MoreHorizontal, Trash2 } from "lucide-react";
import SceneNode from "@/components/home/SceneNode";
import { SCENE_STATUS } from "@/lib/meta/sceneMeta";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

// Plus proche parent qui défile dans l'axe demandé (la rangée pour l'horizontal, la page pour le vertical).
function scrollParent(element, axis) {
  for (let node = element.parentElement; node && node !== document.body; node = node.parentElement) {
    const style = window.getComputedStyle(node);
    const overflow = axis === "x" ? style.overflowX : style.overflowY;
    const room = axis === "x" ? node.scrollWidth > node.clientWidth + 1 : node.scrollHeight > node.clientHeight + 1;
    if (/(auto|scroll)/.test(overflow) && room) return node;
  }
  return document.scrollingElement || document.documentElement;
}

/**
 * Un acte affiché en ligne (disposition « actes en lignes ») : l'en-tête de l'acte, puis ses scènes de gauche à droite.
 * Même contenu et mêmes actions que `ActColumn`.
 */
export default function ActRow({
  act,
  scenes,
  sceneTitles,
  npcById,
  locationById,
  clueById,
  activeSceneId,
  expanded,
  onSelectScene,
  onOpenScene,
  onCycleStatus,
  onAddScene,
  onRenameAct,
  onDeleteAct,
  onDeleteScene,
}) {
  const ordered = [...scenes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const trackRef = useRef(null);

  // Molette de la souris : sur une rangée qui déborde, elle la fait défiler horizontalement. Aux deux bouts de la rangée,
  // elle redevient le défilement normal de la page (sinon on ne pourrait plus quitter la rangée à la molette).
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;
    const onWheel = (event) => {
      if (event.deltaX !== 0 || event.ctrlKey || event.shiftKey) return;
      if (el.scrollWidth <= el.clientWidth + 1) return;
      const atStart = el.scrollLeft <= 0;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
      if ((event.deltaY < 0 && atStart) || (event.deltaY > 0 && atEnd)) return;
      event.preventDefault();
      el.scrollLeft += event.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Une scène sélectionnée s'élargit (200 ms), puis elle est ramenée dans la zone visible.
  useEffect(() => {
    if (!expanded) return undefined;
    const timer = window.setTimeout(() => {
      const track = trackRef.current;
      const target = track?.querySelector(`[data-scene-id="${activeSceneId}"]`);
      if (!track || !target) return;
      const margin = 24;
      const box = target.getBoundingClientRect();
      const trackBox = track.getBoundingClientRect();
      const left = Math.max(trackBox.left, 0) + margin;
      let right = Math.min(trackBox.right, window.innerWidth) - margin;
      const menu = document.querySelector("aside[data-keep-expanded]");
      if (menu) {
        const menuBox = menu.getBoundingClientRect();
        const sameRow = menuBox.top < trackBox.bottom && menuBox.bottom > trackBox.top;
        if (sameRow && menuBox.left > trackBox.left) right = Math.min(right, menuBox.left - margin);
      }
      let shiftX = 0;
      if (box.left < left) shiftX = box.left - left;
      else if (box.right > right) shiftX = Math.min(box.right - right, box.left - left);
      if (shiftX !== 0) track.scrollBy({ left: shiftX, behavior: "smooth" });
      const top = margin;
      const bottom = window.innerHeight - (window.innerWidth < 768 ? 96 : margin);
      let shiftY = 0;
      if (box.top < top) shiftY = box.top - top;
      else if (box.bottom > bottom) shiftY = Math.min(box.bottom - bottom, box.top - top);
      if (shiftY !== 0) scrollParent(track, "y").scrollBy({ top: shiftY, behavior: "smooth" });
    }, 260);
    return () => window.clearTimeout(timer);
  }, [expanded, activeSceneId]);

  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      <div className="flex items-center gap-2">
        {act ? (
          <input
            defaultValue={act.title}
            onBlur={(e) => {
              const value = e.target.value.trim();
              if (value && value !== act.title) onRenameAct(act.id, value);
            }}
            className="min-w-0 flex-1 bg-transparent font-display text-sm font-semibold text-foreground outline-hidden focus:text-primary"
          />
        ) : (
          <span className="flex-1 font-display text-sm font-semibold text-muted-foreground">Sans acte</span>
        )}
        <span className="shrink-0 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {ordered.length} scène{ordered.length === 1 ? "" : "s"}
        </span>
        {act && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Actions de l'acte" className="h-11 w-11 md:h-7 md:w-7">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onDeleteAct(act)} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Supprimer l'acte
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div ref={trackRef} className="mt-4 flex items-start overflow-x-auto pb-3">
        {ordered.map((scene, i) => {
          const active = scene.id === activeSceneId;
          const first = i === 0;
          const last = i === ordered.length - 1;
          return (
            <div
              key={scene.id}
              data-scene-id={scene.id}
              className={cn("flex shrink-0 flex-col gap-2 pr-3 transition-[width] duration-200", active ? "w-[380px]" : "w-[270px]")}
            >
              <div className="relative h-3">
                {ordered.length > 1 && (
                  <span
                    className="absolute top-1/2 h-px -translate-y-1/2 bg-border"
                    style={{ left: first ? 20 : 0, right: last ? "calc(100% - 20px)" : 0 }}
                  />
                )}
                <span
                  className={cn(
                    "absolute left-5 top-1/2 z-10 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background",
                    (SCENE_STATUS[scene.status] || SCENE_STATUS.brouillon).dot
                  )}
                />
              </div>
              <SceneNode
                scene={scene}
                active={active}
                sceneTitles={sceneTitles}
                npcById={npcById}
                locationById={locationById}
                clueById={clueById}
                onSelect={onSelectScene}
                onOpen={onOpenScene}
                onCycleStatus={onCycleStatus}
                onDelete={onDeleteScene}
              />
            </div>
          );
        })}
        <div className="flex shrink-0 flex-col gap-2">
          {ordered.length > 0 && <div className="h-3" aria-hidden="true" />}
          <Button
            data-tutorial="btn-new-scene"
            variant="ghost"
            size="sm"
            onClick={() => onAddScene(act?.id || null)}
            className="justify-start text-muted-foreground hover:text-primary"
          >
            <Plus className="mr-2 h-4 w-4" /> Scène
          </Button>
        </div>
      </div>
    </div>
  );
}
