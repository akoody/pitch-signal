import { closeDatabase } from "./database/database.js";
import { migrate } from "./database/migrate.js";
import { seedDemo } from "./demo-seed.js";
import { config } from "./config.js";
import { formatCliError } from "./cli-error.js";
import { DatabaseProviderQuota, QuotaExceededError, nextQuotaResetAt } from "./provider/quota.js";
import { ReportService } from "./services/report-service.js";
import { MorningSyncService } from "./services/sync-service.js";

const command = process.argv[2];

try {
  if (command === "migrate") {
    await migrate();
  } else if (command === "demo:seed") {
    await migrate();
    const date = await seedDemo();
    console.info(`Demo data is ready. Open the report for ${date}.`);
  } else if (command === "morning") {
    await migrate();
    const result = await new MorningSyncService().run(process.argv[3]);
    const report = await new ReportService().daily(result.date);
    console.info(JSON.stringify({ sync: result, summary: report.summary }, null, 2));
  } else if (command === "quota") {
    await migrate();
    const quota = await new DatabaseProviderQuota(config.FOOTBALLDATA_IO_MONTHLY_BUDGET).usage();
    const resetAt = new Intl.DateTimeFormat("ru-RU", {
      timeZone: config.REPORT_TIMEZONE,
      dateStyle: "long",
      timeStyle: "short"
    }).format(nextQuotaResetAt());
    console.info(`Footballdata.io local quota: ${quota.used}/${quota.limit}; remaining: ${quota.remaining}; reset: ${resetAt}`);
  } else {
    throw new Error("Usage: npm run db:migrate | npm run demo:seed | npm run quota | npm run morning -- [YYYY-MM-DD]");
  }
} catch (error) {
  if (error instanceof QuotaExceededError) {
    const resetAt = new Intl.DateTimeFormat("ru-RU", {
      timeZone: config.REPORT_TIMEZONE,
      dateStyle: "long",
      timeStyle: "short"
    }).format(error.resetAt);
    console.info(`Footballdata.io local quota is exhausted: ${error.used}/${error.limit}. No request was sent.`);
    console.info(`Run the command again after ${resetAt} (${config.REPORT_TIMEZONE}).`);
  } else {
    console.error(formatCliError(error, config.DATABASE_URL));
    process.exitCode = 1;
  }
} finally {
  await closeDatabase();
}
