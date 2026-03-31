---
phase: 20-format-utils-normalization
plan: 01
subsystem: testing
tags: [vitest, typescript, format-utils, tdd]

# Dependency graph
requires: []
provides:
  - src/lib/format.ts with formatPriceShort, formatPriceAxis, formatNullable, formatArea, formatDateKo
  - src/lib/apt-url.ts with makeSlug
  - tests/unit/format.test.ts with 26 unit tests (TDD RED-GREEN)
affects:
  - 20-02 (codebase sweep: all callers of format functions)
  - 20-03 (data display normalization using new functions)
  - 22 (URL structure: makeSlug central definition)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD RED-GREEN: tests written first, then implementations"
    - "formatArea as alias of formatSizeWithPyeong — zero duplication, backward compatible"
    - "formatNullable handles null/undefined/empty-string/0 uniformly"

key-files:
  created:
    - src/lib/apt-url.ts
    - tests/unit/format.test.ts
  modified:
    - src/lib/format.ts

key-decisions:
  - "formatArea = formatSizeWithPyeong alias — avoids duplicate functions, existing callers unaffected"
  - "formatNullable treats 0 as empty — consistent with UI display convention (0원 displayed as -)"
  - "makeSlug uses kebab-case and strips special chars with regex, Korean chars preserved"

patterns-established:
  - "Format utils: all formatting through src/lib/format.ts (single source of truth)"
  - "URL slugs: all slug generation through src/lib/apt-url.ts makeSlug"

requirements-completed: [DATA-01, DATA-02, DATA-03, DATA-04]

# Metrics
duration: 8min
completed: 2026-03-31
---

# Phase 20 Plan 01: Format Utils — Central Module + TDD Summary

**9 new format function exports (formatPriceShort, formatPriceAxis, formatNullable, formatArea, formatDateKo, makeSlug) with 26 unit tests via TDD RED-GREEN cycle**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-31T01:34:16Z
- **Completed:** 2026-03-31T01:42:00Z
- **Tasks:** 2
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments

- Created `src/lib/apt-url.ts` with central `makeSlug` function (prerequisite for Phase 22 URL structure overhaul)
- Added 5 new exports to `src/lib/format.ts`: formatPriceShort, formatPriceAxis, formatNullable, formatArea, formatDateKo
- 26 unit tests cover all new and existing format functions; all pass (GREEN)

## Task Commits

Each task was committed atomically:

1. **Task 1: RED — Write failing unit tests** - `d1422f4` (test)
2. **Task 2: GREEN — Implement format functions** - `706abf4` (feat)

## Files Created/Modified

- `tests/unit/format.test.ts` - 26 unit tests for all format functions (TDD RED phase)
- `src/lib/format.ts` - Added formatPriceShort, formatPriceAxis, formatNullable, formatArea, formatDateKo
- `src/lib/apt-url.ts` - New file: makeSlug central definition

## Decisions Made

- `formatArea = formatSizeWithPyeong` alias — same output, zero duplication, existing callers of `formatSizeWithPyeong` remain unaffected while new callers can use the more readable `formatArea` name
- `formatNullable` treats `0` as falsy (returns fallback) — consistent with UI display intent where 0-value prices/areas should show "-" rather than "0"
- `makeSlug` preserves Korean characters (가-힣 range) while replacing spaces and special chars with `-`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All format utility contracts are now defined and tested
- Plan 02 (codebase sweep) can safely replace inline price formatting with `formatPriceShort`/`formatPriceAxis`
- Plan 03 (data display normalization) can use `formatNullable`, `formatArea`, `formatDateKo`
- Phase 22 (URL structure) can import `makeSlug` from `@/lib/apt-url`

---
*Phase: 20-format-utils-normalization*
*Completed: 2026-03-31*
