import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Racines de la barre d'onglets mobile : chaque onglet tient sa propre pile.
export const TAB_ROOTS = ["/", "/codex", "/calendrier", "/tables", "/notes", "/jeu"];

const MAX_STACK = 20;

const tabForPath = (pathname) => {
  if (pathname === "/") return "/";
  return (
    TAB_ROOTS.find(
      (root) => root !== "/" && (pathname === root || pathname.startsWith(`${root}/`))
    ) || null
  );
};

const emptyStacks = () => TAB_ROOTS.reduce((acc, root) => ({ ...acc, [root]: [root] }), {});

const TabStackContext = createContext({ stacks: {}, activeTab: null, openTab: null, tabTarget: null });

export function TabStackProvider({ children }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [stacks, setStacks] = useState(emptyStacks);

  const activeTab = tabForPath(pathname);

  // Chaque onglet mémorise les chemins qu'on y a visités.
  useEffect(() => {
    const tab = tabForPath(pathname);
    if (!tab) return;
    setStacks((prev) => {
      const stack = prev[tab] || [tab];
      if (stack[stack.length - 1] === pathname) return prev;
      return { ...prev, [tab]: [...stack, pathname].slice(-MAX_STACK) };
    });
  }, [pathname]);

  const tabTarget = useCallback(
    (root) => {
      const stack = stacks[root] || [root];
      return stack[stack.length - 1] || root;
    },
    [stacks]
  );

  const openTab = useCallback(
    (root) => {
      if (root === activeTab) {
        // Onglet déjà actif : on repart de sa racine et on remonte en haut de page.
        setStacks((prev) => ({ ...prev, [root]: [root] }));
        if (pathname !== root) navigate(root);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      navigate(tabTarget(root));
    },
    [activeTab, navigate, pathname, tabTarget]
  );

  const value = useMemo(
    () => ({ stacks, activeTab, openTab, tabTarget }),
    [stacks, activeTab, openTab, tabTarget]
  );

  return <TabStackContext.Provider value={value}>{children}</TabStackContext.Provider>;
}

export function useTabStacks() {
  return useContext(TabStackContext);
}