import { fixturesEnvelopeSchema, statisticsEnvelopeSchema } from "./schemas.js";
import type { ApiFixture, ApiTeamStatistics } from "./schemas.js";

export interface ProviderQuota {
  assertAvailable(requestKey: string, endpoint: string): Promise<void>;
  record(requestKey: string, endpoint: string, responseStatus: number, countsTowardQuota: boolean): Promise<void>;
}

export interface ApiFootballClientOptions {
  apiKey: string;
  baseUrl: string;
  quota: ProviderQuota;
  timeoutMs?: number;
}

export class ProviderResponseError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly endpoint: string
  ) {
    super(message);
    this.name = "ProviderResponseError";
  }
}

export class ProviderApplicationError extends ProviderResponseError {
  constructor(message: string, readonly details: unknown) {
    super(message, 422, "provider-application");
    this.name = "ProviderApplicationError";
  }
}

const hasErrors = (errors: unknown[] | Record<string, unknown>): boolean =>
  Array.isArray(errors) ? errors.length > 0 : Object.keys(errors).length > 0;

export class ApiFootballClient {
  private readonly timeoutMs: number;
  private blockedReason: ProviderApplicationError | null = null;

  constructor(private readonly options: ApiFootballClientOptions) {
    this.timeoutMs = options.timeoutMs ?? 15_000;
  }

  async fixturesByDate(date: string, timezone: string): Promise<ApiFixture[]> {
    const parameters = new URLSearchParams({ date, timezone });
    const payload = await this.get("fixtures", parameters, fixturesEnvelopeSchema);
    return payload.response;
  }

  async finishedFixturesBetween(
    teamId: number,
    season: number,
    from: string,
    to: string,
    timezone: string
  ): Promise<ApiFixture[]> {
    const parameters = new URLSearchParams({
      team: String(teamId),
      season: String(season),
      from,
      to,
      status: "FT-AET-PEN",
      timezone
    });
    const payload = await this.get("fixtures", parameters, fixturesEnvelopeSchema);
    return payload.response;
  }

  async fixtureStatistics(fixtureId: number): Promise<ApiTeamStatistics[]> {
    const parameters = new URLSearchParams({ fixture: String(fixtureId) });
    const payload = await this.get("fixtures/statistics", parameters, statisticsEnvelopeSchema);
    return payload.response;
  }

  private async get<T extends { errors: unknown[] | Record<string, unknown> }>(
    endpoint: string,
    parameters: URLSearchParams,
    schema: { parse(value: unknown): T }
  ): Promise<T> {
    if (this.blockedReason) throw this.blockedReason;
    const requestKey = `${endpoint}?${parameters.toString()}`;
    await this.options.quota.assertAvailable(requestKey, endpoint);
    const url = new URL(endpoint, `${this.options.baseUrl.replace(/\/$/, "")}/`);
    url.search = parameters.toString();

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          "x-apisports-key": this.options.apiKey,
          accept: "application/json",
          "user-agent": "pitch-signal/0.1"
        },
        signal: AbortSignal.timeout(this.timeoutMs)
      });
    } catch (error) {
      throw new ProviderResponseError(
        `API-Football request failed: ${error instanceof Error ? error.message : "unknown network error"}`,
        0,
        endpoint
      );
    }

    if (!response.ok) {
      await this.options.quota.record(requestKey, endpoint, response.status, false);
      throw new ProviderResponseError(`API-Football returned HTTP ${response.status}`, response.status, endpoint);
    }

    let parsed: T;
    try {
      parsed = schema.parse(await response.json());
    } catch (error) {
      await this.options.quota.record(requestKey, endpoint, response.status, true);
      throw error;
    }
    if (hasErrors(parsed.errors)) {
      await this.options.quota.record(requestKey, endpoint, response.status, false);
      const error = new ProviderApplicationError(
        `API-Football returned an application error: ${JSON.stringify(parsed.errors)}`,
        parsed.errors
      );
      this.blockedReason = error;
      throw error;
    }
    await this.options.quota.record(requestKey, endpoint, response.status, true);
    return parsed;
  }
}
