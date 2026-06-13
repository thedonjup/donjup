import { PROPERTY_TYPES } from "@/lib/constants/property-types";

const ALLOWED_CRON_ROUTES = [
  "analytics",
  "coupang",
  "enrich-complexes",
  "fetch-bank-rates",
  "fetch-rates",
  "fetch-reb-index",
  "fetch-rents",
  "fetch-transactions",
  "generate-cardnews",
  "generate-report",
  "generate-seeding",
  "geocode-complexes",
  "geocode-kapt",
  "news",
  "post-instagram",
  "refresh-cache",
  "send-push",
  "validate-data",
] as const;

type CronRoute = (typeof ALLOWED_CRON_ROUTES)[number];
type QueryValidator = (value: string) => boolean;

const ALLOWED_CRON_ROUTE_SET = new Set<string>(ALLOWED_CRON_ROUTES);
const PROPERTY_TYPE_VALUES = new Set(
  Object.values(PROPERTY_TYPES).map((value) => String(value))
);

const integerBetween = (min: number, max: number): QueryValidator => (value) => {
  if (!/^\d+$/.test(value)) return false;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max;
};

const CRON_QUERY_RULES: Partial<Record<CronRoute, Record<string, QueryValidator>>> = {
  "fetch-rents": {
    batch: integerBetween(0, 4),
    months: integerBetween(1, 6),
  },
  "fetch-transactions": {
    batch: integerBetween(0, 4),
    months: integerBetween(1, 6),
    type: (value) => PROPERTY_TYPE_VALUES.has(value),
  },
};

function stripCronPrefix(value: string): string {
  return value
    .trim()
    .replace(/^\/?api\/cron\//, "")
    .replace(/^\/+/, "");
}

export function normalizeAdminCronRoute(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const route = stripCronPrefix(value);
  if (!/^[a-z0-9-]+(\?[a-z0-9=&-]+)?$/i.test(route)) return null;

  const [base, queryString] = route.split("?");
  if (!ALLOWED_CRON_ROUTE_SET.has(base)) return null;

  if (!queryString) return base;

  const rules = CRON_QUERY_RULES[base as CronRoute];
  if (!rules) return null;

  const query = new URLSearchParams(queryString);
  const normalizedQuery = new URLSearchParams();
  const seenKeys = new Set<string>();

  for (const [key, queryValue] of query.entries()) {
    if (seenKeys.has(key)) return null;
    seenKeys.add(key);

    const validate = rules[key];
    if (!validate || !validate(queryValue)) return null;

    normalizedQuery.set(key, queryValue);
  }

  const normalized = normalizedQuery.toString();
  return normalized ? `${base}?${normalized}` : base;
}
