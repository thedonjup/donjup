const DAILY_REPORT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface DailyReportNavDates {
  previousDate?: string | null;
  nextDate?: string | null;
}

export interface DailyReportNavLinks {
  previousHref: string | null;
  nextHref: string | null;
}

export type DailyReportApiDate = "latest" | string;

export function isDailyReportDate(value: string): boolean {
  if (!DAILY_REPORT_DATE_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

export function parseDailyReportApiDate(value: string): DailyReportApiDate | null {
  if (value === "latest") return "latest";
  return isDailyReportDate(value) ? value : null;
}

function toDailyReportHref(date: string | null | undefined): string | null {
  return date && isDailyReportDate(date) ? `/daily/${date}` : null;
}

export function createDailyReportNavLinks({
  previousDate,
  nextDate,
}: DailyReportNavDates): DailyReportNavLinks {
  return {
    previousHref: toDailyReportHref(previousDate),
    nextHref: toDailyReportHref(nextDate),
  };
}
