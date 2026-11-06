import { useSyncExternalStore } from "react";
import { getPendingVersion, subscribePendingOpen } from "@/lib/context/searchStore";

/** Change à chaque élément choisi dans la recherche globale : à mettre dans les dépendances de l'effet qui le prend. */
export function usePendingOpenTick() {
  return useSyncExternalStore(subscribePendingOpen, getPendingVersion);
}
