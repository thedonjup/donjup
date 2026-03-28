---
phase: 12-rate-display-improvement
plan: 02
subsystem: ui
tags: [react, typescript, tailwind, server-component, hero-card, accordion, expandable]

requires:
  - 12-01 (RateIndicatorAccordion, BankRateExpandable components)
provides:
  - Restructured /rate page with hero card + accordion + expandable bank rates (RATE-01/02/03)
affects:
  - donjup.com/rate (live page)

tech-stack:
  added: []
  patterns:
    - "Server Component passes serialized plain props to 'use client' components"
    - "BANK_UNKNOWN filtered from avg computation to avoid skewing average"
    - "validBanks slice for min/max — sorted ascending so [0] = min, [last] = max"

key-files:
  created: []
  modified:
    - src/app/rate/page.tsx

key-decisions:
  - "Filter BANK_UNKNOWN before computing avgRate — avoids catch-all 'other' skewing the displayed average"
  - "Hero card server-rendered (no 'use client') — static HTML for SEO and initial paint"
  - "avgChangeBp computed as mean of all validBanks change_bp values — representative signal"

requirements-completed: [RATE-01, RATE-02, RATE-03]

duration: 6min
completed: 2026-03-28
---

# Phase 12 Plan 02: Rate Display Improvement — Page Restructure Summary

**Hero card with bank average rate at top, accordion for 5 rate indicators, expandable bank rows — flat page transformed to hierarchy with BANK_UNKNOWN filtered from average computation**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-28T03:17:58Z
- **Completed:** 2026-03-28T03:23:58Z
- **Tasks:** 2 (1 auto + 1 checkpoint auto-approved)
- **Files modified:** 1

## Accomplishments

- Rewrote `src/app/rate/page.tsx` as Server Component importing both Plan 01 client components
- Hero card renders `avgRate` (D-01), `avgChangeBp` badge (D-03), `minRate~maxRate` range (D-04)
- `RateIndicatorAccordion indicators={indicators}` replaces flat RateDetailCard grid (D-05/D-08)
- `BankRateExpandable banks={bankItems}` replaces mobile cards + desktop table (D-09)
- "최근 금리 변동 이력" section entirely removed (D-14)
- Page order: hero -> accordion -> ad -> bank rates -> tools -> quicklinks (D-13)
- BANK_UNKNOWN filtered from validBanks before computing avg/min/max per Research Pitfall 3 (D-02)
- Build passed, deployed to donjup.com/rate, live curl confirmed "시중 주담대 평균금리" present

## Task Commits

1. **Task 1: Restructure page.tsx — hero card + wire components + remove history** - `d64758f` (feat)
2. **Task 2: Visual verification** - Auto-approved (checkpoint:human-verify in auto mode)

## Files Created/Modified

- `src/app/rate/page.tsx` - Restructured rate page: hero card + RateIndicatorAccordion + BankRateExpandable, history section removed

## Decisions Made

- Filter BANK_UNKNOWN before computing avgRate — avoids catch-all 'other' skewing the displayed average
- Hero card server-rendered (no 'use client') — static HTML for SEO and initial paint
- avgChangeBp computed as mean of all validBanks change_bp values — representative signal

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. All data flows from DB queries through server component to client components.

## Issues Encountered

None. Build passed first attempt. TypeScript compilation clean.

## User Setup Required

None.

## Self-Check

- [x] `src/app/rate/page.tsx` — file exists and was modified
- [x] Commit `d64758f` — present in git log
- [x] `시중 주담대 평균금리` present on live donjup.com/rate (curl confirmed count=2)
- [x] No "최근 금리 변동 이력" in page.tsx
- [x] No `function RateDetailCard` in page.tsx
- [x] No "use client" in page.tsx

## Self-Check: PASSED

---
*Phase: 12-rate-display-improvement*
*Completed: 2026-03-28*
