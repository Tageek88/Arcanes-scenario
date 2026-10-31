import { createContext, useContext } from "react";

// Post-it de MJ : comptes par élément et ouverture de la fenêtre. Fourni par `PostItProvider` (components/common).
// Sans fournisseur (tests, pages isolées), la valeur est null et les boutons ne s'affichent pas.
export const PostItContext = createContext(null);

export const usePostItContext = () => useContext(PostItContext);
