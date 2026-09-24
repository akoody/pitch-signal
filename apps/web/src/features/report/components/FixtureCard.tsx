import { AlertCircle, Database, ShieldCheck } from "lucide-react";
import type { FixtureAnalysis, MatchSignal } from "@pitch-signal/core";
import { formatKickoff } from "../../../date.js";
import { MatchHistory } from "./MatchHistory.js";
import { SignalCard } from "./SignalCard.js";
import { TrendOverview } from "./TrendOverview.js";

export const FixtureCard = ({ analysis, timezone }: { analysis: FixtureAnalysis; timezone: string }) => (
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
      <div className="empty-state">
        <AlertCircle size={18} /> {analysis.coverage.reason}. Статистика ниже доступна для просмотра, но ещё не считается сильным сигналом.
      </div>
    )}
    <TrendOverview analysis={analysis} />
    <MatchHistory analysis={analysis} />
    {analysis.coverage.sufficient && (analysis.signals.length === 0 ? (
      <div className="empty-state"><ShieldCheck size={18} /> Сильных устойчивых отклонений не найдено</div>
    ) : (
      <div className="signal-grid">
        {analysis.signals.map((signal: MatchSignal) => (
          <SignalCard key={`${signal.subject}-${signal.metric}-${signal.direction}`} signal={signal} />
        ))}
      </div>
    ))}
  </section>
);
