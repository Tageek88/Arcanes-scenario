// === SECTION ACTIONS DE DÉMONSTRATION DU TUTORIEL ===
// Une page (ou un composant) déclare ce que le tutoriel peut faire à sa place : « ouvrir cette fiche », « déplier cette carte »...
// Le tutoriel ne connaît jamais les composants : il appelle une action par son nom (voir hooks/useDemoAction.js).

const actions = new Map();

/** Déclare une action ; renvoie la fonction qui la retire (à appeler au démontage). */
export function registerDemoAction(name, handler) {
  actions.set(name, handler);
  return () => {
    if (actions.get(name) === handler) actions.delete(name);
  };
}

export const hasDemoAction = (name) => actions.has(name);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Lance une action. La page peut ne pas être encore affichée : on attend sa déclaration jusqu'à `timeoutMs`.
 * Ne lève jamais d'erreur : { ok: true, value } ou { ok: false, reason }.
 */
export async function runDemoAction(name, args, { timeoutMs = 2500 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (!actions.has(name) && Date.now() < deadline) {
    await wait(40);
  }
  const handler = actions.get(name);
  if (!handler) return { ok: false, reason: "missing" };
  try {
    return { ok: true, value: await handler(args) };
  } catch (error) {
    console.error(`Action de démonstration « ${name} » en échec`, error);
    return { ok: false, reason: "failed" };
  }
}
