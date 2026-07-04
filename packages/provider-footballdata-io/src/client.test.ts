import { afterEach, describe, expect, it, vi } from "vitest";
import { FootballDataIoClient, type ProviderQuota } from "./client.js";

const quota = (): ProviderQuota => ({
  assertAvailable: vi.fn(() => Promise.resolve()),
  record: vi.fn(() => Promise.resolve())
});

afterEach(() => vi.unstubAllGlobals());

describe("FootballDataIoClient", () => {
  it("normalizes match and team statistics", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        data: {
          matches: [{
            match_id: 10,
            match_date: "2026-07-03 12:00:00",
            date_unix: 1_783_081_200,
            status: "incomplete",
            league: { league_id: 50, name: "World Cup", country: "International" },
            season: { year: 2026 },
            home_team: { team_id: 1, team_name: "Home" },
            away_team: { team_id: 2, team_name: "Away" },
            score: { home: 0, away: 0 }
          }]
        }
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        data: {
          match: {
            home_team: { team_id: 1, team_name: "Home" },
            away_team: { team_id: 2, team_name: "Away" }
          },
          stats: {
            corners: { home: 8, away: 2 },
            fouls: { home: 10, away: 12 },
            yellow_cards: { home: 1, away: 3 },
            red_cards: { home: 0, away: 1 },
            shots_on_target: { home: 7, away: 2 },
            shots_off_target: { home: 11, away: 4 },
            shots: { home: 18, away: 6 },
            goal_kicks: { home: 5, away: 9 },
            offsides: { home: 2, away: 1 },
            possession: { home: 61, away: 39 },
            half_time_goals: { home: 1, away: 0 },
            second_half_goals: { home: 2, away: 1 }
          }
        }
      }), { status: 200 }));
    vi.stubGlobal("fetch", request);
    const client = new FootballDataIoClient({ apiKey: "key", baseUrl: "https://example.test/api/v1", quota: quota() });

    const fixtures = await client.fixturesByDate("2026-07-03");
    const statistics = await client.fixtureStatistics(10);

    expect(fixtures[0]).toMatchObject({
      fixture: { id: 10, status: { short: "NS" } },
      league: { id: 50, season: 2026 },
      teams: { home: { id: 1 }, away: { id: 2 } }
    });
    expect(statistics[0]?.stats).toEqual({
      corners: 8,
      fouls: 10,
      yellowCards: 1,
      redCards: 0,
      shotsOnTarget: 7,
      shotsOffTarget: 11,
      totalShots: 18,
      goalKicks: 5,
      offsides: 2,
      possession: 61,
      firstHalfGoals: 1,
      secondHalfGoals: 2
    });
  });
});
