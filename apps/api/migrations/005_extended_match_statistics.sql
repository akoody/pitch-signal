ALTER TABLE team_fixture_stats
  ADD COLUMN IF NOT EXISTS shots_off_target integer,
  ADD COLUMN IF NOT EXISTS goal_kicks integer,
  ADD COLUMN IF NOT EXISTS offsides integer,
  ADD COLUMN IF NOT EXISTS possession integer;

ALTER TABLE team_fixture_stats
  ADD CONSTRAINT team_fixture_stats_shots_off_target_check
    CHECK (shots_off_target IS NULL OR shots_off_target >= 0),
  ADD CONSTRAINT team_fixture_stats_goal_kicks_check
    CHECK (goal_kicks IS NULL OR goal_kicks >= 0),
  ADD CONSTRAINT team_fixture_stats_offsides_check
    CHECK (offsides IS NULL OR offsides >= 0),
  ADD CONSTRAINT team_fixture_stats_possession_check
    CHECK (possession IS NULL OR possession BETWEEN 0 AND 100);

-- Existing rows were collected before these fields were persisted. Force one
-- controlled backfill instead of presenting NULL as genuine provider absence.
TRUNCATE TABLE team_fixture_stats;
