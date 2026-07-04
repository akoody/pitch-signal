import { z } from "zod";

const teamSchema = z.object({
  team_id: z.number().int().positive(),
  team_name: z.string().min(1),
  team_logo: z.url().nullable().optional()
});

const leagueSchema = z.object({
  league_id: z.number().int().positive(),
  name: z.string().min(1).optional(),
  league_name: z.string().min(1).optional(),
  country: z.string().nullable().optional(),
  image: z.url().nullable().optional(),
  league_image: z.url().nullable().optional()
}).refine((league) => Boolean(league.name || league.league_name), "League name is missing");

export const matchSchema = z.object({
  match_id: z.number().int().positive(),
  match_date: z.string().min(1),
  date_unix: z.number().int().positive(),
  status: z.string().min(1),
  league: leagueSchema,
  season: z.object({ year: z.number().int().min(1900).max(2200) }),
  home_team: teamSchema,
  away_team: teamSchema,
  score: z.object({
    home: z.number().int().nullable(),
    away: z.number().int().nullable()
  })
});

const metaSchema = z.object({
  requests_used: z.number().int().nonnegative().optional(),
  requests_limit: z.number().int().positive().optional(),
  requests_remaining: z.number().int().nonnegative().optional()
}).passthrough();

export const dateMatchesEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.object({ matches: z.array(matchSchema) }),
  meta: metaSchema.optional()
});

export const matchesEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.array(matchSchema),
  meta: metaSchema.optional()
});

const splitStatisticSchema = z.object({
  home: z.number().nullable(),
  away: z.number().nullable()
});

export const statisticsEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.object({
    match: z.object({ home_team: teamSchema, away_team: teamSchema }),
    stats: z.object({
      corners: splitStatisticSchema,
      fouls: splitStatisticSchema,
      yellow_cards: splitStatisticSchema,
      red_cards: splitStatisticSchema,
      shots_on_target: splitStatisticSchema,
      shots_off_target: splitStatisticSchema,
      shots: splitStatisticSchema,
      goal_kicks: splitStatisticSchema,
      offsides: splitStatisticSchema,
      possession: splitStatisticSchema,
      half_time_goals: splitStatisticSchema,
      second_half_goals: splitStatisticSchema
    })
  }),
  meta: metaSchema.optional()
});

export type FootballDataMatch = z.infer<typeof matchSchema>;
export type FootballDataStatistics = z.infer<typeof statisticsEnvelopeSchema>["data"];
