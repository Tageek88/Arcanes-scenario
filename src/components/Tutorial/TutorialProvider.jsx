import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TUTORIALS, WELCOME_TUTORIAL_ID, getTutorial } from "@/config/tutorials";
import {
  getAutoStartedTutorials,
  getCompletedTutorials,
  getTutorialProgress,
  markTutorialAutoStarted,
  resetTutorials,
  setCompletedTutorials,
  setTutorialProgress,
} from "@/utils/tutorialStorage";
import TutorialOverlay from "./TutorialOverlay";

export const TutorialContext = createContext(null);

const WELCOME_DELAY_MS = 1000;
const CAMPAIGN_START_TUTORIAL_ID = "campaign-start";

const canAdvanceWithoutAction = (action) => !action || action.type === "presentation";

function findVisibleTarget(name) {
  return (
    Array.from(document.querySelectorAll(`[data-tutorial="${name}"]`)).find((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }) || null
  );
}

function findUserDialog() {
  const dialogs = Array.from(document.querySelectorAll('[role="dialog"]')).filter(
    (node) => node.getAttribute("aria-labelledby") !== "tutorial-title" && node.getBoundingClientRect().width > 0
  );
  return dialogs[dialogs.length - 1] || null;
}

function findSubmitButton(scope, allowAdd) {
  const pattern = allowAdd ? /^(Enregistrer|Créer|Ajouter)/ : /^(Enregistrer|Créer|Publier|Ajouter)/;
  const buttons = Array.from(scope.querySelectorAll("button:not([disabled])")).filter(
    (button) => pattern.test(button.textContent.trim()) && button.getBoundingClientRect().width > 0
  );
  return buttons[buttons.length - 1] || null;
}

