/*
# Create leaderboard table for Project Aqua: 2085

1. New Tables
- `leaderboard`
- `id` (uuid, primary key, auto-generated)
- `player_name` (text, not null) — the name the player enters
- `score` (integer, not null, default 0) — overall score
- `distance` (integer, not null, default 0) — longest distance traveled
- `water_drops` (integer, not null, default 0) — water drops collected
- `ai_chips` (integer, not null, default 0) — AI chips collected
- `completion_time` (integer, not null, default 0) — best completion time in seconds
- `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `leaderboard`.
- This is a single-tenant public game with no sign-in screen, so all CRUD is open to anon + authenticated.
- All data is intentionally public/shared (leaderboard is a global scoreboard).

3. Indexes
- Index on `score` descending for fast top-score queries.
- Index on `distance` descending for longest-distance queries.
*/

CREATE TABLE IF NOT EXISTS leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name text NOT NULL,
  score integer NOT NULL DEFAULT 0,
  distance integer NOT NULL DEFAULT 0,
  water_drops integer NOT NULL DEFAULT 0,
  ai_chips integer NOT NULL DEFAULT 0,
  completion_time integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_leaderboard" ON leaderboard;
CREATE POLICY "anon_select_leaderboard" ON leaderboard FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_leaderboard" ON leaderboard;
CREATE POLICY "anon_insert_leaderboard" ON leaderboard FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_leaderboard" ON leaderboard;
CREATE POLICY "anon_update_leaderboard" ON leaderboard FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_leaderboard" ON leaderboard;
CREATE POLICY "anon_delete_leaderboard" ON leaderboard FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard (score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_distance ON leaderboard (distance DESC);
