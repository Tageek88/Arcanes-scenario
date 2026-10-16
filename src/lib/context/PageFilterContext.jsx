import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

const PageFilterContext = createContext(null);

export function PageFilterProvider({ children }) {
  const [filters, setFilters] = useState({});
  const setFilter = useCallback((key, valueOrUpdater) => {
    setFilters((current) => ({
      ...current,
      [key]: typeof valueOrUpdater === "function"
        ? valueOrUpdater(current[key])
        : valueOrUpdater,
    }));
  }, []);
  const value = useMemo(() => ({ filters, setFilter }), [filters, setFilter]);

  return (
    <PageFilterContext.Provider value={value}>
      {children}
    </PageFilterContext.Provider>
  );
}

export function usePageFilter(key, initialValue) {
  const context = useContext(PageFilterContext);
  if (!context) throw new Error("usePageFilter doit être utilisé dans PageFilterProvider.");

  const { filters, setFilter } = context;
  const setValue = useCallback(
    (valueOrUpdater) => setFilter(
      key,
      typeof valueOrUpdater === "function"
        ? (currentValue) => valueOrUpdater(currentValue ?? initialValue)
        : valueOrUpdater
    ),
    [setFilter, initialValue, key]
  );
  return [filters[key] ?? initialValue, setValue];
}
