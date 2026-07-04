import type { DailyReport } from "@pitch-signal/core";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export const fetchDailyReport = async (date: string): Promise<DailyReport> => {
  const response = await fetch(`${apiBaseUrl}/api/v1/report?date=${encodeURIComponent(date)}`);
  if (!response.ok) throw new Error(`Не удалось загрузить отчёт: HTTP ${response.status}`);
  return response.json() as Promise<DailyReport>;
};
