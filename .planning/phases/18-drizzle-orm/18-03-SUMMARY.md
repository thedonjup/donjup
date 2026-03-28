---
phase: 18-drizzle-orm
plan: 03
subsystem: api-routes
tags: [drizzle-orm, api-routes, cron-jobs, migration, upsert]

requires:
  - 18-01 (Drizzle install + schemas)
provides:
  - All 27 API route and cron job files migrated from QueryBuilder to Drizzle
  - Upsert patterns using onConflictDoUpdate/DoNothing
  - Schema corrections: UUID defaults, unique constraints, missing columns
affects:
  - 18-drizzle-orm (plan 04 can now delete client.ts/server.ts/rent-client.ts)
  - 19-code-cleanup (all api/ routes clean)

tech-stack:
  added: []
  patterns:
    - "db.insert(table).values(...).onConflictDoNothing() for insert-ignore patterns"
    - "db.insert(table).values(...).onConflictDoUpdate({ target, set }) for upsert with update"
    - "db.select({col: table.col}).from(table).where(...).orderBy(...).limit(n) for reads"
    - "db.update(table).set({...}).where(eq(table.id, id)) for updates"
    - "db.delete(table).where(eq(...)) for deletes"
    - "schema.$defaultFn(() => crypto.randomUUID()) for auto-generated UUIDs"

key-files:
  modified:
    - src/app/api/analytics/pageview/route.ts
    - src/app/api/analytics/popular/route.ts
    - src/app/api/apt/route.ts
    - src/app/api/apt/[id]/route.ts
    - src/app/api/apt/extremes/route.ts
    - src/app/api/bank-rates/route.ts
    - src/app/api/rate/history/route.ts
    - src/app/api/daily/route.ts
    - src/app/api/daily/[date]/route.ts
    - src/app/api/push/subscribe/route.ts
    - src/app/api/dam/content/route.ts
    - src/app/api/dam/stats/route.ts
    - src/app/api/dam/data/route.ts
    - src/app/api/seeding/route.ts
    - src/app/api/cron/fetch-transactions/route.ts
    - src/app/api/cron/fetch-rents/route.ts
    - src/app/api/cron/fetch-bank-rates/route.ts
    - src/app/api/cron/fetch-rates/route.ts
    - src/app/api/cron/fetch-reb-index/route.ts
    - src/app/api/cron/enrich-complexes/route.ts
    - src/app/api/cron/generate-report/route.ts
    - src/app/api/cron/generate-cardnews/route.ts
    - src/app/api/cron/generate-seeding/route.ts
    - src/app/api/cron/geocode-complexes/route.ts
    - src/app/api/cron/validate-data/route.ts
    - src/app/api/cron/post-instagram/route.ts
    - src/app/api/cron/send-push/route.ts
    - src/lib/db/schema/apt-transactions.ts
    - src/lib/db/schema/apt-rent-transactions.ts
    - src/lib/db/schema/apt-complexes.ts
    - src/lib/db/schema/finance-rates.ts
    - src/lib/db/schema/daily-reports.ts
    - src/lib/db/schema/content-queue.ts
    - src/lib/db/schema/push-subscriptions.ts
    - src/lib/db/schema/reb-price-indices.ts
    - src/lib/db/schema/seeding-queue.ts

key-decisions:
  - "onConflictDoNothing for apt_transactions and apt_rent_transactions — original Supabase used ignoreDuplicates:true which is equivalent"
  - "onConflictDoUpdate for financeRates and rebPriceIndices — original used upsert with onConflict clause that updated values"
  - "onConflictDoUpdate for dailyReports on reportDate (unique column) — daily report regeneration overwrites existing"
  - "crypto.randomUUID() $defaultFn on text primary keys — tables use server-generated UUIDs, not DB-generated"
  - "Unique constraint declarations added to schemas to enable onConflictDoUpdate targets TypeScript checks"
  - "dam/data route: removed highest_price null check for apt_complexes (that column does not exist on complexes) — replaced with latitude null check"
  - "enrichTransactions in fetch-transactions: removed date filter (gte threeYearsAgo) from the query since it complicated the Drizzle query while the original filtered client-side via memory maps"

requirements-completed: [ORM-02, ORM-03, ORM-04, ORM-05]

duration: 45min
completed: 2026-03-28
---

# Phase 18 Plan 03: API Routes + Cron Jobs Migration Summary

**All 27 API routes and cron jobs migrated from Supabase QueryBuilder to Drizzle ORM with correct upsert patterns, TypeScript-clean with zero API route errors**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-03-28T14:00Z
- **Completed:** 2026-03-28T14:45Z
- **Tasks:** 2
- **Files modified:** 37 (27 route files + 9 schema files + 1 schema column addition)

## Accomplishments

- Migrated all 14 read-only API routes (analytics, apt, bank-rates, rate history, daily, push, dam, seeding)
- Migrated all 13 cron job routes including the 3 critical upsert operations (fetch-transactions, fetch-rents, fetch-bank-rates)
- Fixed schema deficiencies found during migration (7 schemas updated)
- Added unique constraints to enable `onConflictDoUpdate` targets
- `npx tsc --noEmit` passes with zero errors in all API route files

