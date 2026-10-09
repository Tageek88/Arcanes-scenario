import {
  ApiError,
  handleApiError,
  json,
  options,
  requireDatabase,
  requireOwner,
  requirePoll,
  validPollId,
} from "../../_shared.js";

export async function onRequestOptions() {
  return options();
}

export async function onRequestGet({ request, params, env }) {
  try {
    if (!validPollId(params.id)) throw new ApiError(404, "Ce sondage est introuvable.");
    await requireOwner(request, env, params.id);
    const db = requireDatabase(env);
    const poll = await requirePoll(db, params.id);
    const [slots, votes] = await Promise.all([
      db.prepare("SELECT id, date, time FROM poll_slots WHERE poll_id = ?1 ORDER BY date, time").bind(params.id).all(),
      db.prepare(`
        SELECT v.id, v.player_name, v.updated_at, a.slot_id, a.availability
        FROM poll_votes v
        LEFT JOIN poll_availability a ON a.vote_id = v.id
        WHERE v.poll_id = ?1
        ORDER BY v.player_name COLLATE NOCASE
      `).bind(params.id).all(),
    ]);
    const byPlayer = new Map(votes.results.map(({ id, player_name, updated_at }) => [
      id,
      { name: player_name, updatedAt: updated_at, choices: {} },
    ]));
    votes.results.forEach((vote) => {
      if (vote.slot_id) byPlayer.get(vote.id).choices[vote.slot_id] = vote.availability;
    });
    const playerVotes = [...byPlayer.values()];
    const slotsWithCounts = (slots.results || []).map((slot) => {
      const counts = { available: 0, maybe: 0, unavailable: 0 };
      for (const vote of playerVotes) {
        const choice = vote.choices[slot.id];
        if (choice in counts) counts[choice] += 1;
      }
      return { ...slot, ...counts };
    });
    return json({
      id: poll.id,
      title: poll.title,
      comment: poll.comment,
      players: JSON.parse(poll.expected_players),
      timezone: poll.timezone,
      state: poll.state,
      expiresAt: poll.expires_at,
      slots: slotsWithCounts,
      votes: playerVotes,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
