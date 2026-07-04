import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiFootballClient, ProviderApplicationError, type ProviderQuota } from "./client.js";

const quota = (): ProviderQuota & { assertAvailable: ReturnType<typeof vi.fn>; record: ReturnType<typeof vi.fn> } => ({
  assertAvailable: vi.fn(() => Promise.resolve()),
  record: vi.fn(() => Promise.resolve())
});

const jsonResponse = (payload: unknown): Response => new Response(JSON.stringify(payload), {
  status: 200,
  headers: { "content-type": "application/json" }
});

afterEach(() => vi.unstubAllGlobals());

describe("ApiFootballClient", () => {
  it("uses a date range instead of the paid-only last parameter", async () => {
    const request = vi.fn((input: URL | Request | string) => {
      void input;
      return Promise.resolve(jsonResponse({ errors: [], results: 0, response: [] }));
    });
    vi.stubGlobal("fetch", request);
    const client = new ApiFootballClient({
      apiKey: "test-key",
      baseUrl: "https://example.test",
      quota: quota()
    });

    await client.finishedFixturesBetween(42, 2026, "2026-01-01", "2026-06-30", "Asia/Novokuznetsk");

    const requested = request.mock.calls[0]?.[0];
    expect(requested).toBeDefined();
    const url = requested instanceof URL
      ? requested
      : new URL(typeof requested === "string" ? requested : requested?.url ?? "https://invalid.test");
    expect(url.searchParams.get("team")).toBe("42");
    expect(url.searchParams.get("season")).toBe("2026");
    expect(url.searchParams.get("from")).toBe("2026-01-01");
    expect(url.searchParams.get("to")).toBe("2026-06-30");
    expect(url.searchParams.has("last")).toBe(false);
  });

  it("opens a circuit after a provider plan error", async () => {
    const request = vi.fn((input: URL | Request | string) => {
      void input;
      return Promise.resolve(jsonResponse({
        errors: { plan: "Unsupported parameter" },
        results: 0,
        response: []
      }));
    });
    vi.stubGlobal("fetch", request);
    const requestQuota = quota();
    const client = new ApiFootballClient({
      apiKey: "test-key",
      baseUrl: "https://example.test",
      quota: requestQuota
    });

    await expect(client.fixturesByDate("2026-07-02", "UTC")).rejects.toBeInstanceOf(ProviderApplicationError);
    await expect(client.fixturesByDate("2026-07-03", "UTC")).rejects.toBeInstanceOf(ProviderApplicationError);
    expect(request).toHaveBeenCalledTimes(1);
    expect(requestQuota.assertAvailable).toHaveBeenCalledTimes(1);
    expect(requestQuota.record).toHaveBeenCalledWith(
      expect.any(String),
      "fixtures",
      200,
      false
    );
  });
});
