import { NextResponse } from "next/server";
import { publicApiCacheHeaders } from "@/lib/api/cache-headers";
import { getCachedCoupangProducts } from "@/lib/coupang-products-query";
import { parseCoupangProductCategory } from "@/lib/coupang-products-params";
import { logger } from "@/lib/logger";
import { parseBoundedPositiveInt } from "@/lib/pagination";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = parseCoupangProductCategory(searchParams.get("category"));
    const limit = parseBoundedPositiveInt(searchParams.get("limit"), {
      defaultValue: 4,
      max: 10,
    });

    const products = await getCachedCoupangProducts(category, limit);

    return NextResponse.json(
      { products },
      { headers: publicApiCacheHeaders({ sharedMaxAge: 3600 }) }
    );
  } catch (error) {
    logger.error("Coupang products API failed", {
      error,
      route: "/api/coupang/products",
    });
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
