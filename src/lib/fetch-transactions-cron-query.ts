import { REGION_HIERARCHY } from "@/lib/constants/region-codes";
import {
  PROPERTY_TYPES,
  type PropertyType,
} from "@/lib/constants/property-types";

const ALL_SIDO_CODES = [
  "11",
  "26",
  "27",
  "28",
  "29",
  "30",
  "31",
  "36",
  "41",
  "42",
  "43",
  "44",
  "45",
  "46",
  "47",
  "48",
  "50",
];

const BATCH_GROUPS: Record<number, string[]> = {
  0: ["11", "26", "27"],
  1: ["28", "29", "30", "31", "36"],
  2: ["41"],
  3: ["42", "43", "44", "45"],
  4: ["46", "47", "48", "50"],
};

const VALID_PROPERTY_TYPES = new Set<number>(Object.values(PROPERTY_TYPES));
const DEFAULT_BATCH_MONTH_COUNT = 1;
const DEFAULT_FULL_RUN_MONTH_COUNT = 1;
const MAX_DEAL_MONTH_COUNT = 6;

export type FetchTransactionsCronQuery = {
  batch: number | null;
  isCronBatch: boolean;
  propertyType: PropertyType;
  monthCount: number;
  dealYearMonths: string[];
  sidoCodes: string[];
  regionEntries: [string, string][];
};

type ParsedFetchTransactionsCronQuery = {
  ok: true;
  query: FetchTransactionsCronQuery;
};

type InvalidFetchTransactionsCronQuery = {
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

function parsePropertyType(value: string | null): PropertyType | false {
  if (value === null) return PROPERTY_TYPES.APT;
  if (!/^\d+$/.test(value)) return false;

  const parsed = Number(value);
  return VALID_PROPERTY_TYPES.has(parsed) ? (parsed as PropertyType) : false;
}

function parseMonthCount(
  value: string | null,
  defaultValue: number
): number | false {
  if (value === null) return defaultValue;
  if (!/^\d+$/.test(value)) return false;

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > MAX_DEAL_MONTH_COUNT) {
    return false;
  }

  return parsed;
}

function getSidoCodesForBatch(batch: number | null): string[] {
  if (batch !== null) {
    return BATCH_GROUPS[batch] ?? [];
  }

  return ALL_SIDO_CODES;
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

export function getRecentDealYearMonths(
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

export function parseFetchTransactionsCronQuery(
  searchParams: URLSearchParams,
  now = new Date()
): ParsedFetchTransactionsCronQuery | InvalidFetchTransactionsCronQuery {
  const batchParam = singleParam(searchParams, "batch");
  if (!batchParam.ok) return batchParam;

  const typeParam = singleParam(searchParams, "type");
  if (!typeParam.ok) return typeParam;

  const monthsParam = singleParam(searchParams, "months");
  if (!monthsParam.ok) return monthsParam;

  const batch = parseBatch(batchParam.value);
  if (batch === false) {
    return { ok: false, error: "Invalid batch parameter" };
  }

  const propertyType = parsePropertyType(typeParam.value);
  if (propertyType === false) {
    return { ok: false, error: "Invalid property type parameter" };
  }

  const isCronBatch = batch !== null;
  const defaultMonthCount = isCronBatch
    ? DEFAULT_BATCH_MONTH_COUNT
    : DEFAULT_FULL_RUN_MONTH_COUNT;
  const monthCount = parseMonthCount(monthsParam.value, defaultMonthCount);
  if (monthCount === false) {
    return { ok: false, error: "Invalid months parameter" };
  }

  const sidoCodes = getSidoCodesForBatch(batch);

  return {
    ok: true,
    query: {
      batch,
      isCronBatch,
      propertyType,
      monthCount,
      dealYearMonths: getRecentDealYearMonths(monthCount, now),
      sidoCodes,
      regionEntries: getRegionEntries(sidoCodes),
    },
  };
}
