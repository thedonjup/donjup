---
phase: 13-chart-improvement
plan: "02"
subsystem: chart-rendering
tags: [chart, dual-line, dual-y-axis, jeonse-ratio-overlay, legend, recharts]
dependency_graph:
  requires: [13-01]
  provides: [dual-trend-lines, jeonse-ratio-overlay, chart-legend]
  affects: [PriceHistoryChart]
tech_stack:
  added: []
  patterns: [dual-yAxis-recharts, conditional-overlay-render, inline-legend]
key_files:
  created: []
  modified:
    - src/components/charts/PriceHistoryChart.tsx
  deleted:
    - src/components/charts/JeonseRatioChart.tsx
decisions:
  - "yAxisId={0} (numeric) used on all existing elements to preserve DirectDealConnectors' yAxisMap[0] access"
  - "Right YAxis conditionally rendered only when showJeonseRatio=true to avoid layout shift"
  - "hasRatioOverlay computed from both showJeonseRatio and jeonseRatioLine.length to avoid empty right axis"
  - "ComposedChart right margin increased to 45 when ratio overlay is active to fit right Y-axis labels"
metrics:
  duration: "~7 minutes"
  completed: "2026-03-28T04:03:00Z"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 1
  files_deleted: 1
---

# Phase 13 Plan 02: Chart Rendering — Dual Line + Dual Y-axis + Legend Summary

**One-liner:** PriceHistoryChart extended with blue jeonse trend line on left Y-axis, orange dashed ratio overlay on toggleable right Y-axis, inline legend, and JeonseRatioChart deleted.

## What Was Built

**Task 1 — PriceHistoryChart extension:**
- Imported `RatioPoint` from AptDetailClient
- Extended props: `rentTrendLine?`, `jeonseRatioLine?`, `showJeonseRatio?`
- Added `yAxisId={0}` to ALL existing `YAxis`, `Scatter`, and `Line` elements (preserves DirectDealConnectors `yAxisMap[0]` compatibility)
- Added conditional right `YAxis` (yAxisId="right", domain 0-100, `${v}%` formatter) when `showJeonseRatio=true`
- Added rent trend line: solid blue (#3B82F6) + dashed blue segments using same `solidTrendData`/`dashedTrendData` helpers
- Added `ratioLineData()` helper: maps RatioPoint[] to `{ x: YYYY-MM-15, y: ratio }` format
- Added jeonse ratio overlay: orange dashed line (#F97316) on right Y-axis, rendered only when both `showJeonseRatio=true` and `jeonseRatioLine.length >= 2`
- Added inline legend above chart: green "매매 추이" always visible, blue "전세 추이" conditional on data, orange "전세가율" conditional on overlay being active
- Updated CustomTooltip: added ratio branch (shows `전세가율: X.X%` in orange), updated trend tooltip to distinguish rent vs sale line by stroke color
- Dynamic right margin (45px when overlay active, 5px otherwise) to accommodate right axis labels

**Task 2 — JeonseRatioChart deletion:**
- Confirmed zero references to JeonseRatioChart outside the file itself
- Deleted `src/components/charts/JeonseRatioChart.tsx`
- Full Next.js build passes

**Task 3 — Deployment:**
- Deployed to production: https://donjup.com
- Auto-approved checkpoint (--auto mode)

## Decisions Made

1. Numeric `yAxisId={0}` on all existing elements: The DirectDealConnectors SVG overlay accesses `yAxisMap[0]` by numeric key. Using string "left" would break this lookup.
2. Conditional right YAxis render: Rendering the right axis only when the overlay is active avoids empty space and layout shift when the checkbox is off.
3. `hasRatioOverlay` guard: Derived from both `showJeonseRatio` flag AND `jeonseRatioLine.length >= 2` to avoid rendering an empty right axis when data is unavailable.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data flows from real computed values in AptDetailClient.

## Self-Check: PASSED

- `src/components/charts/PriceHistoryChart.tsx` — modified, exists
- `src/components/charts/JeonseRatioChart.tsx` — deleted (confirmed missing)
- Commit `33ad82e` (Task 1) — verified
- Commit `70d8a7b` (Task 2) — verified
- `npx tsc --noEmit` — passes with no errors
- `npx next build` — passes
- Deployed: https://donjup.com