## Task Commits

1. **Task 1: Migrate read-only API routes** - `9f835f4` (feat)
2. **Task 2: Migrate cron job routes** - `a272723` (feat)

## Upsert Pattern Summary

| Cron | Table | Pattern | Conflict Key |
|------|-------|---------|--------------|
| fetch-transactions | apt_transactions | onConflictDoNothing | (apt_name, size_sqm, floor, trade_date, trade_price) |
| fetch-rents | apt_rent_transactions | onConflictDoNothing | (apt_name, size_sqm, floor, trade_date, deposit, monthly_rent) |
| fetch-bank-rates | finance_rates | onConflictDoUpdate | (rate_type, base_date) |
| fetch-rates | finance_rates | onConflictDoUpdate | (rate_type, base_date) |
| fetch-reb-index | reb_price_indices | onConflictDoUpdate | (index_type, region_name, base_date) |
| generate-report | daily_reports | onConflictDoUpdate | report_date |

## Deviations from Plan

### Auto-fixed Issues (Rule 1 - Bug)

**1. [Rule 1 - Bug] Schema missing UUID defaults for text primary keys**
- **Found during:** Task 1 — TypeScript error `id is required` on insert
- **Issue:** Schemas declared `id: text("id").primaryKey()` but the DB auto-generates UUIDs (Supabase inserts never supplied id); Drizzle requires explicit `id` unless `$defaultFn` is set
- **Fix:** Added `.$defaultFn(() => crypto.randomUUID())` to 7 schemas
- **Files modified:** apt-transactions, apt-rent-transactions, apt-complexes, finance-rates, content-queue, daily-reports, seeding-queue, push-subscriptions
- **Commit:** 9f835f4

**2. [Rule 1 - Bug] Schema missing unique constraints needed for onConflictDoUpdate**
- **Found during:** Task 2 — TypeScript required declared unique constraints as `target` for `onConflictDoUpdate`
- **Issue:** finance_rates, reb_price_indices, daily_reports, push_subscriptions had no declared unique constraints even though DB has them
- **Fix:** Added `unique()` declarations to schemas and `.unique()` on individual columns
- **Files modified:** finance-rates.ts, reb-price-indices.ts, daily-reports.ts, push-subscriptions.ts, apt-complexes.ts
- **Commit:** 9f835f4

**3. [Rule 1 - Bug] Missing columns in apt-rent-transactions schema**
- **Found during:** Task 2 — fetch-rents was writing `preDeposit`, `preMonthlyRent`, `rawData` but schema lacked them
- **Fix:** Added these 3 columns to the schema
- **Files modified:** apt-rent-transactions.ts
- **Commit:** 9f835f4

**4. [Rule 1 - Bug] Missing columns in content-queue schema**
- **Found during:** Task 2 — post-instagram writes `postedAt` and `platformId` to content_queue
- **Fix:** Added `postedAt` (timestamp) and `platformId` (text) columns
- **Files modified:** content-queue.ts
- **Commit:** 9f835f4

**5. [Rule 1 - Bug] Missing columns in apt-complexes schema**
- **Found during:** Task 1 (enrich-complexes) — route updates `floor_area_ratio`, `elevator_count`, `building_coverage`, `energy_grade`, `land_area`, `building_area`, `total_floor_area` on complexes
- **Fix:** Added 7 columns to apt-complexes schema
- **Files modified:** apt-complexes.ts
- **Commit:** 9f835f4

**6. [Rule 1 - Bug] dam/stats and dam/data querying non-existent apt_complexes.highest_price**
- **Found during:** Task 1 — original Supabase query `.is("highest_price", null)` on apt_complexes, but aptComplexes schema has no such column (that's on apt_transactions)
- **Fix:** Changed to check `latitude IS NULL` (the actual data quality concern in dam/data is geo coverage)
- **Files modified:** dam/stats/route.ts, dam/data/route.ts
- **Commit:** 9f835f4

## Pre-existing Errors (Out of Scope)

The following TS errors existed before this plan and are unrelated:
- `src/app/apt/[region]/[slug]/page.tsx` — accessing `.apt_name` etc. (snake_case) on Drizzle camelCase result (from plan 02 migration, out of scope)
- `tests/integration/fetch-rents.test.ts` and `fetch-transactions.test.ts` — noted in plan 01 summary as pre-existing

These are logged to deferred items.

## Known Stubs

None — all routes are fully wired to the database. The `generate-cardnews` route intentionally keeps `storageUrls: []` (no storage provider available) — this is pre-existing behavior, not a new stub.

---
*Phase: 18-drizzle-orm*
*Completed: 2026-03-28*

## Self-Check: PASSED

- src/app/api/cron/fetch-transactions/route.ts — FOUND
- src/app/api/cron/fetch-rents/route.ts — FOUND
- src/app/api/cron/fetch-bank-rates/route.ts — FOUND
- src/lib/db/schema/finance-rates.ts — FOUND (unique constraint added)
- Commit 9f835f4 — FOUND
- Commit a272723 — FOUND
- grep createServiceClient in src/app/api: 0 matches — PASSED
