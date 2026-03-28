---
phase: 12-rate-display-improvement
plan: 01
subsystem: ui
tags: [react, typescript, tailwind, accordion, expandable, client-component]

requires: []
provides:
  - RateIndicatorAccordion client component with collapsed-by-default accordion (RATE-02)
  - BankRateExpandable client component with click-to-expand mobile+desktop layout (RATE-03)
  - IndicatorItem and BankRateItem exported interfaces for Plan 02 to use
affects:
  - 12-02 (will import these components into rate/page.tsx)

tech-stack:
  added: []
  patterns:
    - "CSS max-height transition for accordion/expand (max-h-0 to max-h-[300px] or max-h-32)"
    - "Single openIndex / expandedBank state with null = all collapsed"
    - "use client wrapper components receiving serialized plain props from server"

key-files:
  created:
    - src/components/rate/RateIndicatorAccordion.tsx
    - src/components/rate/BankRateExpandable.tsx
  modified: []

key-decisions:
  - "CSS max-height transition used for accordion animation (no external library)"
  - "Desktop expand uses conditional <tr> row with colSpan=4 (not CSS transition) for table layout compatibility"

patterns-established:
  - "Accordion default collapsed: useState<number | null>(null) — null means nothing open"
  - "Expandable bank rows default collapsed: useState<string | null>(null)"

requirements-completed: [RATE-02, RATE-03]

duration: 15min
completed: 2026-03-28
---

# Phase 12 Plan 01: Rate Display Improvement — Client Components Summary

**Two 'use client' accordion/expandable components for rate page interactions — RateIndicatorAccordion with CSS max-height transitions and BankRateExpandable with mobile card + desktop table layouts, both collapsed by default**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-28T18:15:00Z
- **Completed:** 2026-03-28T18:30:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- RateIndicatorAccordion with 5-item accordion, default collapsed, chevron rotate-180 animation, MiniAreaChart in panel
- BankRateExpandable with mobile sm:hidden cards and desktop hidden sm:block table, click-to-expand showing 이전 금리 and 변동일
- Both components export typed interfaces (IndicatorItem, BankRateItem) ready for Plan 02 to import and pass serialized server data

## Task Commits

1. **Task 1: Create RateIndicatorAccordion client component (RATE-02)** - `6716aac` (feat)
2. **Task 2: Create BankRateExpandable client component (RATE-03)** - `082ee8d` (feat)

## Files Created/Modified

- `src/components/rate/RateIndicatorAccordion.tsx` - Accordion client component for 5 rate indicators with CSS transition panels and MiniAreaChart
- `src/components/rate/BankRateExpandable.tsx` - Expandable bank rate component with responsive mobile/desktop layout

## Decisions Made

- CSS max-height transition for accordion animation (no external library needed, pattern already used in codebase)
- Desktop expand uses conditional `<tr>` row with `colSpan={4}` rather than CSS transition — required for table layout where CSS transitions on table rows are unreliable cross-browser
- Used `key` prop on `<>` fragment wrapper for desktop rows to avoid React key warning

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. TypeScript compiled clean (verified via `npx tsc --noEmit` project-wide, no errors in new files).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Both client components are ready to import in Plan 02
- Plan 02 will wire server data from rate/page.tsx into these components
- IndicatorItem and BankRateItem interfaces are exported — Plan 02 server code should map FinanceRate DB records to these shapes

---
*Phase: 12-rate-display-improvement*
*Completed: 2026-03-28*
