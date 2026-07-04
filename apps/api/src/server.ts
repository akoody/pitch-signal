import { buildApp } from "./app.js";
import { config } from "./config.js";
import { closeDatabase } from "./database/database.js";

const app = await buildApp();

const shutdown = async (signal: string): Promise<void> => {
  app.log.info({ signal }, "Graceful shutdown started");
  await app.close();
  await closeDatabase();
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

await app.listen({ host: "0.0.0.0", port: config.PORT });
