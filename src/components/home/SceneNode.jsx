import React from "react";
import { cn } from "@/lib/utils";
import { ArrowRight, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { SCENE_STATUS } from "@/lib/meta/sceneMeta";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useExpandedCard } from "@/lib/context/ExpandedCardContext";
import PostItButton from "@/components/common/PostItButton";

export default function SceneNode({
  scene,
  active,
  sceneTitles,
  npcById,
  locationById,
  clueById,
  onSelect,
  onOpen,
  onCycleStatus,
  onDelete,
}) {
  const { expanded, cardProps } = useExpandedCard(`scene:${scene.id}`);
  const meta = SCENE_STATUS[scene.status] || SCENE_STATUS.brouillon;
  const branches = (scene.next_scene_ids || []).map((id) => sceneTitles[id]).filter(Boolean);
  const linked = (scene.npc_ids?.length || 0) + (scene.location_ids?.length || 0) + (scene.clue_ids?.length || 0);
  const linkedNpcs = (scene.npc_ids || []).map((id) => npcById[id]).filter(Boolean);
  const linkedLocations = (scene.location_ids || []).map((id) => locationById[id]).filter(Boolean);
  const linkedClues = (scene.clue_ids || []).map((id) => clueById[id]).filter(Boolean);

  return (
    <div
      {...cardProps}
      data-tutorial="btn-edit-codex-from-scene"
      role="button"
      onClick={() => onSelect(scene)}
      onDoubleClick={() => onOpen(scene)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen(scene);
      }}
      className={cn(
        "group flex-1 cursor-pointer rounded-lg border bg-background/70 p-3 transition-colors",
        active || expanded ? "corner-accent border-primary/60 bg-primary/[0.06] ring-2 ring-primary/40" : "border-border hover:border-primary/30"
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
        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
          <PostItButton target={{ kind: "scene", id: scene.id }} label={`la scène « ${scene.title || "Sans titre"} »`} />
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
      {!active && scene.summary && <p className={cn("mt-1 text-xs text-muted-foreground", !expanded && "line-clamp-2")}>{scene.summary}</p>}

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
      {(active || expanded) && (
        <div className="mt-3 space-y-3 border-t border-border pt-3 text-xs">
          {scene.summary && <p className="whitespace-pre-wrap text-muted-foreground">{scene.summary}</p>}
          {scene.gm_notes && (
            <div>
              <p className="mb-1 font-mono uppercase tracking-wider text-muted-foreground">Notes du MJ</p>
              <p className="whitespace-pre-wrap text-foreground">{scene.gm_notes}</p>
            </div>
          )}
          {linkedNpcs.length > 0 && (
            <p><span className="font-medium text-foreground">PNJ :</span> {linkedNpcs.map((entry) => entry.name).join(" · ")}</p>
          )}
          {linkedLocations.length > 0 && (
            <p><span className="font-medium text-foreground">Lieux :</span> {linkedLocations.map((entry) => entry.name).join(" · ")}</p>
          )}
          {linkedClues.length > 0 && (
            <div>
              <p className="mb-1 font-medium text-foreground">Indices &amp; infos</p>
              <ul className="space-y-1">
                {linkedClues.map((entry) => (
                  <li key={entry.id} className="flex items-start justify-between gap-2 text-muted-foreground">
                    <span>{entry.name}</span>
                    <span className="shrink-0 font-mono uppercase">
                      {entry.clue_type === "info"
                        ? [entry.known && "Connue", entry.used && "Utilisée"].filter(Boolean).join(" · ") || "Info"
                        : entry.discovered ? "Découvert" : "Caché"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}