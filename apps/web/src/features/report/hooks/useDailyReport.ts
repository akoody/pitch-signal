import { useCallback, useEffect, useRef, useState } from "react";
import type { DailyReport } from "@pitch-signal/core";
import { fetchDailyReport } from "../../../api.js";

export const useDailyReport = (date: string) => {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    const currentRequestId = ++requestId.current;

    setLoading(true);
    setError(null);
    try {
      const nextReport = await fetchDailyReport(date, controller.signal);
      if (requestId.current === currentRequestId) setReport(nextReport);
    } catch (caught) {
      if (!controller.signal.aborted && requestId.current === currentRequestId) {
        setError(caught instanceof Error ? caught.message : "Неизвестная ошибка");
      }
    } finally {
      if (!controller.signal.aborted && requestId.current === currentRequestId) {
        setLoading(false);
        activeRequest.current = null;
      }
    }
  }, [date]);

  useEffect(() => {
    void load();
    return () => activeRequest.current?.abort();
  }, [load]);

  return { report, loading, error, refresh: load };
};
