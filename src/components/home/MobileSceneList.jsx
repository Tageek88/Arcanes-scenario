import React from "react";
import { Plus } from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import SwipeSceneRow from "@/components/home/SwipeSceneRow";
import { Button } from "@/components/ui/button";

export default function MobileSceneList({
  acts,
  scenes,
  npcs,
  locations,
  clues,
  activeSceneId,
  onSelectScene,
  onOpenScene,
  onCycleStatus,
  onAddScene,
  onAddAct,
}) {
  const sorted = [...acts].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const orphans = scenes.filter((s) => !s.act_id || !acts.some((a) => a.id === s.act_id));
  const groups = [
    ...sorted.map((a) => ({ id: a.id, title: a.title, scenes: scenes.filter((s) => s.act_id === a.id) })),
    ...(orphans.length ? [{ id: "_none", title: "Sans acte", scenes: orphans }] : []),
  ];

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">Aucun acte pour cette campagne.</p>
        <Button variant="outline" className="mt-4" onClick={onAddAct}>
          <Plus className="mr-2 h-4 w-4" /> Ajouter un acte
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Accordion type="multiple" defaultValue={groups.map((g) => g.id)} className="space-y-3">
        {groups.map((group) => (
          <AccordionItem
            key={group.id}
            value={group.id}
            className="rounded-xl border border-border bg-card/50 px-4"
          >
            <AccordionTrigger className="font-display text-sm hover:no-underline">
              <span className="flex items-center gap-2">
                {group.title}
                <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  {group.scenes.length}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pt-1">
              {[...group.scenes]
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((scene) => (
                  <SwipeSceneRow
                    key={scene.id}
                    scene={scene}
                    active={scene.id === activeSceneId}
                    npcs={npcs}
                    locations={locations}
                    clues={clues}
                    onOpen={onOpenScene}
                    onSelect={onSelectScene}
                    onToggleStatus={onCycleStatus}
                  />
                ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAddScene(group.id === "_none" ? null : group.id)}
                className="justify-start text-muted-foreground hover:text-primary"
              >
                <Plus className="mr-2 h-4 w-4" /> Scène
              </Button>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <Button variant="outline" className="w-full" onClick={onAddAct}>
        <Plus className="mr-2 h-4 w-4" /> Ajouter un acte
      </Button>
    </div>
  );
}