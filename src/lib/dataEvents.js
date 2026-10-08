// Signal « des données ont changé », émis par la couche de données après chaque écriture réussie.
// Il ne lève jamais d'erreur et ne bloque jamais l'écriture : il ne fait que prévenir les écrans.

const DEBOUNCE_MS = 150;

const listeners = new Set();
let timer = null;
let pending = false;
let pauseCount = 0;

const flush = () => {
  timer = null;
  if (pauseCount > 0 || !pending) return;
  pending = false;
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error("Actualisation des données impossible :", error);
    }
  });
};

const schedule = () => {
  clearTimeout(timer);
  timer = setTimeout(flush, DEBOUNCE_MS);
};

export function notifyDataChanged() {
  pending = true;
  if (pauseCount === 0) schedule();
}

export function subscribeDataChanged(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Regroupe une suite d'écritures : les écrans ne sont actualisés qu'à la fin, une seule fois,
// pour ne jamais relire des données à moitié écrites. Même en cas d'erreur, l'actualisation reprend.
export async function withDataBatch(task) {
  pauseCount += 1;
  try {
    return await task();
  } finally {
    pauseCount -= 1;
    if (pauseCount === 0 && pending) schedule();
  }
}
