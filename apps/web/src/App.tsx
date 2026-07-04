import { useEffect, useMemo, useState } from "react";
import { Activity, AlertCircle, CalendarDays, Database, RefreshCw, ShieldCheck } from "lucide-react";
import type { DailyReport, FixtureAnalysis, HistoricalObservation, MatchSignal, MetricKey, TeamTrendSummary } from "@pitch-signal/core";
import { fetchDailyReport } from "./api.js";
import { formatKickoff, localIsoDate } from "./date.js";

const confidenceLabels = { high: "Высокая", medium: "Средняя", low: "Низкая" } as const;
const metricLabels: Record<MetricKey, string> = {
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

const value = (input: number | null, metric?: MetricKey) => {
  if (input === null) return "—";
  const formatted = input.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
  return metric === "possession" ? `${formatted}%` : formatted;
};

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
          <span title={`Диапазон: ${value(metric.minimum, metric.metric)}–${value(metric.maximum, metric.metric)}; медиана: ${value(metric.median, metric.metric)}`}>
            {value(metric.average, metric.metric)} <small>за {metric.sampleSize}</small>
          </span>
          <span>{value(metric.opponentAllowedAverage, metric.metric)} <small>за {metric.opponentSampleSize}</small></span>
          <span className="trend-values">{metric.values.length > 0 ? metric.values.map((item) => value(item, metric.metric)).join(" · ") : "—"}</span>
        </div>
      ))}
    </div>
  </div>
);

const TrendOverview = ({ analysis }: { analysis: FixtureAnalysis }) => (
  <div className="trend-overview">
    <div className="trend-overview__heading">
      <div><strong>Фактическая статистика</strong><span>«Против соперника» — сколько в среднем набирали команды в матчах против будущего соперника</span></div>
      {!analysis.coverage.sufficient && <span className="preliminary">Предварительная выборка</span>}
    </div>
    <div className="trend-grid">
      <TrendTable trend={analysis.trends.home} />
      <TrendTable trend={analysis.trends.away} />
    </div>
  </div>
);

const score = (left: number | null, right: number | null) =>
  left === null || right === null ? "—" : `${left}:${right}`;

const compactStat = (match: HistoricalObservation, metric: MetricKey) =>
  score(match.team[metric], match.opponent[metric]);

