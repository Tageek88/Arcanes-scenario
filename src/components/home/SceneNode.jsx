import React from "react";
import { cn } from "@/lib/utils";
import { ArrowRight, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { SCENE_STATUS } from "@/lib/sceneMeta";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export default function SceneNode({ scene, active, sceneTitles, onSelect, onOpen, onCycleStatus, onDelete }) {
  const meta = SCENE_STATUS[scene.status] || SCENE_STATUS.brouillon;
  const branches = (scene.next_scene_ids || []).map((id) => sceneTitles[id]).filter(Boolean);
  const linked = (scene.npc_ids?.length || 0) + (scene.location_ids?.length || 0) + (scene.clue_ids?.length || 0);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(scene)}
      onDoubleClick={() => onOpen(scene)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen(scene);
      }}
      className={cn(
        "group flex-1 cursor-pointer rounded-lg border bg-background/70 p-3 transition-colors",
        active ? "corner-accent border-primary/60 bg-primary/[0.06]" : "border-border hover:border-primary/30"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          title="Changer le statut"
          onClick={(e) => {
            e.stopPropagation();
            onCycleStatus(scene);
          }}
          className={cn("tag border transition-opacity hover:opacity-80", meta.badge)}
        >
          <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", meta.dot)} />
          {meta.label}
        </button>
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100 md:h-7 md:w-7"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onOpen(scene)}>
                <Pencil className="mr-2 h-4 w-4" /> Modifier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(scene)} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <h3 className="mt-2 font-display text-sm font-semibold leading-snug text-foreground">{scene.title}</h3>
      {scene.summary && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{scene.summary}</p>}

      {(linked > 0 || branches.length > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {linked > 0 && <span>{linked} lien{linked > 1 ? "s" : ""}</span>}
          {branches.length > 0 && (
            <span className="flex items-center gap-1 text-primary/80">
              <ArrowRight className="h-3 w-3" />
              {branches.join(" · ")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}