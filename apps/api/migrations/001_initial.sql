CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leagues (
  provider_id integer PRIMARY KEY,
  name text NOT NULL,
  country text,
  logo_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teams (
  provider_id integer PRIMARY KEY,
  name text NOT NULL,
  logo_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fixtures (
  provider_id integer PRIMARY KEY,
  league_id integer NOT NULL REFERENCES leagues(provider_id),
  home_team_id integer NOT NULL REFERENCES teams(provider_id),
  away_team_id integer NOT NULL REFERENCES teams(provider_id),
  kickoff_at timestamptz NOT NULL,
  status text NOT NULL,
  home_goals integer,
  away_goals integer,
  provider_updated_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (home_team_id <> away_team_id)
);

CREATE INDEX IF NOT EXISTS fixtures_kickoff_idx ON fixtures (kickoff_at);
CREATE INDEX IF NOT EXISTS fixtures_home_team_idx ON fixtures (home_team_id, kickoff_at DESC);
CREATE INDEX IF NOT EXISTS fixtures_away_team_idx ON fixtures (away_team_id, kickoff_at DESC);

CREATE TABLE IF NOT EXISTS team_fixture_stats (
  fixture_id integer NOT NULL REFERENCES fixtures(provider_id) ON DELETE CASCADE,
  team_id integer NOT NULL REFERENCES teams(provider_id),
  corners integer,
  fouls integer,
  yellow_cards integer,
  red_cards integer,
  shots_on_target integer,
  total_shots integer,
  collected_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (fixture_id, team_id),
  CHECK (corners IS NULL OR corners >= 0),
  CHECK (fouls IS NULL OR fouls >= 0),
  CHECK (yellow_cards IS NULL OR yellow_cards >= 0),
  CHECK (red_cards IS NULL OR red_cards >= 0),
  CHECK (shots_on_target IS NULL OR shots_on_target >= 0),
  CHECK (total_shots IS NULL OR total_shots >= 0)
);

CREATE TABLE IF NOT EXISTS provider_requests (
  id bigserial PRIMARY KEY,
  provider text NOT NULL,
  request_key text NOT NULL,
  endpoint text NOT NULL,
  response_status integer NOT NULL,
  quota_day date NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS provider_requests_quota_idx
  ON provider_requests (provider, quota_day);

CREATE TABLE IF NOT EXISTS sync_runs (
  id uuid PRIMARY KEY,
  report_date date NOT NULL,
  timezone text NOT NULL,
  status text NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  fixtures_discovered integer NOT NULL DEFAULT 0,
  statistics_collected integer NOT NULL DEFAULT 0,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
