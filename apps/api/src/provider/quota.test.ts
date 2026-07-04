import { describe, expect, it } from "vitest";
import { nextQuotaResetAt } from "./quota.js";

describe("nextQuotaResetAt", () => {
  it("returns the first day of the next UTC month", () => {
    expect(nextQuotaResetAt(new Date("2026-07-01T18:51:30Z")).toISOString())
      .toBe("2026-08-01T00:00:00.000Z");
  });
});
