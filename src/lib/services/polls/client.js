import { normalizePollServiceUrl } from "./config";

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