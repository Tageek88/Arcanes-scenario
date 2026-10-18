import { pollRequest } from "./client";
import { getPollServiceUrl } from "./config";
import { deleteLocalPoll } from "./store";

// Calls to the remote poll service made on behalf of the poll owner.
// Every call except the creation is authenticated with the owner token: never log or display it.

/** Failure to remove the local reference of a poll whose remote copy no longer exists. */
export class LocalPollDeleteError extends Error {
  constructor(cause) {
    super("La référence locale au sondage n'a pas pu être supprimée.");
    this.name = "LocalPollDeleteError";
    this.cause = cause;
  }
}

/** Service URL of a poll: its own, or the default one for polls saved without it. */
export const pollServiceUrlOf = (poll) => poll.service_url || getPollServiceUrl();

const ownerHeaders = (poll) => ({ Authorization: `Bearer ${poll.owner_token}` });

/** Full details of a poll (title, players, slots, votes, expiry), as the owner sees them. */
export const fetchPollDetails = (poll, baseUrl = pollServiceUrlOf(poll)) =>
  pollRequest(baseUrl, `/api/polls/${poll.poll_id}/results`, { headers: ownerHeaders(poll) });

export const createRemotePoll = (baseUrl, payload) =>
  pollRequest(baseUrl, "/api/polls", { method: "POST", body: JSON.stringify(payload) });

export const updateRemotePoll = (baseUrl, poll, payload) =>
  pollRequest(baseUrl, `/api/polls/${poll.poll_id}`, {
    method: "PUT",
    headers: ownerHeaders(poll),
    body: JSON.stringify(payload),
  });

export const closeRemotePoll = (poll) =>
  pollRequest(pollServiceUrlOf(poll), `/api/polls/${poll.poll_id}/close`, {
    method: "POST",
    headers: ownerHeaders(poll),
    body: "{}",
  });

/**
 * Deletes the remote poll, then its local reference.
 * A 404 from the service (poll expired or already deleted) is not an error: the local reference is still removed.
 * @returns {Promise<{ remoteMissing: boolean }>} remoteMissing is true when the service no longer knew the poll
 * @throws the service error (other than 404), the local error, or a LocalPollDeleteError when the remote poll was already gone
 */
export async function removeSessionPoll(poll) {
  let remoteMissing = false;
  try {
    await pollRequest(pollServiceUrlOf(poll), `/api/polls/${poll.poll_id}`, {
      method: "DELETE",
      headers: ownerHeaders(poll),
    });
  } catch (error) {
    if (error.status !== 404) throw error;
    remoteMissing = true;
  }
  try {
    await deleteLocalPoll(poll.id);
  } catch (error) {
    throw remoteMissing ? new LocalPollDeleteError(error) : error;
  }
  return { remoteMissing };
}
