// @ts-nocheck
/** @jsxRuntime classic */
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Backpack, Dices, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categoryMeta, rollTable, validEntries } from "@/lib/meta/tableMeta";
import { useExpandedCard } from "@/lib/context/ExpandedCardContext";

export default function TableCard({ table, onEdit, onDelete, onAddToInventory }) {
  const { expanded, cardProps } = useExpandedCard(`table:${table.id}`);
  const [result, setResult] = useState(null);
  const [rolling, setRolling] = useState(false);

  const meta = categoryMeta(table.category);
  const entries = validEntries(table);
  const empty = entries.length === 0;

  const roll = () => {
    if (empty) return;
    setRolling(true);
    setResult(null);
    setTimeout(() => {
      setResult(rollTable(entries));
      setRolling(false);
    }, 350);
  };

  return (
    <div {...cardProps} className={cn("w-full max-w-full flex cursor-pointer flex-col rounded-xl border border-border bg-card/50 p-4", expanded && "ring-2 ring-primary/50")}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-base font-semibold text-foreground break-words min-w-0 flex-1">{table.name}</h3>
        <span className={cn("tag shrink-0 border", meta.badge)}>{meta.label}</span>
      </div>

      <span className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground break-words">
        {`${entries.length} entrée${entries.length > 1 ? "s" : ""}`}
      </span>

      {table.description && (
        <p className={cn("mt-2 text-sm text-muted-foreground break-words", !expanded && "line-clamp-2")}>{table.description}</p>
      )}

      {expanded && entries.length > 0 && (
        <ol className="mt-3 list-inside list-decimal space-y-1 text-xs text-muted-foreground">
          {entries.map((entry, index) => <li key={`${entry.text}-${index}`} className="break-words">{entry.text}</li>)}
        </ol>
      )}

      <div className="mt-4 flex-1" />

      {(rolling || result) && (
        <div className="corner-accent mb-3 w-full rounded-lg border border-primary/40 bg-primary/[0.07] p-4">
          {rolling ? (
            <span className="font-mono text-xs uppercase tracking-widest text-primary break-words">Lancer…</span>
          ) : (
            <p className="font-display text-base leading-snug text-foreground break-words">{result?.text}</p>
          )}
          {!rolling && result?.text && onAddToInventory && (
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => onAddToInventory(result.text)}>
              <Backpack className="mr-2 h-4 w-4" /> Ajouter à l'inventaire
            </Button>
          )}
        </div>
      )}

      {empty && (
        <p className="mb-3 w-full rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
          Table vide — ajoutez des entrées pour pouvoir tirer.
        </p>
      )}

      <Button
        aria-label={`Tirer une entrée de ${table.name}`}
        className="w-full shrink-0"
        onClick={roll}
        disabled={empty || rolling}
      >
        <Dices className="mr-2 h-4 w-4 shrink-0" />
        Tirer
      </Button>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-label={`Modifier ${table.name}`}
          onClick={() => onEdit(table)}
          className="tag min-touch border border-border text-muted-foreground transition-colors hover:text-foreground shrink-0"
        >
          <Pencil className="mr-1.5 h-3 w-3" />
          Modifier
        </button>

        <button
          type="button"
          aria-label={`Supprimer ${table.name}`}
          onClick={() => onDelete(table)}
          className="tag min-touch border border-border text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive shrink-0"
        >
          <Trash2 className="mr-1.5 h-3 w-3" />
          Supprimer
        </button>
      </div>
    </div>
  );
}
