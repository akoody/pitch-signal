import { describe, expect, it } from "vitest";
import type { HistoricalObservation, TeamMatchStats, UpcomingFixture } from "./model.js";
import { analyzeFixture } from "./analytics.js";

const stats = (corners: number, overrides: Partial<TeamMatchStats> = {}): TeamMatchStats => ({
  corners,
  fouls: null,
  yellowCards: null,
  redCards: null,
  shotsOnTarget: null,
  shotsOffTarget: null,
  totalShots: null,
  goalKicks: null,
  offsides: null,
  possession: null,
  firstHalfGoals: null,
  secondHalfGoals: null,
  ...overrides
});

const observations = (teamCorners: number[], opponentCorners: number[]): HistoricalObservation[] =>
  teamCorners.map((corners, index) => ({
    fixtureId: index + 1,
    kickoffAt: new Date(`2026-06-${String(index + 1).padStart(2, "0")}T12:00:00Z`),
    venue: index % 2 === 0 ? "home" : "away",
    opponentName: "Opponent FC",
    teamGoals: 1,
    opponentGoals: 0,
    team: stats(corners),
    opponent: stats(opponentCorners[index] ?? 4)
  }));

const fixture: UpcomingFixture = {
  id: 100,
  kickoffAt: new Date("2026-07-02T15:00:00Z"),
  league: { id: 39, name: "Premier League", season: 2026, country: "England" },
  homeTeam: { id: 1, name: "North FC" },
  awayTeam: { id: 2, name: "South FC" }
};

describe("analyzeFixture", () => {
  it("finds a stable team corner trend and exposes its evidence", () => {
    const home = observations([7, 8, 6, 7, 9, 6, 8, 7, 6, 8], Array.from({ length: 10 }, () => 4));
    const away = observations(Array.from({ length: 10 }, () => 4), [7, 6, 8, 7, 6, 7, 8, 6, 7, 7]);
    const result = analyzeFixture(fixture, home, away, 5);
    const signal = result.signals.find((item) =>
      item.subject === "home-team" && item.metric === "corners" && item.direction === "over"
    );
    expect(result.coverage.sufficient).toBe(true);
    expect(signal).toBeDefined();
    expect(signal?.evidence.sampleSize).toBe(10);
    expect(signal?.evidence.opponentAverage).toBeGreaterThan(6);
  });

  it("does not emit a signal when the sample is too small", () => {
    const result = analyzeFixture(fixture, observations([8, 9], [4, 4]), observations([4, 5], [8, 8]), 5);
    expect(result.coverage.sufficient).toBe(false);
    expect(result.signals).toEqual([]);
    expect(result.trends.home.metrics.find((metric) => metric.metric === "corners")).toMatchObject({
      sampleSize: 2,
      values: [8, 9],
      average: 8.5,
      minimum: 8,
      maximum: 9,
      opponentAllowedAverage: 8
    });
  });
});
