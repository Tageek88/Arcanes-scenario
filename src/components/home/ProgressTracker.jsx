import React from "react";

export default function ProgressTracker({ progress }) {
  const total = progress?.total || 0;
  const played = progress?.joue || 0;
  const key = progress?.clef || 0;
  const drafts = progress?.brouillon || 0;
  const pct = total ? Math.round((played / total) * 100) : 0;

  return (
    <div className="rounded-xl border border-border bg-background/60 p-4">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
          Avancement
        </span>
        <span className="font-mono text-sm text-foreground">
          {played}/{total} jouées
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-sm text-muted-foreground">
        <span className="text-primary">{key} scènes clef</span>
        <span>{drafts} brouillons</span>
      </div>
    </div>
  );
}