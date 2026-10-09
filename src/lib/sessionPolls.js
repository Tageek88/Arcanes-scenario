import { api } from "@/api/localClient";

const SERVICE_URL_KEY = "arcanes_poll_service_url";
const DEFAULT_SERVICE_URL = "https://arcanes-planification.pages.dev";
const AVAILABILITY_VALUES = new Set(["available", "maybe", "unavailable"]);

export function getPollServiceUrl() {
  try {
    return localStorage.getItem(SERVICE_URL_KEY) || DEFAULT_SERVICE_URL;
  } catch (error) {
    console.error("Lecture de l'adresse du service de sondage impossible :", error);
    return DEFAULT_SERVICE_URL;
  }
}

export function savePollServiceUrl(value) {
  try {
    if (!value) {
      localStorage.removeItem(SERVICE_URL_KEY);
      return;
    }
    localStorage.setItem(SERVICE_URL_KEY, value);
  } catch (error) {
    console.error("Enregistrement de l'adresse du service de sondage impossible :", error);
    throw new Error("L'adresse du service n'a pas pu être mémorisée sur cet appareil.");
  }
}

export function normalizePollServiceUrl(value) {
  let url;
  try {
    url = new URL(String(value || "").trim());
  } catch {
    throw new Error("Saisissez l'adresse complète du site de sondage Cloudflare Pages.");
  }
  const localHttp = ["localhost", "127.0.0.1"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(localHttp && url.protocol === "http:")) ||
    url.pathname !== "/" || url.search || url.hash) {
    throw new Error("L'adresse doit être l'origine HTTPS du site de sondage, sans chemin supplémentaire.");
  }
  return url.origin;
}

export async function pollRequest(baseUrl, path, options = {}) {
  const response = await fetch(`${normalizePollServiceUrl(baseUrl)}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error(`Le service de sondage a renvoyé une réponse illisible (${response.status}).`);
  }
  if (!response.ok) {
    const error = new Error(body.error || `Le service de sondage a répondu ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return body;
}

const EMPTY_COUNTS = { available: 0, maybe: 0, unavailable: 0 };

export function withSlotAvailabilityCounts(slots = [], votes = []) {
  return slots.map((slot) => {
    const counts = { ...EMPTY_COUNTS };
    for (const vote of votes) {
      const choice = vote?.choices?.[slot.id];
      if (choice in counts) counts[choice] += 1;
    }
    return { ...slot, ...counts };
  });
}

export async function refreshSessionPoll(poll, baseUrl) {
  const results = await pollRequest(baseUrl, `/api/polls/${poll.poll_id}/results`, {
    headers: { Authorization: `Bearer ${poll.owner_token}` },
  });
  const votes = results.votes || [];
  const updated = {
    title: results.title || poll.title,
    comment: results.comment || "",
    expected_players: results.players,
    slots: withSlotAvailabilityCounts(results.slots || [], votes),
    votes,
    timezone: results.timezone || poll.timezone,
    state: results.state,
    expires_at: results.expiresAt,
    synced_at: new Date().toISOString(),
  };
  await api.entities.SessionPoll.update(poll.id, updated, { silent: true });
  return { ...poll, ...updated };
}

/**
 * Décompte les réponses enregistrées pour une proposition de date.
 * @param {Array<{ choices?: Record<string, string> }> | null | undefined} votes
 * @param {string} slotId
 * @returns {{ available: number, maybe: number, unavailable: number }}
 */
export function tallyVotes(votes, slotId) {
  const counts = { available: 0, maybe: 0, unavailable: 0 };
  if (!slotId) return counts;
  for (const vote of votes || []) {
    const availability = vote?.choices?.[slotId];
    if (AVAILABILITY_VALUES.has(availability)) counts[availability] += 1;
  }
  return counts;
}
