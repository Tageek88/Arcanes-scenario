const STORAGE_KEY = "arcanes.tutorials.completed";
const PROGRESS_KEY = "arcanes.tutorials.progress";
const AUTO_STARTED_KEY = "arcanes.tutorials.auto-started";

export function getCompletedTutorials() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setCompletedTutorials(ids) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* stockage indisponible : le tutoriel pourra simplement se relancer */
  }
}

export function getAutoStartedTutorials() {
  try {
    const parsed = JSON.parse(localStorage.getItem(AUTO_STARTED_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function markTutorialAutoStarted(id) {
  try {
    const started = getAutoStartedTutorials();
    if (!started.includes(id)) {
      localStorage.setItem(AUTO_STARTED_KEY, JSON.stringify([...started, id]));
    }
  } catch {
    /* le tutoriel reste utilisable sans mémoriser son lancement automatique */
  }
}

export function resetTutorials() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PROGRESS_KEY);
    localStorage.removeItem(AUTO_STARTED_KEY);
  } catch {
    /* rien à réinitialiser */
  }
}

export function getTutorialProgress() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "null");
    return parsed && typeof parsed.id === "string" && Number.isInteger(parsed.stepIndex)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function setTutorialProgress(progress) {
  try {
    if (progress) localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    else localStorage.removeItem(PROGRESS_KEY);
  } catch {
    /* la session peut continuer sans reprise persistée */
  }
}

export function dispatchTutorialAction(action, payload = {}) {
  window.dispatchEvent(new CustomEvent("arcanes:tutorial-action", {
    detail: { action, payload },
  }));
}
