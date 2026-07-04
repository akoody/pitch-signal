export const metricKeys = [
  "corners",
  "fouls",
  "yellowCards",
  "shotsOnTarget",
  "shotsOffTarget",
  "totalShots",
  "goalKicks",
  "offsides",
  "possession",
  "firstHalfGoals",
  "secondHalfGoals"
] as const;

export type MetricKey = (typeof metricKeys)[number];

export type TeamMatchStats = Record<MetricKey, number | null> & { redCards: number | null };

export interface HistoricalObservation {
  fixtureId: number;
  kickoffAt: Date;
  venue: "home" | "away";
  opponentName: string;
  teamGoals: number | null;
  opponentGoals: number | null;
  team: TeamMatchStats;
  opponent: TeamMatchStats;
}

export interface UpcomingFixture {
  id: number;
  kickoffAt: Date;
  league: { id: number; name: string; season: number; country: string | null };
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
}

export type SignalDirection = "over" | "under";
export type SignalSubject = "home-team" | "away-team" | "match-total";

export interface SignalEvidence {
  sampleSize: number;
  hitCount: number;
  hitRate: number;
  wilsonLowerBound: number;
  average: number;
  median: number;
  standardDeviation: number;
  opponentSampleSize: number;
  opponentAverage: number | null;
}

export interface MatchSignal {
  metric: MetricKey;
  subject: SignalSubject;
  direction: SignalDirection;
  line: number;
  score: number;
  confidence: "low" | "medium" | "high";
  summary: string;
  evidence: SignalEvidence;
}

export interface MetricTrend {
  metric: MetricKey;
  sampleSize: number;
  values: number[];
  average: number | null;
  median: number | null;
  minimum: number | null;
  maximum: number | null;
  opponentSampleSize: number;
  opponentAllowedValues: number[];
  opponentAllowedAverage: number | null;
}

export interface TeamTrendSummary {
  teamName: string;
  metrics: MetricTrend[];
}

export interface FixtureAnalysis {
  fixture: UpcomingFixture;
  coverage: {
    homeMatches: number;
    awayMatches: number;
    sufficient: boolean;
    reason: string | null;
  };
  trends: {
    home: TeamTrendSummary;
    away: TeamTrendSummary;
  };
  history: {
    home: HistoricalObservation[];
    away: HistoricalObservation[];
  };
  signals: MatchSignal[];
}

export interface DailyReport {
  date: string;
  timezone: string;
  generatedAt: string;
  provider: string;
  quota: { used: number; limit: number; remaining: number };
  summary: {
    fixtures: number;
    analyzed: number;
    insufficientData: number;
    signals: number;
  };
  fixtures: FixtureAnalysis[];
}
