import React, { useMemo } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import CodexCard from "@/components/codex/CodexCard";
import { childrenMap } from "@/lib/locationTree";

export default function LocationTree({ locations, collapsed, onToggle, onEdit, onDelete, onDuplicate, onAddChild }) {
  const map = useMemo(() => childrenMap(locations), [locations]);
  const byId = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations]);

  // Chemin des ancêtres, sans le lieu lui-même (ex. "France › Lyon").
  const ancestorsLabel = (location) => {
    const names = [];
    const seen = new Set([location.id]);
    let current = byId.get(location.parent_id);
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      names.unshift(current.name);
      current = byId.get(current.parent_id);
    }
    return names.join(" › ");
  };

  const renderNode = (location, depth, seen) => {
    const kids = (map.get(location.id) || []).filter((k) => !seen.has(k.id));
    const isCollapsed = collapsed.has(location.id);
    const path = ancestorsLabel(location);

    const body = (
      <div className="min-w-0">
        {path && (
          <p className="mb-1 truncate px-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {path}
          </p>
        )}
        <CodexCard kind="location" entry={location} linked={false} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} />
        <div className="mt-1 flex items-center gap-3 px-1">
          <button
            type="button"
            onClick={() => onAddChild(location)}
            className="inline-flex items-center font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-primary"
          >
            <Plus className="mr-1 h-3 w-3" /> Sous-lieu
          </button>
          {kids.length > 0 && (
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              {kids.length} sous-lieu{kids.length > 1 ? "x" : ""}
            </span>
          )}
        </div>
      </div>
    );

    if (kids.length === 0) return <div key={location.id}>{body}</div>;

    const nextSeen = new Set(seen).add(location.id);
    return (
      <div
        key={location.id}
        className={cn(
          "rounded-xl border p-3",
          depth % 2 === 0 ? "border-primary/30 bg-primary/[0.04]" : "border-border bg-secondary/30"
        )}
      >
        <div className="flex items-start gap-2">
          <button
            type="button"
            aria-label={isCollapsed ? `Déplier ${location.name}` : `Replier ${location.name}`}
            aria-expanded={!isCollapsed}
            onClick={() => onToggle(location.id)}
            className="mt-4 shrink-0 text-muted-foreground hover:text-primary"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <div className="min-w-0 flex-1">{body}</div>
        </div>
        {!isCollapsed && (
          <div className="ml-2 mt-3 space-y-3 border-l-2 border-primary/30 pl-2 sm:pl-4">
            {kids.map((kid) => renderNode(kid, depth + 1, nextSeen))}
          </div>
        )}
      </div>
    );
  };

  const roots = map.get("") || [];
  return <div className="max-w-3xl space-y-4">{roots.map((root) => renderNode(root, 0, new Set()))}</div>;
}
