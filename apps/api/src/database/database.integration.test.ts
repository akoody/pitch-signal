import { afterAll, describe, expect, it } from "vitest";
import { sql } from "kysely";
import { closeDatabase, database } from "./database.js";
import { migrate } from "./migrate.js";

describe.runIf(Boolean(process.env.DATABASE_URL))("database migrations", () => {
  afterAll(async () => closeDatabase());

  it("applies the schema idempotently", async () => {
    await migrate();
    await migrate();
    const result = await sql<{ table_name: string }>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('fixtures', 'team_fixture_stats', 'provider_requests', 'sync_runs')
      ORDER BY table_name
    `.execute(database);
    expect(result.rows.map((row) => row.table_name)).toEqual([
      "fixtures",
      "provider_requests",
      "sync_runs",
      "team_fixture_stats"
    ]);
  });
});
