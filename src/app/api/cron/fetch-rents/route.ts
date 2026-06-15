import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { verifyCronAuth } from "@/lib/api/auth";
import { db } from "@/lib/db";
import {
  aptComplexes,
  aptRentTransactions,
  type NewAptComplex,
  type NewAptRentTransaction,
} from "@/lib/db/schema";
import {
  fetchRentTransactions,
  type ParsedRentTransaction,
} from "@/lib/api/molit-rent";
import { delay } from "@/lib/api/molit";
import { makeSlug } from "@/lib/apt-url";
import { logger } from "@/lib/logger";
import { sendSlackAlert } from "@/lib/alert";
import { safeErrorListItem } from "@/lib/api/safe-error-response";
import { rentTransactionId } from "@/lib/rent-transaction-id";
import { cronDatabaseGuard } from "@/lib/api/cron-db-guard";
import { revalidatePublicDataCaches } from "@/lib/cache-revalidation";
import { PUBLIC_DATA_CACHE_TAGS } from "@/lib/cache-tags";
import {
  getRecentRentYearMonths,
  parseFetchRentsCronQuery,
} from "@/lib/fetch-rents-cron-query";

export { rentTransactionId };

export const maxDuration = 300;

const EXISTING_RENT_ID_QUERY_BATCH_SIZE = 500;
const APT_PROPERTY_TYPE = 1;
export { getRecentRentYearMonths };

function rentTransactionIdFromParsed(transaction: ParsedRentTransaction): string {
  return rentTransactionId({
    regionCode: transaction.regionCode,
    dongName: transaction.dongName,
    aptName: transaction.aptName,
    sizeSqm: transaction.sizeSqm,
    floor: transaction.floor,
    deposit: transaction.deposit,
    monthlyRent: transaction.monthlyRent,
    rentType: transaction.rentType,
    contractType: transaction.contractType,
    tradeDate: transaction.tradeDate,
    preDeposit: transaction.preDeposit,
    preMonthlyRent: transaction.preMonthlyRent,
  });
}

async function existingRentTransactionIds(ids: string[]): Promise<Set<string>> {
  const existingIds = new Set<string>();

  for (let index = 0; index < ids.length; index += EXISTING_RENT_ID_QUERY_BATCH_SIZE) {
    const chunk = ids.slice(index, index + EXISTING_RENT_ID_QUERY_BATCH_SIZE);
    if (chunk.length === 0) continue;

    const rows = await db
      .select({ id: aptRentTransactions.id })
      .from(aptRentTransactions)
      .where(inArray(aptRentTransactions.id, chunk))
      .limit(chunk.length);

    for (const row of rows) {
      existingIds.add(row.id);
    }
  }

  return existingIds;
}

function rentComplexSlug(transaction: ParsedRentTransaction): string {
  return makeSlug(
    transaction.regionCode,
    [transaction.dongName, transaction.aptName].filter(Boolean).join("-")
  );
}

function rentComplexKey(input: {
  regionCode: string;
  dongName: string | null;
  aptName: string;
}): string {
  return JSON.stringify([
    input.regionCode,
    input.dongName || "",
    input.aptName,
    APT_PROPERTY_TYPE,
  ]);
}

async function upsertRentOnlyComplexes(
  transactions: ParsedRentTransaction[],
  regionName: string
): Promise<number> {
  const candidates = new Map<string, NewAptComplex>();

  for (const transaction of transactions) {
    if (!transaction.aptName) continue;

    const key = rentComplexKey({
      regionCode: transaction.regionCode,
      dongName: transaction.dongName || null,
      aptName: transaction.aptName,
    });
    if (candidates.has(key)) continue;

    candidates.set(key, {
      regionCode: transaction.regionCode,
      regionName,
      dongName: transaction.dongName || null,
      aptName: transaction.aptName,
      builtYear: transaction.builtYear || null,
      slug: rentComplexSlug(transaction),
      govtComplexId: null,
      propertyType: APT_PROPERTY_TYPE,
    });
  }

  if (candidates.size === 0) return 0;

  const rows = [...candidates.values()];
  const aptNames = [...new Set(rows.map((row) => row.aptName))];
  const existingRows = await db
    .select({
      regionCode: aptComplexes.regionCode,
      dongName: aptComplexes.dongName,
      aptName: aptComplexes.aptName,
    })
    .from(aptComplexes)
    .where(
      and(
        eq(aptComplexes.regionCode, rows[0].regionCode),
        inArray(aptComplexes.aptName, aptNames)
      )
    )
    .limit(Math.max(aptNames.length * 3, 1));

  const existingKeys = new Set(existingRows.map(rentComplexKey));
  const missingRows = rows.filter((row) =>
    !existingKeys.has(rentComplexKey({
      regionCode: row.regionCode,
      dongName: row.dongName ?? null,
      aptName: row.aptName,
    }))
  );

  if (missingRows.length === 0) return 0;

  const inserted = await db
    .insert(aptComplexes)
    .values(missingRows)
    .onConflictDoNothing()
    .returning({ id: aptComplexes.id });

  return inserted.length;
}

