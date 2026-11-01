import React, { useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import ActColumn from "@/components/home/ActColumn";
import ActRow from "@/components/home/ActRow";

export default function SceneBoard({
  actsAsRows = false,
  acts,
  scenes,
  npcs,
  locations,
  clues,
  activeSceneId,
  onSelectScene,
  onOpenScene,
  onCycleStatus,
  onAddAct,
  onRenameAct,
  onDeleteAct,
  onAddScene,
  onDeleteScene,
}) {
  const containerRef = useRef(null);
  const sorted = [...acts].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const orphans = scenes.filter((s) => !s.act_id || !acts.some((a) => a.id === s.act_id));
  const sceneTitles = scenes.reduce((acc, s) => ({ ...acc, [s.id]: s.title }), {});
  const npcById = Object.fromEntries(npcs.map((npc) => [npc.id, npc]));
  const locationById = Object.fromEntries(locations.map((location) => [location.id, location]));
  const clueById = Object.fromEntries(clues.map((clue) => [clue.id, clue]));

  // Disposition en colonnes : la molette verticale fait défiler le tableau horizontalement.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || actsAsRows) return undefined;

    const handleWheel = (e) => {
      if (el.scrollWidth > el.clientWidth) {
        if (e.deltaX === 0) {
          e.preventDefault();
          el.scrollLeft += e.deltaY;
        }
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [actsAsRows]);

  const common = {
    sceneTitles,
    npcById,
    locationById,
    clueById,
    activeSceneId,
    onSelectScene,
    onOpenScene,
    onCycleStatus,
    onAddScene,
    onRenameAct,
    onDeleteAct,
    onDeleteScene,
  };

  if (actsAsRows) {
    return (
      <div ref={containerRef} className="flex flex-col gap-4 pb-4">
        {sorted.map((act) => (
          <ActRow
            key={act.id}
            act={act}
            scenes={scenes.filter((s) => s.act_id === act.id)}
            expanded={scenes.some((scene) => scene.act_id === act.id && scene.id === activeSceneId)}
            {...common}
          />
        ))}
        {orphans.length > 0 && (
          <ActRow act={null} scenes={orphans} expanded={orphans.some((scene) => scene.id === activeSceneId)} {...common} />
        )}
        <button
          type="button"
          data-tutorial="btn-new-act"
          onClick={onAddAct}
          className="flex min-h-[72px] w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-dashed border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <Plus className="h-5 w-5" />
          <span className="font-mono text-xs uppercase tracking-widest">Ajouter un acte</span>
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex gap-4 overflow-x-auto pb-4">
      {sorted.map((act) => (
        <ActColumn
          key={act.id}
          act={act}
          scenes={scenes.filter((s) => s.act_id === act.id)}
          expanded={scenes.some((scene) => scene.act_id === act.id && scene.id === activeSceneId)}
          {...common}
        />
      ))}
      {orphans.length > 0 && (
        <ActColumn act={null} scenes={orphans} expanded={orphans.some((scene) => scene.id === activeSceneId)} {...common} />
      )}
      <button
        type="button"
        data-tutorial="btn-new-act"
        onClick={onAddAct}
        className="flex min-h-[220px] w-[200px] shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
      >
        <Plus className="h-6 w-6" />
        <span className="font-mono text-xs uppercase tracking-widest">Ajouter un acte</span>
      </button>
    </div>
  );
}
