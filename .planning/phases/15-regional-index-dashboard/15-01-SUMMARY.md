---
phase: 15-regional-index-dashboard
plan: "01"
subsystem: regional-index
tags: [index, dashboard, recharts, server-component, cluster]
dependency_graph:
  requires: [price-normalization, region-codes]
  provides: [cluster-index-engine, index-dashboard-pages, cluster-chart]
  affects: [mobile-nav]
tech_stack:
  added: []
  patterns: [server-component-data-fetch, recharts-line-chart, isr-revalidate-3600]
key_files:
  created:
    - src/lib/cluster-index.ts
    - src/components/charts/ClusterIndexChart.tsx
    - src/app/index/page.tsx
    - src/app/index/[clusterId]/page.tsx
  modified:
    - src/lib/constants/region-codes.ts
    - src/components/layout/MobileNav.tsx
decisions:
  - "ClusterDefinition interface + CLUSTER_DEFINITIONS 4 clusters: gangnam3 / mayongseong / nodogang / sudobukmain"
  - "computeClusterIndex filters direct deals via isDirectDeal() before groupByMonth; no floor adjust at cluster level"
  - "Base month = first month with >= 3 transactions; index = round((median/baseMedian)*1000)/10"
  - "ClusterIndexChart is a 'use client' component imported by server page — no dynamic import needed"
  - "Dashboard page is pure server component; removed onMouseEnter/onMouseLeave (Rule 1 fix)"
metrics:
  duration_minutes: 15
  completed_date: "2026-03-28"
  tasks_completed: 2
  files_changed: 6
---

# Phase 15 Plan 01: Regional Index Dashboard Summary

**One-liner:** Median-based cluster price index engine (4 clusters) with ISR dashboard at /index + time-series detail at /index/[clusterId] using Recharts LineChart with ReferenceLine at 100.

## What Was Built

### Task 1: Cluster definitions + index engine + chart component

- **region-codes.ts**: Added `ClusterDefinition` interface and `CLUSTER_DEFINITIONS` array with 4 clusters:
  - gangnam3 (강남3구): 11680, 11650, 11710
  - mayongseong (마용성): 11440, 11170, 11200
  - nodogang (노도강): 11350, 11320, 11305
  - sudobukmain (수도권 주요): 41135, 41465, 41285, 41287 (수지구=41465, NOT 41463)

- **cluster-index.ts**: `computeClusterIndex(regionCodes, minTransactions=3)` — queries apt_transactions, filters direct deals, groups by month, finds base month, returns `ClusterIndexPoint[]` with month/index/medianPrice/count.

- **ClusterIndexChart.tsx**: `"use client"` Recharts component — LineChart 300px height, XAxis/YAxis, Tooltip, ReferenceLine at y=100 with dashed stroke "#9CA3AF", Line stroke "#2B579A".

### Task 2: Dashboard page + detail page + nav link

- **src/app/index/page.tsx**: ISR (revalidate=3600) server component. Fetches all 4 clusters via `Promise.all`, displays card grid with current index, monthly change (green/red), sparkline via MiniAreaChartWrapper, and recent median price.

- **src/app/index/[clusterId]/page.tsx**: ISR server component. generateStaticParams produces 4 routes. Displays full ClusterIndexChart + per-region 3-month median grid (direct SQL query, not computeClusterIndex).

- **MobileNav.tsx**: Added `{ href: "/index", label: "지역 지수" }` after `/market` entry.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed event handlers from Server Component**
- **Found during:** Task 2 build
- **Issue:** `onMouseEnter`/`onMouseLeave` handlers on `<div>` in `/index/page.tsx` — Next.js throws at prerender: "Event handlers cannot be passed to Client Component props"
- **Fix:** Removed hover handlers; hover effect dropped (card still navigable via Link)
- **Files modified:** src/app/index/page.tsx
- **Commit:** dde3b94

## Known Stubs

None — all data is wired to live DB queries.

## Self-Check: PASSED

Files verified:
- src/lib/cluster-index.ts — EXISTS
- src/components/charts/ClusterIndexChart.tsx — EXISTS
- src/app/index/page.tsx — EXISTS
- src/app/index/[clusterId]/page.tsx — EXISTS
- /index route — BUILD CONFIRMED (static prerender)
- /index/gangnam3, /mayongseong, /nodogang, /sudobukmain — BUILD CONFIRMED
