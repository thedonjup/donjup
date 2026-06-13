import { isDailyReportDate } from "@/lib/daily-report-nav";
import { parseBoundedPositiveInt } from "@/lib/pagination";

const DEFAULT_SEEDING_LIMIT = 50;
const MAX_SEEDING_LIMIT = 100;

const SEEDING_PLATFORMS = [
  "dc_fm",
  "naver_cafe",
  "clien",
  "kakao_chat",
  "blog",
] as const;

export type SeedingPlatform = (typeof SEEDING_PLATFORMS)[number];

interface ParsedSeedingQueueQuery {
  ok: true;
  date: string;
  platform: SeedingPlatform | null;
  limit: number;
}

interface InvalidSeedingQueueQuery {
  ok: false;
  error: string;
}

const SEEDING_PLATFORM_SET = new Set<string>(SEEDING_PLATFORMS);

function isoDate(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}

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

function parsePlatform(value: string | null): SeedingPlatform | null | false {
  if (!value) return null;
  return SEEDING_PLATFORM_SET.has(value) ? (value as SeedingPlatform) : false;
}

export function parseSeedingQueueQuery(
  searchParams: URLSearchParams,
  now = new Date()
): ParsedSeedingQueueQuery | InvalidSeedingQueueQuery {
  const dateParam = singleParam(searchParams, "date");
  if (!dateParam.ok) return dateParam;

  const platformParam = singleParam(searchParams, "platform");
  if (!platformParam.ok) return platformParam;

  const limitParam = singleParam(searchParams, "limit");
  if (!limitParam.ok) return limitParam;

  const date = dateParam.value ?? isoDate(now);
  if (!isDailyReportDate(date)) {
    return { ok: false, error: "Invalid report date" };
  }

  const platform = parsePlatform(platformParam.value);
  if (platform === false) {
    return { ok: false, error: "Invalid seeding platform" };
  }

  return {
    ok: true,
    date,
    platform,
    limit: parseBoundedPositiveInt(limitParam.value, {
      defaultValue: DEFAULT_SEEDING_LIMIT,
      max: MAX_SEEDING_LIMIT,
    }),
  };
}
