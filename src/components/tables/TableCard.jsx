// @ts-nocheck
/** @jsxRuntime classic */
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Dices, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categoryMeta, rollTable, validEntries } from "@/lib/tableMeta";

/**
 * @typedef {Object} TableCardProps
 * @property {any} table
 * @property {(table: any) => void} onEdit
 * @property {(table: any) => void} onDelete
 */

/** @param {TableCardProps} props */
export default function TableCard({ table, onEdit, onDelete }) {
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
    <div className="flex flex-col rounded-xl border border-border bg-card/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-base font-semibold text-foreground">{table.name}</h3>
        <span className={cn("tag shrink-0 border", meta.badge)}>{meta.label}</span>
      </div>

      <span className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
        {`${entries.length} entrée${entries.length > 1 ? "s" : ""}`}
      </span>

      {table.description && (
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{table.description}</p>
      )}

      <div className="mt-4 flex-1" />

      {(rolling || result) && (
        <div className="corner-accent mb-3 rounded-lg border border-primary/40 bg-primary/[0.07] p-4">
          {rolling ? (
            <span className="font-mono text-xs uppercase tracking-widest text-primary">Lancer…</span>
          ) : (
            <p className="font-display text-base leading-snug text-foreground">{result?.text}</p>
          )}
        </div>
      )}

      {empty && (
        <p className="mb-3 rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
          Table vide — ajoutez des entrées pour pouvoir tirer.
        </p>
      )}

      <Button
        aria-label={`Tirer une entrée de ${table.name}`}
        className="w-full"
        onClick={roll}
        disabled={empty || rolling}
      >
        <Dices className="mr-2 h-4 w-4" />
        Tirer
      </Button>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          aria-label={`Modifier ${table.name}`}
          onClick={() => onEdit(table)}
          className="tag min-touch border border-border text-muted-foreground transition-colors hover:text-foreground"
        >
          <Pencil className="mr-1.5 h-3 w-3" />
          Modifier
        </button>

        <button
          type="button"
          aria-label={`Supprimer ${table.name}`}
          onClick={() => onDelete(table)}
          className="tag min-touch border border-border text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
        >
          <Trash2 className="mr-1.5 h-3 w-3" />
          Supprimer
        </button>
      </div>
    </div>
  );
}