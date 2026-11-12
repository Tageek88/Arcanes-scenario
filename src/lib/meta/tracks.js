// Pure rules of the tracks ("cases à cocher") of a game sheet model (no React, no Dexie).
//
// Model (GameSheetModel.tracks): [{ id, name, count }]
//   `id` is stable: renaming a track never loses the boxes already ticked on the sheets.
// Sheet (GameCharacter.checks, NPC.checks): { <track id>: number of ticked boxes }
//   Boxes are ticked from the first one; a track with no ticked box has no entry.

export const MAX_TRACKS = 20;
export const MAX_TRACK_BOXES = 40;
export const MAX_TRACK_NAME_LENGTH = 60;

function toInt(value) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? n : null;
}

/** A new stable identifier for a track. */
export function newTrackId() {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `t${random.replace(/-/g, "").slice(0, 12)}`;
}

/**
 * Tracks cleaned and bounded. A track needs an id, a name and 1 to MAX_TRACK_BOXES boxes
 * (`count` may be typed text); anything else is dropped, and so is a repeated id.
 */
export function cleanTracks(raw) {
  const out = [];
  const seen = new Set();
  for (const item of Array.isArray(raw) ? raw : []) {
    if (out.length >= MAX_TRACKS) break;
    const id = String(item?.id ?? "").trim();
    const name = String(item?.name ?? "").trim().slice(0, MAX_TRACK_NAME_LENGTH);
    const count = toInt(item?.count);
    if (!id || id === "__proto__" || seen.has(id) || !name || count === null || count < 1) continue;
    seen.add(id);
    out.push({ id, name, count: Math.min(count, MAX_TRACK_BOXES) });
  }
  return out;
}

/** Draft of the model editor: every value is text, rows keep their id. */
export function tracksToDraft(tracks) {
  return cleanTracks(tracks).map((track) => ({ id: track.id, name: track.name, count: String(track.count) }));
}

/** Saved tracks from the editor draft (rows without a name or a box count are dropped). */
export function draftToTracks(draft) {
  return cleanTracks(draft);
}

/** Ticked boxes to show for a stored value, between 0 and the number of boxes of the track. */
export function checkedCount(value, count) {
  const n = toInt(value);
  return n === null ? 0 : Math.min(Math.max(n, 0), Math.max(0, toInt(count) ?? 0));
}

/** Value after a click on box `index` (0-based): clicking the last ticked box unticks it, any other box ticks up to it. */
export function nextCheckedValue(checked, index) {
  return checked === index + 1 ? index : index + 1;
}

/**
 * Ticked boxes of a sheet, cleaned. With `tracks` (the model's), only known tracks are kept and the value is
 * bounded by the box count; without, any id is kept (bounded by MAX_TRACK_BOXES). Zero is never stored.
 */
export function cleanChecks(raw, tracks) {
  const out = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const limits = Array.isArray(tracks) ? new Map(cleanTracks(tracks).map((track) => [track.id, track.count])) : null;
  for (const [id, value] of Object.entries(raw)) {
    if (!id.trim() || id === "__proto__") continue;
    const max = limits ? limits.get(id) : MAX_TRACK_BOXES;
    if (max === undefined) continue;
    const n = toInt(value);
    if (n === null || n < 1) continue;
    out[id] = Math.min(n, max);
  }
  return out;
}

/** The checks of a sheet with one track set to `value` (0 removes it). */
export function setChecked(checks, id, value) {
  const next = { ...(checks && typeof checks === "object" && !Array.isArray(checks) ? checks : {}) };
  const n = toInt(value);
  if (n === null || n < 1) delete next[id];
  else next[id] = n;
  return next;
}

/** What a printout shows: [{ id, name, count, checked }] for the model's tracks and a sheet's checks. */
export function trackRows(tracks, checks) {
  const source = checks && typeof checks === "object" ? checks : {};
  return cleanTracks(tracks).map((track) => ({
    ...track,
    checked: checkedCount(Object.hasOwn(source, track.id) ? source[track.id] : 0, track.count),
  }));
}
