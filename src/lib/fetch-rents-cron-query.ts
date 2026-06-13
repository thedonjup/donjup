import { REGION_HIERARCHY } from "@/lib/constants/region-codes";

const BATCH_GROUPS: Record<number, string[]> = {
  0: ["11", "26", "27"],
  1: ["28", "29", "30", "31", "36"],
  2: ["41"],
  3: ["42", "43", "44", "45"],
  4: ["46", "47", "48", "50"],
};

const DEFAULT_RENT_MONTH_COUNT = 1;
const MAX_RENT_MONTH_COUNT = 6;

export type FetchRentsCronQuery = {
  batch: number | null;
  isCronBatch: boolean;
  monthCount: number;
  dealYearMonths: string[];
  sidoCodes: string[];
  regionEntries: [string, string][];
};

type ParsedFetchRentsCronQuery = {
  ok: true;
  query: FetchRentsCronQuery;
};

type InvalidFetchRentsCronQuery = {
  ok: false;
  error: string;
};

function singleParam(
  searchParams: URLSearchParams,
  key: string
): { ok: true; value: string | null } | { ok: false; error: string } {
  const values = searchParams.getAll(key);
  if (values.length > 1) {
    return { ok: false, error: `Duplicate ${key} parameter` };
  }

  return { ok: true, value: values[0] ?? null };
}

function parseBatch(value: string | null): number | null | false {
  if (value === null) return null;
  if (!/^\d+$/.test(value)) return false;

  const batch = Number(value);
  return Object.hasOwn(BATCH_GROUPS, batch) ? batch : false;
}

function parseMonthCount(value: string | null): number | false {
  if (value === null) return DEFAULT_RENT_MONTH_COUNT;
  if (!/^\d+$/.test(value)) return false;

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > MAX_RENT_MONTH_COUNT) {
    return false;
  }

  return parsed;
}

function getSidoCodesForBatch(batch: number | null): string[] {
  if (batch !== null) {
    return BATCH_GROUPS[batch] ?? [];
  }

  return Object.keys(REGION_HIERARCHY);
}

function getRegionEntries(sidoCodes: string[]): [string, string][] {
  const entries: [string, string][] = [];

  for (const sidoCode of sidoCodes) {
    const sido = REGION_HIERARCHY[sidoCode];
    if (!sido) continue;

    for (const [code, sigunguName] of Object.entries(sido.sigungu)) {
      entries.push([code, `${sido.shortName} ${sigunguName}`]);
    }
  }

  return entries;
}

function getSeoulYearMonth(baseDate: Date): { year: number; monthIndex: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(baseDate);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);

  return { year, monthIndex: month - 1 };
}

export function getRecentRentYearMonths(
  count: number,
  baseDate = new Date()
): string[] {
  const { year, monthIndex } = getSeoulYearMonth(baseDate);

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, monthIndex - index, 1));
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");

    return `${date.getUTCFullYear()}${month}`;
  });
}

export function parseFetchRentsCronQuery(
  searchParams: URLSearchParams,
  now = new Date()
): ParsedFetchRentsCronQuery | InvalidFetchRentsCronQuery {
  const batchParam = singleParam(searchParams, "batch");
  if (!batchParam.ok) return batchParam;

  const monthsParam = singleParam(searchParams, "months");
  if (!monthsParam.ok) return monthsParam;

  const batch = parseBatch(batchParam.value);
  if (batch === false) {
    return { ok: false, error: "Invalid batch parameter" };
  }

  const monthCount = parseMonthCount(monthsParam.value);
  if (monthCount === false) {
    return { ok: false, error: "Invalid months parameter" };
  }

  const sidoCodes = getSidoCodesForBatch(batch);

  return {
    ok: true,
    query: {
      batch,
      isCronBatch: batch !== null,
      monthCount,
      dealYearMonths: getRecentRentYearMonths(monthCount, now),
      sidoCodes,
      regionEntries: getRegionEntries(sidoCodes),
    },
  };
}
