import { api } from "@/api/localClient";
import { pollRequest } from "./client";
import { withSlotAvailabilityCounts } from "./votes";

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
