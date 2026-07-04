import type {
  FixtureAnalysis,
  HistoricalObservation,
  MatchSignal,
  MetricKey,
  MetricTrend,
  SignalDirection,
  SignalSubject,
  UpcomingFixture
} from "./model.js";
import { mean, median, round, standardDeviation, wilsonLowerBound } from "./statistics.js";

const linesByMetric: Record<MetricKey, readonly number[]> = {
  corners: [3.5, 4.5, 5.5, 6.5],
  fouls: [8.5, 10.5, 12.5, 14.5],
  yellowCards: [0.5, 1.5, 2.5, 3.5],
  shotsOnTarget: [2.5, 3.5, 4.5, 5.5],
  shotsOffTarget: [3.5, 5.5, 7.5, 9.5],
  totalShots: [8.5, 10.5, 12.5, 14.5],
  goalKicks: [4.5, 6.5, 8.5, 10.5],
  offsides: [0.5, 1.5, 2.5, 3.5],
  possession: [39.5, 44.5, 49.5, 54.5, 59.5],
  firstHalfGoals: [0.5, 1.5],
  secondHalfGoals: [0.5, 1.5]
};

const metricLabels: Record<MetricKey, string> = {
  corners: "угловые",
  fouls: "фолы",
  yellowCards: "жёлтые карточки",
  shotsOnTarget: "удары в створ",
  shotsOffTarget: "удары мимо",
  totalShots: "удары по воротам",
  goalKicks: "удары от ворот",
  offsides: "офсайды",
  possession: "владение мячом",
  firstHalfGoals: "голы в 1-м тайме",
  secondHalfGoals: "голы во 2-м тайме"
};

interface CandidateInput {
  metric: MetricKey;
  subject: SignalSubject;
  direction: SignalDirection;
  line: number;
  values: number[];
  opponentValues: number[];
  subjectName: string;
}

const candidate = (input: CandidateInput): MatchSignal | null => {
  const hits = input.values.filter((value) =>
    input.direction === "over" ? value > input.line : value < input.line
  ).length;
  const hitRate = hits / input.values.length;
  const lowerBound = wilsonLowerBound(hits, input.values.length);
  const average = mean(input.values);
  const deviation = standardDeviation(input.values);
  const consistency = average === 0 ? 0 : Math.max(0, 1 - deviation / Math.max(average, 1));
  const opponentAverage = input.opponentValues.length > 0 ? mean(input.opponentValues) : null;
  const opponentSupports = opponentAverage === null
    ? 0.5
    : input.direction === "over"
      ? Math.min(1, opponentAverage / Math.max(input.line, 0.5))
      : Math.min(1, Math.max(input.line, 0.5) / Math.max(opponentAverage, 0.5));
  const sampleFactor = Math.min(1, input.values.length / 10);
  const score = 100 * (0.5 * lowerBound + 0.2 * consistency + 0.2 * opponentSupports + 0.1 * sampleFactor);

  if (hitRate < 0.7 || lowerBound < 0.45 || score < 55) return null;

  const confidence = score >= 75 && input.values.length >= 8
    ? "high"
    : score >= 63
      ? "medium"
      : "low";
  const directionLabel = input.direction === "over" ? "больше" : "меньше";

  return {
    metric: input.metric,
    subject: input.subject,
    direction: input.direction,
    line: input.line,
    score: round(score, 1),
    confidence,
    summary: `${input.subjectName}: ${metricLabels[input.metric]} ${directionLabel} ${input.line} — ${hits}/${input.values.length}`,
    evidence: {
      sampleSize: input.values.length,
      hitCount: hits,
      hitRate: round(hitRate, 3),
      wilsonLowerBound: round(lowerBound, 3),
      average: round(average),
      median: round(median(input.values)),
      standardDeviation: round(deviation),
      opponentSampleSize: input.opponentValues.length,
      opponentAverage: opponentAverage === null ? null : round(opponentAverage)
    }
  };
};

