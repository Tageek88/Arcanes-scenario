import {
  ApiError,
  handleApiError,
  json,
  options,
  requireDatabase,
  requireOwner,
  requirePoll,
  validPollId,
} from "../_shared.js";

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
