import type { FixtureAnalysis, HistoricalObservation, MetricKey } from "@pitch-signal/core";
import { formatScore } from "../report-format.js";

const compactStat = (match: HistoricalObservation, metric: MetricKey): string =>
  formatScore(match.team[metric], match.opponent[metric]);

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
            <span>{formatScore(match.teamGoals, match.opponentGoals)}</span>
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

export const MatchHistory = ({ analysis }: { analysis: FixtureAnalysis }) => (
  <details className="history-details">
    <summary>Подробно по последним матчам <span>счёт и статистика команда:соперник</span></summary>
    <div className="halves-note"><strong>По таймам:</strong> бесплатный источник предоставляет голы. Угловые, удары и фолы доступны только за весь матч.</div>
    <div className="history-grid">
      <HistoryTable teamName={analysis.fixture.homeTeam.name} matches={analysis.history.home} />
      <HistoryTable teamName={analysis.fixture.awayTeam.name} matches={analysis.history.away} />
    </div>
  </details>
);
