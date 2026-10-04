import React, { Suspense, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import SideRail from "@/components/nav/SideRail";
import MobileNav from "@/components/nav/MobileNav";
import MobileBackBar from "@/components/MobileBackBar";
import PageLoader from "@/components/PageLoader";
import PullToRefresh from "@/components/PullToRefresh";
import { queryClientInstance } from "@/lib/query-client";
import { useDataRefresh } from "@/lib/RefreshContext";

export default function AppShell({ children }) {
  const { pathname } = useLocation();
  const { refresh } = useDataRefresh();

  const handleRefresh = useCallback(async () => {
    queryClientInstance.invalidateQueries();
    await refresh();
  }, [refresh]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SideRail />
      <main className="pb-24 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] md:pb-0 md:pl-20">
        <MobileBackBar />
        <PullToRefresh onRefresh={handleRefresh}>
          <Suspense fallback={<PageLoader />}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pathname}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </PullToRefresh>
      </main>
      <MobileNav />
    </div>
  );
}