import React from "react";
import { cn } from "@/lib/utils";
import { textRows } from "@/lib/meta/textFields";

/**
 * Champs de texte remplis d'une fiche, en lecture seule : le nom du champ, puis sa valeur. Les champs courts se rangent sur
 * deux colonnes, les longs prennent toute la largeur. Rien n'est affiché quand ils sont tous vides.
 */
export default function TextFieldsView({ fields, texts, compact = false, className }) {
  const rows = textRows(fields, texts).filter((row) => row.value);
  if (rows.length === 0) return null;
  return (
    <div className={cn("grid grid-cols-2 gap-x-3 gap-y-1.5", compact ? "text-xs" : "text-sm", className)}>
      {rows.map((row) => (
        <div key={row.id} className={cn("min-w-0", row.long && "col-span-2")}>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{row.name}</p>
          <p className={cn("wrap-break-word text-foreground", row.long && "whitespace-pre-wrap line-clamp-3")}>{row.value}</p>
        </div>
      ))}
    </div>
  );
}
