import React, { useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { noteTarget } from "@/lib/meta/postit";

const SHOWS = [
  ["all", "Toutes les notes"],
  ["free", "Notes libres"],
  ["postit", "Post-it collés"],
  ["orphans", "Post-it orphelins"],
];

/**
 * Filtre de la page Notes de MJ : type de note et élément sur lequel les post-it sont collés.
 * @param {{ notes: any[], targets: Map<string, any>, show: string, onShow: (value: string) => void,
 *   element: string, onElement: (value: string) => void }} props
 */
export default function NotesFilterBar({ notes, targets, show, onShow, element, onElement }) {
  const orphans = notes.filter((note) => targets.get(note.id)?.missing).length;

  // Éléments qui portent au moins un post-it, avec leur nom (sans la partie de fiche : le filtre couvre toute la fiche).
  const elements = useMemo(() => {
    const byKey = new Map();
    for (const note of notes) {
      const target = noteTarget(note);
      const described = targets.get(note.id);
      if (!target || !described) continue;
      const key = `${target.kind}:${target.id}`;
      if (byKey.has(key)) continue;
      const label = described.label.split(" › ")[0];
      byKey.set(key, { key, label: `${described.kindLabel} · ${label}` });
    }
    return [...byKey.values()].sort((a, b) => a.label.localeCompare(b.label, "fr", { numeric: true }));
  }, [notes, targets]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={show} onValueChange={onShow}>
        <SelectTrigger className="h-9 w-48" aria-label="Type de notes affichées"><SelectValue /></SelectTrigger>
        <SelectContent>
          {SHOWS.filter(([value]) => value !== "orphans" || orphans > 0).map(([value, label]) => (
            <SelectItem key={value} value={value}>{value === "orphans" ? `${label} (${orphans})` : label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {elements.length > 0 && (
        <Select value={element || "_all"} onValueChange={(value) => onElement(value === "_all" ? "" : value)}>
          <SelectTrigger className="h-9 w-64 max-w-full" aria-label="Élément portant les post-it"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Tous les éléments</SelectItem>
            {elements.map((entry) => <SelectItem key={entry.key} value={entry.key}>{entry.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
