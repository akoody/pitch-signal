import { database } from "../database/database.js";

export class SyncRunRepository {
  async start(id: string, date: string, timezone: string): Promise<void> {
    await database.insertInto("sync_runs").values({
      id,
      report_date: date,
      timezone,
      status: "running",
      error_message: null,
      finished_at: null
    }).execute();
  }

  async complete(id: string, fixturesDiscovered: number, statisticsCollected: number): Promise<void> {
    await database.updateTable("sync_runs").set({
      status: "completed",
      fixtures_discovered: fixturesDiscovered,
      statistics_collected: statisticsCollected,
      finished_at: new Date()
    }).where("id", "=", id).execute();
  }

  async fail(id: string, error: unknown): Promise<void> {
    await database.updateTable("sync_runs").set({
      status: "failed",
      error_message: error instanceof Error ? error.message.slice(0, 2_000) : "Unknown sync error",
      finished_at: new Date()
    }).where("id", "=", id).execute();
  }

  async latest(): Promise<{
    id: string;
    reportDate: string;
    status: string;
    fixturesDiscovered: number;
    statisticsCollected: number;
    errorMessage: string | null;
    startedAt: Date;
    finishedAt: Date | null;
  } | null> {
    const row = await database.selectFrom("sync_runs").selectAll()
      .orderBy("started_at", "desc").executeTakeFirst();
    if (!row) return null;
    return {
      id: row.id,
      reportDate: row.report_date,
      status: row.status,
      fixturesDiscovered: row.fixtures_discovered,
      statisticsCollected: row.statistics_collected,
      errorMessage: row.error_message,
      startedAt: row.started_at,
      finishedAt: row.finished_at
    };
  }
}
