export const PUBLIC_DATA_CACHE_TAGS = {
  APT_COMPLEXES: "apt-complexes",
  APT_TRANSACTIONS: "apt-transactions",
  COUPANG_PRODUCTS: "coupang-products",
  APT_RENT_TRANSACTIONS: "apt-rent-transactions",
  DAILY_REPORTS: "daily-reports",
  FINANCE_RATES: "finance-rates",
  HOMEPAGE: "homepage",
  NEWS: "news",
  PAGE_VIEWS: "page-views",
} as const;

export type PublicDataCacheTag =
  (typeof PUBLIC_DATA_CACHE_TAGS)[keyof typeof PUBLIC_DATA_CACHE_TAGS];
