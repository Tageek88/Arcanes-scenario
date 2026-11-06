import React, { useEffect, useState } from "react";
import { MoreHorizontal, Plus, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  onDeleteAct,
  onDeleteScene,
}) {
  const sorted = [...acts].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const orphans = scenes.filter((s) => !s.act_id || !acts.some((a) => a.id === s.act_id));
  const groups = [
    ...sorted.map((a) => ({ id: a.id, title: a.title, scenes: scenes.filter((s) => s.act_id === a.id) })),
    ...(orphans.length ? [{ id: "_none", title: "Sans acte", scenes: orphans }] : []),
  ];

  // Actes repliés par la personne : tout est déplié par défaut.
  const [closedGroups, setClosedGroups] = useState([]);
  const openGroups = groups.map((g) => g.id).filter((id) => !closedGroups.includes(id));

  // Une scène sélectionnée (par exemple depuis la recherche) rouvre son acte s'il était replié.
  useEffect(() => {
    if (!activeSceneId) return;
    const group = groups.find((g) => g.scenes.some((s) => s.id === activeSceneId));
    if (group) setClosedGroups((current) => (current.includes(group.id) ? current.filter((id) => id !== group.id) : current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSceneId]);

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">Aucun acte pour cette campagne.</p>
        <Button data-tutorial="btn-new-act" variant="outline" className="mt-4" onClick={onAddAct}>
          <Plus className="mr-2 h-4 w-4" /> Ajouter un acte
        </Button>
      </div>
    );
  }

  return (
    <div className="stack-y-3">
      <Accordion
        type="multiple"
        value={openGroups}
        onValueChange={(next) => setClosedGroups(groups.map((g) => g.id).filter((id) => !next.includes(id)))}
        className="stack-y-3"
      >
        {groups.map((group) => (
          <AccordionItem
            key={group.id}
            value={group.id}
            data-tutorial="act-column"
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
            <AccordionContent className="stack-y-2 pt-1">
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
                    onDelete={onDeleteScene}
                  />
                ))}
              <div className="flex items-center justify-between">
                <Button
                  data-tutorial="btn-new-scene"
                  variant="ghost"
                  size="sm"
                  onClick={() => onAddScene(group.id === "_none" ? null : group.id)}
                  className="justify-start text-muted-foreground hover:text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" /> Scène
                </Button>
                {group.id !== "_none" && onDeleteAct && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Actions de l'acte ${group.title}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => onDeleteAct(acts.find((act) => act.id === group.id))}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Supprimer l'acte
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <Button data-tutorial="btn-new-act" variant="outline" className="w-full" onClick={onAddAct}>
        <Plus className="mr-2 h-4 w-4" /> Ajouter un acte
      </Button>
    </div>
  );
}