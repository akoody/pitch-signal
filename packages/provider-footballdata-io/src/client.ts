import type { TeamMatchStats } from "@pitch-signal/core";
import {
  dateMatchesEnvelopeSchema,
  matchesEnvelopeSchema,
  statisticsEnvelopeSchema,
  type FootballDataMatch,
  type FootballDataStatistics
} from "./schemas.js";

export interface ProviderQuota {
  assertAvailable(requestKey: string, endpoint: string): Promise<void>;
  record(requestKey: string, endpoint: string, responseStatus: number, countsTowardQuota: boolean): Promise<void>;
}

export interface FootballDataIoClientOptions {
  apiKey: string;
  baseUrl: string;
  quota: ProviderQuota;
  timeoutMs?: number;
}

export interface ProviderFixture {
  fixture: { id: number; date: string; status: { short: string } };
  league: { id: number; name: string; season: number; country?: string | null; logo?: string | null };
  teams: {
    home: { id: number; name: string; logo?: string | null };
    away: { id: number; name: string; logo?: string | null };
  };
  goals: { home: number | null; away: number | null };
}

export interface ProviderTeamStatistics {
  team: { id: number; name: string };
  stats: TeamMatchStats;
}

export class ProviderResponseError extends Error {
  constructor(message: string, readonly statusCode: number, readonly endpoint: string) {
    super(message);
    this.name = "ProviderResponseError";
  }
}

const status = (value: string): string => value === "complete" ? "FT" : value === "incomplete" ? "NS" : value.toUpperCase();

const normalizeFixture = (match: FootballDataMatch): ProviderFixture => ({
  fixture: {
    id: match.match_id,
    date: new Date(match.date_unix * 1_000).toISOString(),
    status: { short: status(match.status) }
  },
  league: {
    id: match.league.league_id,
    name: match.league.name ?? match.league.league_name ?? "Unknown league",
    season: match.season.year,
    country: match.league.country ?? null,
    logo: match.league.image ?? match.league.league_image ?? null
  },
  teams: {
    home: { id: match.home_team.team_id, name: match.home_team.team_name, logo: match.home_team.team_logo ?? null },
    away: { id: match.away_team.team_id, name: match.away_team.team_name, logo: match.away_team.team_logo ?? null }
  },
  goals: { home: match.score.home, away: match.score.away }
});

const normalizeStatistics = ({ match, stats }: FootballDataStatistics): ProviderTeamStatistics[] => [
  {
    team: { id: match.home_team.team_id, name: match.home_team.team_name },
    stats: {
      corners: stats.corners.home,
      fouls: stats.fouls.home,
      yellowCards: stats.yellow_cards.home,
      redCards: stats.red_cards.home,
      shotsOnTarget: stats.shots_on_target.home,
      shotsOffTarget: stats.shots_off_target.home,
      totalShots: stats.shots.home,
      goalKicks: stats.goal_kicks.home,
      offsides: stats.offsides.home,
      possession: stats.possession.home,
      firstHalfGoals: stats.half_time_goals.home,
      secondHalfGoals: stats.second_half_goals.home
    }
  },
  {
    team: { id: match.away_team.team_id, name: match.away_team.team_name },
    stats: {
      corners: stats.corners.away,
      fouls: stats.fouls.away,
      yellowCards: stats.yellow_cards.away,
      redCards: stats.red_cards.away,
      shotsOnTarget: stats.shots_on_target.away,
      shotsOffTarget: stats.shots_off_target.away,
      totalShots: stats.shots.away,
      goalKicks: stats.goal_kicks.away,
      offsides: stats.offsides.away,
      possession: stats.possession.away,
      firstHalfGoals: stats.half_time_goals.away,
      secondHalfGoals: stats.second_half_goals.away
    }
  }
];

export class FootballDataIoClient {
  private readonly timeoutMs: number;

  constructor(private readonly options: FootballDataIoClientOptions) {
    this.timeoutMs = options.timeoutMs ?? 15_000;
  }

  async fixturesByDate(date: string): Promise<ProviderFixture[]> {
    const payload = await this.get(`matches/date/${date}`, new URLSearchParams({ limit: "100" }), dateMatchesEnvelopeSchema);
    return payload.data.matches.map(normalizeFixture);
  }

  async finishedFixturesBetween(teamId: number, from: string, to: string): Promise<ProviderFixture[]> {
    const parameters = new URLSearchParams({
      team_id: String(teamId),
      from,
      to,
      status: "complete",
      limit: "100"
    });
    const payload = await this.get("matches", parameters, matchesEnvelopeSchema);
    return payload.data.map(normalizeFixture);
  }

  async fixtureStatistics(fixtureId: number): Promise<ProviderTeamStatistics[]> {
    const payload = await this.get(`matches/${fixtureId}/stats`, new URLSearchParams(), statisticsEnvelopeSchema);
    return normalizeStatistics(payload.data);
  }

  private async get<T>(
    endpoint: string,
    parameters: URLSearchParams,
    schema: { parse(value: unknown): T }
  ): Promise<T> {
    const requestKey = `${endpoint}?${parameters.toString()}`;
    await this.options.quota.assertAvailable(requestKey, endpoint);
    const url = new URL(endpoint, `${this.options.baseUrl.replace(/\/$/, "")}/`);
    url.search = parameters.toString();

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          authorization: `Bearer ${this.options.apiKey}`,
          accept: "application/json",
          "user-agent": "pitch-signal/0.1"
        },
        signal: AbortSignal.timeout(this.timeoutMs)
      });
    } catch (error) {
      throw new ProviderResponseError(
        `Footballdata.io request failed: ${error instanceof Error ? error.message : "unknown network error"}`,
        0,
        endpoint
      );
    }

    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      await this.options.quota.record(requestKey, endpoint, response.status, response.status !== 401);
      throw new ProviderResponseError(
        `Footballdata.io returned HTTP ${response.status}: ${JSON.stringify(body)}`,
        response.status,
        endpoint
      );
    }

    await this.options.quota.record(requestKey, endpoint, response.status, true);
    try {
      return schema.parse(body);
    } catch (error) {
      throw new ProviderResponseError(
        `Footballdata.io returned an unexpected response for ${endpoint}: ${error instanceof Error ? error.message : "schema validation failed"}`,
        response.status,
        endpoint
      );
    }
  }
}
