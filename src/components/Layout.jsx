import React from "react";
import { useOutlet } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { RefreshProvider } from "@/lib/RefreshContext";
import { TabStackProvider } from "@/lib/TabStackContext";

export default function Layout() {
  const outlet = useOutlet();

  return (
    <RefreshProvider>
      <TabStackProvider>
        <AppShell>{outlet}</AppShell>
      </TabStackProvider>
    </RefreshProvider>
  );
}