export async function GET(request: Request) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const parsedQuery = parseFetchRentsCronQuery(searchParams);
  if (!parsedQuery.ok) {
    return NextResponse.json(
      { success: false, error: parsedQuery.error },
      { status: 400 }
    );
  }

  const databaseUnavailable = await cronDatabaseGuard("fetch-rents");
  if (databaseUnavailable) return databaseUnavailable;

  const {
    batch,
    isCronBatch,
    monthCount,
    dealYearMonths,
    sidoCodes,
    regionEntries,
  } = parsedQuery.query;

  let totalInserted = 0;
  let totalInsertedComplexes = 0;
  const errors: string[] = [];

  for (const dealYearMonth of dealYearMonths) {
    for (const [code, name] of regionEntries) {
      try {
        const transactions = await fetchRentTransactions(code, dealYearMonth);

        if (transactions.length === 0) {
          await delay(300);
          continue;
        }

        totalInsertedComplexes += await upsertRentOnlyComplexes(transactions, name);

        const transactionIds = transactions.map(rentTransactionIdFromParsed);
        const existingIds = await existingRentTransactionIds(transactionIds);
        const newTransactions: NewAptRentTransaction[] = [];

        for (const t of transactions) {
          const id = rentTransactionIdFromParsed(t);

          if (existingIds.has(id)) continue;

          newTransactions.push({
            id,
            regionCode: t.regionCode,
            regionName: `${name} ${t.dongName}`,
            aptName: t.aptName,
            sizeSqm: t.sizeSqm !== undefined ? String(t.sizeSqm) : null,
            floor: t.floor,
            deposit: t.deposit,
            monthlyRent: t.monthlyRent,
            rentType: t.rentType,
            contractType: t.contractType || null,
            tradeDate: t.tradeDate,
            preDeposit: t.preDeposit,
            preMonthlyRent: t.preMonthlyRent,
            rawData: t.rawData,
          });
          existingIds.add(id);
        }

        if (newTransactions.length === 0) {
          await delay(300);
          continue;
        }

        const inserted = await db
          .insert(aptRentTransactions)
          .values(newTransactions)
          .onConflictDoNothing()
          .returning({ id: aptRentTransactions.id });

        totalInserted += inserted.length;

        await delay(300);
      } catch (e) {
        errors.push(safeErrorListItem(`${name}(${dealYearMonth})`, e));
      }
    }
  }

  if (errors.length > 0) {
    logger.error("Fetch-rents had errors", {
      errorCount: errors.length,
      cron: "fetch-rents",
    });
    await sendSlackAlert(`[fetch-rents] ${errors.length} errors: ${errors.slice(0, 3).join(", ")}`);
  }

  const cacheTags = [
    ...(totalInserted > 0 ? [PUBLIC_DATA_CACHE_TAGS.APT_RENT_TRANSACTIONS] : []),
    ...(totalInsertedComplexes > 0 ? [PUBLIC_DATA_CACHE_TAGS.APT_COMPLEXES] : []),
  ];
  const cacheRevalidation = cacheTags.length > 0
    ? revalidatePublicDataCaches(
        cacheTags,
        {
          route: "/api/cron/fetch-rents",
          totalInserted,
          totalInsertedComplexes,
        }
      )
    : undefined;

  return NextResponse.json({
    success: true,
    batch: isCronBatch ? batch : "all",
    sidoCodes,
    monthCount,
    dealYearMonths,
    totalInserted,
    totalInsertedComplexes,
    regionsProcessed: regionEntries.length,
    monthsProcessed: dealYearMonths.length,
    errors: errors.length > 0 ? errors : undefined,
    cacheRevalidation,
  });
}
