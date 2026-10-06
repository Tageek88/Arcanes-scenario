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

export async function onRequestPost({ request, params, env }) {
  try {
    if (!validPollId(params.id)) throw new ApiError(404, "Ce sondage est introuvable.");
    const poll = await requireOwner(request, env, params.id);
    if (poll.state !== "closed") {
      await requireDatabase(env).prepare("UPDATE polls SET state = 'closed' WHERE id = ?1")
        .bind(params.id)
        .run();
    }
    return json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
