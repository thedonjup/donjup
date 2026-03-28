---
phase: 17-integration-e2e-tests
plan: 01
subsystem: testing
tags: [vitest, next-test-api-route-handler, integration-testing, api-routes, vi-mock]

requires:
  - phase: 16-test-infrastructure
    provides: vitest config, unit test patterns (vi.mock, mockPoolQuery)

provides:
  - integration tests for fetch-bank-rates cron route (auth + FinLife mock)
  - integration tests for fetch-rents cron route (auth + MOLIT rent mock)
  - integration tests for fetch-transactions cron route (auth + MOLIT transaction mock)
  - vitest include pattern that explicitly excludes e2e tests

affects:
  - phase 17 E2E plan (vitest.config.ts exclude pattern protects Playwright tests)
  - any future cron route additions (pattern established for testApiHandler + vi.mock)

tech-stack:
  added: [next-test-api-route-handler@5.0.4]
  patterns:
    - testApiHandler wrapping route handler with appHandler import
    - vi.mock('@/lib/db/client') to intercept createDbClient for all DB clients
    - makeMockDb() helper with thenable chain for QueryBuilder mock
    - process.env.CRON_SECRET = 'test-secret' in beforeEach for auth setup

key-files:
  created:
    - tests/integration/fetch-bank-rates.test.ts
    - tests/integration/fetch-rents.test.ts
    - tests/integration/fetch-transactions.test.ts
  modified:
    - vitest.config.ts (added explicit include pattern)
    - package.json (added next-test-api-route-handler devDependency)

key-decisions:
  - "vi.mock('@/lib/db/client') covers both createServiceClient and createRentServiceClient since both delegate to createDbClient"
  - "testApiHandler must be first import in each test file — ntarh requirement"
  - "makeMockDb() thenable chain: then() calls resolve({ data: [], error: null }) for QueryBuilder await support"
  - "vitest include pattern explicitly lists tests/unit and tests/integration to prevent e2e Playwright tests from running via npm test"

patterns-established:
  - "Integration test pattern: testApiHandler + vi.mock(@/lib/db/client) + makeMockDb() thenable chain"
  - "Auth test pattern: fetch without Authorization -> 401, fetch with Bearer {CRON_SECRET} -> success path"
  - "External API mock: vi.mock each @/lib/api/* module used by route to prevent real HTTP calls"

requirements-completed: [TEST-04]

duration: 15min
completed: 2026-03-28
---

# Phase 17 Plan 01: Integration Tests for Cron API Routes Summary

**Vitest integration tests for three cron routes using next-test-api-route-handler + vi.mock DB isolation, covering 401 auth rejection and success paths without real DB or external API calls**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-28T22:02:00Z
- **Completed:** 2026-03-28T22:05:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Installed next-test-api-route-handler@5.0.4 and updated vitest.config.ts with explicit include patterns to isolate unit + integration from E2E
- Created 12 integration tests across 3 files: fetch-bank-rates (4), fetch-rents (4), fetch-transactions (4)
- Full test suite passes: 66 tests (54 unit + 12 integration) via `npm test`
- All tests isolated: no real DB connections, no external API calls

## Task Commits

1. **Task 1: Install next-test-api-route-handler + update vitest config** - `f0a0bad` (chore)
2. **Task 2: Write integration tests for three cron API routes** - `35daa74` (feat)

## Files Created/Modified

- `tests/integration/fetch-bank-rates.test.ts` - Auth 401 + FinLife mock tests for fetch-bank-rates cron route
- `tests/integration/fetch-rents.test.ts` - Auth 401 + MOLIT rent mock tests for fetch-rents cron route
- `tests/integration/fetch-transactions.test.ts` - Auth 401 + MOLIT transaction mock tests for fetch-transactions cron route
- `vitest.config.ts` - Added explicit include patterns (tests/unit, tests/integration); e2e excluded
- `package.json` - Added next-test-api-route-handler@5.0.4 devDependency

## Decisions Made

- Mocked `@/lib/db/client` (createDbClient) rather than `@/lib/db/server` or `@/lib/db/rent-client` — both service clients delegate to createDbClient, so one mock covers all
- Used thenable chain in makeMockDb() (`then()` method) to support `await supabase.from()...` pattern used by routes
- Mocked `@/lib/constants/region-codes` with minimal single-region stub (서울/11110) to keep tests fast and avoid processing all regions
- Mocked `delay()` from molit and molit-multi to prevent 300ms artificial delays in tests

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tests passed on first run.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Integration tests complete for TEST-04 requirement
- Vitest config now explicitly excludes e2e tests — ready for Phase 17-02 Playwright setup
- Pattern established for future cron route integration tests: copy makeMockDb() + vi.mock pattern

---
*Phase: 17-integration-e2e-tests*
*Completed: 2026-03-28*
