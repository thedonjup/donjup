---
phase: 18-drizzle-orm
plan: "02"
subsystem: server-components
tags: [drizzle, migration, server-components, pages]
dependency_graph:
  requires: [18-01]
  provides: [orm-server-component-migration]
  affects: [src/app]
tech_stack:
  added: []
  patterns:
    - "Drizzle explicit select aliases for snake_case downstream compatibility"
    - "innerJoin() replacing Supabase !inner join syntax"
    - "sql<number>`count(*)` for COUNT queries"
    - "isNotNull/lte/gte/ne/inArray/and operators"
    - "filter() before map() to narrow nullable types"
key_files:
  created: []
  modified:
    - src/app/page.tsx
    - src/app/market/page.tsx
    - src/app/market/[sido]/page.tsx
    - src/app/market/[sido]/[sigungu]/page.tsx
    - src/app/apt/[region]/[slug]/page.tsx
    - src/app/apt/[region]/[slug]/opengraph-image.tsx
    - src/app/apt/sitemap.ts
    - src/app/daily/[date]/page.tsx
    - src/app/daily/archive/page.tsx
    - src/app/rent/page.tsx
    - src/app/trend/page.tsx
    - src/app/today/page.tsx
    - src/app/new-highs/page.tsx
    - src/app/themes/page.tsx
    - src/app/themes/[slug]/page.tsx
    - src/app/rate/page.tsx
    - src/app/map/page.tsx
decisions:
  - "Explicit snake_case select aliases used for all pages where downstream types require snake_case field names"
  - "Drizzle innerJoin() replaces Supabase !inner syntax for apt_complexes joins"
  - "Supabase RPC get_monthly_volume removed; replaced with direct query + server-side JS aggregation"
  - "numeric() schema columns require Number() conversion since Drizzle returns them as string"
  - "Single db instance handles all tables including apt_rent_transactions (no separate createRentServiceClient)"
metrics:
  duration: "~90 minutes (resumed from prior session)"
  completed: "2026-03-28T13:51:33Z"
  tasks_completed: 2
  files_modified: 17
---

# Phase 18 Plan 02: Server Component Pages Drizzle Migration Summary

All 17 Next.js Server Component page files migrated from Supabase QueryBuilder (`createClient`, `createServiceClient`, `createRentServiceClient`) to Drizzle ORM using single `db` instance from `@/lib/db`.

## Tasks Completed

| Task | Files | Commit |
|------|-------|--------|
| 1 — Homepage, market, apt detail, daily, rent (10 files) | page.tsx x7 + opengraph-image.tsx + sitemap.ts | b9258dc |
| 2 — Trend, today, new-highs, themes, rate, map (7 files) | page.tsx x7 | 2c6581a |

## Key Technical Decisions

**Explicit snake_case aliases:** `casing: 'snake_case'` on the Drizzle instance only affects SQL column names sent to PostgreSQL, not JavaScript property names in query results. Pages that downstream into types expecting snake_case (e.g., `DailyReport`, `Transaction`, `FinanceRate`) require explicit select aliases:
```typescript
db.select({ apt_name: aptTransactions.aptName, ... })
```

**innerJoin for apt_complexes:** Supabase `apt_complexes!inner` join syntax replaced with:
```typescript
.innerJoin(aptComplexes, eq(aptTransactions.complexId, aptComplexes.id))
```

**RPC removal (trend page):** Supabase `rpc("get_monthly_volume")` had no Drizzle equivalent. Replaced with direct query with `limit(50000)` and server-side monthly aggregation using `reduce()` over the result set.

**numeric() type conversion:** Drizzle returns PostgreSQL `NUMERIC` columns as `string | null`. All `sizeSqm`, `tradePrice`, `changeRate`, `latitude`, `longitude` values require `Number()` wrapping.

**Nullable latitude filter:** `MapTransaction.latitude` requires `number` (non-nullable). Added `.filter((t) => t.latitude !== null && t.longitude !== null)` before `.map()` to satisfy TypeScript constraint after the WHERE clause guarantees latitude is non-null but TypeScript doesn't know that.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] MetaComplex type mismatch in apt/[region]/[slug]/page.tsx**
- **Found during:** Task 1
- **Issue:** `generateMetadata` typed `complex` as `typeof aptComplexes.$inferSelect` (camelCase) but explicit select returned snake_case aliases, causing TS2339 errors
- **Fix:** Changed type to local `MetaComplex = { apt_name: string; region_name: string; dong_name: string | null; region_code: string; slug: string }`
- **Files modified:** src/app/apt/[region]/[slug]/page.tsx
- **Commit:** b9258dc

**2. [Rule 1 - Bug] latitude/longitude type narrowing for MapTransaction**
- **Found during:** Task 2
- **Issue:** `MapTransaction.latitude` requires `number` but Drizzle numeric() returns `string | null`; after filter, TypeScript still inferred `string | null`
- **Fix:** Added `.filter((t) => t.latitude !== null && t.longitude !== null)` before `.map()`, then `Number(t.latitude)` in map
- **Files modified:** src/app/map/page.tsx
- **Commit:** 2c6581a

## Known Stubs

None — all pages wire to real DB queries.

## Verification

- `grep -r "createServiceClient\|createClient\|createRentServiceClient" src/app --include="*.tsx" --include="*.ts" | grep -v "api/"` returns 0 matches
- `npx tsc --noEmit` returns 0 errors in app code (2 pre-existing test errors unrelated to migration)

## Self-Check: PASSED
- b9258dc: confirmed in git log
- 2c6581a: confirmed in git log
- All 17 files listed in plan frontmatter are present in modified state
