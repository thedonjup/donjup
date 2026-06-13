const KST_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function formatKstDate(now: Date = new Date()): string {
  const parts = KST_DATE_FORMATTER.formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Failed to format KST date");
  }

  return `${year}-${month}-${day}`;
}

export function formatKstDateDaysAgo(days: number, now: Date = new Date()): string {
  if (!Number.isInteger(days) || days < 0) {
    throw new Error("days must be a non-negative integer");
  }

  return formatKstDate(new Date(now.getTime() - days * ONE_DAY_MS));
}
