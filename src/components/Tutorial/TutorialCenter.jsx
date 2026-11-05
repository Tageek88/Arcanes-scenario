import React from "react";
import { Button } from "@/components/ui/button";
import useConfirm from "@/hooks/useConfirm";
import useDemoCampaign from "@/hooks/useDemoCampaign";
import { useTutorial } from "./useTutorial";

export default function TutorialCenter() {
  const { tours, completedTours, startTour, resetTours } = useTutorial();
  const demo = useDemoCampaign();
  const { confirm, confirmDialog } = useConfirm();

  const removeDemo = async () => {
    const accepted = await confirm({
      title: "Supprimer la campagne d'exemple",
      description: "La campagne d'exemple est supprimée avec tout ce qu'elle contient, y compris ce que vous y avez ajouté. Vos autres campagnes ne sont pas touchées. Vous pourrez la rajouter à tout moment.",
      confirmLabel: "Supprimer",
    });
    if (accepted) demo.remove();
  };

  return (
    <section data-tutorial="section-help" className="stack-y-3 rounded-xl border border-border bg-card/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-foreground">Tutoriel</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Une visite guidée de l'application : elle change d'onglet et vous montre les fonctions, sans rien modifier dans vos données.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={resetTours}>
          Réinitialiser
        </Button>
      </div>
      <ul className="divide-y divide-border">
        {tours.map((tour) => {
          const done = completedTours.includes(tour.id);
          return (
            <li key={tour.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {tour.name}
                  {done && <span className="ml-2 text-xs font-normal text-muted-foreground">Vu</span>}
                </p>
                <p className="text-sm text-muted-foreground">{tour.description}</p>
              </div>
              <Button size="sm" variant={done ? "outline" : "default"} onClick={() => startTour(tour.id)}>
                {done ? "Revoir" : "Lancer"}
              </Button>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Campagne d'exemple</p>
          <p className="text-sm text-muted-foreground">
            Un scénario complet, utilisé par les phases 2 et 3 du tutoriel. Vous pouvez aussi l'ajouter pour explorer l'application.
          </p>
        </div>
        {demo.present ? (
          <Button size="sm" variant="outline" onClick={removeDemo} disabled={demo.busy}>
            Supprimer l'exemple
          </Button>
        ) : (
          <Button size="sm" onClick={demo.add} disabled={demo.busy}>
            Ajouter l'exemple
          </Button>
        )}
      </div>
      {confirmDialog}
    </section>
  );
}
