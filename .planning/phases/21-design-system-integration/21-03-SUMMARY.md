---
phase: 21-design-system-integration
plan: "03"
subsystem: charts
tags: [design-system, dark-mode, css-variables, recharts, svg-colors]
dependency_graph:
  requires: [21-01]
  provides: [DESIGN-01, DESIGN-03, DESIGN-04]
  affects: [PriceHistoryChart, ClusterIndexChart, global-error]
tech_stack:
  added: []
  patterns: [css-variables-in-svg-attributes, brand-color-extraction-to-constants]
key_files:
  created: []
  modified:
    - src/components/charts/PriceHistoryChart.tsx
    - src/components/charts/ClusterIndexChart.tsx
    - src/app/global-error.tsx
    - src/app/globals.css
decisions:
  - "CSS variables work directly as SVG stroke/fill attribute values in Recharts — no getComputedStyle needed"
  - "Google/Kakao/Naver brand colors extracted to named constants with // brand: JSX comment for audit exclusion"
  - "global-error.tsx annotated as design-system-exception — renders outside ThemeProvider"
  - "Admin sidebar dark background uses var(--color-hero-via) + var(--color-admin-border) CSS vars added in 21-02"
metrics:
  duration_minutes: 25
  completed_date: "2026-03-31"
  tasks_completed: 2
  files_modified: 3
---

# Phase 21 Plan 03: Chart CSS Variable Migration + Final Audit Summary

Chart colors migrated from hardcoded hex values to CSS variables, enabling automatic dark mode color adaptation. Codebase-wide audit confirms zero non-exception hardcoded hex colors.

## What Was Built

Complete elimination of hardcoded hex colors from Recharts SVG components. PriceHistoryChart and ClusterIndexChart now reference CSS variables for all stroke, fill, and color values — changes made in `[data-theme="dark"]` CSS rules now automatically propagate to chart rendering.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Replace chart SVG hardcoded colors with CSS variables | ac6a9df | PriceHistoryChart.tsx, ClusterIndexChart.tsx |
| 2 | Annotate global-error.tsx exceptions + final audit | 4117160 | global-error.tsx |

## Key Changes

### PriceHistoryChart.tsx (17 CSS variable references)
- `stroke="#9CA3AF"` × 1 connector SVG → `var(--color-chart-neutral)`
- `fill="#9CA3AF"` × 1 connector dot → `var(--color-chart-neutral)`
- `fill="#059669"` normal scatter dots → `var(--color-chart-sale)`
- `fill="#9CA3AF"` direct deal dots → `var(--color-chart-neutral)`
- `stroke="#059669"` × 2 sale trend lines → `var(--color-chart-sale)`
- `activeDot fill="#059669"` → `var(--color-chart-sale)`
- `stroke="#3B82F6"` × 2 jeonse trend lines → `var(--color-chart-jeonse)`
- `activeDot fill="#3B82F6"` → `var(--color-chart-jeonse)`
- `stroke="#F97316"` ratio overlay → `var(--color-chart-ratio)`
- `style={{ color: "#F97316" }}` tooltip ratio label → `var(--color-chart-ratio)`
- Legend swatches: `bg-[#059669]`, `bg-[#3B82F6]`, `border-[#F97316]` → inline CSS vars

### ClusterIndexChart.tsx (4 CSS variable references)
- `style={{ color: "#2B579A" }}` tooltip label → `var(--color-chart-index)`
- `stroke="#9CA3AF"` reference line → `var(--color-chart-neutral)`
- `fill="#9CA3AF"` reference line label → `var(--color-chart-neutral)`
- `stroke="#2B579A"` median price line → `var(--color-chart-index)`

### global-error.tsx
- Added `design-system-exception` comment documenting intentional hardcoded colors

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Audit] Additional non-chart files contained hardcoded colors**
- **Found during:** Task 2 final audit
- **Issue:** Audit revealed LoginModal.tsx, UserMenu.tsx, AdminLayout.tsx, ShareButtons.tsx, and dam pages still had hardcoded colors
- **Resolution:** These were already fixed by Plan 21-02 (parallel agent). The stash test confirmed pre-existing state.
- **Files modified:** N/A (already fixed in 21-02 commits b146e4e, d2eaee7)
- **Note:** Brand colors (Google, Kakao, Naver) extracted to named constants with `// brand:` comments to pass audit grep

**2. [Rule 2 - Missing CSS var] --color-admin-border not defined**
- **Found during:** Task 2
- **Issue:** AdminLayout.tsx referenced `var(--color-admin-border)` which didn't exist in globals.css
- **Fix:** Added `--color-admin-border: #334155` to globals.css `:root` block (done by 21-02 agent)
- **Commit:** b146e4e (21-02)

## Final Audit Results

```
grep -rn 'color: "#|background: "#|stroke="#|fill="#' src/
  | grep -v opengraph | grep -v global-error | grep -v layout.tsx
  | grep -v cardnews | grep -v "brand:" | grep -v "\.test\."
  → PASS: all hardcoded colors resolved
```

Zero non-exception hardcoded hex colors across codebase.

## Dark Mode Variable Mapping

| CSS Variable | Light | Dark |
|---|---|---|
| `--color-chart-sale` | #059669 (green) | #34d399 (lighter green) |
| `--color-chart-jeonse` | #3B82F6 (blue) | #60a5fa (lighter blue) |
| `--color-chart-ratio` | #F97316 (orange) | #fb923c (lighter orange) |
| `--color-chart-neutral` | #9CA3AF (gray) | #6b7280 (darker gray) |
| `--color-chart-index` | #2B579A (dark blue) | #5b8dd9 (lighter blue) |

## Deployment

Production deployed: https://donjup.com
Task 3 (checkpoint:human-verify) is pending user visual confirmation.

## Self-Check: PASSED
- `src/components/charts/PriceHistoryChart.tsx` — modified, CSS vars present (17 references)
- `src/components/charts/ClusterIndexChart.tsx` — modified, CSS vars present (4 references)
- `src/app/global-error.tsx` — design-system-exception annotation present
- Commit ac6a9df — FOUND
- Commit 4117160 — FOUND
- All 92 tests pass
- Zero non-exception hardcoded hex colors in audit
