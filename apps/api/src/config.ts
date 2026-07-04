import { fileURLToPath } from "node:url";
import { config as loadEnvironment } from "dotenv";
import { z } from "zod";

loadEnvironment({
  path: fileURLToPath(new URL("../../../.env", import.meta.url)),
  quiet: true
});

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4100),
  WEB_ORIGIN: z.url().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1),
  FOOTBALLDATA_IO_KEY: z.string().default(""),
  FOOTBALLDATA_IO_BASE_URL: z.url().default("https://footballdata.io/api/v1"),
  FOOTBALLDATA_IO_MONTHLY_BUDGET: z.coerce.number().int().min(1).max(1_500_000).default(1_000),
  REPORT_TIMEZONE: z.string().min(1).default("Asia/Novokuznetsk"),
  HISTORY_MATCHES_PER_TEAM: z.coerce.number().int().min(5).max(30).default(10),
  HISTORY_LOOKBACK_DAYS: z.coerce.number().int().min(30).max(730).default(180),
  MIN_SAMPLE_SIZE: z.coerce.number().int().min(3).max(20).default(5)
});

const result = schema.safeParse(process.env);
if (!result.success) {
  throw new Error(`Invalid environment configuration: ${z.prettifyError(result.error)}`);
}

export const config = result.data;
