import React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export default function LinkPicker({ label, items, selected, onToggle, emptyText }) {
  const selectedIds = selected || [];

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => {
            const on = selectedIds.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggle(item.id)}
                className={cn(
                  "tag border transition-colors",
                  on
                    ? "border-primary/50 bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                )}
              >
                {item.name || item.title}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}