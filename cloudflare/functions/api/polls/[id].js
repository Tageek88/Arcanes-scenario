import {
  ApiError,
  handleApiError,
  json,
  normalizePlayerName,
  options,
  requireDatabase,
  requireOwner,
  requirePoll,
  readJson,
  randomToken,
  validPollId,
} from "../_shared.js";
import { endOfDayInTimezone, validatePollPayload } from "../polls.js";

export async function onRequestOptions() {
  return options();
}

export async function onRequestGet({ params, env }) {
  try {
    if (!validPollId(params.id)) throw new ApiError(404, "Ce sondage est introuvable.");
    const db = requireDatabase(env);
    const poll = await requirePoll(db, params.id);
    const slots = await db.prepare(`
      SELECT s.id, s.date, s.time,
        SUM(CASE WHEN a.availability = 'available' THEN 1 ELSE 0 END) AS available,
        SUM(CASE WHEN a.availability = 'maybe' THEN 1 ELSE 0 END) AS maybe,
        SUM(CASE WHEN a.availability = 'unavailable' THEN 1 ELSE 0 END) AS unavailable
      FROM poll_slots s
      LEFT JOIN poll_availability a ON a.slot_id = s.id
      WHERE s.poll_id = ?1
      GROUP BY s.id
      ORDER BY s.date, s.time
    `).bind(params.id).all();

    return json({
      id: poll.id,
      title: poll.title,
      comment: poll.comment,
      players: JSON.parse(poll.expected_players),
      timezone: poll.timezone,
      state: poll.state,
      expiresAt: poll.expires_at,
      slots: slots.results,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function onRequestDelete({ request, params, env }) {
  try {
    if (!validPollId(params.id)) throw new ApiError(404, "Ce sondage est introuvable.");
    await requireOwner(request, env, params.id);
    const db = requireDatabase(env);
    await db.batch([
      db.prepare("DELETE FROM poll_availability WHERE slot_id IN (SELECT id FROM poll_slots WHERE poll_id = ?1)").bind(params.id),
      db.prepare("DELETE FROM poll_votes WHERE poll_id = ?1").bind(params.id),
      db.prepare("DELETE FROM poll_slots WHERE poll_id = ?1").bind(params.id),
      db.prepare("DELETE FROM polls WHERE id = ?1").bind(params.id),
    ]);
    return json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function onRequestPut({ request, params, env }) {
  try {
    if (!validPollId(params.id)) throw new ApiError(404, "Ce sondage est introuvable.");
    await requireOwner(request, env, params.id);
    const db = requireDatabase(env);
    const pollData = validatePollPayload(await readJson(request));
    const now = new Date();
    const expiresAt = endOfDayInTimezone(pollData.expiresOn, pollData.timezone);
    if (expiresAt <= now.toISOString()) {
      throw new ApiError(400, "La date d'expiration doit être aujourd'hui ou une date future dans le fuseau horaire du MJ.");
    }

    const [existingSlots, existingVotes] = await Promise.all([
      db.prepare("SELECT id, date, time FROM poll_slots WHERE poll_id = ?1").bind(params.id).all(),
      db.prepare("SELECT id, player_key FROM poll_votes WHERE poll_id = ?1").bind(params.id).all(),
    ]);
    const slotsByKey = new Map(existingSlots.results.map((slot) => [`${slot.date}T${slot.time}`, slot]));
    const requestedSlotKeys = new Set(pollData.slots.map((slot) => `${slot.date}T${slot.time}`));
    const requestedPlayerNames = new Map(pollData.players.map((name) => [normalizePlayerName(name), name]));
    const statements = [
      db.prepare(`
        UPDATE polls
        SET title = ?1, comment = ?2, expected_players = ?3, timezone = ?4, expires_at = ?5
        WHERE id = ?6
      `).bind(
        pollData.title,
        pollData.comment,
        JSON.stringify(pollData.players),
        pollData.timezone,
        expiresAt,
        params.id
      ),
    ];

    for (const slot of existingSlots.results) {
      if (!requestedSlotKeys.has(`${slot.date}T${slot.time}`)) {
        statements.push(
          db.prepare("DELETE FROM poll_availability WHERE slot_id = ?1").bind(slot.id),
          db.prepare("DELETE FROM poll_slots WHERE id = ?1 AND poll_id = ?2").bind(slot.id, params.id)
        );
      }
    }
    for (const slot of pollData.slots) {
      if (!slotsByKey.has(`${slot.date}T${slot.time}`)) {
        statements.push(
          db.prepare("INSERT INTO poll_slots (id, poll_id, date, time) VALUES (?1, ?2, ?3, ?4)")
            .bind(randomToken(16), params.id, slot.date, slot.time)
        );
      }
    }
    for (const vote of existingVotes.results) {
      const playerName = requestedPlayerNames.get(vote.player_key);
      if (!playerName) {
        statements.push(
          db.prepare("DELETE FROM poll_availability WHERE vote_id = ?1").bind(vote.id),
          db.prepare("DELETE FROM poll_votes WHERE id = ?1 AND poll_id = ?2").bind(vote.id, params.id)
        );
      } else {
        statements.push(
          db.prepare("UPDATE poll_votes SET player_name = ?1 WHERE id = ?2 AND poll_id = ?3")
            .bind(playerName, vote.id, params.id)
        );
      }
    }

    await db.batch(statements);
    return json({ ok: true, expiresAt });
  } catch (error) {
    return handleApiError(error);
  }
}
