ALTER TABLE team_fixture_stats
  ADD COLUMN IF NOT EXISTS first_half_goals integer,
  ADD COLUMN IF NOT EXISTS second_half_goals integer;

ALTER TABLE team_fixture_stats
  ADD CONSTRAINT team_fixture_stats_first_half_goals_check
    CHECK (first_half_goals IS NULL OR first_half_goals >= 0),
  ADD CONSTRAINT team_fixture_stats_second_half_goals_check
    CHECK (second_half_goals IS NULL OR second_half_goals >= 0);

-- These values were not persisted by previous adapter versions.
TRUNCATE TABLE team_fixture_stats;
