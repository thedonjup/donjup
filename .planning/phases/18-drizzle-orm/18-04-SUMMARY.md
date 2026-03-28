---
phase: 18-drizzle-orm
plan: "04"
subsystem: database
tags: [drizzle-orm, migration, raw-sql, legacy-cleanup, testing]

requires:
  - phase: 18-01
    provides: Drizzle db instance + schema definitions
  - phase: 18-02
    provides: Server component pages migrated
  - phase: 18-03
    provides: API routes and cron jobs migrated

provides:
  - Zero legacy DB patterns in src/ — all getPool/createClient/createRentServiceClient removed
  - src/lib/db/client.ts deleted (QueryBuilder + getPool)
  - src/lib/db/server.ts deleted (createClient/createServiceClient)
  - src/lib/db/rent-client.ts deleted (createRentServiceClient)
  - All 8 remaining raw SQL sites migrated to Drizzle
  - All 4 test files mocking @/lib/db instead of @/lib/db/client
  - "import { db } from '@/lib/db'" is the ONLY DB access pattern in the codebase

affects:
  - 19-code-cleanup (legacy files now fully removed)

tech-stack:
  added: []
  patterns:
    - "inArray(table.col, values) for dynamic IN clause queries"
    - "db.execute(sql`...`) for DDL, aggregate GROUP BY, and complex dynamic conditions"
    - "sql tagged template with interpolated values for parameterized dynamic queries"
    - "sql.join(conditions, sql` AND `) for building dynamic WHERE clauses"
    - "Drizzle select chain .select().from().where().orderBy() for multi-column reads"
    - "vi.mock('@/lib/db') with chainable mockReturnThis() chain for unit/integration tests"

key-files:
  modified:
    - src/lib/cluster-index.ts
    - src/app/api/search/route.ts
    - src/app/search/page.tsx
    - src/app/index/[clusterId]/page.tsx
    - src/app/api/cron/analytics/route.ts
    - src/app/api/cron/coupang/route.ts
    - src/app/api/cron/news/route.ts
    - src/app/api/cron/refresh-cache/route.ts
    - src/lib/cardnews/generator.ts
    - tests/integration/fetch-transactions.test.ts
    - tests/integration/fetch-rents.test.ts
    - tests/integration/fetch-bank-rates.test.ts
    - tests/unit/cluster-index.test.ts
  deleted:
    - src/lib/db/client.ts
    - src/lib/db/server.ts
    - src/lib/db/rent-client.ts

key-decisions:
  - "db.execute(sql tagged template) for search route — dynamic multi-part OR conditions with LIKE prefix matching on region codes are too complex for Drizzle's builder; sql tagged template with sql.join() satisfies ORM-06 while preserving exact query logic"
  - "db.execute(sql`...`) for DDL in coupang/news cron routes — coupang_products and news tables are not in Drizzle schema; DDL must go through db.execute"
  - "client.ts deleted alongside server.ts and rent-client.ts — verified no remaining importers in src/ before deletion"
  - "generator.ts migrated to Drizzle (dead code but blocked client.ts deletion via DbClient type import)"
  - "Test mock pattern: vi.mock('@/lib/db', () => ({ db: mockChain })) where mockChain has mockReturnThis() for all chainable methods"

requirements-completed: [ORM-06]

duration: 35min
completed: 2026-03-28
---

# Phase 18 Plan 04: Final Raw SQL Cleanup + Legacy File Deletion Summary

**All 8 remaining getPool() call sites migrated to Drizzle, legacy DB files (client.ts/server.ts/rent-client.ts) deleted, test mocks updated to @/lib/db — zero legacy DB patterns remain in the codebase**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-03-28T22:50Z
- **Completed:** 2026-03-28T23:03Z
- **Tasks:** 2
- **Files modified:** 13 modified, 3 deleted

## Accomplishments

- Migrated all 8 raw SQL sites (`cluster-index.ts`, `search/route.ts`, `search/page.tsx`, `index/[clusterId]/page.tsx`, `cron/analytics`, `cron/coupang`, `cron/news`, `cron/refresh-cache`) to Drizzle
- Deleted all 3 legacy DB client files (`client.ts`, `server.ts`, `rent-client.ts`) — codebase now has exactly one DB entry point
- Updated all 4 test files to mock `@/lib/db` with Drizzle-shaped chain — 66 tests pass
- `npx tsc --noEmit` passes with zero errors

## Task Commits

1. **Task 1: Migrate 8 raw SQL sites to Drizzle ORM** - `9628371` (feat)
2. **Task 2: Delete legacy files + update test mocks** - `d579d50` (feat)

## Files Created/Modified

