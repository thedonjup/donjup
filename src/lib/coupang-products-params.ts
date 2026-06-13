export const COUPANG_PRODUCT_CATEGORIES = [
  "book",
  "interior",
  "moving",
  "appliance",
] as const;

export type CoupangProductCategory =
  (typeof COUPANG_PRODUCT_CATEGORIES)[number];

const COUPANG_PRODUCT_CATEGORY_SET = new Set<string>(
  COUPANG_PRODUCT_CATEGORIES
);

export function parseCoupangProductCategory(
  value: string | null | undefined
): CoupangProductCategory {
  const category = value?.trim() ?? "";

  return COUPANG_PRODUCT_CATEGORY_SET.has(category)
    ? category as CoupangProductCategory
    : "book";
}
