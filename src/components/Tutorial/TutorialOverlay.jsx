import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { placeBubble } from "@/lib/tutorial/placement";
import { findVisible, targetSpec } from "@/lib/tutorial/dom";

const BUBBLE_WIDTH = 340;
const MOBILE_BREAKPOINT = 768;
const MOBILE_NAV_HEIGHT = 84;
const RING_PADDING = 5;
const SEARCH_GRACE_MS = 600;
// La page peut encore bouger après l'arrivée de l'élément (transition de page, données chargées, fenêtre qui s'ouvre) :
// on vérifie pendant 2 s (20 contrôles) qu'il est bien dans la zone visible, sinon on le ramène.
const REVEAL_RETRIES = 20;

const toRect = ({ left, top, width, height }) => ({ left, top, width, height });
const sameRect = (a, b) =>
  a === b || (a && b && a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height);

function scrollParent(node) {
  let parent = node.parentElement;
  while (parent && parent !== document.body) {
    const overflow = getComputedStyle(parent).overflowY;
    if ((overflow === "auto" || overflow === "scroll") && parent.scrollHeight > parent.clientHeight) return parent;
    parent = parent.parentElement;
  }
  return document.scrollingElement;
}

// Amène l'élément dans la partie de l'écran que la bulle ne recouvre pas.
function reveal(target, reservedBottom) {
  const limit = window.innerHeight - reservedBottom - 12;
  const rect = target.getBoundingClientRect();
  if (rect.top >= 12 && rect.bottom <= limit) return;
  target.scrollIntoView({ block: "center", inline: "nearest" });
  const after = target.getBoundingClientRect();
  if (after.bottom > limit) scrollParent(target)?.scrollBy({ top: after.bottom - limit + 12 });
}

/**
 * Bulle d'explication d'une étape : placée à côté de l'élément (jamais dessus), sans voile sur l'écran.
 * Un simple contour montre l'élément. Sur téléphone, la bulle est un bandeau au-dessus de la barre d'onglets.
 */
export default function TutorialOverlay({ tour, step, index, total, ready, collapsed, onToggleCollapsed, onNext, onPrevious, onClose }) {
  const bubbleRef = useRef(null);
  const [rect, setRect] = useState(null);
  const [waited, setWaited] = useState(false);
  const [size, setSize] = useState({ width: BUBBLE_WIDTH, height: 170 });
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const mobile = viewport.width < MOBILE_BREAKPOINT;
  const last = index === total - 1;
  const reservedBottom = mobile ? size.height + MOBILE_NAV_HEIGHT : 0;

  // Mesure de la bulle (sa hauteur change avec le texte et le mode réduit).
  useEffect(() => {
    const node = bubbleRef.current;
    if (!node || typeof ResizeObserver !== "function") return undefined;
    const observer = new ResizeObserver(() => {
      const box = node.getBoundingClientRect();
      setSize((previous) => (previous.width === box.width && previous.height === box.height ? previous : { width: box.width, height: box.height }));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ready]);

  // Suivi de l'élément montré : position, défilement, redimensionnement, changements de mise en page.
  useEffect(() => {
    if (!ready) return undefined;
    let alive = true;
    let target = null;
    let revealTries = 0;
    const spec = targetSpec(step);
    const measure = () => {
      if (!alive) return;
      if (!target || !target.isConnected) target = findVisible(spec);
      const next = target ? toRect(target.getBoundingClientRect()) : null;
      setRect((previous) => (sameRect(previous, next) ? previous : next));
      setViewport((previous) =>
        previous.width === window.innerWidth && previous.height === window.innerHeight
          ? previous
          : { width: window.innerWidth, height: window.innerHeight }
      );
      if (target && revealTries < REVEAL_RETRIES) {
        revealTries += 1;
        reveal(target, reservedBottom);
      }
    };
    const first = requestAnimationFrame(measure);
    const timer = setInterval(measure, 100);
    const grace = setTimeout(() => alive && setWaited(true), SEARCH_GRACE_MS);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      alive = false;
      cancelAnimationFrame(first);
      clearInterval(timer);
      clearTimeout(grace);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [ready, step, reservedBottom]);

  // Flèches du clavier (sauf pendant une saisie). Échap n'est volontairement pas utilisé : il fermerait la fenêtre ouverte dessous.
  useEffect(() => {
    const onKey = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const tag = event.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || event.target?.isContentEditable) return;
      if (event.key === "ArrowRight") onNext();
      else if (event.key === "ArrowLeft" && index > 0) onPrevious();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, onNext, onPrevious]);

  const visible = ready && (!targetSpec(step) || rect || waited);
  const placement = mobile
    ? null
    : placeBubble({ target: rect, size, viewport, prefer: step.side });

  // La bulle est rendue hors de l'application : une fenêtre ouverte dessous (Radix) la verrait comme « extérieure »
  // et se fermerait au clic. On arrête donc la propagation du clic et du focus avant qu'ils n'atteignent le document.
  const shield = (event) => event.stopPropagation();

  return createPortal(
    <>
      {visible && rect && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[70] rounded-lg border-2 border-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.2)] transition-[left,top,width,height] duration-200 motion-reduce:transition-none"
          style={{
            left: rect.left - RING_PADDING,
            top: rect.top - RING_PADDING,
            width: rect.width + RING_PADDING * 2,
            height: rect.height + RING_PADDING * 2,
          }}
        />
      )}
      <div
        ref={bubbleRef}
        role="region"
        aria-label="Visite guidée"
        aria-live="polite"
        onPointerDown={shield}
        onFocus={shield}
        className={cn(
          "fixed z-[70] rounded-xl border border-border bg-card p-4 text-card-foreground shadow-xl",
          mobile && "inset-x-2 bottom-[calc(5rem+env(safe-area-inset-bottom))]",
          !visible && "invisible"
        )}
        style={{ pointerEvents: "auto", ...(mobile ? {} : { width: BUBBLE_WIDTH, left: placement.left, top: placement.top }) }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              {tour.name} · {index + 1}/{total}
            </p>
            <h2 className="mt-1 font-display text-base font-semibold text-foreground">{step.title}</h2>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleCollapsed} aria-label={collapsed ? "Agrandir la bulle" : "Réduire la bulle"}>
              {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label="Quitter la visite">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {!collapsed && <p className="mt-2 text-sm text-foreground">{step.text}</p>}
        <div className="mt-3 flex items-center justify-between gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onPrevious} disabled={index === 0}>
            Précédent
          </Button>
          <Button type="button" size="sm" onClick={onNext}>
            {last ? "Terminer" : "Suivant"}
          </Button>
        </div>
      </div>
    </>,
    document.body
  );
}
