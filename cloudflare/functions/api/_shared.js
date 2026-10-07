const JSON_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

export const options = () => new Response(null, { status: 204, headers: JSON_HEADERS });

export async function readJson(request, maxBytes = 64 * 1024) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > maxBytes) throw new ApiError(413, "La demande est trop volumineuse.");
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new ApiError(413, "La demande est trop volumineuse.");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "Le contenu envoyé n'est pas un JSON valide.");
  }
}

export const normalizePlayerName = (name) =>
  String(name || "").normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("fr-FR");

export const validDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
};

export const validTime = (value) =>
  typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);

export function requireDatabase(env) {
  if (!env.DB) throw new ApiError(503, "La base D1 n'est pas reliée au projet Pages.");
  return env.DB;
}

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashToken(token) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function randomToken(bytes = 32) {
  const buffer = crypto.getRandomValues(new Uint8Array(bytes));
  return [...buffer].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function enforceRateLimit(request, env, scope, limit, windowSeconds) {
  if (!env.RATE_LIMIT_SECRET || env.RATE_LIMIT_SECRET.length < 32) {
    throw new ApiError(503, "Le secret de limitation des requêtes n'est pas configuré.");
  }
  const address = request.headers.get("cf-connecting-ip");
  if (!address) throw new ApiError(503, "L'adresse du client est indisponible pour la limitation des requêtes.");

  const clientHash = await hmac(env.RATE_LIMIT_SECRET, address);
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - windowSeconds;
  const result = await requireDatabase(env).prepare(`
    INSERT INTO rate_limits (client_hash, scope, window_start, request_count)
    VALUES (?1, ?2, ?3, 1)
    ON CONFLICT(client_hash, scope) DO UPDATE SET
      request_count = CASE WHEN rate_limits.window_start <= ?4 THEN 1 ELSE rate_limits.request_count + 1 END,
      window_start = CASE WHEN rate_limits.window_start <= ?4 THEN ?3 ELSE rate_limits.window_start END
    RETURNING request_count
  `).bind(clientHash, scope, now, windowStart).first();

  if (!result || result.request_count > limit) {
    throw new ApiError(429, "Trop de demandes. Réessayez plus tard.");
  }
}

export async function requireOwner(request, env, pollId) {
  const token = /^Bearer ([a-f0-9]{64})$/i.exec(request.headers.get("authorization") || "")?.[1];
  if (!token) throw new ApiError(401, "Lien de gestion invalide.");

  const poll = await requireDatabase(env)
    .prepare("SELECT id, state, expires_at FROM polls WHERE id = ?1")
    .bind(pollId)
    .first();
  if (!poll) throw new ApiError(404, "Ce sondage est introuvable ou a expiré.");
  if (poll.expires_at <= new Date().toISOString()) {
    await requireDatabase(env).prepare("DELETE FROM polls WHERE id = ?1").bind(pollId).run();
    throw new ApiError(404, "Ce sondage est introuvable ou a expiré.");
  }

  const stored = await requireDatabase(env)
    .prepare("SELECT owner_token_hash FROM polls WHERE id = ?1")
    .bind(pollId)
    .first();
  if (!stored || await hashToken(token) !== stored.owner_token_hash) {
    throw new ApiError(403, "Vous n'avez pas accès à la gestion de ce sondage.");
  }
  return poll;
}

export async function handleApiError(error) {
  if (error instanceof ApiError) return json({ error: error.message }, error.status);
  console.error("Erreur de l'API des sondages :", error);
  return json({ error: "Le service de sondage a rencontré une erreur. Réessayez plus tard." }, 500);
}

export async function requirePoll(db, pollId) {
  const poll = await db
    .prepare("SELECT id, title, comment, expected_players, timezone, state, expires_at FROM polls WHERE id = ?1")
    .bind(pollId)
    .first();
  if (!poll) throw new ApiError(404, "Ce sondage est introuvable ou a expiré.");
  if (poll.expires_at <= new Date().toISOString()) {
    await db.prepare("DELETE FROM polls WHERE id = ?1").bind(pollId).run();
    throw new ApiError(404, "Ce sondage est introuvable ou a expiré.");
  }
  return poll;
}

export function validPollId(value) {
  return /^[a-f0-9]{32}$/i.test(value || "");
}
