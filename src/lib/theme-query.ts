import { unstable_cache } from "next/cache";
import { asc, desc, eq, gte, lte } from "drizzle-orm";
import { PUBLIC_DATA_CACHE_TAGS } from "@/lib/cache-tags";
import { db } from "@/lib/db";
import { aptComplexes, aptTransactions } from "@/lib/db/schema";

export const THEME_IDS = [
  "reconstruction",
  "large-complex",
  "new-build",
  "crash-deals",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export type ThemeDefinition = {
  id: ThemeId;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  icon: string;
  color: string;
  bgColor: string;
};

export type ThemeResult = {
  id: string;
  apt_name: string;
  region_code: string;
  region_name?: string;
  slug?: string;
  govt_complex_id?: string | null;
  built_year?: number | null;
  total_units?: number | null;
  trade_price?: number;
  change_rate?: number | null;
  trade_date?: string;
};

type CrashDealRow = Omit<ThemeResult, "change_rate" | "slug" | "trade_price"> & {
  change_rate: number | string | null;
  complex_slug: string | null;
  trade_price: number | string;
};

const THEME_CACHE_REVALIDATE_SECONDS = 3600;
const RECONSTRUCTION_MIN_AGE_YEARS = 30;
const LARGE_COMPLEX_MIN_UNITS = 1000;
const NEW_BUILD_MIN_YEAR = 2020;
const CRASH_DEAL_MAX_CHANGE_RATE = "-20";

const COMPLEX_THEME_FIELDS = {
  id: aptComplexes.id,
  apt_name: aptComplexes.aptName,
  region_code: aptComplexes.regionCode,
  slug: aptComplexes.slug,
  govt_complex_id: aptComplexes.govtComplexId,
  built_year: aptComplexes.builtYear,
  total_units: aptComplexes.totalUnits,
};

export const THEME_DEFINITIONS: Record<ThemeId, ThemeDefinition> = {
  reconstruction: {
    id: "reconstruction",
    title: "재건축 임박",
    description: "준공 30년 이상, 재건축 가능성이 높은 단지",
    metaTitle: "재건축 임박 아파트 - 준공 30년 이상 단지 모음",
    metaDescription:
      "준공 30년 이상으로 재건축 가능성이 높은 전국 아파트 단지 목록. 재건축 투자 참고 자료를 확인하세요.",
    icon: "🏗️",
    color: "text-amber-600",
    bgColor: "theme-bg-amber",
  },
  "large-complex": {
    id: "large-complex",
    title: "대단지 (1,000세대+)",
    description: "1,000세대 이상 대규모 단지",
    metaTitle: "대단지 아파트 - 1,000세대 이상 대규모 단지",
    metaDescription:
      "전국 1,000세대 이상 대단지 아파트 목록. 대단지만의 인프라와 커뮤니티 장점을 비교해보세요.",
    icon: "🏢",
    color: "text-blue-600",
    bgColor: "theme-bg-blue",
  },
  "new-build": {
    id: "new-build",
    title: "신축 (2020년 이후)",
    description: "2020년 이후 준공된 신축 단지",
    metaTitle: "신축 아파트 - 2020년 이후 준공 단지",
    metaDescription:
      "2020년 이후 준공된 전국 신축 아파트 단지 목록. 최신 설계와 시설을 갖춘 단지를 확인하세요.",
    icon: "✨",
    color: "text-emerald-600",
    bgColor: "theme-bg-emerald",
  },
  "crash-deals": {
    id: "crash-deals",
    title: "폭락 매물",
    description: "최고가 대비 20% 이상 하락한 거래",
    metaTitle: "폭락 매물 - 최고가 대비 20% 이상 하락 거래",
    metaDescription:
      "역대 최고가 대비 20% 이상 하락한 전국 아파트 실거래 내역. 급매 타이밍을 확인하세요.",
    icon: "📉",
    color: "text-red-600",
    bgColor: "theme-bg-red",
  },
};

export function getThemeDefinition(id: string | null | undefined): ThemeDefinition | null {
  if (!id || !THEME_IDS.includes(id as ThemeId)) return null;

  return THEME_DEFINITIONS[id as ThemeId];
}

export function getThemeList(): ThemeDefinition[] {
  return THEME_IDS.map((id) => THEME_DEFINITIONS[id]);
}

function normalizeCrashDeals(rows: CrashDealRow[]): ThemeResult[] {
  return rows.map(({ change_rate, complex_slug, trade_price, ...row }) => ({
    ...row,
    change_rate: change_rate === null ? null : Number(change_rate),
    govt_complex_id: row.govt_complex_id ?? null,
    slug: complex_slug ?? undefined,
    trade_price: Number(trade_price),
  }));
}

async function fetchThemeResults(
  themeId: ThemeId,
  limit: number
): Promise<ThemeResult[]> {
  if (themeId === "reconstruction") {
    const cutoffYear = new Date().getFullYear() - RECONSTRUCTION_MIN_AGE_YEARS;

    return db.select(COMPLEX_THEME_FIELDS).from(aptComplexes)
      .where(lte(aptComplexes.builtYear, cutoffYear))
      .orderBy(asc(aptComplexes.builtYear))
      .limit(limit);
  }

  if (themeId === "large-complex") {
    return db.select(COMPLEX_THEME_FIELDS).from(aptComplexes)
      .where(gte(aptComplexes.totalUnits, LARGE_COMPLEX_MIN_UNITS))
      .orderBy(desc(aptComplexes.totalUnits))
      .limit(limit);
  }

  if (themeId === "new-build") {
    return db.select(COMPLEX_THEME_FIELDS).from(aptComplexes)
      .where(gte(aptComplexes.builtYear, NEW_BUILD_MIN_YEAR))
      .orderBy(desc(aptComplexes.builtYear))
      .limit(limit);
  }

  const rows = await db.select({
    id: aptTransactions.id,
    apt_name: aptTransactions.aptName,
    region_code: aptTransactions.regionCode,
    trade_price: aptTransactions.tradePrice,
    change_rate: aptTransactions.changeRate,
    trade_date: aptTransactions.tradeDate,
    complex_slug: aptComplexes.slug,
    govt_complex_id: aptComplexes.govtComplexId,
  }).from(aptTransactions)
    .leftJoin(aptComplexes, eq(aptTransactions.complexId, aptComplexes.id))
    .where(lte(aptTransactions.changeRate, CRASH_DEAL_MAX_CHANGE_RATE))
    .orderBy(asc(aptTransactions.changeRate))
    .limit(limit);

  return normalizeCrashDeals(rows);
}

export const getCachedThemeResults = unstable_cache(
  fetchThemeResults,
  ["theme-results-v1"],
  {
    revalidate: THEME_CACHE_REVALIDATE_SECONDS,
    tags: [
      PUBLIC_DATA_CACHE_TAGS.APT_COMPLEXES,
      PUBLIC_DATA_CACHE_TAGS.APT_TRANSACTIONS,
    ],
  },
);
