import React from "react";
import { cn } from "@/lib/utils";
import TextFieldsView from "@/components/game/TextFieldsView";

const GRID = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
};

/**
 * Corps d'une fiche rangé en blocs selon la mise en page (voir resolveLayout) : sur ordinateur, les blocs se répartissent
 * en colonnes ; sur mobile, ils s'empilent dans l'ordre. `renderStat(item, { main })` dessine une caractéristique,
 * `renderTracks(pistes)` les cases à cocher ; `texts` sont les textes de la fiche.
 */
export default function SheetLayoutView({ layout, characteristics, texts, renderStat, renderTracks, className }) {
  const byName = new Map((characteristics || []).map((item) => [item.name, item]));
  const stat = (name, options) => {
    const item = byName.get(name);
    return item ? <React.Fragment key={name}>{renderStat(item, options)}</React.Fragment> : null;
  };
  if (!layout?.blocks?.length) return null;
  return (
    <div className={cn("mt-4 grid gap-3", GRID[layout.columns] || GRID[1], className)}>
      {layout.blocks.map((block) => (
        <section key={block.id} className={cn("min-w-0", block.wide && "md:col-span-full")}>
          {block.title && <h3 className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{block.title}</h3>}
          {block.kind === "stat-group" && (
            <dl className="grid gap-2 rounded-lg border border-border p-2">
              {stat(block.stat, { main: true })}
              {block.children.length > 0 && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{block.children.map((name) => stat(name, { main: false }))}</div>
              )}
            </dl>
          )}
          {block.kind === "stats" && (
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">{block.stats.map((name) => stat(name, { main: false }))}</dl>
          )}
          {block.kind === "texts" && <TextFieldsView fields={block.fields} texts={texts} compact />}
          {block.kind === "tracks" && renderTracks(block.tracks)}
        </section>
      ))}
    </div>
  );
}