export default function TutorialProvider({ children }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const [completedTutorials, setCompleted] = useState(getCompletedTutorials);
  const [active, setActive] = useState(() => {
    const progress = getTutorialProgress();
    const tutorial = progress && getTutorial(progress.id);
    return tutorial && progress.stepIndex < tutorial.steps.length
      ? { tutorial, stepIndex: progress.stepIndex }
      : null;
  });
  const [canAdvance, setCanAdvance] = useState(() =>
    !active || canAdvanceWithoutAction(active.tutorial.steps[active.stepIndex]?.action)
  );

  const setStep = useCallback((tutorial, stepIndex, route = pathname) => {
    setActive({ tutorial, stepIndex });
    setTutorialProgress({ id: tutorial.id, stepIndex, route });
    const action = tutorial.steps[stepIndex]?.action;
    setCanAdvance(canAdvanceWithoutAction(action));
  }, [pathname]);

  const markAsCompleted = useCallback((id) => {
    setCompleted((current) => {
      if (current.includes(id)) return current;
      const next = [...current, id];
      setCompletedTutorials(next);
      return next;
    });
  }, []);

  const startTutorial = useCallback(
    (id) => {
      const tutorial = getTutorial(id);
      if (!tutorial || tutorial.steps.length === 0) return;
      if (id !== WELCOME_TUTORIAL_ID) markTutorialAutoStarted(id);
      const route = tutorial.route || pathname;
      if (route !== pathname) navigate(route);
      setStep(tutorial, 0, route);
    },
    [navigate, pathname, setStep]
  );

  const resetAllTutorials = useCallback(() => {
    resetTutorials();
    setCompleted([]);
    setActive(null);
    setCanAdvance(true);
  }, []);

  // Fermer le tutoriel efface sa reprise ; fermer l'accueil valide le choix de ne pas le suivre.
  const closeTutorial = useCallback(() => {
    if (active?.tutorial.id === WELCOME_TUTORIAL_ID) markAsCompleted(WELCOME_TUTORIAL_ID);
    setTutorialProgress(null);
    setActive(null);
    setCanAdvance(true);
  }, [active, markAsCompleted]);

  const pauseTutorial = useCallback(() => {
    if (active) {
      setTutorialProgress({
        id: active.tutorial.id,
        stepIndex: active.stepIndex,
        route: pathname,
      });
    }
    setActive(null);
  }, [active, pathname]);

  const goToStep = useCallback(
    (delta, allowUnvalidated = false) => {
      if (!active) return;
      if (delta > 0 && !canAdvance && !allowUnvalidated) return;
      const nextIndex = active.stepIndex + delta;
      if (nextIndex < 0) return;
      if (nextIndex >= active.tutorial.steps.length) {
        const startCampaignTutorial =
          active.tutorial.id === WELCOME_TUTORIAL_ID &&
          !completedTutorials.includes(CAMPAIGN_START_TUTORIAL_ID) &&
          !getAutoStartedTutorials().includes(CAMPAIGN_START_TUTORIAL_ID);
        markAsCompleted(active.tutorial.id);
        setTutorialProgress(null);
        setCanAdvance(true);
        if (startCampaignTutorial) {
          startTutorial(CAMPAIGN_START_TUTORIAL_ID);
          return;
        }
        setActive(null);
        return;
      }
      setStep(active.tutorial, nextIndex);
    },
    [active, canAdvance, completedTutorials, markAsCompleted, setStep, startTutorial]
  );

  // « Suivant » exécute l'action proposée ; l'étape avance une fois l'action réellement détectée.
  const advanceToNextStep = useCallback(() => {
    if (!active) return;
    const isLast = active.stepIndex === active.tutorial.steps.length - 1;

    // Le bouton "Terminer" sur la dernière étape complète et ferme toujours le tutoriel
    if (isLast) {
      goToStep(1, true);
      return;
    }

    const step = active.tutorial.steps[active.stepIndex];
    const action = step.action;

    // Tour d'accueil : « Suivant » ouvre directement l'onglet nommé par l'étape suivante.
    if (active.tutorial.id === WELCOME_TUTORIAL_ID) {
      const nextRoute = active.tutorial.steps[active.stepIndex + 1]?.action?.route;
      if (nextRoute && nextRoute !== pathname) navigate(nextRoute);
      goToStep(1, true);
      return;
    }

    if (!action || action.type === "presentation" || canAdvance) {
      const nextStep = active.tutorial.steps[active.stepIndex + 1];
      const targetRoute =
        nextStep?.action?.type === "navigate" ? nextStep.action.route : active.tutorial.route;
      if (targetRoute && targetRoute !== pathname) navigate(targetRoute);
      goToStep(1, true);
      return;
    }

    if (action.type === "navigate") {
      if (action.route !== pathname) navigate(action.route);
      return;
    }

    const target = findVisibleTarget(step.element);
    if (!target) {
      goToStep(1, true);
      return;
    }
    if (action.type === "click") {
      target.click();
      return;
    }
    // Étape de saisie : « Suivant » déclenche le bouton d'enregistrement du formulaire déjà ouvert,
    // sinon il ouvre d'abord ce formulaire en cliquant sur la cible.
    const openDialog = findUserDialog();
    const scope = action.name === "relation-saved" ? target : openDialog || target.closest("form");
    if (!scope) {
      goToStep(1, true);
      return;
    }
    const submit = findSubmitButton(scope, action.name === "relation-saved");
    if (submit) submit.click();
    else if (scope.tagName === "FORM") scope.requestSubmit();
    else scope.querySelector("input, textarea")?.focus();
  }, [active, canAdvance, goToStep, navigate, pathname]);

  const resumeTutorial = useCallback(() => {
    const progress = getTutorialProgress();
    if (!progress) return;
    const tutorial = getTutorial(progress.id);
    if (!tutorial || progress.stepIndex < 0 || progress.stepIndex >= tutorial.steps.length) {
      setTutorialProgress(null);
      return;
    }
    const route = progress.route || tutorial.route || pathname;
    if (route !== pathname) navigate(route);
    setStep(tutorial, progress.stepIndex, route);
  }, [navigate, pathname, setStep]);

  // Premier démarrage : propose le tour guidé complet après le chargement de l'interface.
  useEffect(() => {
    if (active || completedTutorials.includes(WELCOME_TUTORIAL_ID)) return undefined;
    if (getTutorialProgress()) return undefined;
    const timer = setTimeout(() => startTutorial(WELCOME_TUTORIAL_ID), WELCOME_DELAY_MS);
    return () => clearTimeout(timer);
  }, [active, completedTutorials, startTutorial]);

  // Après l'accueil, chaque onglet reçoit son tutoriel lors de sa première visite.
  useEffect(() => {
    if (active || !completedTutorials.includes(WELCOME_TUTORIAL_ID) || getTutorialProgress()) return undefined;
    const tutorial = TUTORIALS.find((item) => item.id !== WELCOME_TUTORIAL_ID && item.route === pathname);
    if (
      !tutorial ||
      completedTutorials.includes(tutorial.id) ||
      getAutoStartedTutorials().includes(tutorial.id)
    ) return undefined;

    const timer = setTimeout(() => startTutorial(tutorial.id), 300);
    return () => clearTimeout(timer);
  }, [active, completedTutorials, pathname, startTutorial]);

  // Chaque fenêtre de tutoriel ramène l'utilisateur sur l'onglet concerné.
  const activeId = active?.tutorial.id;
  const activeStepIndex = active?.stepIndex;
  useEffect(() => {
    if (!activeId) return;
    const tutorial = getTutorial(activeId);
    const action = tutorial?.steps[activeStepIndex]?.action;
    let route;
    if (activeId === WELCOME_TUTORIAL_ID) route = action?.route || "/";
    else if (action?.type !== "navigate") route = tutorial?.route;
    if (route && route !== pathnameRef.current) navigate(route);
  }, [activeId, activeStepIndex, navigate]);

  // Les étapes de navigation attendent que l'utilisateur ouvre lui-même l'onglet.
  useEffect(() => {
    if (!active || active.tutorial.id === WELCOME_TUTORIAL_ID) return undefined;
    const action = active.tutorial.steps[active.stepIndex]?.action;
    if (action?.type === "navigate" && action.route === pathname) {
      const isLast = active.stepIndex === active.tutorial.steps.length - 1;
      const timer = setTimeout(() => {
        if (isLast) setCanAdvance(true);
        else goToStep(1, true);
      }, 250);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [active, goToStep, pathname]);

  useEffect(() => {
    if (!active) return undefined;
    const action = active.tutorial.steps[active.stepIndex]?.action;
    if (!action) return undefined;

    const advanceOnAction = (event) => {
      if (event.detail?.action === action.name) {
        setCanAdvance(true);
        if (action.autoAdvance) goToStep(1, true);
      }
    };
    window.addEventListener("arcanes:tutorial-action", advanceOnAction);

    if (action.type === "click") {
      const advanceOnClick = (event) => {
        const target = event.target.closest(`[data-tutorial="${active.tutorial.steps[active.stepIndex].element}"]`);
        if (!target) return;
        if (active.stepIndex === active.tutorial.steps.length - 1) setCanAdvance(true);
        else goToStep(1, true);
      };
      document.addEventListener("click", advanceOnClick, true);
      return () => {
        window.removeEventListener("arcanes:tutorial-action", advanceOnAction);
        document.removeEventListener("click", advanceOnClick, true);
      };
    }

    if (action.type === "input") {
      const selector = `[data-tutorial="${active.tutorial.steps[active.stepIndex].element}"]`;
      const validateInput = (event) => {
        const target = event.target.closest(selector);
        if (target && String(target.value || "").trim()) setCanAdvance(true);
      };
      document.addEventListener("input", validateInput, true);
      document.addEventListener("change", validateInput, true);
      return () => {
        window.removeEventListener("arcanes:tutorial-action", advanceOnAction);
        document.removeEventListener("input", validateInput, true);
        document.removeEventListener("change", validateInput, true);
      };
    }

    return () => window.removeEventListener("arcanes:tutorial-action", advanceOnAction);
  }, [active, goToStep]);

  const markCurrentStepComplete = useCallback(() => setCanAdvance(true), []);

  const value = useMemo(
    () => ({
      tutorials: TUTORIALS,
      completedTutorials,
      activeTutorialId: active?.tutorial.id ?? null,
      startTutorial,
      resumeTutorial,
      hasTutorialProgress: !!getTutorialProgress(),
      markAsCompleted,
      resetAllTutorials,
      markCurrentStepComplete,
    }),
    [completedTutorials, active, startTutorial, resumeTutorial, markAsCompleted, resetAllTutorials, markCurrentStepComplete]
  );

  const pausedProgress = active ? null : getTutorialProgress();
  const pausedTutorial = pausedProgress ? getTutorial(pausedProgress.id) : null;
  const isTutorialPaused =
    pausedTutorial &&
    pausedProgress.stepIndex >= 0 &&
    pausedProgress.stepIndex < pausedTutorial.steps.length;

  return (
    <TutorialContext.Provider value={value}>
      {children}
      {isTutorialPaused && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl border border-border bg-card p-3 text-card-foreground shadow-xl md:bottom-4"
        >
          <p className="min-w-0 text-sm">
            Tutoriel en pause : <span className="font-semibold">{pausedTutorial.name}</span>
          </p>
          <button
            type="button"
            onClick={resumeTutorial}
            className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Reprendre
          </button>
        </div>
      )}
      {active && (
        <TutorialOverlay
          tutorial={active.tutorial}
          stepIndex={active.stepIndex}
          canAdvance={canAdvance}
          onNext={advanceToNextStep}
          onPrevious={() => goToStep(-1)}
          onPause={pauseTutorial}
          onClose={closeTutorial}
        />
      )}
    </TutorialContext.Provider>
  );
}
