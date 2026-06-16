import { NextResponse } from "next/server";
import { publicApiCacheHeaders } from "@/lib/api/cache-headers";
import { parseAptLookupId } from "@/lib/apt-lookup";
import {
  getCachedAptDetailComplexByLookupId,
  getCachedAptDetailRentTransactions,
  getCachedAptDetailSaleTransactions,
} from "@/lib/apt-detail-query";
import { publicDatabaseError } from "@/lib/db/errors";
import { logDatabaseFailure } from "@/lib/db/logging";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = parseAptLookupId(rawId);

  if (!id) {
    return NextResponse.json({ error: "Invalid apt id" }, { status: 400 });
  }

  try {
    const complex = await getCachedAptDetailComplexByLookupId(id);

    if (!complex) {
      return NextResponse.json({ error: "단지를 찾을 수 없습니다." }, { status: 404 });
    }

    const [saleTransactions, rentTransactions] = await Promise.all([
      getCachedAptDetailSaleTransactions(
        complex.id,
        complex.aptName,
        complex.regionCode,
        complex.propertyType,
        complex.identityId,
      ),
      getCachedAptDetailRentTransactions(
        complex.aptName,
        complex.regionCode,
        complex.identityId,
        complex.id,
      ),
    ]);

    const transactions = saleTransactions.map((transaction) => ({
      id: transaction.id,
      trade_price: transaction.trade_price,
      trade_date: transaction.trade_date,
      size_sqm: transaction.size_sqm,
      floor: transaction.floor,
      highest_price: transaction.highest_price,
      change_rate: transaction.change_rate,
    }));
    const rents = rentTransactions.slice(0, 20).map((rent) => ({
      id: rent.id,
      deposit: rent.deposit,
      monthly_rent: rent.monthly_rent,
      rent_type: rent.rent_type,
      trade_date: rent.trade_date,
    }));

    return NextResponse.json(
      {
        complex: {
          id: complex.id,
          apt_name: complex.aptName,
          region_code: complex.regionCode,
          region_name: complex.regionName,
          dong_name: complex.dongName,
          built_year: complex.builtYear,
          total_units: complex.totalUnits,
          slug: complex.slug,
          govt_complex_id: complex.govtComplexId,
          identity_id: complex.identityId,
        },
        transactions,
        rents,
      },
      { headers: publicApiCacheHeaders() }
    );
  } catch (e) {
    const publicError = publicDatabaseError(e);

    logDatabaseFailure("Failed to fetch apt detail API", e, {
      route: "/api/apt/[id]",
      id,
    });

    return NextResponse.json(
      { error: publicError.message, code: publicError.code },
      { status: publicError.status }
    );
  }
}