- `src/lib/cluster-index.ts` — `inArray(aptTransactions.regionCode, regionCodes) + eq(propertyType, 1)` replaces manual `$N` placeholder loop
- `src/app/api/search/route.ts` — `db.execute(sql tagged template)` with `sql.join(conditions, sql\` AND \`)` for dynamic WHERE
- `src/app/search/page.tsx` — same dynamic sql.join pattern for server-side search
- `src/app/index/[clusterId]/page.tsx` — `inArray + gte + ne + eq` chain for per-region median query
- `src/app/api/cron/analytics/route.ts` — DDL via `db.execute(sql`CREATE TABLE IF NOT EXISTS...`)`, upsert via `onConflictDoUpdate`
- `src/app/api/cron/coupang/route.ts` — DDL + upsert via `db.execute(sql`...`)` (non-schema table)
- `src/app/api/cron/news/route.ts` — DDL + insert via `db.execute(sql`...`)` (non-schema table)
- `src/app/api/cron/refresh-cache/route.ts` — Drizzle select chains in `Promise.all`, `onConflictDoUpdate` for homepage_cache
- `src/lib/cardnews/generator.ts` — migrated from `DbClient` to Drizzle `db` directly
- `tests/unit/cluster-index.test.ts` — mock `@/lib/db` with `db.select().from().where().orderBy()` chain
- `tests/integration/fetch-transactions.test.ts` — mock `@/lib/db` with Drizzle insert/onConflictDoNothing chain
- `tests/integration/fetch-rents.test.ts` — mock `@/lib/db` with Drizzle insert/onConflictDoNothing chain
- `tests/integration/fetch-bank-rates.test.ts` — mock `@/lib/db` with Drizzle insert/onConflictDoUpdate chain
- `src/lib/db/client.ts` — DELETED
- `src/lib/db/server.ts` — DELETED
- `src/lib/db/rent-client.ts` — DELETED

## Decisions Made

- **`db.execute(sql tagged template)` for search routes:** The search query has dynamic multi-part OR conditions (e.g., `region_code LIKE $1 OR apt_name ILIKE $2 OR dong_name ILIKE $2`) with shared parameter values. Using `sql.join(conditions, sql\` AND \`)` with individually constructed `sql\`...\`` chunks handles parameterization correctly while satisfying ORM-06 (no raw `pool.query()`).
- **`db.execute(sql`...`)` for DDL:** coupang_products and news tables don't have Drizzle schema definitions (they're ad-hoc tables created by their cron jobs). DDL must use `db.execute` since there's no table object to pass to `db.insert()`.
- **Migrated dead code generator.ts:** `generateDailyCardNews` in `generator.ts` is never called (generate-cardnews route was inlined in plan 03), but its `import type { DbClient } from "@/lib/db/client"` blocked deletion of `client.ts`. Migrated to use Drizzle `db` directly rather than leaving dead code with a legacy dependency.
- **Test mock pattern:** `vi.mock('@/lib/db', () => ({ db: mockChain }))` where each method returns `this` allows the full method chain to be called without errors. The terminal `limit/onConflictDoNothing/onConflictDoUpdate` returns a resolved Promise so the test can await it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] generator.ts imported DbClient blocking client.ts deletion**
- **Found during:** Task 2 (Delete legacy files)
- **Issue:** `src/lib/cardnews/generator.ts` had `import type { DbClient } from "@/lib/db/client"` — this was the only remaining importer of `client.ts` in `src/`
- **Fix:** Migrated `generator.ts` to use Drizzle `db` directly (`db.select().from().where().limit(1)`)
- **Files modified:** src/lib/cardnews/generator.ts
- **Committed in:** d579d50 (Task 2 commit)

**2. [Rule 1 - Bug] Pre-existing test type errors fixed**
- **Found during:** Task 2 (TypeScript check after test updates)
- **Issue:** Original tests had `dealType: null` (should be `string`) and `contractTerm: null, builtYear: null` (should be non-null) — pre-existing errors that were masked when test files had `@ts-ignore` behavior via the old mock
- **Fix:** Changed `dealType: null` → `dealType: ''`, `contractTerm: null` → `contractTerm: '2년'`, `builtYear: null` → `builtYear: 2017`
- **Files modified:** fetch-transactions.test.ts, fetch-rents.test.ts
- **Committed in:** d579d50 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug fix)
**Impact on plan:** Both fixes required for correct deletion and TypeScript cleanliness. No scope creep.

## Known Stubs

None — all migrations are complete and fully wired.

## Final Verification

```
grep -r "getPool" src --include="*.ts" --include="*.tsx" | grep -v "lib/db/index.ts" → 0 lines
grep -r "createServiceClient|createClient|createRentServiceClient" src → 0 lines
grep -r "from.*@/lib/db/client|from.*@/lib/db/server|from.*@/lib/db/rent-client" src → 0 lines
npm test → 5 passed (66 tests)
npx tsc --noEmit → 0 errors
```

## Next Phase Readiness

- Phase 18 (Drizzle ORM) complete — all 4 plans executed
- Phase 19 (코드 정리) can now proceed: legacy DB files are deleted, single `db` entry point confirmed
- `import { db } from '@/lib/db'` is the only DB access pattern in the entire codebase

---
*Phase: 18-drizzle-orm*
*Completed: 2026-03-28*

## Self-Check: PASSED

- src/lib/db/client.ts — DELETED (confirmed by `ls src/lib/db/*.ts` returning only index.ts)
- src/lib/db/server.ts — DELETED
- src/lib/db/rent-client.ts — DELETED
- src/lib/cluster-index.ts — FOUND, imports from @/lib/db
- src/app/api/search/route.ts — FOUND, uses db.execute(sql`...`)
- Commit 9628371 — FOUND (feat(18-04): migrate 8 raw SQL sites)
- Commit d579d50 — FOUND (feat(18-04): delete legacy DB files)
- npm test: 66/66 passed
- npx tsc --noEmit: 0 errors
