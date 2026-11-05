import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FIRST_TOUR_ID, TOURS, getTour, stepsFor } from "@/config/tutorials";
import { useToast } from "@/components/ui/use-toast";
import { registerDemoAction, runDemoAction } from "@/lib/context/tutorialBridge";
import { DOM_ACTIONS } from "@/lib/tutorial/dom";
import { enterDemo, leaveDemo } from "@/lib/services/demoTour";
import {
  getAutoStartedTutorials,
  getCompletedTutorials,
  markTutorialAutoStarted,
  resetTutorials,
  setCompletedTutorials,
} from "@/utils/tutorialStorage";
import TutorialOverlay from "./TutorialOverlay";

export const TutorialContext = createContext(null);

const WELCOME_DELAY_MS = 1000;
const MOBILE_BREAKPOINT = 768;
const isMobileScreen = () => window.innerWidth < MOBILE_BREAKPOINT;

/**
 * Moteur de visite guidée : à chaque étape il ouvre l'onglet, lance les actions de démonstration de l'étape,
 * puis affiche la bulle. Il ne demande jamais à la personne de cliquer.
 */
export default function TutorialProvider({ children }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  });

  const { toast } = useToast();
  const startingRef = useRef(false);
  const [completed, setCompleted] = useState(getCompletedTutorials);
  const [active, setActive] = useState(null); // { tourId, index, mobile } : « mobile » est fixé au lancement, la liste d'étapes ne change plus ensuite
  const [ready, setReady] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const tourId = active?.tourId ?? null;
  const index = active?.index ?? 0;
  const mobile = active?.mobile ?? false;
  const tour = tourId ? getTour(tourId) : null;
  const steps = useMemo(() => stepsFor(tour, mobile), [tour, mobile]);
  const step = steps[index] ?? null;

  const markCompleted = useCallback((id) => {
    setCompleted((current) => {
      if (current.includes(id)) return current;
      const next = [...current, id];
      setCompletedTutorials(next);
      return next;
    });
  }, []);

  // Une visite sur la campagne d'exemple la remet en place à la fin : on retrouve alors la campagne de la personne.
  const leaveIfNeeded = useCallback((finished) => {
    if (finished?.needsDemo) leaveDemo().catch((error) => console.error("Retour à la campagne précédente impossible :", error));
  }, []);

  const startTour = useCallback(
    async (id) => {
      const next = getTour(id);
      if (!next?.steps.length || startingRef.current) return;
      startingRef.current = true;
      try {
        if (next.needsDemo) {
          const { selected } = await enterDemo();
          if (!selected) throw new Error("La campagne d'exemple n'a pas pu être sélectionnée.");
        }
        setReady(false);
        setCollapsed(false);
        setActive({ tourId: id, index: 0, mobile: isMobileScreen() });
      } catch (error) {
        console.error("Démarrage de la visite impossible :", error);
        leaveIfNeeded(next);
        toast({ title: "Visite impossible à lancer", description: "La campagne d'exemple n'a pas pu être préparée. Réessayez depuis Paramètres › Tutoriel.", variant: "destructive" });
      } finally {
        startingRef.current = false;
      }
    },
    [leaveIfNeeded, toast]
  );

  const closeTour = useCallback(() => {
    // Quitter la première visite vaut « je ne veux pas la suivre » : elle ne se relance plus toute seule.
    if (tourId === FIRST_TOUR_ID) markCompleted(FIRST_TOUR_ID);
    leaveIfNeeded(tour);
    setActive(null);
    setReady(false);
  }, [leaveIfNeeded, markCompleted, tour, tourId]);

  const goTo = useCallback(
    (delta) => {
      if (!tour) return;
      const next = index + delta;
      if (next < 0) return;
      if (next >= steps.length) {
        markCompleted(tour.id);
        leaveIfNeeded(tour);
        setActive(null);
        setReady(false);
        return;
      }
      setReady(false);
      setActive({ tourId: tour.id, index: next, mobile });
    },
    [index, leaveIfNeeded, markCompleted, mobile, steps.length, tour]
  );

  const resetTours = useCallback(() => {
    leaveIfNeeded(tour);
    resetTutorials();
    setCompleted([]);
    setActive(null);
    setReady(false);
  }, [leaveIfNeeded, tour]);

  // Actions génériques (clic, fermeture de fenêtre) que les visites peuvent lancer sur n'importe quelle page.
  useEffect(() => {
    const removers = Object.entries(DOM_ACTIONS).map(([name, handler]) => registerDemoAction(name, handler));
    return () => removers.forEach((remove) => remove());
  }, []);

  // Arrivée sur une étape : ouvrir l'onglet, lancer les actions de démonstration, puis montrer la bulle.
  // Le nettoyage (changement d'étape ou fin de visite) lance les actions « undo » de l'étape quittée.
  useEffect(() => {
    if (!tourId) return undefined;
    const current = stepsFor(getTour(tourId), mobile)[index];
    if (!current) return undefined;
    let alive = true;
    if (current.route && current.route !== pathnameRef.current) navigate(current.route);
    (async () => {
      for (const action of current.run || []) {
        if (!alive) return;
        await runDemoAction(action.demo, action.args);
      }
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
      (current.undo || []).forEach((action) => {
        runDemoAction(action.demo, action.args, { timeoutMs: 0 });
      });
    };
  }, [tourId, index, mobile, navigate]);

  // Premier démarrage : propose la phase 1, une seule fois, à quelqu'un qui n'a encore vu aucun tutoriel.
  useEffect(() => {
    if (tourId || completed.length > 0 || getAutoStartedTutorials().includes(FIRST_TOUR_ID)) return undefined;
    const timer = setTimeout(() => {
      markTutorialAutoStarted(FIRST_TOUR_ID);
      startTour(FIRST_TOUR_ID);
    }, WELCOME_DELAY_MS);
    return () => clearTimeout(timer);
  }, [tourId, completed, startTour]);

  const value = useMemo(
    () => ({ tours: TOURS, completedTours: completed, activeTourId: tourId, startTour, closeTour, resetTours }),
    [completed, tourId, startTour, closeTour, resetTours]
  );

  return (
    <TutorialContext.Provider value={value}>
      {children}
      {tour && step && (
        <TutorialOverlay
          key={`${tour.id}:${step.id}`}
          tour={tour}
          step={step}
          index={index}
          total={steps.length}
          ready={ready}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((current) => !current)}
          onNext={() => goTo(1)}
          onPrevious={() => goTo(-1)}
          onClose={closeTour}
        />
      )}
    </TutorialContext.Provider>
  );
}
