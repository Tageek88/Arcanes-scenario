import React, { Suspense, useCallback, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import SideRail from "@/components/nav/SideRail";
import MobileNav from "@/components/nav/MobileNav";
import MobileBackBar from "@/components/MobileBackBar";
import PageLoader from "@/components/PageLoader";
import PullToRefresh from "@/components/PullToRefresh";
import { queryClientInstance } from "@/lib/query-client";
import { useDataRefresh } from "@/lib/context/RefreshContext";
import { useExpandedCardState } from "@/lib/context/ExpandedCardContext";

// Ordre des rubriques du menu : il décide du sens dans lequel la page se tourne.
const PAGE_ORDER = ["/", "/codex", "/calendrier", "/tables", "/notes", "/jeu", "/settings"];
const orderOf = (path) => {
  const index = PAGE_ORDER.findIndex((item) => (item === "/" ? path === "/" : path === item || path.startsWith(item + "/")));
  return index < 0 ? PAGE_ORDER.length : index;
};

// Attend que la nouvelle page soit réellement affichée (et non son indicateur de chargement) avant de la photographier.
const settle = async () => {
  const limit = Date.now() + 800;
  while (document.querySelector("[data-page-loader]") && Date.now() < limit) {
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }
};

export default function AppShell({ children }) {
  const { pathname } = useLocation();
  const [turn, setTurn] = useState({ path: pathname, direction: "forward" });
  if (turn.path !== pathname) {
    setTurn({ path: pathname, direction: orderOf(pathname) >= orderOf(turn.path) ? "forward" : "back" });
  }
  const navigate = useNavigate();

  // Clic sur un lien interne : le navigateur garde un instantané de l'ancienne page pendant que la nouvelle se pose dessus.
  useEffect(() => {
    if (typeof document.startViewTransition !== "function") return undefined;
    const onClick = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const link = event.target instanceof Element ? event.target.closest("a[href^='#/']") : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const to = link.getAttribute("href").slice(1);
      const nextPath = to.split(/[?#]/)[0] || "/";
      if (nextPath === pathname) return;
      event.preventDefault();
      const root = document.documentElement;
      root.dataset.turn = orderOf(nextPath) >= orderOf(pathname) ? "forward" : "back";
      const transition = document.startViewTransition(async () => {
        flushSync(() => navigate(to));
        await settle();
      });
      const clear = () => { delete root.dataset.turn; };
      transition.finished.then(clear, clear);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname, navigate]);

  const { refresh } = useDataRefresh();
  const { setExpandedCardId } = useExpandedCardState();

  const handleRefresh = useCallback(async () => {
    queryClientInstance.invalidateQueries();
    await refresh();
  }, [refresh]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SideRail />
      <main data-tutorial="main-content" className="pb-24 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] md:pb-0 md:pl-20">
        <MobileBackBar />
        <PullToRefresh onRefresh={handleRefresh}>
          <Suspense fallback={<div data-page-loader><PageLoader /></div>}>
            <div key={pathname} className="page-transition" data-turn={turn.direction}>
              <div
                onClick={(event) => {
                  if (!event.target.closest("[data-expandable-card], [data-keep-expanded], [role='dialog'], [role='alertdialog'], [role='menu'], [role='listbox']")) setExpandedCardId(null);
                }}
              >
                {children}
              </div>
            </div>
          </Suspense>
        </PullToRefresh>
      </main>
      <MobileNav />
    </div>
  );
}