const HistoryTable = ({ teamName, matches }: { teamName: string; matches: HistoricalObservation[] }) => (
  <div className="history-team">
    <h5>{teamName}</h5>
    <div className="history-scroll">
      <div className="history-table" role="table" aria-label={`Последние матчи ${teamName}`}>
        <div className="history-row history-row--header" role="row">
          <span>Дата</span><span>Поле</span><span>Соперник</span><span>Счёт</span><span>1Т</span><span>2Т</span>
          <span>Угл.</span><span>Удары</span><span>В створ</span><span>От ворот</span><span>Фолы</span><span>ЖК</span>
        </div>
        {matches.map((match) => (
          <div className="history-row" role="row" key={match.fixtureId}>
            <span>{new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(new Date(match.kickoffAt))}</span>
            <span className={`venue venue--${match.venue}`}>{match.venue === "home" ? "Д" : "Г"}</span>
            <strong title={match.opponentName}>{match.opponentName}</strong>
            <span>{score(match.teamGoals, match.opponentGoals)}</span>
            <span>{compactStat(match, "firstHalfGoals")}</span>
            <span>{compactStat(match, "secondHalfGoals")}</span>
            <span>{compactStat(match, "corners")}</span>
            <span>{compactStat(match, "totalShots")}</span>
            <span>{compactStat(match, "shotsOnTarget")}</span>
            <span>{compactStat(match, "goalKicks")}</span>
            <span>{compactStat(match, "fouls")}</span>
            <span>{compactStat(match, "yellowCards")}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const MatchHistory = ({ analysis }: { analysis: FixtureAnalysis }) => (
  <details className="history-details">
    <summary>Подробно по последним матчам <span>счёт и статистика команда:соперник</span></summary>
    <div className="halves-note"><strong>По таймам:</strong> бесплатный источник предоставляет голы. Угловые, удары и фолы доступны только за весь матч.</div>
    <div className="history-grid">
      <HistoryTable teamName={analysis.fixture.homeTeam.name} matches={analysis.history.home} />
      <HistoryTable teamName={analysis.fixture.awayTeam.name} matches={analysis.history.away} />
    </div>
  </details>
);

const SignalCard = ({ signal }: { signal: MatchSignal }) => (
  <article className={`signal signal--${signal.confidence}`}>
    <div className="signal__header">
      <span className="signal__confidence">{confidenceLabels[signal.confidence]}</span>
      <span className="signal__score">{signal.score}</span>
    </div>
    <h4>{signal.summary}</h4>
    <dl className="signal__evidence">
      <div><dt>Проход</dt><dd>{Math.round(signal.evidence.hitRate * 100)}%</dd></div>
      <div><dt>Среднее</dt><dd>{signal.evidence.average}</dd></div>
      <div><dt>Медиана</dt><dd>{signal.evidence.median}</dd></div>
      <div><dt>Разброс</dt><dd>{signal.evidence.standardDeviation}</dd></div>
      <div><dt>Wilson LB</dt><dd>{Math.round(signal.evidence.wilsonLowerBound * 100)}%</dd></div>
      <div><dt>Соперник</dt><dd>{signal.evidence.opponentAverage ?? "—"}</dd></div>
    </dl>
  </article>
);

const FixtureCard = ({ analysis, timezone }: { analysis: FixtureAnalysis; timezone: string }) => (
  <section className="fixture">
    <header className="fixture__header">
      <div>
        <div className="fixture__meta">
          <span>{formatKickoff(analysis.fixture.kickoffAt.toString(), timezone)}</span>
          <span>{analysis.fixture.league.country ?? "Международный"} · {analysis.fixture.league.name}</span>
        </div>
        <h3>{analysis.fixture.homeTeam.name} <span>—</span> {analysis.fixture.awayTeam.name}</h3>
      </div>
      <div className="coverage" title="Количество загруженных исторических матчей">
        <Database size={15} /> {analysis.coverage.homeMatches}/{analysis.coverage.awayMatches}
      </div>
    </header>
    {!analysis.coverage.sufficient && (
      <div className="empty-state"><AlertCircle size={18} /> {analysis.coverage.reason}. Статистика ниже доступна для просмотра, но ещё не считается сильным сигналом.</div>
    )}
    <TrendOverview analysis={analysis} />
    <MatchHistory analysis={analysis} />
    {analysis.coverage.sufficient && (analysis.signals.length === 0 ? (
      <div className="empty-state"><ShieldCheck size={18} /> Сильных устойчивых отклонений не найдено</div>
    ) : (
      <div className="signal-grid">{analysis.signals.map((signal) => (
        <SignalCard key={`${signal.subject}-${signal.metric}-${signal.direction}`} signal={signal} />
      ))}</div>
    ))}
  </section>
);

export const App = () => {
  const [date, setDate] = useState(localIsoDate());
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await fetchDailyReport(date));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [date]);

  const visible = useMemo(() => report?.fixtures ?? [], [report]);

  return (
    <main>
      <header className="topbar">
        <div className="brand"><span className="brand__mark">PS</span><div><strong>Pitch Signal</strong><small>Explainable football trends</small></div></div>
        <div className="date-control"><CalendarDays size={17} /><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div>
      </header>

      <div className="page">
        <section className="hero">
          <div><p className="eyebrow">Утренний обзор</p><h1>Матчи и устойчивые<br />статистические тренды</h1><p className="hero__copy">Сервис отделяет сильные повторяемые отклонения от шума. Это аналитика исторических данных, а не обещание результата.</p></div>
          <button className="refresh" onClick={() => void load()} disabled={loading}><RefreshCw size={17} className={loading ? "spin" : ""} /> Обновить</button>
        </section>

        {report && <section className="summary">
          <div><span>Матчей</span><strong>{report.summary.fixtures}</strong></div>
          <div><span>Выборка ≥5</span><strong>{report.summary.analyzed}</strong></div>
          <div><span>Сигналов</span><strong>{report.summary.signals}</strong></div>
          <div><span>API-квота</span><strong>{report.quota.used}<small>/{report.quota.limit}</small></strong></div>
        </section>}

        {error && <div className="error"><AlertCircle size={20} /><div><strong>Отчёт недоступен</strong><span>{error}</span></div></div>}
        {loading && !report ? <div className="loading"><Activity size={22} /> Загружаем отчёт…</div> : null}

        <div className="fixtures">
          {visible.map((analysis) => <FixtureCard key={analysis.fixture.id} analysis={analysis} timezone={report?.timezone ?? "UTC"} />)}
        </div>

        {!loading && report && report.summary.fixtures === 0 && (
          <div className="loading"><AlertCircle size={22} /> На эту дату матчи ещё не синхронизированы. Запусти <code>npm run morning</code>.</div>
        )}

        <footer className="data-attribution">
          Football data by <a href="https://footballdata.io/" target="_blank" rel="noreferrer">Footballdata.io</a>
        </footer>
      </div>
    </main>
  );
};
