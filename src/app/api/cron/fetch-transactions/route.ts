import { NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { aptTransactions, aptComplexes } from "@/lib/db/schema";
import { desc, eq, and, inArray } from "drizzle-orm";
import { fetchTransactions, delay } from "@/lib/api/molit";
import {
  fetchMultiTransactions,
  delay as multiDelay,
} from "@/lib/api/molit-multi";
import { calcDropLevel } from "@/lib/constants/drop-level";
import { makeSlug } from "@/lib/apt-url";
import { PROPERTY_TYPES, type PropertyType } from "@/lib/constants/property-types";
import { safeErrorListItem } from "@/lib/api/safe-error-response";
import { cronDatabaseGuard } from "@/lib/api/cron-db-guard";
import { revalidatePublicDataCaches } from "@/lib/cache-revalidation";
import { PUBLIC_DATA_CACHE_TAGS } from "@/lib/cache-tags";
import {
  getRecentDealYearMonths,
  parseFetchTransactionsCronQuery,
} from "@/lib/fetch-transactions-cron-query";

export const maxDuration = 300;

const EXISTING_ID_QUERY_BATCH_SIZE = 500;

interface RecentTradePriceRow {
  tradePrice: number;
}

type ComplexIdCache = Map<string, string | null>;
type RecentTradePriceCache = Map<string, RecentTradePriceRow[]>;

export function normalizeGovtComplexId(
  regionCode: string,
  aptSeq?: string | null
): string | null {
  const trimmed = aptSeq?.trim();
  if (!trimmed) return null;

  const prefix = `${regionCode}-`;
  const cleanSeq = trimmed.startsWith(prefix)
    ? trimmed.slice(prefix.length)
    : trimmed;

  return `${regionCode}-${cleanSeq}`;
}

export { getRecentDealYearMonths };

export function transactionId(input: {
  regionCode: string;
  aptName: string;
  sizeSqm: number;
  tradeDate: string;
  tradePrice: number;
  floor: number;
}): string {
  return `${input.regionCode}-${input.aptName}-${input.sizeSqm}-${input.tradeDate}-${input.tradePrice}-${input.floor}`;
}

async function existingTransactionIds(ids: string[]): Promise<Set<string>> {
  const existingIds = new Set<string>();

  for (let index = 0; index < ids.length; index += EXISTING_ID_QUERY_BATCH_SIZE) {
    const chunk = ids.slice(index, index + EXISTING_ID_QUERY_BATCH_SIZE);
    if (chunk.length === 0) continue;

    const rows = await db
      .select({ id: aptTransactions.id })
      .from(aptTransactions)
      .where(inArray(aptTransactions.id, chunk))
      .limit(chunk.length);

    for (const row of rows) {
      existingIds.add(row.id);
    }
  }

  return existingIds;
}

function complexGovtCacheKey(govtComplexId: string | null): string | null {
  return govtComplexId ? `govt:${govtComplexId}` : null;
}

function complexNameCacheKey(input: {
  regionCode: string;
  aptName: string;
  propertyType: PropertyType;
}): string {
  return `name:${input.regionCode}:${input.propertyType}:${input.aptName}`;
}

async function resolveComplexIdCached(
  cache: ComplexIdCache,
  input: {
    regionCode: string;
    regionName: string;
    dongName: string;
    aptName: string;
    builtYear: number;
    govtComplexId: string | null;
    propertyType: PropertyType;
  }
): Promise<string | null> {
  const govtKey = complexGovtCacheKey(input.govtComplexId);
  const nameKey = complexNameCacheKey(input);

  if (govtKey && cache.has(govtKey)) return cache.get(govtKey) ?? null;
  if (cache.has(nameKey)) return cache.get(nameKey) ?? null;

  const complexId = await resolveComplexId(input);
  cache.set(nameKey, complexId);
  if (govtKey) cache.set(govtKey, complexId);

  return complexId;
}

function recentTradePriceCacheKey(input: {
  regionCode: string;
  aptName: string;
  sizeSqm: number;
}): string {
  return `${input.regionCode}:${input.aptName}:${input.sizeSqm}`;
}

async function getRecentTradePricesCached(
  cache: RecentTradePriceCache,
  input: {
    regionCode: string;
    aptName: string;
    sizeSqm: number;
  }
): Promise<RecentTradePriceRow[]> {
  const key = recentTradePriceCacheKey(input);
  const cached = cache.get(key);
  if (cached) return cached;

  const rows = await db
    .select({ tradePrice: aptTransactions.tradePrice })
    .from(aptTransactions)
    .where(
      and(
        eq(aptTransactions.aptName, input.aptName),
        eq(aptTransactions.regionCode, input.regionCode),
        eq(aptTransactions.sizeSqm, String(input.sizeSqm)),
      )
    )
    .orderBy(desc(aptTransactions.tradeDate), desc(aptTransactions.id));

  cache.set(key, rows);
  return rows;
}

function appendRecentTradePrice(
  cache: RecentTradePriceCache,
  input: {
    regionCode: string;
    aptName: string;
    sizeSqm: number;
  },
  tradePrice: number
) {
  const key = recentTradePriceCacheKey(input);
  const rows = cache.get(key);
  if (rows) {
    rows.push({ tradePrice });
  }
}

async function resolveComplexId(input: {
  regionCode: string;
  regionName: string;
  dongName: string;
  aptName: string;
  builtYear: number;
  govtComplexId: string | null;
  propertyType: PropertyType;
}): Promise<string | null> {
  if (input.govtComplexId) {
    const byGovtId = await db
      .select({ id: aptComplexes.id })
      .from(aptComplexes)
      .where(eq(aptComplexes.govtComplexId, input.govtComplexId))
      .limit(1);

    if (byGovtId[0]) return byGovtId[0].id;
  }

  const byName = await db
    .select({
      id: aptComplexes.id,
      govtComplexId: aptComplexes.govtComplexId,
    })
    .from(aptComplexes)
    .where(
      and(
        eq(aptComplexes.regionCode, input.regionCode),
        eq(aptComplexes.aptName, input.aptName),
      )
    )
    .limit(1);

  if (byName[0]) {
    if (input.govtComplexId && !byName[0].govtComplexId) {
      await db
        .update(aptComplexes)
        .set({
          govtComplexId: input.govtComplexId,
          propertyType: input.propertyType,
        })
        .where(eq(aptComplexes.id, byName[0].id));
    }

    return byName[0].id;
  }

  const slug = input.govtComplexId ?? makeSlug(input.regionCode, input.aptName);

  await db.insert(aptComplexes).values({
    regionCode: input.regionCode,
    regionName: input.regionName,
    dongName: input.dongName,
    aptName: input.aptName,
    builtYear: input.builtYear || null,
    slug,
    govtComplexId: input.govtComplexId,
    propertyType: input.propertyType,
  }).onConflictDoNothing();

  const createdRows = await db
    .select({ id: aptComplexes.id })
    .from(aptComplexes)
    .where(
      input.govtComplexId
        ? eq(aptComplexes.govtComplexId, input.govtComplexId)
        : and(
            eq(aptComplexes.regionCode, input.regionCode),
            eq(aptComplexes.aptName, input.aptName),
          )
    )
    .limit(1);

  return createdRows[0]?.id ?? null;
}

export async function GET(request: Request) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const parsedQuery = parseFetchTransactionsCronQuery(searchParams);
  if (!parsedQuery.ok) {
    return NextResponse.json(
      { success: false, error: parsedQuery.error },
      { status: 400 }
    );
  }

  const databaseUnavailable = await cronDatabaseGuard("fetch-transactions");
  if (databaseUnavailable) return databaseUnavailable;

  const {
    batch,
    isCronBatch,
    propertyType,
    monthCount,
    dealYearMonths,
    sidoCodes,
    regionEntries,
  } = parsedQuery.query;

  let totalInserted = 0;
  let totalNewHigh = 0;
  let totalSignificantDrop = 0;
  const errors: string[] = [];
  const complexIdCache: ComplexIdCache = new Map();
  const recentTradePriceCache: RecentTradePriceCache = new Map();

  for (const [regionCode, regionName] of regionEntries) {
    for (const dealYearMonth of dealYearMonths) {
      try {
        const transactions = propertyType === PROPERTY_TYPES.APT
          ? await fetchTransactions(regionCode, dealYearMonth)
          : await fetchMultiTransactions(propertyType, regionCode, dealYearMonth);
        if (transactions.length === 0) continue;

        const txIds = transactions.map((tx) => transactionId({
          regionCode,
          aptName: tx.aptName,
          sizeSqm: tx.sizeSqm,
          tradeDate: tx.tradeDate,
          tradePrice: tx.tradePrice,
          floor: tx.floor,
        }));
        const existingIds = await existingTransactionIds(txIds);

        for (const tx of transactions) {
          const txId = transactionId({
            regionCode,
            aptName: tx.aptName,
            sizeSqm: tx.sizeSqm,
            tradeDate: tx.tradeDate,
            tradePrice: tx.tradePrice,
            floor: tx.floor,
          });

          if (existingIds.has(txId)) continue;

          const recentTrades = await getRecentTradePricesCached(
            recentTradePriceCache,
            {
              regionCode,
              aptName: tx.aptName,
              sizeSqm: tx.sizeSqm,
            }
          );

          let highestPrice = tx.tradePrice;
          for (const rt of recentTrades) {
            highestPrice = Math.max(highestPrice, rt.tradePrice);
          }

          let changeRate: number | null = null;
          let isNewHigh = false;
          let isSignificantDrop = false;

          if (recentTrades.length > 0) {
            const prevHighest = Math.max(...recentTrades.map((r) => r.tradePrice));
            if (tx.tradePrice > prevHighest) {
              isNewHigh = true;
              highestPrice = tx.tradePrice;
            } else {
              highestPrice = prevHighest;
              changeRate = parseFloat(
                (((tx.tradePrice - prevHighest) / prevHighest) * 100).toFixed(2)
              );
              isSignificantDrop = changeRate <= -15;
            }
          }

          const dropLevel = calcDropLevel(changeRate);
          const aptSeq = "aptSeq" in tx ? tx.aptSeq : null;
          const govtComplexId = normalizeGovtComplexId(regionCode, aptSeq);
          const complexId = await resolveComplexIdCached(complexIdCache, {
            regionCode,
            regionName,
            dongName: tx.dongName,
            aptName: tx.aptName,
            builtYear: tx.builtYear,
            govtComplexId,
            propertyType,
          });

          await db.insert(aptTransactions).values({
            id: txId,
            complexId,
            regionCode,
            regionName,
            aptName: tx.aptName,
            sizeSqm: String(tx.sizeSqm),
            tradePrice: tx.tradePrice,
            tradeDate: tx.tradeDate,
            floor: tx.floor,
            dealType: tx.dealType,
            highestPrice,
            changeRate: changeRate !== null ? String(changeRate) : null,
            isNewHigh,
            isSignificantDrop,
            dropLevel,
            propertyType,
          });
          existingIds.add(txId);
          appendRecentTradePrice(
            recentTradePriceCache,
            {
              regionCode,
              aptName: tx.aptName,
              sizeSqm: tx.sizeSqm,
            },
            tx.tradePrice
          );

          totalInserted++;
          if (isNewHigh) totalNewHigh++;
          if (isSignificantDrop) totalSignificantDrop++;
        }

        await (propertyType === PROPERTY_TYPES.APT ? delay(300) : multiDelay(300));
      } catch (e) {
        errors.push(safeErrorListItem(`${regionName} (${dealYearMonth})`, e));
      }
    }
  }

  const cacheRevalidation = totalInserted > 0
    ? revalidatePublicDataCaches(
        [
          PUBLIC_DATA_CACHE_TAGS.APT_TRANSACTIONS,
          PUBLIC_DATA_CACHE_TAGS.APT_COMPLEXES,
        ],
        {
          route: "/api/cron/fetch-transactions",
          totalInserted,
        }
      )
    : undefined;

  return NextResponse.json({
    success: true,
    batch: isCronBatch ? batch : "all",
    propertyType,
    sidoCodes,
    monthCount,
    dealYearMonths,
    totalInserted,
    totalNewHigh,
    totalSignificantDrop,
    regionsProcessed: regionEntries.length,
    monthsProcessed: dealYearMonths.length,
    errors: errors.length > 0 ? errors : undefined,
    cacheRevalidation,
  });
}
