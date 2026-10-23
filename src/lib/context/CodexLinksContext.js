import { createContext, useContext } from "react";

/**
 * Liens interactifs du Codex, fournis par la page Codex et par le panneau de la page d'accueil.
 * Sans fournisseur (valeur null), les valeurs s'affichent comme du simple texte.
 *
 * @typedef {Object} CodexLinks
 * @property {string} term                                            recherche en cours (pour repérer les filtres actifs)
 * @property {(key: string, value: string) => void} filter            ajoute ou retire un filtre dans la barre de recherche
 * @property {(kind: string, id: string) => void} goTo                affiche l'élément correspondant (PNJ, lieu, indice)
 * @property {(kind: string, locationId: string) => void} showAt      affiche les éléments d'un type rattachés à un lieu
 */
export const CodexLinksContext = createContext(/** @type {CodexLinks | null} */ (null));

export const useCodexLinks = () => useContext(CodexLinksContext);
