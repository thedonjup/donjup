import { unstable_cache } from "next/cache";
import { searchProducts } from "@/lib/api/coupang";
import { PUBLIC_DATA_CACHE_TAGS } from "@/lib/cache-tags";
import type { CoupangProductCategory } from "@/lib/coupang-products-params";

const COUPANG_PRODUCT_KEYWORDS: Record<CoupangProductCategory, string> = {
  appliance: "\uAC00\uC804\uC81C\uD488 \uC778\uAE30",
  book: "\uBD80\uB3D9\uC0B0 \uD22C\uC790 \uCC45",
  interior: "\uC778\uD14C\uB9AC\uC5B4 \uC18C\uD488",
  moving: "\uC774\uC0AC \uC900\uBE44\uBB3C",
};

export async function getCoupangProducts(
  category: CoupangProductCategory,
  limit: number
) {
  return searchProducts(COUPANG_PRODUCT_KEYWORDS[category], limit);
}

export const getCachedCoupangProducts = unstable_cache(
  getCoupangProducts,
  ["coupang-products-v1"],
  {
    revalidate: 3600,
    tags: [PUBLIC_DATA_CACHE_TAGS.COUPANG_PRODUCTS],
  }
);
