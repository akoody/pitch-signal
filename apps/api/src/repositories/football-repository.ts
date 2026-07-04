import { sql } from "kysely";
import type { HistoricalObservation, TeamMatchStats, UpcomingFixture } from "@pitch-signal/core";
import type { ProviderFixture } from "@pitch-signal/provider-footballdata-io";
import { database } from "../database/database.js";

const completedStatuses = ["FT", "AET", "PEN"];

export class FootballRepository {
  async removeDemoData(): Promise<void> {
    const demoLeagueId = 9_000_001;
    const demoTeamIds = [9_000_011, 9_000_012, 9_000_013, 9_000_014];
    await database.transaction().execute(async (transaction) => {
      await transaction.deleteFrom("fixtures").where("league_id", "=", demoLeagueId).execute();
      await transaction.deleteFrom("teams").where("provider_id", "in", demoTeamIds).execute();
      await transaction.deleteFrom("leagues").where("provider_id", "=", demoLeagueId).execute();
    });
  }

  async upsertFixture(input: ProviderFixture): Promise<void> {
    await database.transaction().execute(async (transaction) => {
      await transaction.insertInto("leagues").values({
        provider_id: input.league.id,
        name: input.league.name,
        country: input.league.country ?? null,
        logo_url: input.league.logo ?? null
      }).onConflict((conflict) => conflict.column("provider_id").doUpdateSet({
        name: input.league.name,
        country: input.league.country ?? null,
        logo_url: input.league.logo ?? null,
        updated_at: new Date()
      })).execute();

      for (const team of [input.teams.home, input.teams.away]) {
        await transaction.insertInto("teams").values({
          provider_id: team.id,
          name: team.name,
          logo_url: team.logo ?? null
        }).onConflict((conflict) => conflict.column("provider_id").doUpdateSet({
          name: team.name,
          logo_url: team.logo ?? null,
          updated_at: new Date()
        })).execute();
      }

      await transaction.insertInto("fixtures").values({
        provider_id: input.fixture.id,
        league_id: input.league.id,
        season: input.league.season,
        home_team_id: input.teams.home.id,
        away_team_id: input.teams.away.id,
        kickoff_at: new Date(input.fixture.date),
        status: input.fixture.status.short,
        home_goals: input.goals.home,
        away_goals: input.goals.away,
        provider_updated_at: null
      }).onConflict((conflict) => conflict.column("provider_id").doUpdateSet({
        kickoff_at: new Date(input.fixture.date),
        season: input.league.season,
        status: input.fixture.status.short,
        home_goals: input.goals.home,
        away_goals: input.goals.away,
        updated_at: new Date()
      })).execute();
    });
  }

  async upsertStatistics(fixtureId: number, teamId: number, stats: TeamMatchStats): Promise<void> {
    await database.insertInto("team_fixture_stats").values({
      fixture_id: fixtureId,
      team_id: teamId,
      corners: stats.corners,
      fouls: stats.fouls,
      yellow_cards: stats.yellowCards,
      red_cards: stats.redCards,
      shots_on_target: stats.shotsOnTarget,
      shots_off_target: stats.shotsOffTarget,
      total_shots: stats.totalShots,
      goal_kicks: stats.goalKicks,
      offsides: stats.offsides,
      possession: stats.possession,
      first_half_goals: stats.firstHalfGoals,
      second_half_goals: stats.secondHalfGoals
    }).onConflict((conflict) => conflict.columns(["fixture_id", "team_id"]).doUpdateSet({
      corners: stats.corners,
      fouls: stats.fouls,
      yellow_cards: stats.yellowCards,
      red_cards: stats.redCards,
      shots_on_target: stats.shotsOnTarget,
      shots_off_target: stats.shotsOffTarget,
      total_shots: stats.totalShots,
      goal_kicks: stats.goalKicks,
      offsides: stats.offsides,
      possession: stats.possession,
      first_half_goals: stats.firstHalfGoals,
      second_half_goals: stats.secondHalfGoals,
      collected_at: new Date()
    })).execute();
  }

  async hasStatistics(fixtureId: number): Promise<boolean> {
    const row = await database.selectFrom("team_fixture_stats")
      .select(({ fn }) => fn.countAll<number>().as("count"))
      .where("fixture_id", "=", fixtureId)
      .executeTakeFirst();
    return Number(row?.count ?? 0) >= 2;
  }

  async fixturesForDate(date: string, timezone: string): Promise<UpcomingFixture[]> {
    const result = await sql<{
      id: number;
      kickoff_at: Date;
      league_id: number;
      league_name: string;
      season: number | null;
      country: string | null;
      home_team_id: number;
      home_team_name: string;
      away_team_id: number;
      away_team_name: string;
    }>`
      SELECT f.provider_id AS id, f.kickoff_at, l.provider_id AS league_id, l.name AS league_name, f.season,
        l.country, h.provider_id AS home_team_id, h.name AS home_team_name,
        a.provider_id AS away_team_id, a.name AS away_team_name
      FROM fixtures f
      JOIN leagues l ON l.provider_id = f.league_id
      JOIN teams h ON h.provider_id = f.home_team_id
      JOIN teams a ON a.provider_id = f.away_team_id
      WHERE timezone(${timezone}, f.kickoff_at)::date = ${date}::date
      ORDER BY f.kickoff_at, l.name, h.name
    `.execute(database);
    return result.rows.map((row) => ({
      id: row.id,
      kickoffAt: new Date(row.kickoff_at),
      league: { id: row.league_id, name: row.league_name, season: row.season ?? row.kickoff_at.getUTCFullYear(), country: row.country },
      homeTeam: { id: row.home_team_id, name: row.home_team_name },
      awayTeam: { id: row.away_team_id, name: row.away_team_name }
    }));
  }

