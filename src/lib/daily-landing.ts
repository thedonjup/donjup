export interface DailyArchiveReport {
  report_date: string;
  top_drops?: unknown;
  top_highs?: unknown;
}

export interface DailyReportSignalInput {
  top_drops?: unknown;
  top_highs?: unknown;
  rate_summary?: unknown;
  volume_summary?: unknown;
}

export function latestDailyReportDate(rows: DailyArchiveReport[]): string | null {
  return rows.reduce<string | null>((latest, row) => {
    if (!latest || row.report_date > latest) return row.report_date;
    return latest;
  }, null);
}

export function dailyArchivePageLabel(currentPage: number, totalPages: number): string {
  const safeCurrent = Number.isSafeInteger(currentPage) && currentPage > 0 ? currentPage : 1;
  const safeTotal = Number.isSafeInteger(totalPages) && totalPages > 0 ? totalPages : 1;
  return `${Math.min(safeCurrent, safeTotal)} / ${safeTotal}페이지`;
}

export function countDailyReportSignals(report: DailyReportSignalInput): {
  dropCount: number;
  highCount: number;
  rateCount: number;
  volumeCount: number;
} {
  return {
    dropCount: Array.isArray(report.top_drops) ? report.top_drops.length : 0,
    highCount: Array.isArray(report.top_highs) ? report.top_highs.length : 0,
    rateCount: Array.isArray(report.rate_summary) ? report.rate_summary.length : 0,
    volumeCount: Array.isArray(report.volume_summary) ? report.volume_summary.length : 0,
  };
}

export function totalArchiveSignals(rows: DailyArchiveReport[]): number {
  return rows.reduce((sum, row) => {
    const signals = countDailyReportSignals(row);
    return sum + signals.dropCount + signals.highCount;
  }, 0);
}

export function formatDailyDateLabel(date: string | null): string {
  if (!date) return "-";
  return date.replaceAll("-", ".");
}
