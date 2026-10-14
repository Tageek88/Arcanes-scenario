import React, { useRef } from "react";
import { cn } from "@/lib/utils";
import { SCENE_STATUS } from "@/lib/meta/sceneMeta";

export default function SwipeSceneRow({ scene, active, npcs, locations, clues, onOpen, onSelect, onToggleStatus }) {
  const startX = useRef(null);
  const meta = SCENE_STATUS[scene.status] || SCENE_STATUS.brouillon;

  return (
    <div
      data-expandable-card={`scene:${scene.id}`}
      aria-expanded={active}
      tabIndex={0}
      onKeyDown={(event) => {
        if ((event.key === "Enter" || event.key === " ") && event.target === event.currentTarget) {
          event.preventDefault();
          onSelect(scene);
        }
      }}
      onTouchStart={(e) => {
        startX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (startX.current == null) return;
        const dx = e.changedTouches[0].clientX - startX.current;
        startX.current = null;
        if (dx > 60) onToggleStatus(scene);
      }}
      className={cn(
        "w-full max-w-full flex flex-col gap-2 rounded-lg border p-3 transition-colors overflow-hidden",
        active ? "border-primary/60 bg-primary/[0.06]" : "border-border bg-background/70"
      )}
    >
      <button type="button" className="w-full min-w-0 text-left overflow-hidden" onClick={() => onSelect(scene)} onDoubleClick={() => onOpen(scene)}>
        <div className="flex items-center gap-2">
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta.dot)} />
          <span className="truncate font-display text-sm font-semibold text-foreground">{scene.title}</span>
        </div>
        {scene.summary && (
          <p className={cn("mt-1 text-xs text-muted-foreground break-words overflow-hidden", active ? "whitespace-pre-wrap" : "line-clamp-1")}>
            {scene.summary}
          </p>
        )}
        {active && scene.gm_notes && (
          <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground break-words overflow-hidden">
            <span className="font-medium text-foreground">Notes du MJ : </span>{scene.gm_notes}
          </p>
        )}
        {active && (scene.npc_ids?.length > 0 || scene.location_ids?.length > 0 || scene.clue_ids?.length > 0) && (
          <div className="mt-2 space-y-1 text-xs text-muted-foreground overflow-hidden">
            {scene.npc_ids?.length > 0 && (
              <p className="break-words overflow-hidden"><span className="font-medium text-foreground">PNJ :</span> {scene.npc_ids.map((id) => npcs.find((item) => item.id === id)?.name).filter(Boolean).join(" · ")}</p>
            )}
            {scene.location_ids?.length > 0 && (
              <p className="break-words overflow-hidden"><span className="font-medium text-foreground">Lieux :</span> {scene.location_ids.map((id) => locations.find((item) => item.id === id)?.name).filter(Boolean).join(" · ")}</p>
            )}
            {scene.clue_ids?.length > 0 && (
              <ul className="space-y-1">
                {scene.clue_ids.map((id) => clues.find((item) => item.id === id)).filter(Boolean).map((item) => (
                  <li key={item.id} className="flex justify-between gap-2">
                    <span className="break-words overflow-hidden">{item.name}</span>
                    <span className="shrink-0 font-mono uppercase">
                      {item.clue_type === "info"
                        ? [item.known && "Connue", item.used && "Utilisée"].filter(Boolean).join(" · ") || "Info"
                        : item.discovered ? "Découvert" : "Caché"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </button>
      <div className="flex gap-2 justify-end shrink-0">
        <button type="button" onClick={() => onToggleStatus(scene)} className={cn("tag border", meta.badge)}>
          {meta.label}
        </button>
        <button
          type="button"
          aria-label={`Ouvrir ${scene.title}`}
          onClick={() => onOpen(scene)}
          className="tag min-touch border border-primary/40 text-primary transition-colors active:bg-primary/10"
        >
          Ouvrir
        </button>
      </div>
    </div>
  );
}
