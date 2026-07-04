import { describe, expect, it } from "vitest";
import { formatCliError } from "./cli-error.js";

describe("formatCliError", () => {
  it("explains how to recover when the local database is unavailable", () => {
    const ipv4Error = Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:5433"), {
      code: "ECONNREFUSED",
      port: 5433
    });
    const error = new AggregateError([ipv4Error], "");

    expect(formatCliError(error, "postgresql://user:secret@localhost:5433/app")).toBe(
      'PostgreSQL is unavailable at localhost:5433. Start it with "docker compose up -d postgres" and run the command again.'
    );
  });

  it("prints nested messages from aggregate errors", () => {
    const error = new AggregateError([new Error("first failure"), new Error("second failure")], "");

    expect(formatCliError(error, "postgresql://localhost/app")).toBe("first failure; second failure");
  });
});
