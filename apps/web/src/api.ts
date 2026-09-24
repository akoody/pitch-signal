import type { DailyReport } from "@pitch-signal/core";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export const fetchDailyReport = async (date: string, signal?: AbortSignal): Promise<DailyReport> => {
  const requestInit: RequestInit = signal ? { signal } : {};
  const response = await fetch(`${apiBaseUrl}/api/v1/report?date=${encodeURIComponent(date)}`, requestInit);
  if (!response.ok) throw new Error(`Не удалось загрузить отчёт: HTTP ${response.status}`);
  return response.json() as Promise<DailyReport>;
};
