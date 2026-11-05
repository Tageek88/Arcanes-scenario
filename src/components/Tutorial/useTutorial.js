import { useContext } from "react";
import { TutorialContext } from "./TutorialProvider";

// Exemple : const { startTour } = useTutorial(); startTour("tour-1");
export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) throw new Error("useTutorial doit être utilisé dans un TutorialProvider.");
  return context;
}

export default useTutorial;
