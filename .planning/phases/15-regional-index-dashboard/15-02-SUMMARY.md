---
phase: 15-regional-index-dashboard
plan: "02"
subsystem: market-pages
tags: [price-normalization, median, market, ui]
dependency_graph:
  requires: [price-normalization.ts (computeMedianPrice, isDirectDeal)]
  provides: [median/avg price display on /market and /market/[sido]]
  affects: [src/app/market/page.tsx, src/app/market/[sido]/page.tsx]
tech_stack:
  added: []
  patterns: [Promise.all 4th query, direct-deal filter, JS-side median/avg]
key_files:
  created: []
  modified:
    - src/app/market/page.tsx
    - src/app/market/[sido]/page.tsx
decisions:
  - "PriceRow typed locally with `type PriceRow` to satisfy strict no-implicit-any TypeScript config"
  - "property_type=1 hardcoded for sigungu price query (no filter UI at sigungu level yet)"
metrics:
  duration: "~15 minutes"
  completed: "2026-03-28"
  tasks_completed: 1
  tasks_total: 1
  files_modified: 2
requirements: [INDEX-03]
---

# Phase 15 Plan 02: Median/Avg Price on Market Pages Summary

**One-liner:** Added 3-month median and average transaction price (direct deals excluded) to all sido and sigungu market cards.

## What Was Built

Both `/market` (sido-level) and `/market/[sido]` (sigungu-level) pages now display a "최근 3개월 중위가 / 평균가" row at the bottom of each card.

### Changes

**src/app/market/page.tsx**
- Imported `computeMedianPrice`, `isDirectDeal` from `@/lib/price-normalization`
- Computed `cutoff` date (3 months ago) before Promise.all loop
- Added 4th query inside each sido's Promise.all: selects `trade_price, deal_type` filtered by `gte("trade_date", cutoff)`, routed through `applyTypeFilter` to respect the property type filter
- Typed raw query result as `PriceRow[]`, filtered direct deals, computed median and avg in JS
- Extended `sidoStats` type with `medianPrice: number` and `avgPrice: number`
- Added conditional UI row below the topDrop/topHigh grid; hidden when both values are 0

**src/app/market/[sido]/page.tsx**
- Same import and pattern as page.tsx
- 4th query uses `.eq("region_code", code).gte("trade_date", cutoff).eq("property_type", 1)` (property_type=1 hardcoded — no property type filter on sigungu page)
- Same median/avg computation and conditional UI row

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript implicit `any` on filter/map lambdas**
- **Found during:** Task 1 (build verification)
- **Issue:** Supabase query result type was too generic; TypeScript strict mode flagged implicit `any` on `.filter((t) => ...)` and `.reduce((a, b) => ...)`
- **Fix:** Added local `type PriceRow = { trade_price: number; deal_type: string | null }` and cast `priceResult.data` to `PriceRow[]`; added explicit number types on reduce accumulator
- **Files modified:** both market pages
- **Commit:** 07240d9

## Known Stubs

None. Data is wired directly from `apt_transactions` via live DB query.

## Verification

- TypeScript: PASSED ("Finished TypeScript in 13.6s")
- Compiled: PASSED ("Compiled successfully in 19.4s")
- Pre-existing `/index` prerender error is unrelated to this plan's changes (confirmed by stash test)

## Self-Check: PASSED

- src/app/market/page.tsx: modified with median/avg query and UI row
- src/app/market/[sido]/page.tsx: modified with median/avg query and UI row
- Commit 07240d9 exists
