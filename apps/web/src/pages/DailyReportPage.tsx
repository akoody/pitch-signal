import { useState } from "react";
import { Activity, AlertCircle, CalendarDays, RefreshCw } from "lucide-react";
import { localIsoDate } from "../date.js";
import { FixtureCard } from "../features/report/components/FixtureCard.js";
import { useDailyReport } from "../features/report/hooks/useDailyReport.js";

export const DailyReportPage = () => {
  const [date, setDate] = useState(localIsoDate());
  const { report, loading, error, refresh } = useDailyReport(date);

  return (
    <main>
      <header className="topbar">
        <div className="brand">
          <span className="brand__mark">PS</span>
          <div><strong>Pitch Signal</strong><small>Explainable football trends</small></div>
        </div>
        <div className="date-control">
          <CalendarDays size={17} />
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
      </header>

      <div className="page">
        <section className="hero">
          <div>
            <p className="eyebrow">Утренний обзор</p>
            <h1>Матчи и устойчивые<br />статистические тренды</h1>
            <p className="hero__copy">Сервис отделяет сильные повторяемые отклонения от шума. Это аналитика исторических данных, а не обещание результата.</p>
          </div>
          <button className="refresh" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw size={17} className={loading ? "spin" : ""} /> Обновить
          </button>
        </section>

        {report && (
          <section className="summary">
            <div><span>Матчей</span><strong>{report.summary.fixtures}</strong></div>
            <div><span>Выборка ≥5</span><strong>{report.summary.analyzed}</strong></div>
            <div><span>Сигналов</span><strong>{report.summary.signals}</strong></div>
            <div><span>API-квота</span><strong>{report.quota.used}<small>/{report.quota.limit}</small></strong></div>
          </section>
        )}

        {error && (
          <div className="error">
            <AlertCircle size={20} />
            <div><strong>Отчёт недоступен</strong><span>{error}</span></div>
          </div>
        )}
        {loading && !report && <div className="loading"><Activity size={22} /> Загружаем отчёт…</div>}

        <div className="fixtures">
          {report?.fixtures.map((analysis) => (
            <FixtureCard key={analysis.fixture.id} analysis={analysis} timezone={report.timezone} />
          ))}
        </div>

        {!loading && report && report.summary.fixtures === 0 && (
          <div className="loading">
            <AlertCircle size={22} /> На эту дату матчи ещё не синхронизированы. Запусти <code>npm run morning</code>.
          </div>
        )}

        <footer className="data-attribution">
          Football data by <a href="https://footballdata.io/" target="_blank" rel="noreferrer">Footballdata.io</a>
        </footer>
      </div>
    </main>
  );
};
