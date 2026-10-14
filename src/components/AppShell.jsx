import React, { Suspense, useCallback } from "react";
import { useLocation } from "react-router-dom";
import SideRail from "@/components/nav/SideRail";
import MobileNav from "@/components/nav/MobileNav";
import MobileBackBar from "@/components/MobileBackBar";
import PageLoader from "@/components/PageLoader";
import PullToRefresh from "@/components/PullToRefresh";
import { queryClientInstance } from "@/lib/query-client";
import { useDataRefresh } from "@/lib/context/RefreshContext";
import { useExpandedCardState } from "@/lib/context/ExpandedCardContext";

export default function AppShell({ children }) {
  const { pathname } = useLocation();
  const { refresh } = useDataRefresh();
  const { setExpandedCardId } = useExpandedCardState();

  const handleRefresh = useCallback(async () => {
    queryClientInstance.invalidateQueries();
    await refresh();
  }, [refresh]);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-background text-foreground">
      <SideRail />
      <main data-tutorial="main-content" className="min-h-screen w-full max-w-full pb-24 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] md:pb-0 md:pl-20">
        <MobileBackBar />
        <PullToRefresh onRefresh={handleRefresh}>
          <Suspense fallback={<PageLoader />}>
            <div key={pathname} className="page-transition w-full max-w-full">
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