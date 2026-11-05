// === SECTION OUTILS DOM DE LA VISITE GUIDÉE ===
// La visite montre toujours un élément réel de la page. Un élément est désigné soit par sa valeur de data-tutorial,
// soit par un sélecteur CSS (+ un texte qu'il doit contenir), quand la page n'a pas de repère dédié.

const norm = (value) => String(value || "").replace(/\s+/g, " ").trim();
const isVisible = (node) => {
  const rect = node.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Désignation CSS d'un élément à montrer, selon les champs d'une étape : { selector, text } ou null. */
export function targetSpec(step) {
  if (!step) return null;
  if (step.target) return { selector: `[data-tutorial="${step.target}"]`, text: "" };
  if (step.selector) return { selector: step.selector, text: step.selectorText || "" };
  return null;
}

/** Premier élément réellement visible qui correspond (certains existent en deux versions, bureau et mobile). */
export function findVisible(spec) {
  if (!spec?.selector) return null;
  let nodes;
  try {
    nodes = Array.from(document.querySelectorAll(spec.selector));
  } catch {
    return null;
  }
  const text = norm(spec.text);
  return nodes.find((node) => isVisible(node) && (!text || norm(node.textContent).includes(text))) || null;
}

/** Attend l'apparition d'un élément (la page vient souvent de s'afficher) ; null si rien n'apparaît à temps. */
export async function waitForVisible(specs, timeoutMs = 3000) {
  const list = Array.isArray(specs) ? specs : [specs];
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    for (const spec of list) {
      const node = findVisible(spec);
      if (node) return node;
    }
    if (Date.now() >= deadline) return null;
    await wait(60);
  }
}

// Sur téléphone, une fenêtre qui s'ouvre place le curseur dans son premier champ et fait monter le clavier,
// qui cacherait l'écran : on retire le curseur une fois la fenêtre en place.
const dropKeyboard = () => {
  [250, 700].forEach((delay) =>
    setTimeout(() => {
      const active = document.activeElement;
      if (active && active !== document.body && typeof active.blur === "function" && /^(INPUT|TEXTAREA)$/.test(active.tagName)) active.blur();
    }, delay)
  );
};

/**
 * Actions génériques que la visite peut lancer sur n'importe quelle page :
 *  - dom.click { selector | selectors, text?, skipIf?, blur? } : clique l'élément ; skipIf = sélecteur que l'élément doit
 *    ne PAS déjà respecter (ex. déjà déplié) ; blur = retirer le clavier après l'ouverture d'une fenêtre.
 *  - dom.closeDialog : referme la fenêtre ouverte (touche Échap, comme le ferait la personne).
 */
export const DOM_ACTIONS = {
  "dom.click": async ({ selector, selectors, text = "", skipIf = "", blur = false } = {}) => {
    const specs = (selectors || [selector]).filter(Boolean).map((one) => ({ selector: one, text }));
    const node = await waitForVisible(specs);
    if (!node) return false;
    if (skipIf && node.matches(skipIf)) return true;
    node.click();
    if (blur) dropKeyboard();
    return true;
  },
  "dom.closeDialog": async () => {
    const open = Array.from(document.querySelectorAll('[role="dialog"], [role="alertdialog"]')).some(isVisible);
    if (open) document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    await wait(150);
    return open;
  },
};
