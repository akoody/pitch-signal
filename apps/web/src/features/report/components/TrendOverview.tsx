import type { FixtureAnalysis, TeamTrendSummary } from "@pitch-signal/core";
import { formatMetricValue, metricLabels } from "../report-format.js";

const TrendTable = ({ trend }: { trend: TeamTrendSummary }) => (
  <div className="trend-team">
    <h4>{trend.teamName}</h4>
    <div className="trend-table" role="table" aria-label={`Статистика ${trend.teamName}`}>
      <div className="trend-row trend-row--header" role="row">
        <span>Показатель</span><span>Команда: среднее</span><span>Против соперника</span><span>Последние: новые → старые</span>
      </div>
      {trend.metrics.map((metric) => (
        <div className="trend-row" role="row" key={metric.metric}>
          <strong>{metricLabels[metric.metric]}</strong>
          <span title={`Диапазон: ${formatMetricValue(metric.minimum, metric.metric)}–${formatMetricValue(metric.maximum, metric.metric)}; медиана: ${formatMetricValue(metric.median, metric.metric)}`}>
            {formatMetricValue(metric.average, metric.metric)} <small>за {metric.sampleSize}</small>
          </span>
          <span>{formatMetricValue(metric.opponentAllowedAverage, metric.metric)} <small>за {metric.opponentSampleSize}</small></span>
          <span className="trend-values">
            {metric.values.length > 0
              ? metric.values.map((item) => formatMetricValue(item, metric.metric)).join(" · ")
              : "—"}
          </span>
        </div>
      ))}
    </div>
  </div>
);

export const TrendOverview = ({ analysis }: { analysis: FixtureAnalysis }) => (
  <div className="trend-overview">
    <div className="trend-overview__heading">
      <div>
        <strong>Фактическая статистика</strong>
        <span>«Против соперника» — сколько в среднем набирали команды в матчах против будущего соперника</span>
      </div>
      {!analysis.coverage.sufficient && <span className="preliminary">Предварительная выборка</span>}
    </div>
    <div className="trend-grid">
      <TrendTable trend={analysis.trends.home} />
      <TrendTable trend={analysis.trends.away} />
    </div>
  </div>
);
