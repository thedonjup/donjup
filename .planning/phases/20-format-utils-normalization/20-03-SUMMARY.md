---
phase: 20-format-utils-normalization
plan: 03
subsystem: ui
tags: [format, sqmToPyeong, makeSlug, formatDateKo, formatArea, apt-url, data-normalization]

# Dependency graph
requires:
  - phase: 20-01
    provides: "Central format.ts and apt-url.ts with sqmToPyeong, formatArea, makeSlug, formatDateKo"
provides:
  - "7 files updated to use central imports from @/lib/format and @/lib/apt-url"
  - "Zero local sqmToPyeong/makeAptSlug/makeSlug/formatDate definitions outside central modules"
  - "Area display uses formatArea (N㎡ (N평)) in full-width contexts, Math.round(sqmToPyeong())평 in compact"
affects: [22-url-restructure, 21-design-system]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Central import pattern: sqmToPyeong/formatArea from @/lib/format, makeSlug from @/lib/apt-url"
    - "Compact area display: Math.round(sqmToPyeong(sqm))평 with // compact display comment"
    - "Full area display: formatArea(sqm) → 'N㎡ (N평)'"

key-files:
  created: []
  modified:
    - src/components/apt/TransactionTabs.tsx
    - src/app/rent/page.tsx
    - src/app/today/page.tsx
    - src/app/new-highs/page.tsx
    - src/app/themes/[slug]/page.tsx
    - src/components/home/RankingTabs.tsx
    - src/app/dam/users/page.tsx

key-decisions:
  - "Compact displays (ranking cards, table cells) use Math.round(sqmToPyeong(sqm))평 — integer평 preferred in constrained space"
  - "Full-width displays (rent table area column) use formatArea(sqm) → 'N㎡ (N평)' per DATA-03"
  - "Pre-existing build errors (firebase-admin, pg modules) confirmed not caused by this plan"

patterns-established:
  - "All area conversion: import sqmToPyeong from @/lib/format, never define locally"
  - "All apt slug generation: import makeSlug from @/lib/apt-url, never define locally"
  - "ISO date display: import formatDateKo from @/lib/format, never define locally"

requirements-completed: [DATA-02, DATA-03, DATA-04]

# Metrics
duration: 25min
completed: 2026-03-31
---

# Phase 20 Plan 03: Format Utils Normalization Summary

**All 7 remaining local sqmToPyeong/makeSlug/makeAptSlug/formatDate definitions eliminated — central imports from @/lib/format and @/lib/apt-url used throughout codebase**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-03-31T10:20:00Z
- **Completed:** 2026-03-31T10:45:00Z
- **Tasks:** 3 (2 implementation + 1 audit)
- **Files modified:** 7

## Accomplishments

- Removed 5 local makeSlug/makeAptSlug definitions (rent, today, new-highs, themes, RankingTabs) — all now use `@/lib/apt-url`
- Removed 2 local sqmToPyeong definitions (TransactionTabs, rent/page) — all now use `@/lib/format`
- Removed 1 local formatDate definition (dam/users) — now uses formatDateKo from `@/lib/format`
- rent/page.tsx area column updated to formatArea(sqm) → "N㎡ (N평)" format (DATA-03 compliance)
- 92 tests pass, TypeScript clean on modified files

## Task Commits

1. **Task 1: Replace sqmToPyeong/formatArea duplicates + apply "㎡ (평)" format** - `f1ee56c` (feat)
2. **Task 2: Replace makeSlug in themes + RankingTabs + formatDate in dam/users** - `9ca3b89` (feat)
3. **Task 3: Final verification — zero local duplicates + build clean** - no additional commit (audit-only, all clean)

## Files Created/Modified

- `src/components/apt/TransactionTabs.tsx` - Removed local sqmToPyeong, import from @/lib/format
- `src/app/rent/page.tsx` - Removed local sqmToPyeong+makeAptSlug, use formatArea+makeSlug
- `src/app/today/page.tsx` - Removed local makeSlug, import from @/lib/apt-url
- `src/app/new-highs/page.tsx` - Removed local makeSlug, import from @/lib/apt-url
- `src/app/themes/[slug]/page.tsx` - Removed local makeSlug, import from @/lib/apt-url
- `src/components/home/RankingTabs.tsx` - Removed local makeSlug, import from @/lib/apt-url
- `src/app/dam/users/page.tsx` - Removed local formatDate, use formatDateKo from @/lib/format

## Decisions Made

- Compact area display (ranking cards, table cells) keeps integer평 via `Math.round(sqmToPyeong(sqm))평` — preserves UX in space-constrained contexts
- Full-width area display (rent page area column) upgraded to `formatArea(sqm)` → "N㎡ (N평)" per DATA-03

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- Pre-existing build errors (firebase-admin, pg modules not installed in dev environment) confirmed unrelated — same 5 errors existed before any changes. TypeScript compilation of modified files is clean.

## Known Stubs

None — all 7 files use real data sources. No placeholder values introduced.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 20 complete: all DATA-01~04 requirements met across plans 01-03
- makeSlug fully centralized in @/lib/apt-url — Phase 22 URL restructure can proceed
- formatArea/sqmToPyeong unified — Phase 21 design system integration can use consistent area display pattern

---
*Phase: 20-format-utils-normalization*
*Completed: 2026-03-31*
