import { analyzeFixture, type DailyReport } from "@pitch-signal/core";
import { config } from "../config.js";
import { DatabaseProviderQuota } from "../provider/quota.js";
import { FootballRepository } from "../repositories/football-repository.js";
import { dateInTimezone } from "../time.js";

export class ReportService {
  private readonly football = new FootballRepository();
  private readonly quota = new DatabaseProviderQuota(config.FOOTBALLDATA_IO_MONTHLY_BUDGET);

  async daily(date = dateInTimezone(new Date(), config.REPORT_TIMEZONE)): Promise<DailyReport> {
    const fixtures = await this.football.fixturesForDate(date, config.REPORT_TIMEZONE);
    const analyses = await Promise.all(fixtures.map(async (fixture) => {
      const [homeHistory, awayHistory] = await Promise.all([
        this.football.history(fixture.homeTeam.id, fixture.kickoffAt, config.HISTORY_MATCHES_PER_TEAM),
        this.football.history(fixture.awayTeam.id, fixture.kickoffAt, config.HISTORY_MATCHES_PER_TEAM)
      ]);
      return analyzeFixture(fixture, homeHistory, awayHistory, config.MIN_SAMPLE_SIZE);
    }));
    const quota = await this.quota.usage();
    return {
      date,
      timezone: config.REPORT_TIMEZONE,
      generatedAt: new Date().toISOString(),
      provider: "Footballdata.io",
      quota,
      summary: {
        fixtures: analyses.length,
        analyzed: analyses.filter((analysis) => analysis.coverage.sufficient).length,
        insufficientData: analyses.filter((analysis) => !analysis.coverage.sufficient).length,
        signals: analyses.reduce((sum, analysis) => sum + analysis.signals.length, 0)
      },
      fixtures: analyses
    };
  }
}
