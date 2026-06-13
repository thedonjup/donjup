export type PageParam = string | string[] | null | undefined;

interface BoundedPositiveIntOptions {
  defaultValue: number;
  max?: number;
}

export function firstParam(value: PageParam): string | undefined {
  const firstValue = Array.isArray(value) ? value[0] : value;
  return firstValue ?? undefined;
}

export function parsePositivePage(value: PageParam): number {
  const rawValue = firstParam(value);
  if (!rawValue || !/^\d+$/.test(rawValue)) {
    return 1;
  }

  const page = Number(rawValue);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function pageOffset(page: number, pageSize: number): number {
  if (!Number.isSafeInteger(page) || page < 1) {
    return 0;
  }

  return (page - 1) * pageSize;
}

export function parseBoundedPositiveInt(
  value: PageParam,
  { defaultValue, max }: BoundedPositiveIntOptions
): number {
  const rawValue = firstParam(value);
  if (!rawValue || !/^\d+$/.test(rawValue)) {
    return defaultValue;
  }

  const parsed = Number(rawValue);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return defaultValue;
  }

  return max ? Math.min(parsed, max) : parsed;
}
