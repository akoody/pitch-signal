import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { z } from "zod";
import { config } from "./config.js";
import { database } from "./database/database.js";
import { SyncRunRepository } from "./repositories/sync-run-repository.js";
import { ReportService } from "./services/report-service.js";
import { dateInTimezone } from "./time.js";

const dateQuerySchema = z.object({
  date: z.iso.date().optional()
});

export const buildApp = async (): Promise<FastifyInstance> => {
  const app = Fastify({ logger: { level: config.NODE_ENV === "production" ? "info" : "debug" } });
  await app.register(cors, { origin: config.WEB_ORIGIN });

  app.get("/health", () => ({ status: "ok" }));
  app.get("/ready", async (_request, reply) => {
    try {
      await database.selectFrom("schema_migrations").select("version").limit(1).execute();
      return { status: "ready" };
    } catch {
      return reply.code(503).send({ status: "not-ready" });
    }
  });

  app.get("/api/v1/report", async (request, reply) => {
    const parsed = dateQuerySchema.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_QUERY", details: z.treeifyError(parsed.error) });
    const date = parsed.data.date ?? dateInTimezone(new Date(), config.REPORT_TIMEZONE);
    return new ReportService().daily(date);
  });

  app.get("/api/v1/sync/latest", async () => new SyncRunRepository().latest());

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    void reply.code(500).send({ error: "INTERNAL_SERVER_ERROR", message: "Internal server error" });
  });
  return app;
};
