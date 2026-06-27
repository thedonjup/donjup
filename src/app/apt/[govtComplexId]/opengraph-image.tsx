import { formatPrice } from "@/lib/format";
import {
  APT_OG_IMAGE_SIZE,
  createAptOgImageResponse,
  createFallbackAptOgImageResponse,
} from "@/lib/apt-og-image";
import {
  getCachedAptDetailComplexByGovtId,
  getCachedAptDetailSaleTransactions,
} from "@/lib/apt-detail-query";
import { logDatabaseFailure } from "@/lib/db/logging";

export const runtime = "nodejs";
export const alt = "돈줍 아파트 실거래가";
export const size = APT_OG_IMAGE_SIZE;
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: Promise<{ govtComplexId: string }>;
}) {
  const { govtComplexId } = await params;

  try {
    const complex = await getCachedAptDetailComplexByGovtId(govtComplexId);
    const latest = complex
      ? (await getCachedAptDetailSaleTransactions(
        complex.id,
        complex.aptName,
        complex.regionCode,
        complex.propertyType,
        complex.identityId,
      ))[0] ?? null
      : null;

    return createAptOgImageResponse({
      aptName: complex?.aptName,
      regionName: complex?.regionName,
      price: latest?.trade_price ? formatPrice(latest.trade_price) : "-",
      rate: latest?.change_rate ?? null,
    });
  } catch (error) {
    logDatabaseFailure("Apt OG image fallback used", error, {
      route: "/apt/[govtComplexId]/opengraph-image",
      govtComplexId,
    });
    return createFallbackAptOgImageResponse();
  }
}
