---
phase: 13-chart-improvement
plan: "01"
subsystem: chart-data-layer
tags: [chart, period-filter, jeonse-ratio, rent-trend, data-layer]
dependency_graph:
  requires: [10-price-normalization]
  provides: [period-filtering, rentTrendLine, jeonseRatioLine, showJeonseRatio-state]
  affects: [PriceHistoryChartWrapper, PriceHistoryChart]
tech_stack:
  added: []
  patterns: [useMemo-chain, period-cutoff-filtering, transplant-from-JeonseRatioChart]
key_files:
  created: []
  modified:
    - src/components/apt/AptDetailClient.tsx
    - src/components/charts/PriceHistoryChartWrapper.tsx
decisions:
  - "RatioPoint exported from AptDetailClient so PriceHistoryChartWrapper can import without circular dep"
  - "recentMedian kept on unfiltered saleTxns per Pitfall 3 — period filter must not shift the outlier threshold baseline"
  - "PriceHistoryChartWrapper uses (props as any) cast because PriceHistoryChart does not yet accept new props — Plan 02 will add rendering"
  - "showJeonseRatio default OFF per D-12 — user must explicitly enable the overlay"
metrics:
  duration: "~10 minutes"
  completed: "2026-03-28T03:54:09Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
---

# Phase 13 Plan 01: Chart Data Layer — Period Filter + Rent Trend + Jeonse Ratio Summary

**One-liner:** Period filtering tabs (1m/3m/6m/1y/all) + rentTrendLine (pure-jeonse 3-month moving median) + jeonseRatioLine (monthly ratio) computed in AptDetailClient and passed through PriceHistoryChartWrapper.

## What Was Built

**Task 1 — AptDetailClient (data layer):**
- Added `RatioPoint` interface (exported for Wrapper import)
- Added `PeriodKey` type with `PERIOD_MONTHS` / `PERIOD_LABELS` constants
- Added `selectedPeriod` state → `periodCutoff` → `filteredSaleTxns` / `filteredRentTxns`
- `recentMedian` intentionally kept on unfiltered `saleTxns` (Research Pitfall 3)
- `filterTransactions` now uses `filteredSaleTxns` so chart dots respect period selection
- `rentTrendLine`: pure jeonse (monthly_rent === 0) filtered → `groupByMonth` → `computeMovingMedian`
- `jeonseRatioLine`: transplanted logic from JeonseRatioChart — monthly median jeonse / median sale × 100
- `showJeonseRatio` state (default false) + checkbox in annotation area
- 5 period chip buttons rendered above chart (same chip styling as size selector)
- All new props passed to `PriceHistoryChartWrapper`
- Removed `JeonseRatioChart` import, render block, `selectedSizeRentTxns`, `selectedSizeSaleTxns` memos

**Task 2 — PriceHistoryChartWrapper (props passthrough):**
- Imported `RatioPoint` from AptDetailClient
- Extended props interface with `rentTrendLine?`, `jeonseRatioLine?`, `showJeonseRatio?`
- Passes through via `{...props as any}` cast until Plan 02 adds rendering to PriceHistoryChart

## Decisions Made

1. `recentMedian` kept on full `saleTxns`: Period filtering the outlier-detection baseline would cause the threshold to shift as users select shorter periods, making the same transaction appear/disappear inconsistently.
2. `(props as any)` cast in Wrapper: Avoids type error without touching PriceHistoryChart before Plan 02. The any cast is localized to the Wrapper component.
3. JeonseRatioChart fully removed from AptDetailClient: consolidates the ratio logic into one place (the client component), eliminating duplicate chart sections.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all props are computed from real data. PriceHistoryChart ignores `rentTrendLine`, `jeonseRatioLine`, `showJeonseRatio` until Plan 02 adds rendering (intentional, tracked in Plan 02).

## Self-Check: PASSED

- `src/components/apt/AptDetailClient.tsx` — modified, exists
- `src/components/charts/PriceHistoryChartWrapper.tsx` — modified, exists
- Commit `7e9dde9` (Task 1) — verified
- Commit `89e6a7c` (Task 2) — verified
- `npx tsc --noEmit` — passes with no errors
