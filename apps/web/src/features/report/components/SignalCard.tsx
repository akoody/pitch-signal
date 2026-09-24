import type { MatchSignal } from "@pitch-signal/core";
import { confidenceLabels } from "../report-format.js";

export const SignalCard = ({ signal }: { signal: MatchSignal }) => (
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
