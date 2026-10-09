import React from "react";
import { Button } from "@/components/ui/button";
import { useTutorial } from "./useTutorial";

export default function TutorialCenter() {
  const {
    tutorials,
    completedTutorials,
    startTutorial,
    resumeTutorial,
    hasTutorialProgress,
    resetAllTutorials,
  } = useTutorial();

  return (
    <section data-tutorial="section-help" className="space-y-3 rounded-xl border border-border bg-card/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-foreground">Centre d'aide</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Relancez un tutoriel interactif à tout moment. Les créations effectuées pendant un tutoriel sont enregistrées dans vos données de campagne.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={resetAllTutorials}>
          Réinitialiser tous les tutoriels
        </Button>
        {hasTutorialProgress && (
          <Button size="sm" onClick={resumeTutorial}>
            Reprendre le tutoriel
          </Button>
        )}
      </div>
      <ul className="divide-y divide-border">
        {tutorials.map((tutorial) => {
          const done = completedTutorials.includes(tutorial.id);
          return (
            <li key={tutorial.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {tutorial.name}
                  {done && <span className="ml-2 text-xs font-normal text-muted-foreground">Vu</span>}
                </p>
                <p className="text-sm text-muted-foreground">{tutorial.description}</p>
              </div>
              <Button size="sm" variant={done ? "outline" : "default"} onClick={() => startTutorial(tutorial.id)}>
                {done ? "Revoir" : "Démarrer"}
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
