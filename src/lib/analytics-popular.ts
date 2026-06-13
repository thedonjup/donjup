export function pageviewStartDate(days: number, now = new Date()): string {
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);
  return startDate.toISOString().split("T")[0];
}
