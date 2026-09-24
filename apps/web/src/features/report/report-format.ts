import type { MetricKey } from "@pitch-signal/core";

export const confidenceLabels = {
  high: "Высокая",
  medium: "Средняя",
  low: "Низкая"
} as const;

export const metricLabels: Record<MetricKey, string> = {
  corners: "Угловые",
  fouls: "Фолы",
  yellowCards: "Жёлтые карточки",
  shotsOnTarget: "Удары в створ",
  shotsOffTarget: "Удары мимо",
  totalShots: "Удары по воротам (всего)",
  goalKicks: "Удары от ворот",
  offsides: "Офсайды",
  possession: "Владение мячом",
  firstHalfGoals: "Голы · 1-й тайм",
  secondHalfGoals: "Голы · 2-й тайм"
};

export const formatMetricValue = (input: number | null, metric?: MetricKey): string => {
  if (input === null) return "—";
  const formatted = input.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
  return metric === "possession" ? `${formatted}%` : formatted;
};

export const formatScore = (left: number | null, right: number | null): string =>
  left === null || right === null ? "—" : `${left}:${right}`;
