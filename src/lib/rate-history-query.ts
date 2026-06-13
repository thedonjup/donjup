import { parseBoundedPositiveInt, type PageParam } from "@/lib/pagination";

const MAX_RATE_TYPE_LENGTH = 64;
const RATE_TYPE_PATTERN = /^[\p{L}\p{N}_-]+$/u;

export function parseRateHistoryMonths(value: PageParam): number {
  return parseBoundedPositiveInt(value, {
    defaultValue: 12,
    max: 120,
  });
}

export function parseFinanceRateType(value: string | null | undefined): string | null {
  const trimmed = value?.trim();

  if (!trimmed || trimmed.length > MAX_RATE_TYPE_LENGTH) {
    return null;
  }

  return RATE_TYPE_PATTERN.test(trimmed) ? trimmed : null;
}
