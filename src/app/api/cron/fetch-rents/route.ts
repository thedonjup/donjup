import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { verifyCronAuth } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { aptRentTransactions, type NewAptRentTransaction } from "@/lib/db/schema";
import {
  fetchRentTransactions,
  type ParsedRentTransaction,
} from "@/lib/api/molit-rent";
import { delay } from "@/lib/api/molit";
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
  const errors: string[] = [];

  for (const dealYearMonth of dealYearMonths) {
    for (const [code, name] of regionEntries) {
      try {
        const transactions = await fetchRentTransactions(code, dealYearMonth);

        if (transactions.length === 0) {
          await delay(300);
          continue;
        }

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

  const cacheRevalidation = totalInserted > 0
    ? revalidatePublicDataCaches(
        [PUBLIC_DATA_CACHE_TAGS.APT_RENT_TRANSACTIONS],
        {
          route: "/api/cron/fetch-rents",
          totalInserted,
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
    regionsProcessed: regionEntries.length,
    monthsProcessed: dealYearMonths.length,
    errors: errors.length > 0 ? errors : undefined,
    cacheRevalidation,
  });
}
