import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { sql } from "kysely";
import { database } from "./database.js";

export const migrate = async (): Promise<void> => {
  await sql`CREATE TABLE IF NOT EXISTS schema_migrations (
    version text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`.execute(database);

  const directory = fileURLToPath(new URL("../../migrations/", import.meta.url));
  const files = (await fs.readdir(directory)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    const applied = await sql<{ version: string }>`
      SELECT version FROM schema_migrations WHERE version = ${file}
    `.execute(database);
    if (applied.rows.length > 0) continue;

    const migration = await fs.readFile(path.join(directory, file), "utf8");
    await database.transaction().execute(async (transaction) => {
      await sql.raw(migration).execute(transaction);
      await sql`INSERT INTO schema_migrations (version) VALUES (${file})`.execute(transaction);
    });
    console.info(`Applied migration ${file}`);
  }
};
