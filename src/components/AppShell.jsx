import React, { Suspense, useCallback } from "react";
import { useLocation } from "react-router-dom";
import SideRail from "@/components/nav/SideRail";
import MobileNav from "@/components/nav/MobileNav";
import MobileBackBar from "@/components/MobileBackBar";
import PageLoader from "@/components/PageLoader";
import PullToRefresh from "@/components/PullToRefresh";
import { queryClientInstance } from "@/lib/query-client";
import { useDataRefresh } from "@/lib/RefreshContext";
import { useExpandedCardState } from "@/lib/ExpandedCardContext";

export default function AppShell({ children }) {
  const { pathname } = useLocation();
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
          <Suspense fallback={<PageLoader />}>
            <div key={pathname} className="page-transition">
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