import React, { useRef } from "react";
import { cn } from "@/lib/utils";
import { SCENE_STATUS } from "@/lib/sceneMeta";

export default function SwipeSceneRow({ scene, active, onOpen, onSelect, onToggleStatus }) {
  const startX = useRef(null);
  const meta = SCENE_STATUS[scene.status] || SCENE_STATUS.brouillon;

  return (
    <div
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
        "flex items-center gap-3 rounded-lg border p-3 transition-colors",
        active ? "border-primary/60 bg-primary/[0.06]" : "border-border bg-background/70"
      )}
    >
      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onSelect(scene)} onDoubleClick={() => onOpen(scene)}>
        <div className="flex items-center gap-2">
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta.dot)} />
          <span className="truncate font-display text-sm font-semibold text-foreground">{scene.title}</span>
        </div>
        {scene.summary && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{scene.summary}</p>}
      </button>
      <button type="button" onClick={() => onToggleStatus(scene)} className={cn("tag shrink-0 border", meta.badge)}>
        {meta.label}
      </button>
      <button
        type="button"
        aria-label={`Ouvrir ${scene.title}`}
        onClick={() => onOpen(scene)}
        className="tag min-touch shrink-0 border border-primary/40 text-primary transition-colors active:bg-primary/10"
      >
        Ouvrir
      </button>
    </div>
  );
}