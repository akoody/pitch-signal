import { z } from "zod";

const nullableInteger = z.union([z.number(), z.string()])
  .nullable()
  .transform((value, context): number | null => {
    if (value === null) return null;
    const parsed = typeof value === "number" ? value : Number.parseFloat(value.replace("%", ""));
    if (!Number.isFinite(parsed)) {
      context.addIssue({ code: "custom", message: `Expected numeric statistic, received ${value}` });
      return z.NEVER;
    }
    return Math.round(parsed);
  });

const fixtureSchema = z.object({
  fixture: z.object({
    id: z.number().int().positive(),
    date: z.iso.datetime({ offset: true }),
    status: z.object({ short: z.string() })
  }),
  league: z.object({
    id: z.number().int().positive(),
    name: z.string().min(1),
    season: z.number().int().min(1900).max(2200),
    country: z.string().nullable().optional(),
    logo: z.url().nullable().optional()
  }),
  teams: z.object({
    home: z.object({ id: z.number().int().positive(), name: z.string().min(1), logo: z.url().nullable().optional() }),
    away: z.object({ id: z.number().int().positive(), name: z.string().min(1), logo: z.url().nullable().optional() })
  }),
  goals: z.object({ home: z.number().int().nullable(), away: z.number().int().nullable() })
});

const statisticSchema = z.object({
  type: z.string(),
  value: nullableInteger
});

const teamStatisticsSchema = z.object({
  team: z.object({ id: z.number().int().positive(), name: z.string().min(1) }),
  statistics: z.array(statisticSchema)
});

const envelope = <T extends z.ZodType>(item: T) => z.object({
  errors: z.union([z.array(z.unknown()), z.record(z.string(), z.unknown())]),
  results: z.number().int().nonnegative(),
  response: z.array(item)
});

export const fixturesEnvelopeSchema = envelope(fixtureSchema);
export const statisticsEnvelopeSchema = envelope(teamStatisticsSchema);

export type ApiFixture = z.infer<typeof fixtureSchema>;
export type ApiTeamStatistics = z.infer<typeof teamStatisticsSchema>;
