import { randomUUID } from "node:crypto";
import {
  FootballDataIoClient,
  ProviderResponseError,
  type ProviderFixture
} from "@pitch-signal/provider-footballdata-io";
import { config } from "../config.js";
import { databasePool } from "../database/database.js";
import { DatabaseProviderQuota, QuotaExceededError } from "../provider/quota.js";
import { FootballRepository } from "../repositories/football-repository.js";
import { SyncRunRepository } from "../repositories/sync-run-repository.js";
import { dateInTimezone } from "../time.js";

export interface SyncResult {
  runId: string;
  date: string;
  fixturesDiscovered: number;
  statisticsCollected: number;
  quota: { used: number; limit: number; remaining: number };
}

export class MorningSyncService {
  private readonly football = new FootballRepository();
  private readonly runs = new SyncRunRepository();
  private readonly quota = new DatabaseProviderQuota(config.FOOTBALLDATA_IO_MONTHLY_BUDGET);
  private readonly client = new FootballDataIoClient({
    apiKey: config.FOOTBALLDATA_IO_KEY,
    baseUrl: config.FOOTBALLDATA_IO_BASE_URL,
    quota: this.quota
  });

  async run(date = dateInTimezone(new Date(), config.REPORT_TIMEZONE)): Promise<SyncResult> {
    if (!config.FOOTBALLDATA_IO_KEY) {
      throw new Error("FOOTBALLDATA_IO_KEY is empty. Add a free Footballdata.io key to .env before running morning sync.");
    }

    const quotaBeforeSync = await this.quota.usage();
    if (quotaBeforeSync.remaining <= 0) {
      throw new QuotaExceededError(quotaBeforeSync.used, quotaBeforeSync.limit);
    }

    const lockConnection = await databasePool.connect();
    const lock = await lockConnection.query<{ acquired: boolean }>(
      "SELECT pg_try_advisory_lock(hashtext('pitch-signal-morning-sync')) AS acquired"
    );
    if (!lock.rows[0]?.acquired) {
      lockConnection.release();
      throw new Error("Another morning sync is already running");
    }

    const runId = randomUUID();
    let fixturesDiscovered = 0;
    let statisticsCollected = 0;
    await this.runs.start(runId, date, config.REPORT_TIMEZONE);

    try {
      await this.football.removeDemoData();
      const providerDates = [-1, 0, 1].map((offset) => {
        const value = new Date(`${date}T00:00:00Z`);
        value.setUTCDate(value.getUTCDate() + offset);
        return value.toISOString().slice(0, 10);
      });
      const candidates = (await Promise.all(providerDates.map((providerDate) =>
        this.client.fixturesByDate(providerDate)
      ))).flat();
      const today = [...new Map(candidates.map((fixture) => [fixture.fixture.id, fixture])).values()]
        .filter((fixture) => dateInTimezone(new Date(fixture.fixture.date), config.REPORT_TIMEZONE) === date)
        .sort((left, right) => Date.parse(left.fixture.date) - Date.parse(right.fixture.date));
      fixturesDiscovered = today.length;
      for (const fixture of today) await this.football.upsertFixture(fixture);

      for (const fixture of today) {
        try {
          statisticsCollected += await this.backfillFixtureTeams(fixture);
        } catch (error) {
          if (error instanceof QuotaExceededError) break;
          if (error instanceof ProviderResponseError && error.statusCode >= 500) {
            console.warn(`Skipping provider failure for fixture ${fixture.fixture.id}: ${error.message}`);
            continue;
          }
          throw error;
        }
      }

      await this.runs.complete(runId, fixturesDiscovered, statisticsCollected);
      return {
        runId,
        date,
        fixturesDiscovered,
        statisticsCollected,
        quota: await this.quota.usage()
      };
    } catch (error) {
      await this.runs.fail(runId, error);
      throw error;
    } finally {
      await lockConnection.query("SELECT pg_advisory_unlock(hashtext('pitch-signal-morning-sync'))");
      lockConnection.release();
    }
  }

  private async backfillFixtureTeams(upcoming: ProviderFixture): Promise<number> {
    const kickoff = new Date(upcoming.fixture.date);
    const teamIds = [upcoming.teams.home.id, upcoming.teams.away.id];
    const histories = await Promise.all(teamIds.map((teamId) =>
      this.football.history(teamId, kickoff, config.HISTORY_MATCHES_PER_TEAM)
    ));
    if (histories.every((history) => history.length >= config.HISTORY_MATCHES_PER_TEAM)) return 0;

    const discovered = new Map<number, ProviderFixture>();
    for (const [index, teamId] of teamIds.entries()) {
      if ((histories[index]?.length ?? 0) >= config.HISTORY_MATCHES_PER_TEAM) continue;
      const rangeEnd = new Date(kickoff);
      rangeEnd.setUTCDate(rangeEnd.getUTCDate() - 1);
      const rangeStart = new Date(rangeEnd);
      rangeStart.setUTCDate(rangeStart.getUTCDate() - config.HISTORY_LOOKBACK_DAYS);
      const fixtures = (await this.client.finishedFixturesBetween(
        teamId,
        dateInTimezone(rangeStart, config.REPORT_TIMEZONE),
        dateInTimezone(rangeEnd, config.REPORT_TIMEZONE)
      ))
        .filter((fixture) => Date.parse(fixture.fixture.date) < kickoff.getTime())
        .sort((left, right) => Date.parse(right.fixture.date) - Date.parse(left.fixture.date))
        .slice(0, config.HISTORY_MATCHES_PER_TEAM);
      for (const fixture of fixtures) {
        discovered.set(fixture.fixture.id, fixture);
        await this.football.upsertFixture(fixture);
      }
    }

    const missing = [];
    for (const fixture of discovered.values()) {
      if (!(await this.football.hasStatistics(fixture.fixture.id))) missing.push(fixture);
    }
    missing.sort((left, right) => Date.parse(right.fixture.date) - Date.parse(left.fixture.date));

    let collected = 0;
    for (const fixture of missing) {
      const current = await Promise.all(teamIds.map((teamId) =>
        this.football.history(teamId, kickoff, config.HISTORY_MATCHES_PER_TEAM)
      ));
      if (current.every((history) => history.length >= config.HISTORY_MATCHES_PER_TEAM)) break;

      const statistics = await this.client.fixtureStatistics(fixture.fixture.id);
      if (statistics.length < 2) continue;
      for (const teamStatistics of statistics) {
        await this.football.upsertStatistics(
          fixture.fixture.id,
          teamStatistics.team.id,
          teamStatistics.stats
        );
      }
      collected += 1;
    }
    return collected;
  }
}
