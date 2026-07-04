-- Provider IDs are source-specific. Remove the unusable API-Football cache before
-- Footballdata.io becomes the sole ingestion provider. Request and sync audit logs stay intact.
TRUNCATE TABLE team_fixture_stats, fixtures, teams, leagues;
