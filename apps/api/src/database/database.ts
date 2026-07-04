import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import { config } from "../config.js";
import type { Database } from "./types.js";

export const databasePool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  application_name: "pitch-signal"
});

databasePool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error", error);
});

export const database = new Kysely<Database>({
  dialect: new PostgresDialect({ pool: databasePool })
});

export const closeDatabase = async (): Promise<void> => {
  await database.destroy();
};
