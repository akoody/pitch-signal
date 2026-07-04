import { sql } from "kysely";
import type { ProviderQuota } from "@pitch-signal/provider-footballdata-io";
import { database } from "../database/database.js";

const provider = "footballdata-io";
const utcDate = (): string => new Date().toISOString().slice(0, 10);

export const nextQuotaResetAt = (now = new Date()): Date =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

export class QuotaExceededError extends Error {
  constructor(
    readonly used: number,
    readonly limit: number,
    readonly resetAt = nextQuotaResetAt()
  ) {
    super(`Footballdata.io monthly request budget exhausted (${used}/${limit})`);
    this.name = "QuotaExceededError";
  }
}

export class DatabaseProviderQuota implements ProviderQuota {
  constructor(private readonly limit: number) {}

  async usage(): Promise<{ used: number; limit: number; remaining: number }> {
    const result = await sql<{ count: string }>`
      SELECT count(*)::text AS count
      FROM provider_requests
      WHERE provider = ${provider}
        AND requested_at >= date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
        AND counts_toward_quota = true
    `.execute(database);
    const used = Number(result.rows[0]?.count ?? 0);
    return { used, limit: this.limit, remaining: Math.max(0, this.limit - used) };
  }

  async assertAvailable(): Promise<void> {
    const current = await this.usage();
    if (current.remaining <= 0) throw new QuotaExceededError(current.used, current.limit);
  }

  async record(
    requestKey: string,
    endpoint: string,
    responseStatus: number,
    countsTowardQuota: boolean
  ): Promise<void> {
    await database.insertInto("provider_requests").values({
      provider,
      request_key: requestKey,
      endpoint,
      response_status: responseStatus,
      counts_toward_quota: countsTowardQuota,
      quota_day: utcDate()
    }).execute();
  }
}
