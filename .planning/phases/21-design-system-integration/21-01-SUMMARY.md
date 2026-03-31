---
phase: 21-design-system-integration
plan: "01"
subsystem: css-foundation
tags: [dark-mode, css-variables, design-system, tailwind]
dependency_graph:
  requires: []
  provides: [dark-mode-variant, drop-level-css-vars, chart-css-vars, centralized-drop-level-config]
  affects: [src/app/globals.css, src/lib/constants/drop-level.ts, src/app/today/page.tsx, src/components/apt/TransactionTabs.tsx, src/components/home/RankingTabs.tsx]
tech_stack:
  added: []
  patterns: [css-custom-variant, css-variables-dark-override, centralized-constants]
key_files:
  created:
    - src/lib/constants/drop-level.ts
  modified:
    - src/app/globals.css
    - src/app/today/page.tsx
    - src/components/apt/TransactionTabs.tsx
    - src/components/home/RankingTabs.tsx
decisions:
  - "@custom-variant dark uses [data-theme='dark'] selector to activate all Tailwind dark: utilities"
  - "DROP_LEVEL_CONFIG uses CSS variable references (var(--color-drop-level-*)) so badge colors automatically respond to dark mode theme"
metrics:
  duration: "~3 minutes"
  completed_date: "2026-03-31"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 5
---

# Phase 21 Plan 01: CSS Foundation + DROP_LEVEL_CONFIG Centralization Summary

**One-liner:** Tailwind dark: utilities enabled via @custom-variant dark + 11 new CSS vars + DROP_LEVEL_CONFIG centralized with CSS variable color references.

## What Was Built

1. **`@custom-variant dark` declaration** — Single line added to globals.css immediately after `@import "tailwindcss"`. This is the DESIGN-02 fix that activates all `dark:` Tailwind utilities when `[data-theme="dark"]` is set on the html element. Without this, every `dark:bg-*`, `dark:text-*` etc. was inert.

2. **11 new CSS variables in globals.css:**
   - 6 drop-level vars: `--color-drop-level-{decline,crash,severe}` and `*-bg` variants in both `:root` and `[data-theme="dark"]`
   - 5 chart vars: `--color-chart-{sale,jeonse,ratio,neutral,index}` in both `:root` and `[data-theme="dark"]`

3. **Centralized `src/lib/constants/drop-level.ts`** — Single source of truth for DROP_LEVEL_CONFIG. Color values now use `var(--color-drop-level-*)` references so badges automatically adapt to dark mode without conditional logic.

4. **3 consumer files updated** — today/page.tsx, TransactionTabs.tsx, RankingTabs.tsx all remove their local DROP_LEVEL_CONFIG definitions and import from the centralized module.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add @custom-variant dark + CSS variables | 9685c1f | src/app/globals.css |
| 2 | Centralize DROP_LEVEL_CONFIG + update 3 consumers | 6082515 | src/lib/constants/drop-level.ts, 3 consumer files |

## Verification Results

- `grep "@custom-variant dark" src/app/globals.css` → 1 match (line 3)
- `grep -c "color-drop-level-decline:" src/app/globals.css` → 2 matches (root + dark)
- `grep -c "color-chart-sale:" src/app/globals.css` → 2 matches (root + dark)
- `grep -rn "DROP_LEVEL_CONFIG\s*=" src/ --include="*.tsx"` → 0 matches (no local definitions)
- All 3 consumers contain `from "@/lib/constants/drop-level"` (1 match each)
- Build: pre-existing `pg` module-not-found errors (5 errors, all unrelated to these changes, confirmed by stash test)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data flows through CSS variables that are wired to real values in globals.css.

## Self-Check: PASSED

- [x] `src/app/globals.css` exists with @custom-variant dark at line 3
- [x] `src/lib/constants/drop-level.ts` exists and exports DROP_LEVEL_CONFIG
- [x] Commits 9685c1f and 6082515 exist in git log
- [x] Zero local DROP_LEVEL_CONFIG definitions in .tsx files
- [x] All 3 consumers import from centralized location
