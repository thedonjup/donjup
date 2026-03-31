---
phase: 20-format-utils-normalization
plan: "02"
subsystem: ui
tags: [format, price, normalization, refactor]

requires:
  - phase: 20-01
    provides: Central format module at src/lib/format.ts with formatPrice, formatKrw, formatPriceShort, formatPriceAxis, sqmToPyeong

provides:
  - Zero local formatPrice definitions outside src/lib/format.ts
  - Zero local formatPriceShort/sqmToPyeong definitions in AptDetailClient
  - generate-seeding uses formatKrw (원 units) instead of local formatPrice

affects:
  - PriceHistoryChart
  - AptDetailClient
  - opengraph-image
  - rank-item cardnews template
  - generate-seeding cron

tech-stack:
  added: []
  patterns:
    - "All price formatting flows through src/lib/format.ts — no local definitions in consuming files"

key-files:
  created: []
  modified:
    - src/components/charts/PriceHistoryChart.tsx
    - src/app/apt/[region]/[slug]/opengraph-image.tsx
    - src/lib/cardnews/templates/rank-item.tsx
    - src/app/api/cron/generate-seeding/route.ts
    - src/components/apt/AptDetailClient.tsx

key-decisions:
  - "generate-seeding local formatPrice took 원 units (not 만원) — replaced with formatKrw, not formatPrice"
  - "AptDetailClient local sqmToPyeong lacked 1-decimal precision — central version fixes this silently"

patterns-established:
  - "Price format functions: always import from @/lib/format, never define locally"

requirements-completed:
  - DATA-01
  - DATA-04

duration: 10min
completed: "2026-03-31"
---

# Phase 20 Plan 02: Price Format Duplicates Removal Summary

**5 files migrated to central formatPrice/formatKrw/formatPriceShort/sqmToPyeong imports — zero local price format definitions remain outside src/lib/format.ts**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-03-31T10:40:00Z
- **Completed:** 2026-03-31T10:50:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Removed 5 local formatPrice/formatPriceShort/sqmToPyeong function definitions across chart, OG image, cardnews template, seeding cron, and detail client
- generate-seeding cron now correctly uses formatKrw (원 units) instead of a local 원-unit formatter that was named formatPrice (confusingly)
- AptDetailClient gains 1-decimal precision on sqmToPyeong via the central implementation
- All 92 tests pass, TypeScript compiles cleanly on changed files

## Task Commits

1. **Task 1: Replace price format duplicates in chart, OG image, cardnews, seeding** - `90adecc` (feat)
2. **Task 2: Replace formatPriceShort in AptDetailClient** - `8d9ad2b` (feat)

## Files Created/Modified

- `src/components/charts/PriceHistoryChart.tsx` - Removed local formatPrice, sqmToPyeong, formatPriceAxis; added import from @/lib/format
- `src/app/apt/[region]/[slug]/opengraph-image.tsx` - Removed local formatPrice; added import from @/lib/format
- `src/lib/cardnews/templates/rank-item.tsx` - Removed local formatPrice; added import from @/lib/format
- `src/app/api/cron/generate-seeding/route.ts` - Removed local formatPrice (원 units); added formatKrw import; replaced all call sites
- `src/components/apt/AptDetailClient.tsx` - Removed local sqmToPyeong and formatPriceShort inner functions; added import from @/lib/format

## Decisions Made

- generate-seeding's local `formatPrice(won)` took 원 units — mapped to `formatKrw` (not `formatPrice`) from the central module to preserve correct unit semantics
- AptDetailClient's local sqmToPyeong used `Math.round(sqm / 3.3058)` (integer), central uses `Math.round(sqm / 3.3058 * 10) / 10` (1 decimal) — the improvement is a correctness gain with no breaking risk

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — pre-existing TypeScript errors in firebase-admin and unrelated test types were present before this plan and are out of scope.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 20-03 (remaining format normalizations) can proceed
- All consuming files are now linked to the central format module

---
*Phase: 20-format-utils-normalization*
*Completed: 2026-03-31*
