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

export default function ActColumn({
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
  const columnRef = useRef(null);

  // Une scène sélectionnée : la colonne s'élargit (200 ms), puis elle est ramenée dans la zone visible.
  useEffect(() => {
    if (!expanded) return undefined;
    const timer = window.setTimeout(() => {
      const column = columnRef.current;
      if (!column) return;
      const margin = 24;
      // Plus proche parent qui défile dans l'axe demandé (le tableau pour l'horizontal, la page ou son conteneur pour le vertical).
      const scroller = (axis) => {
        for (let node = column.parentElement; node && node !== document.body; node = node.parentElement) {
          const style = window.getComputedStyle(node);
          const overflow = axis === "x" ? style.overflowX : style.overflowY;
          const room = axis === "x" ? node.scrollWidth > node.clientWidth + 1 : node.scrollHeight > node.clientHeight + 1;
          if (/(auto|scroll)/.test(overflow) && room) return node;
        }
        return document.scrollingElement || document.documentElement;
      };
      const box = column.getBoundingClientRect();
      // Zone visible horizontale : le tableau, à gauche du menu du Codex s'il le recouvre.
      const boardX = scroller("x");
      const boardBox = boardX === document.scrollingElement || boardX === document.documentElement
        ? { left: 0, right: window.innerWidth, top: 0, bottom: window.innerHeight }
        : boardX.getBoundingClientRect();
      const left = Math.max(boardBox.left, 0) + margin;
      let right = Math.min(boardBox.right, window.innerWidth) - margin;
      const menu = document.querySelector("aside[data-keep-expanded]");
      if (menu) {
        const menuBox = menu.getBoundingClientRect();
        const sameRow = menuBox.top < boardBox.bottom && menuBox.bottom > boardBox.top;
        if (sameRow && menuBox.left > boardBox.left) right = Math.min(right, menuBox.left - margin);
      }
      let shiftX = 0;
      if (box.left < left) shiftX = box.left - left;
      else if (box.right > right) shiftX = Math.min(box.right - right, box.left - left);
      if (shiftX !== 0) boardX.scrollBy({ left: shiftX, behavior: "smooth" });
      // Zone visible verticale : l'écran (hors barre de navigation du bas sur mobile).
      const top = margin;
      const bottom = window.innerHeight - (window.innerWidth < 768 ? 96 : margin);
      const target = column.querySelector(`[data-scene-id="${activeSceneId}"]`) || column;
      const sceneBox = target.getBoundingClientRect();
      let shiftY = 0;
      if (sceneBox.top < top) shiftY = sceneBox.top - top;
      else if (sceneBox.bottom > bottom) shiftY = Math.min(sceneBox.bottom - bottom, sceneBox.top - top);
      if (shiftY !== 0) scroller("y").scrollBy({ top: shiftY, behavior: "smooth" });
      console.info("[scène visible]", { shiftX, shiftY, scene: [Math.round(sceneBox.top), Math.round(sceneBox.bottom)], colonne: [Math.round(box.left), Math.round(box.right)], limites: [Math.round(left), Math.round(right)] });
    }, 260);
    return () => window.clearTimeout(timer);
  }, [expanded, activeSceneId]);

  return (
    <div ref={columnRef} className={cn(
      "flex shrink-0 flex-col rounded-xl border border-border bg-card/50 p-4 transition-[width] duration-200",
      expanded ? "w-[380px]" : activeSceneId ? "w-[250px]" : "w-[290px]"
    )}>
      <div className="flex items-center gap-2">
        {act ? (
          <input
            defaultValue={act.title}
            onBlur={(e) => {
              const value = e.target.value.trim();
              if (value && value !== act.title) onRenameAct(act.id, value);
            }}
            className="min-w-0 flex-1 bg-transparent font-display text-sm font-semibold text-foreground outline-none focus:text-primary"
          />
        ) : (
          <span className="flex-1 font-display text-sm font-semibold text-muted-foreground">Sans acte</span>
        )}
        {act && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11 md:h-7 md:w-7">
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
      <span className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
        {ordered.length} scène{ordered.length === 1 ? "" : "s"}
      </span>

      <div className="mt-4 flex flex-1 flex-col gap-3">
        {ordered.map((scene, i) => (
          <div key={scene.id} data-scene-id={scene.id} className="flex gap-3">
            <div className="relative w-3 shrink-0">
              {ordered.length > 1 && (
                <span
                  className={cn(
                    "absolute left-1/2 w-px -translate-x-1/2 bg-border",
                    i === 0 ? "top-5" : "top-0",
                    i === ordered.length - 1 ? "bottom-5" : "bottom-0"
                  )}
                />
              )}
              <span
                className={cn(
                  "absolute left-1/2 top-5 z-10 h-2.5 w-2.5 -translate-x-1/2 rounded-full ring-2 ring-background",
                  (SCENE_STATUS[scene.status] || SCENE_STATUS.brouillon).dot
                )}
              />
            </div>
            <SceneNode
              scene={scene}
              active={scene.id === activeSceneId}
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
        ))}
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
  );
}