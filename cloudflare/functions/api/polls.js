import {
  ApiError,
  enforceRateLimit,
  handleApiError,
  hashToken,
  json,
  options,
  randomToken,
  readJson,
  requireDatabase,
  validDate,
  validTime,
} from "./_shared.js";

const MAX_PLAYERS = 40;
const MAX_SLOTS = 30;
const uniquePlayers = (players) => {
  if (!Array.isArray(players) || players.length < 1 || players.length > MAX_PLAYERS) return false;
  const normalized = players.map((player) => String(player || "").normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("fr-FR"));
  return normalized.every((name) => name.length > 0 && name.length <= 60) && new Set(normalized).size === normalized.length;
};

export function validatePollPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ApiError(400, "Les données du sondage sont invalides.");
  }
  const title = String(payload.title || "").trim();
  if (!title || title.length > 120) throw new ApiError(400, "Le titre doit contenir entre 1 et 120 caractères.");
  if (!uniquePlayers(payload.players)) {
    throw new ApiError(400, `Indiquez de 1 à ${MAX_PLAYERS} joueurs, avec des noms uniques de 60 caractères maximum.`);
  }
  if (!Array.isArray(payload.slots) || payload.slots.length < 2 || payload.slots.length > MAX_SLOTS) {
    throw new ApiError(400, `Indiquez de 2 à ${MAX_SLOTS} dates possibles.`);
  }
  const uniqueSlots = new Set();
  for (const slot of payload.slots) {
    if (!slot || !validDate(slot.date) || !validTime(slot.time)) {
      throw new ApiError(400, "Chaque proposition doit avoir une date et une heure valides.");
    }
    const key = `${slot.date}T${slot.time}`;
    if (uniqueSlots.has(key)) throw new ApiError(400, "Les propositions de date doivent être uniques.");
    uniqueSlots.add(key);
  }
  const timezone = String(payload.timezone || "");
  try {
    new Intl.DateTimeFormat("fr-FR", { timeZone: timezone }).format(new Date());
  } catch {
    throw new ApiError(400, "Le fuseau horaire envoyé n'est pas valide.");
  }
  return {
    title,
    players: payload.players.map((player) => String(player).normalize("NFKC").trim().replace(/\s+/g, " ")),
    slots: payload.slots.map(({ date, time }) => ({ date, time })),
    timezone,
  };
}

export async function onRequestOptions() {
  return options();
}

export async function onRequestPost({ request, env }) {
  try {
    const db = requireDatabase(env);
    await enforceRateLimit(request, env, "create", 5, 600);
    const pollData = validatePollPayload(await readJson(request));
    const id = randomToken(16);
    const ownerToken = randomToken();
    const now = new Date();
    const createdAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await db.prepare("DELETE FROM polls WHERE expires_at <= ?1").bind(createdAt).run();

    const statements = [
      db.prepare(`
        INSERT INTO polls (id, title, expected_players, timezone, owner_token_hash, state, created_at, expires_at)
        VALUES (?1, ?2, ?3, ?4, ?5, 'open', ?6, ?7)
      `).bind(
        id,
        pollData.title,
        JSON.stringify(pollData.players),
        pollData.timezone,
        await hashToken(ownerToken),
        createdAt,
        expiresAt
      ),
      ...pollData.slots.map((slot) =>
        db.prepare("INSERT INTO poll_slots (id, poll_id, date, time) VALUES (?1, ?2, ?3, ?4)")
          .bind(randomToken(16), id, slot.date, slot.time)
      ),
    ];
    await db.batch(statements);
    const origin = new URL(request.url).origin;
    return json({
      id,
      title: pollData.title,
      publicUrl: `${origin}/s/${id}`,
      ownerToken,
      timezone: pollData.timezone,
      expiresAt,
    }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
