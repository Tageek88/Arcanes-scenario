import { useEffect, useRef } from "react";
import { registerDemoAction } from "@/lib/context/tutorialBridge";

/**
 * Déclare une action que le tutoriel peut lancer pendant que ce composant est affiché.
 * Exemple : useDemoAction("codex.openFirstNpc", () => openEdit(firstNpc));
 */
export default function useDemoAction(name, handler) {
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });
  useEffect(() => registerDemoAction(name, (args) => latest.current(args)), [name]);
}
