import { formatPrice } from "@/lib/format";
import {
  APT_OG_IMAGE_SIZE,
  createAptOgImageResponse,
  createFallbackAptOgImageResponse,
} from "@/lib/apt-og-image";
import {
  getCachedAptDetailComplexBySlug,
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
  params: Promise<{ govtComplexId: string; slug: string }>;
}) {
  const { govtComplexId: region, slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  try {
    const complex = await getCachedAptDetailComplexBySlug(region, decodedSlug);
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
    logDatabaseFailure("Apt slug OG image fallback used", error, {
      route: "/apt/[govtComplexId]/[slug]/opengraph-image",
      region,
      slug: decodedSlug,
    });
    return createFallbackAptOgImageResponse();
  }
}
