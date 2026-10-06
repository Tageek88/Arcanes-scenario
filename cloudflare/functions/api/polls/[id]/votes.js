import {
  ApiError,
  enforceRateLimit,
  hashToken,
  handleApiError,
  json,
  options,
  randomToken,
  readJson,
  requireDatabase,
  requirePoll,
  validPollId,
} from "../../_shared.js";
import { normalizePlayerName } from "../../_shared.js";

const VALID_AVAILABILITY = new Set(["available", "maybe", "unavailable"]);

export async function onRequestOptions() {
  return options();
}

export async function onRequestPost({ request, params, env }) {
  try {
    if (!validPollId(params.id)) throw new ApiError(404, "Ce sondage est introuvable.");
    await enforceRateLimit(request, env, `vote:${params.id}`, 30, 60);
    const db = requireDatabase(env);
    const poll = await requirePoll(db, params.id);
    if (poll.state !== "open") throw new ApiError(409, "Ce sondage est clôturé.");

    const payload = await readJson(request, 16 * 1024);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new ApiError(400, "La réponse envoyée est invalide.");
    }
    const players = JSON.parse(poll.expected_players);
    const playerName = players.find((name) => normalizePlayerName(name) === normalizePlayerName(payload.player));
    if (!playerName) throw new ApiError(400, "Choisissez votre nom dans la liste des joueurs attendus.");

    const slots = await db.prepare("SELECT id FROM poll_slots WHERE poll_id = ?1").bind(params.id).all();
    const slotIds = new Set(slots.results.map(({ id }) => id));
    const choices = payload.choices;
    if (!choices || typeof choices !== "object" || Array.isArray(choices)) {
      throw new ApiError(400, "Indiquez votre disponibilité pour chaque date.");
    }
    const choiceIds = Object.keys(choices);
    if (choiceIds.length !== slotIds.size || choiceIds.some((id) => !slotIds.has(id))) {
      throw new ApiError(400, "Les disponibilités envoyées ne correspondent pas aux dates du sondage.");
    }
    if (choiceIds.some((id) => !VALID_AVAILABILITY.has(choices[id]))) {
      throw new ApiError(400, "Chaque réponse doit être disponible, peut-être ou indisponible.");
    }

    const playerKey = normalizePlayerName(playerName);
    const voteId = await hashToken(`${params.id}:${playerKey}`);
    const now = new Date().toISOString();
    await db.batch([
      db.prepare(`
        INSERT INTO poll_votes (id, poll_id, player_key, player_name, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5)
        ON CONFLICT(poll_id, player_key) DO UPDATE SET
          player_name = excluded.player_name,
          updated_at = excluded.updated_at
      `).bind(voteId, params.id, playerKey, playerName, now),
      db.prepare("DELETE FROM poll_availability WHERE vote_id = ?1").bind(voteId),
      ...choiceIds.map((slotId) =>
        db.prepare("INSERT INTO poll_availability (vote_id, slot_id, availability) VALUES (?1, ?2, ?3)")
          .bind(voteId, slotId, choices[slotId])
      ),
    ]);
    return json({ ok: true, updatedAt: now });
  } catch (error) {
    return handleApiError(error);
  }
}
