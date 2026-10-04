import React from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import CodexCard from "@/components/codex/CodexCard";

export default function LocationTree({ rows, collapsed, onToggle, onEdit, onDelete, onAddChild }) {
  return (
    <div className="space-y-2">
      {rows.map(({ location, depth, childCount }) => {
        const isCollapsed = collapsed.has(location.id);
        return (
          <div
            key={location.id}
            style={{ marginLeft: Math.min(depth, 6) * 20 }}
            className="flex max-w-3xl items-start gap-2"
          >
            <div className="flex w-6 shrink-0 justify-center pt-4">
              {childCount > 0 && (
                <button
                  type="button"
                  aria-label={isCollapsed ? `Déplier ${location.name}` : `Replier ${location.name}`}
                  aria-expanded={!isCollapsed}
                  onClick={() => onToggle(location.id)}
                  className="text-muted-foreground hover:text-primary"
                >
                  {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <CodexCard kind="location" entry={location} linked={false} onEdit={onEdit} onDelete={onDelete} />
              <div className="mt-1 flex items-center gap-3 px-1">
                <button
                  type="button"
                  onClick={() => onAddChild(location)}
                  className="inline-flex items-center font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-primary"
                >
                  <Plus className="mr-1 h-3 w-3" /> Sous-lieu
                </button>
                {childCount > 0 && (
                  <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    {childCount} sous-lieu{childCount > 1 ? "x" : ""}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}