import type { TeamMatchStats } from "@pitch-signal/core";
import type { ProviderFixture as ApiFixture } from "@pitch-signal/provider-footballdata-io";
import { config } from "./config.js";
import { FootballRepository } from "./repositories/football-repository.js";
import { dateInTimezone } from "./time.js";

const league = { id: 9_000_001, name: "Pitch Signal Demo League", season: 2026, country: "Demo" };
const north = { id: 9_000_011, name: "Northbridge FC" };
const south = { id: 9_000_012, name: "Southport Athletic" };
const east = { id: 9_000_013, name: "East Borough" };
const west = { id: 9_000_014, name: "West City" };

const apiFixture = (
  id: number,
  kickoffAt: Date,
  status: string,
  home: { id: number; name: string },
  away: { id: number; name: string }
): ApiFixture => ({
  fixture: { id, date: kickoffAt.toISOString(), status: { short: status } },
  league,
  teams: { home, away },
  goals: { home: status === "FT" ? 1 : null, away: status === "FT" ? 0 : null }
});

const stats = (input: Partial<TeamMatchStats>): TeamMatchStats => ({
  corners: null,
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
  ...input
});

export const seedDemo = async (): Promise<string> => {
  const repository = new FootballRepository();
  const now = new Date();
  const reportDate = dateInTimezone(now, config.REPORT_TIMEZONE);
  const upcoming = new Date(`${reportDate}T12:00:00+07:00`);
  if (upcoming <= now) upcoming.setUTCDate(upcoming.getUTCDate() + 1);
  const effectiveDate = dateInTimezone(upcoming, config.REPORT_TIMEZONE);

  await repository.upsertFixture(apiFixture(9_100_000, upcoming, "NS", north, south));

  const northCorners = [8, 7, 9, 6, 8, 7, 6, 9, 7, 8];
  const southAllowedCorners = [7, 6, 8, 7, 6, 8, 7, 7, 6, 8];
  for (let index = 0; index < 10; index += 1) {
    const kickoffAt = new Date(upcoming);
    kickoffAt.setUTCDate(kickoffAt.getUTCDate() - (index + 1) * 5);

    const northFixtureId = 9_100_100 + index;
    await repository.upsertFixture(apiFixture(northFixtureId, kickoffAt, "FT", north, east));
    await repository.upsertStatistics(northFixtureId, north.id, stats({
      corners: northCorners[index] ?? 7,
      fouls: 13,
      yellowCards: 2,
      redCards: 0,
      shotsOnTarget: 6,
      totalShots: 15
    }));
    await repository.upsertStatistics(northFixtureId, east.id, stats({
      corners: 4,
      fouls: 10,
      yellowCards: 1,
      redCards: 0,
      shotsOnTarget: 3,
      totalShots: 9
    }));

    const southFixtureId = 9_100_200 + index;
    await repository.upsertFixture(apiFixture(southFixtureId, kickoffAt, "FT", south, west));
    await repository.upsertStatistics(southFixtureId, south.id, stats({
      corners: 4,
      fouls: 14,
      yellowCards: 3,
      redCards: 0,
      shotsOnTarget: 3,
      totalShots: 10
    }));
    await repository.upsertStatistics(southFixtureId, west.id, stats({
      corners: southAllowedCorners[index] ?? 7,
      fouls: 12,
      yellowCards: 2,
      redCards: 0,
      shotsOnTarget: 5,
      totalShots: 13
    }));
  }
  return effectiveDate;
};