  async history(teamId: number, before: Date, limit: number): Promise<HistoricalObservation[]> {
    const result = await sql<{
      fixture_id: number;
      kickoff_at: Date;
      venue: "home" | "away";
      opponent_name: string;
      team_goals: number | null;
      opponent_goals: number | null;
      team_corners: number | null;
      team_fouls: number | null;
      team_yellow_cards: number | null;
      team_red_cards: number | null;
      team_shots_on_target: number | null;
      team_shots_off_target: number | null;
      team_total_shots: number | null;
      team_goal_kicks: number | null;
      team_offsides: number | null;
      team_possession: number | null;
      team_first_half_goals: number | null;
      team_second_half_goals: number | null;
      opponent_corners: number | null;
      opponent_fouls: number | null;
      opponent_yellow_cards: number | null;
      opponent_red_cards: number | null;
      opponent_shots_on_target: number | null;
      opponent_shots_off_target: number | null;
      opponent_total_shots: number | null;
      opponent_goal_kicks: number | null;
      opponent_offsides: number | null;
      opponent_possession: number | null;
      opponent_first_half_goals: number | null;
      opponent_second_half_goals: number | null;
    }>`
      SELECT f.provider_id AS fixture_id, f.kickoff_at,
        CASE WHEN f.home_team_id = ${teamId} THEN 'home' ELSE 'away' END AS venue,
        CASE WHEN f.home_team_id = ${teamId} THEN away_team.name ELSE home_team.name END AS opponent_name,
        CASE WHEN f.home_team_id = ${teamId} THEN f.home_goals ELSE f.away_goals END AS team_goals,
        CASE WHEN f.home_team_id = ${teamId} THEN f.away_goals ELSE f.home_goals END AS opponent_goals,
        own.corners AS team_corners, own.fouls AS team_fouls,
        own.yellow_cards AS team_yellow_cards, own.shots_on_target AS team_shots_on_target,
        own.red_cards AS team_red_cards, own.total_shots AS team_total_shots, opponent.corners AS opponent_corners,
        own.shots_off_target AS team_shots_off_target, own.goal_kicks AS team_goal_kicks,
        own.offsides AS team_offsides, own.possession AS team_possession,
        own.first_half_goals AS team_first_half_goals, own.second_half_goals AS team_second_half_goals,
        opponent.fouls AS opponent_fouls, opponent.yellow_cards AS opponent_yellow_cards,
        opponent.red_cards AS opponent_red_cards,
        opponent.shots_on_target AS opponent_shots_on_target,
        opponent.shots_off_target AS opponent_shots_off_target,
        opponent.total_shots AS opponent_total_shots, opponent.goal_kicks AS opponent_goal_kicks,
        opponent.offsides AS opponent_offsides, opponent.possession AS opponent_possession,
        opponent.first_half_goals AS opponent_first_half_goals,
        opponent.second_half_goals AS opponent_second_half_goals
      FROM fixtures f
      JOIN teams home_team ON home_team.provider_id = f.home_team_id
      JOIN teams away_team ON away_team.provider_id = f.away_team_id
      JOIN team_fixture_stats own ON own.fixture_id = f.provider_id AND own.team_id = ${teamId}
      JOIN team_fixture_stats opponent ON opponent.fixture_id = f.provider_id AND opponent.team_id <> ${teamId}
      WHERE (f.home_team_id = ${teamId} OR f.away_team_id = ${teamId})
        AND f.kickoff_at < ${before}
        AND f.status = ANY(${sql.val(completedStatuses)}::text[])
      ORDER BY f.kickoff_at DESC
      LIMIT ${limit}
    `.execute(database);
    return result.rows.map((row) => ({
      fixtureId: row.fixture_id,
      kickoffAt: new Date(row.kickoff_at),
      venue: row.venue,
      opponentName: row.opponent_name,
      teamGoals: row.team_goals,
      opponentGoals: row.opponent_goals,
      team: {
        corners: row.team_corners,
        fouls: row.team_fouls,
        yellowCards: row.team_yellow_cards,
        redCards: row.team_red_cards,
        shotsOnTarget: row.team_shots_on_target,
        shotsOffTarget: row.team_shots_off_target,
        totalShots: row.team_total_shots,
        goalKicks: row.team_goal_kicks,
        offsides: row.team_offsides,
        possession: row.team_possession,
        firstHalfGoals: row.team_first_half_goals,
        secondHalfGoals: row.team_second_half_goals
      },
      opponent: {
        corners: row.opponent_corners,
        fouls: row.opponent_fouls,
        yellowCards: row.opponent_yellow_cards,
        redCards: row.opponent_red_cards,
        shotsOnTarget: row.opponent_shots_on_target,
        shotsOffTarget: row.opponent_shots_off_target,
        totalShots: row.opponent_total_shots,
        goalKicks: row.opponent_goal_kicks,
        offsides: row.opponent_offsides,
        possession: row.opponent_possession,
        firstHalfGoals: row.opponent_first_half_goals,
        secondHalfGoals: row.opponent_second_half_goals
      }
    }));
  }
}