const metricValues = (
  observations: readonly HistoricalObservation[],
  metric: MetricKey,
  side: "team" | "opponent"
): number[] => observations
  .map((observation) => observation[side][metric])
  .filter((value): value is number => value !== null);

const metricTrend = (
  metric: MetricKey,
  observations: readonly HistoricalObservation[],
  opponentObservations: readonly HistoricalObservation[]
): MetricTrend => {
  const values = metricValues(observations, metric, "team");
  const opponentAllowedValues = metricValues(opponentObservations, metric, "opponent");
  return {
    metric,
    sampleSize: values.length,
    values,
    average: values.length > 0 ? round(mean(values)) : null,
    median: values.length > 0 ? round(median(values)) : null,
    minimum: values.length > 0 ? Math.min(...values) : null,
    maximum: values.length > 0 ? Math.max(...values) : null,
    opponentSampleSize: opponentAllowedValues.length,
    opponentAllowedValues,
    opponentAllowedAverage: opponentAllowedValues.length > 0 ? round(mean(opponentAllowedValues)) : null
  };
};

const teamTrendSummary = (
  teamName: string,
  observations: readonly HistoricalObservation[],
  opponentObservations: readonly HistoricalObservation[]
) => ({
  teamName,
  metrics: (Object.keys(linesByMetric) as MetricKey[]).map((metric) =>
    metricTrend(metric, observations, opponentObservations)
  )
});

const teamSignals = (
  observations: readonly HistoricalObservation[],
  opponentObservations: readonly HistoricalObservation[],
  subject: "home-team" | "away-team",
  subjectName: string,
  minSampleSize: number
): MatchSignal[] => {
  const signals: MatchSignal[] = [];
  for (const metric of Object.keys(linesByMetric) as MetricKey[]) {
    const values = metricValues(observations, metric, "team");
    const opponentValues = metricValues(opponentObservations, metric, "opponent");
    if (values.length < minSampleSize) continue;
    for (const line of linesByMetric[metric]) {
      for (const direction of ["over", "under"] as const) {
        const signal = candidate({ metric, subject, direction, line, values, opponentValues, subjectName });
        if (signal) signals.push(signal);
      }
    }
  }
  return signals;
};

export const analyzeFixture = (
  fixture: UpcomingFixture,
  homeHistory: readonly HistoricalObservation[],
  awayHistory: readonly HistoricalObservation[],
  minSampleSize: number
): FixtureAnalysis => {
  const trends = {
    home: teamTrendSummary(fixture.homeTeam.name, homeHistory, awayHistory),
    away: teamTrendSummary(fixture.awayTeam.name, awayHistory, homeHistory)
  };
  const sufficient = homeHistory.length >= minSampleSize && awayHistory.length >= minSampleSize;
  const reason = sufficient
    ? null
    : `Нужно минимум ${minSampleSize} матчей на команду; доступно ${homeHistory.length}/${awayHistory.length}`;
  if (!sufficient) {
    return {
      fixture,
      coverage: { homeMatches: homeHistory.length, awayMatches: awayHistory.length, sufficient, reason },
      trends,
      history: { home: [...homeHistory], away: [...awayHistory] },
      signals: []
    };
  }

  const signals = [
    ...teamSignals(homeHistory, awayHistory, "home-team", fixture.homeTeam.name, minSampleSize),
    ...teamSignals(awayHistory, homeHistory, "away-team", fixture.awayTeam.name, minSampleSize)
  ]
    .sort((left, right) => {
      const scoreDifference = right.score - left.score;
      if (scoreDifference !== 0) return scoreDifference;
      return Math.abs(left.evidence.average - left.line) - Math.abs(right.evidence.average - right.line);
    })
    .filter((signal, index, all) => all.findIndex((item) =>
      item.subject === signal.subject && item.metric === signal.metric
    ) === index)
    .slice(0, 12);

  return {
    fixture,
    coverage: { homeMatches: homeHistory.length, awayMatches: awayHistory.length, sufficient, reason },
    trends,
    history: { home: [...homeHistory], away: [...awayHistory] },
    signals
  };
};
