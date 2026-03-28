---
phase: 19
plan: 01
subsystem: code-quality
tags: [eslint, typescript, cleanup, unused-imports, as-any]
dependency_graph:
  requires: [18-04]
  provides: [CLEAN-01, CLEAN-02, CLEAN-03]
  affects: [eslint.config.mjs, 29 production source files]
tech_stack:
  added: []
  patterns:
    - "_-prefix convention for unused function parameters (argsIgnorePattern: ^_)"
    - "dynamic<Props>() pattern for typed Next.js dynamic imports"
key_files:
  created: []
  modified:
    - eslint.config.mjs
    - src/app/api/analytics/pageview/route.ts
    - src/app/api/bank-rates/route.ts
    - src/app/api/cron/fetch-bank-rates/route.ts
    - src/app/api/cron/fetch-transactions/route.ts
    - src/app/api/cron/generate-cardnews/route.ts
    - src/app/api/cron/post-instagram/route.ts
    - src/app/api/cron/validate-data/route.ts
    - src/app/api/geocode/route.ts
    - src/app/apt/[region]/[slug]/opengraph-image.tsx
    - src/app/apt/[region]/[slug]/page.tsx
    - src/app/daily/archive/page.tsx
    - src/app/dam/comments/page.tsx
    - src/app/market/[sido]/[sigungu]/page.tsx
    - src/app/market/page.tsx
    - src/app/page.tsx
    - src/app/rate/calculator/components/LoanCalculatorTab.tsx
    - src/app/rate/page.tsx
    - src/app/search/page.tsx
    - src/app/themes/[slug]/page.tsx
    - src/app/themes/page.tsx
    - src/app/today/page.tsx
    - src/app/trend/page.tsx
    - src/components/apt/TransactionTabs.tsx
    - src/components/charts/PriceHistoryChartWrapper.tsx
    - src/components/map/MobileBottomSheet.tsx
    - src/lib/db/schema/daily-reports.ts
    - src/lib/db/schema/push-subscriptions.ts
    - src/proxy.ts
decisions:
  - "argsIgnorePattern: ^_ added to eslint config to allow _-prefixed unused function params (needed for positional params that cannot be removed)"
  - "dynamic<PriceHistoryChartProps>() used instead of as any cast — types the dynamic import at the call site"
  - "enrichTransactions regionName param prefixed with _ (param required by callers but not used in body)"
metrics:
  duration: "~25 minutes"
  completed: "2026-03-28"
  tasks_completed: 2
  files_modified: 29
---

# Phase 19 Plan 01: Code Cleanup — Unused Imports & as any Summary

Eliminated all unused imports/variables across production code and removed the single `as any` cast in PriceHistoryChartWrapper, achieving CLEAN-01 (0 as any), CLEAN-02 (0 unused-vars), and verifying CLEAN-03 (0 legacy DB patterns).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Remove all unused imports and variables | 86b7d16 | 28 files |
| 2 | Fix as-any cast in PriceHistoryChartWrapper, verify CLEAN-03 | fe3c733 | 1 file |

## Verification Results

- `npx eslint src/ | grep "no-unused-vars"` — **0 lines** (CLEAN-02 met)
- `grep -r "as any" src/` — **0 lines** (CLEAN-01 exceeded: target was < 5, achieved 0)
- `grep -rn "createClient|createRentServiceClient" src/` — **0 lines** (CLEAN-03 met)
- `npx tsc --noEmit` — **clean** (0 errors)
- `npx next build` — **passed**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Two additional files had no-unused-vars not in plan**
- **Found during:** Task 1 full-src ESLint run
- **Issue:** `src/app/trend/page.tsx` had unused `and` import; `src/components/apt/TransactionTabs.tsx` had unused `formatSizeWithPyeong` import
- **Fix:** Removed both unused imports
- **Files modified:** src/app/trend/page.tsx, src/components/apt/TransactionTabs.tsx
- **Commit:** 86b7d16

**2. [Rule 2 - Enhancement] ESLint config needed argsIgnorePattern**
- **Found during:** Task 1 — `_regionName` and `_request` params still flagged after `_` prefix
- **Issue:** Default next/typescript ESLint config treats `_`-prefixed vars as still-unused without `argsIgnorePattern: "^_"` setting
- **Fix:** Added `@typescript-eslint/no-unused-vars` rule override with `argsIgnorePattern`, `varsIgnorePattern`, and `caughtErrorsIgnorePattern` all set to `^_`
- **Files modified:** eslint.config.mjs
- **Commit:** 86b7d16

## Known Stubs

None — all plan goals fully achieved with live data.

## Self-Check: PASSED
- src/components/charts/PriceHistoryChartWrapper.tsx — FOUND
- eslint.config.mjs argsIgnorePattern — FOUND
- Commit 86b7d16 — FOUND
- Commit fe3c733 — FOUND
