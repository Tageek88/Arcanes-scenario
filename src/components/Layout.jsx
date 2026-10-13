import React from "react";
import { useOutlet } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { RefreshProvider } from "@/lib/context/RefreshContext";
import { TabStackProvider } from "@/lib/context/TabStackContext";
import { ExpandedCardProvider } from "@/lib/context/ExpandedCardContext";
import { PageFilterProvider } from "@/lib/context/PageFilterContext";

export default function Layout() {
  const outlet = useOutlet();

  return (
    <RefreshProvider>
      <TabStackProvider>
        <PageFilterProvider>
          <ExpandedCardProvider>
            <AppShell>{outlet}</AppShell>
          </ExpandedCardProvider>
        </PageFilterProvider>
      </TabStackProvider>
    </RefreshProvider>
  );
}