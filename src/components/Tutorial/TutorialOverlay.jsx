import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const PADDING = 6;
const GAP = 14;
const TOOLTIP_WIDTH = 320;
const EDGE = 12;

// Premier élément réellement visible portant data-tutorial="name" (la barre latérale existe en deux versions).
function findTarget(name) {
  if (!name) return null;
  const candidates = document.querySelectorAll(`[data-tutorial="${name}"]`);
  return (
    Array.from(candidates).find((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }) || null
  );
}

function findOpenDialog(exclude) {
  const dialogs = Array.from(document.querySelectorAll('[role="dialog"]')).filter((node) => {
    if (exclude && exclude.contains(node)) return false;
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
  return dialogs[dialogs.length - 1] || null;
}

function computeTooltipStyle(rect, size, preferred = "bottom") {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
  if (!rect) {
    return { left: (vw - size.width) / 2, top: (vh - size.height) / 2 };
  }

  const space = {
    bottom: vh - rect.bottom,
    top: rect.top,
    right: vw - rect.right,
    left: rect.left,
  };
  const need = { bottom: size.height, top: size.height, right: size.width, left: size.width };
  const order = [preferred, "bottom", "top", "right", "left"];
  const placement = order.find((side) => space[side] >= need[side] + GAP + EDGE) || "bottom";

  let left;
  let top;
  if (placement === "bottom" || placement === "top") {
    left = clamp(rect.left + rect.width / 2 - size.width / 2, EDGE, vw - size.width - EDGE);
    top = placement === "bottom" ? rect.bottom + GAP : rect.top - size.height - GAP;
  } else {
    top = clamp(rect.top + rect.height / 2 - size.height / 2, EDGE, vh - size.height - EDGE);
    left = placement === "right" ? rect.right + GAP : rect.left - size.width - GAP;
  }
  return { left: clamp(left, EDGE, vw - size.width - EDGE), top: clamp(top, EDGE, vh - size.height - EDGE) };
}

export default function TutorialOverlay({
  tutorial,
  stepIndex,
  canAdvance = true,
  onNext,
  onPrevious,
  onClose,
  onPause,
}) {
  const step = tutorial.steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === tutorial.steps.length - 1;
  const isPhaseLast = step.phase && step.phaseStep === step.phaseTotal;
  const isTour = tutorial.id === "welcome" || Boolean(step.noDim);
  const tooltipRef = useRef(null);
  const nextRef = useRef(null);
  const [rect, setRect] = useState(null);
  const [size, setSize] = useState({ width: TOOLTIP_WIDTH, height: 180 });
  const [visible, setVisible] = useState(false);
  const [blockedLong, setBlockedLong] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  const measure = useCallback(() => {
    // Pendant une saisie, on encadre tout le volet de création ouvert plutôt que le seul champ ou bouton.
    const isFormStep = step.action?.type === "event" || step.action?.type === "input";
    const target = (isFormStep && findOpenDialog(tooltipRef.current)) || findTarget(step.element);
    if (!target) {
      setRect((current) => (current ? null : current));
      return;
    }
    const box = target.getBoundingClientRect();
    const next = {
      top: box.top - PADDING,
      left: box.left - PADDING,
      width: box.width + PADDING * 2,
      height: box.height + PADDING * 2,
      bottom: box.bottom + PADDING,
      right: box.right + PADDING,
    };
    setRect((current) =>
      current && current.top === next.top && current.left === next.left && current.width === next.width && current.height === next.height
        ? current
        : next
    );
  }, [step.element, step.action?.type]);

  // Amène la cible dans la vue au changement d'étape.
  useEffect(() => {
    const timer = setTimeout(() => {
      findTarget(step.element)?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 50);
    return () => clearTimeout(timer);
  }, [step.element]);

  // Suit la cible : la page peut charger après coup (chargement paresseux) ou défiler.
  useEffect(() => {
    measure();
    const interval = setInterval(measure, 200);
    window.addEventListener("resize", measure);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  // Mesure l'infobulle à chaque rendu ; setSize ne change l'état que si la taille a vraiment changé (pas de boucle).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const node = tooltipRef.current;
    if (!node) return;
    const { width, height } = node.getBoundingClientRect();
    setSize((current) => (current.width === width && current.height === height ? current : { width, height }));
  });
  
  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    nextRef.current?.focus();
  }, [stepIndex]);

  useEffect(() => {
    setBlockedLong(false);
    setShowSolution(false);
    if (canAdvance) return undefined;
    const timer = setTimeout(() => setBlockedLong(true), 30000);
    return () => clearTimeout(timer);
  }, [canAdvance, stepIndex]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onNext();
      } else if (event.key === "ArrowLeft" && !isFirst) {
        event.preventDefault();
        onPrevious();
      } else if (event.key === "Tab" && tooltipRef.current) {
        const focusable = tooltipRef.current.querySelectorAll("button:not([disabled])");
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isFirst, onClose, onNext, onPrevious]);

  const tooltipStyle = computeTooltipStyle(rect, size, step.position);
  const titleId = "tutorial-title";
  const introId = "tutorial-intro";

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[9999]">
      {rect ? (
        <div
          aria-hidden="true"
          className={`pointer-events-none fixed rounded-lg ring-2 ring-blue-500/50 ${isTour ? "" : "shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]"} transition-all duration-300 motion-reduce:transition-none`}
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
        />
      ) : (
        !isTour && <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-black/70" />
      )}

      <div
        ref={tooltipRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={introId}
        className={`pointer-events-auto fixed rounded-lg border border-gray-700 bg-gray-800 p-4 text-white shadow-xl transition-all duration-300 motion-reduce:transition-none ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        style={{ ...tooltipStyle, width: `min(${TOOLTIP_WIDTH}px, calc(100vw - ${EDGE * 2}px))` }}
      >
        <p className="text-xs text-gray-400">
          {step.phase ? `Phase ${step.phase}/3 · ` : ""}{step.title ? `${tutorial.name} · ` : ""}
          Étape {step.phaseStep || stepIndex + 1} / {step.phaseTotal || tutorial.steps.length}
        </p>
        <h2 id={titleId} className="mt-1 text-base font-semibold">
          {step.title}
        </h2>
        <p id={introId} className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-200">
          {step.intro}
        </p>
        {(isLast || isPhaseLast) && (
          <p className="mt-2 text-sm font-medium text-emerald-300">
            {isLast
              ? tutorial.summary || `Bravo, le tutoriel « ${tutorial.name} » est terminé.`
              : "Bravo, cette phase est terminée."}
          </p>
        )}
        {step.hint && !canAdvance && (
          <p className="mt-2 text-xs text-amber-200">{step.hint}</p>
        )}
        {blockedLong && (
          <div className="mt-2">
            <p className="text-xs text-amber-200">Besoin d'aide ? Vous pouvez afficher une solution ou terminer le tutoriel.</p>
            {step.solution && (
              <button
                type="button"
                onClick={() => setShowSolution((shown) => !shown)}
                className="mt-1 text-xs text-blue-300 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {showSolution ? "Masquer la solution" : "Voir la solution"}
              </button>
            )}
            {showSolution && <p className="mt-1 text-xs text-gray-200">{step.solution}</p>}
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1.5 text-sm text-gray-400 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Ignorer ce tuto
            </button>
            <button
              type="button"
              onClick={onPause}
              className="rounded-lg px-2 py-1.5 text-sm text-gray-400 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Pause
            </button>
          </div>
          <div className="ml-auto flex shrink-0 gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={onPrevious}
                className="rounded-lg bg-gray-700 px-3 py-1.5 text-sm text-white transition-colors hover:bg-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Précédent
              </button>
            )}
            <button
              ref={nextRef}
              type="button"
              onClick={onNext}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
            >
              {isLast ? "Terminer" : "Suivant"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
