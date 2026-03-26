---
phase: 03-component-split
plan: 02
subsystem: map
tags: [refactor, component-split, kakaomap]
dependency_graph:
  requires: [02-01]
  provides: [KakaoMap sub-components, map-utils]
  affects: [src/components/map/, src/app/map/page.tsx]
tech_stack:
  added: []
  patterns: [component extraction, utility module, re-export for backward compat]
key_files:
  created:
    - src/components/map/map-utils.ts
    - src/components/map/FilterChip.tsx
    - src/components/map/MapSidePanel.tsx
    - src/components/map/MobileBottomSheet.tsx
  modified:
    - src/components/map/KakaoMap.tsx
decisions:
  - buildInfoWindowContent extracted to eliminate duplicated info window HTML template
  - MapTransaction re-exported from KakaoMap.tsx to maintain backward compatibility with map/page.tsx
  - formatPrice imported from @/lib/format in all map sub-components (no local duplicate)
metrics:
  duration: 7m
  completed: "2026-03-26"
  tasks_completed: 2
  files_changed: 5
---

# Phase 03 Plan 02: KakaoMap Component Split Summary

KakaoMap.tsx split from 640 lines into 5 files using utility extraction and sub-component decomposition, with duplicated info window HTML consolidated into a single `buildInfoWindowContent` function.

## What Was Done

Extracted all non-map-core concerns from `KakaoMap.tsx` into dedicated modules:

- `map-utils.ts` — `MapTransaction` interface, `getMarkerColor`, `getMarkerLabel`, `buildInfoWindowContent`
- `FilterChip.tsx` — reusable filter button component
- `MapSidePanel.tsx` — left panel with transaction list, filters, and panel toggle
- `MobileBottomSheet.tsx` — mobile bottom sheet with expand/collapse

`KakaoMap.tsx` now contains only: SDK initialization, map instance management, marker update effect, `handleItemClick` callback, and the JSX shell that composes the sub-components.

## Line Counts After Split

| File | Lines |
|------|-------|
| KakaoMap.tsx | 232 |
| MapSidePanel.tsx | 188 |
| MobileBottomSheet.tsx | 129 |
| map-utils.ts | 70 |
| FilterChip.tsx | 28 |

## Key Improvements

- Duplicated info window HTML (appeared twice in KakaoMap.tsx — in marker click handler and in `handleItemClick`) is now a single `buildInfoWindowContent(item)` call in both places.
- `MapTransaction` type re-exported from `KakaoMap.tsx` so `src/app/map/page.tsx` requires zero changes.
- All sub-components use `formatPrice` from `@/lib/format` (no local duplication).

## Verification Results

- `pnpm build` exits 0
- `wc -l` confirms all map files <= 300 lines
- `grep` confirms `MapTransaction` re-export in KakaoMap.tsx
- `grep` confirms `buildInfoWindowContent` used at both call sites in KakaoMap.tsx

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | b057609 | feat(03-02): split KakaoMap.tsx into sub-components and map-utils |

## Self-Check: PASSED

- [x] src/components/map/KakaoMap.tsx exists (232 lines)
- [x] src/components/map/map-utils.ts exists (70 lines)
- [x] src/components/map/FilterChip.tsx exists (28 lines)
- [x] src/components/map/MapSidePanel.tsx exists (188 lines)
- [x] src/components/map/MobileBottomSheet.tsx exists (129 lines)
- [x] Commit b057609 exists
- [x] pnpm build passes
