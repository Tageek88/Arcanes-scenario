import React from "react";
import { cn } from "@/lib/utils";
import { checkedCount, nextCheckedValue } from "@/lib/meta/tracks";

/**
 * Une piste de cases à cocher (stress, radiations, consommables…) : son nom et ses cases.
 * `value` est le nombre de cases cochées ; `onChange(nombre)` reçoit la nouvelle valeur. Sans `onChange`, les cases sont en lecture seule.
 * Les cases sont des boutons : un clic dessus n'ouvre ni ne ferme la carte qui les porte.
 */
export default function TrackBoxes({ track, value = 0, onChange, className }) {
  const checked = checkedCount(value, track.count);
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{track.name}</span>
      <div className="flex flex-wrap gap-1" role="group" aria-label={`${track.name} : ${checked} case${checked > 1 ? "s" : ""} cochée${checked > 1 ? "s" : ""} sur ${track.count}`}>
        {Array.from({ length: track.count }, (_, index) => {
          const on = index < checked;
          return (
            <button
              key={index}
              type="button"
              role="checkbox"
              aria-checked={on}
              aria-label={`${track.name}, case ${index + 1}`}
              disabled={!onChange}
              onClick={(event) => {
                event.stopPropagation();
                onChange?.(nextCheckedValue(checked, index));
              }}
              className={cn(
                "h-6 w-6 rounded-sm border transition-colors",
                on ? "border-primary bg-primary" : "border-border bg-transparent hover:border-primary/60"
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
