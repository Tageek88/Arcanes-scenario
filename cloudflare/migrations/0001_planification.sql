PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS polls (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  expected_players TEXT NOT NULL,
  timezone TEXT NOT NULL,
  owner_token_hash TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'open' CHECK (state IN ('open', 'closed')),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS poll_slots (
  id TEXT PRIMARY KEY,
  poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  UNIQUE (poll_id, date, time)
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id TEXT PRIMARY KEY,
  poll_id TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  player_key TEXT NOT NULL,
  player_name TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (poll_id, player_key)
);

CREATE TABLE IF NOT EXISTS poll_availability (
  vote_id TEXT NOT NULL REFERENCES poll_votes(id) ON DELETE CASCADE,
  slot_id TEXT NOT NULL REFERENCES poll_slots(id) ON DELETE CASCADE,
  availability TEXT NOT NULL CHECK (availability IN ('available', 'maybe', 'unavailable')),
  PRIMARY KEY (vote_id, slot_id)
);

CREATE INDEX IF NOT EXISTS poll_slots_poll_id ON poll_slots(poll_id);
CREATE INDEX IF NOT EXISTS poll_votes_poll_id ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS poll_availability_slot_id ON poll_availability(slot_id);

CREATE TABLE IF NOT EXISTS rate_limits (
  client_hash TEXT NOT NULL,
  scope TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  request_count INTEGER NOT NULL,
  PRIMARY KEY (client_hash, scope)
);
