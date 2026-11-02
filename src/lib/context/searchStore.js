// === SECTION RECHERCHE GLOBALE : ÉTAT PARTAGÉ ===
// Deux petits canaux sans React : demander l'ouverture de la fenêtre de recherche (bouton loupe, Ctrl+K),
// et laisser à la page d'arrivée l'élément choisi, qu'elle ouvre à son affichage.

const listeners = new Set();

/** Appelle `listener()` quand quelqu'un demande la fenêtre de recherche ; renvoie la fonction qui arrête l'écoute. */
export const subscribeSearchRequest = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const requestSearch = () => listeners.forEach((listener) => listener());

// Un élément choisi dans la recherche, à ouvrir par la page vers laquelle on navigue.
// Il périme vite : si aucune page ne le prend, il ne doit pas s'ouvrir par surprise plus tard.
const PENDING_LIFETIME_MS = 5000;
let pending = null;

export const setPendingOpen = (kind, id) => {
  pending = { kind, id, at: Date.now() };
};

/** Regarde l'élément à ouvrir, sans le prendre, s'il est d'un des types demandés et récent. Sinon `null`. */
export const peekPendingOpen = (kinds) => {
  if (!pending) return null;
  if (Date.now() - pending.at > PENDING_LIFETIME_MS) {
    pending = null;
    return null;
  }
  return kinds.includes(pending.kind) ? { kind: pending.kind, id: pending.id } : null;
};

/**
 * Prend l'élément à ouvrir (et l'oublie) s'il est d'un des types demandés, récent, et si `exists(id)` est vrai.
 * Tant que les données de la page ne sont pas chargées, `exists` est faux et l'élément reste en attente.
 */
export const takePendingOpen = (kinds, exists = () => true) => {
  const request = peekPendingOpen(kinds);
  if (!request || !exists(request.id)) return null;
  pending = null;
  return request;
};
