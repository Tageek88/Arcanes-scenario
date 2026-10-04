import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

// Durée minimale d'affichage de l'indicateur, le temps que les données reviennent.
const SETTLE_MS = 600;

const RefreshContext = createContext({ refreshKey: 0, refresh: async () => {} });

export function RefreshProvider({ children }) {
  const [refreshKey, setRefreshKey] = useState(0);

  // Relance les chargements de la page affichée, sans recharger l'application.
  const refresh = useCallback(async () => {
    setRefreshKey((key) => key + 1);
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
  }, []);

  const value = useMemo(() => ({ refreshKey, refresh }), [refreshKey, refresh]);

  return <RefreshContext.Provider value={value}>{children}</RefreshContext.Provider>;
}

export function useDataRefresh() {
  return useContext(RefreshContext);
}