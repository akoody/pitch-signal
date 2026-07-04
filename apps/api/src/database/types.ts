import type { ColumnType, Generated } from "kysely";

type Timestamp = ColumnType<Date, Date | string, Date | string>;
type GeneratedTimestamp = ColumnType<Date, Date | string | undefined, Date | string>;

export interface SchemaMigrationTable {
  version: string;
  applied_at: GeneratedTimestamp;
}

export interface LeagueTable {
  provider_id: number;
  name: string;
  country: string | null;
  logo_url: string | null;
  updated_at: GeneratedTimestamp;
}

export interface TeamTable {
  provider_id: number;
  name: string;
  logo_url: string | null;
  updated_at: GeneratedTimestamp;
}

export interface FixtureTable {
  provider_id: number;
  league_id: number;
  season: number | null;
  home_team_id: number;
  away_team_id: number;
  kickoff_at: Timestamp;
  status: string;
  home_goals: number | null;
  away_goals: number | null;
  provider_updated_at: Timestamp | null;
  updated_at: GeneratedTimestamp;
}

export interface TeamFixtureStatsTable {
  fixture_id: number;
  team_id: number;
  corners: number | null;
  fouls: number | null;
  yellow_cards: number | null;
  red_cards: number | null;
  shots_on_target: number | null;
  shots_off_target: number | null;
  total_shots: number | null;
  goal_kicks: number | null;
  offsides: number | null;
  possession: number | null;
  first_half_goals: number | null;
  second_half_goals: number | null;
  collected_at: GeneratedTimestamp;
}

export interface ProviderRequestTable {
  id: Generated<string>;
  provider: string;
  request_key: string;
  endpoint: string;
  response_status: number;
  counts_toward_quota: Generated<boolean>;
  quota_day: ColumnType<string, string, string>;
  requested_at: GeneratedTimestamp;
}

export interface SyncRunTable {
  id: string;
  report_date: ColumnType<string, string, string>;
  timezone: string;
  status: "running" | "completed" | "failed";
  fixtures_discovered: Generated<number>;
  statistics_collected: Generated<number>;
  error_message: string | null;
  started_at: GeneratedTimestamp;
  finished_at: Timestamp | null;
}

export interface Database {
  schema_migrations: SchemaMigrationTable;
  leagues: LeagueTable;
  teams: TeamTable;
  fixtures: FixtureTable;
  team_fixture_stats: TeamFixtureStatsTable;
  provider_requests: ProviderRequestTable;
  sync_runs: SyncRunTable;
}
