---
phase: 21-design-system-integration
plan: 02
subsystem: ui
tags: [css-variables, dark-mode, design-system, tailwind, next.js]

# Dependency graph
requires:
  - phase: 21-01
    provides: CSS variable foundation in globals.css (:root and dark theme)
provides:
  - Zero hardcoded hex colors in inline styles across 11 component files
  - All tab active states using var(--color-text-inverted) instead of #fff
  - Brand-specific colors (Kakao/Naver) annotated with // brand: comments
  - New CSS vars: --color-admin-border, --color-status-posted-bg, --color-status-posted
affects: [22-url-restructure, 23-broken-features, 24-ux-improvements]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tab active text: var(--color-text-inverted) instead of #fff for dark mode correctness"
    - "Brand exception pattern: // brand: comments on Kakao/Naver hardcoded colors"
    - "Admin UI border: var(--color-admin-border) for slate-700 admin sidebar"

key-files:
  created: []
  modified:
    - src/components/apt/TransactionTabs.tsx
    - src/components/apt/AptDetailClient.tsx
    - src/components/home/RankingTabs.tsx
    - src/components/onboarding/RegionSelector.tsx
    - src/components/auth/LoginModal.tsx
    - src/components/auth/UserMenu.tsx
    - src/components/ShareButtons.tsx
    - src/app/dam/AdminLayout.tsx
    - src/app/dam/content/page.tsx
    - src/app/dam/users/page.tsx
    - src/app/dam/cron/page.tsx
    - src/app/globals.css

key-decisions:
  - "var(--color-text-inverted) for active tab text — dark mode inverts to dark text, correct contrast in both themes"
  - "Kakao/Naver/Google brand SVG colors kept as-is with // brand: annotations — brand identity requires exact colors"
  - "Added --color-admin-border (#334155 light, #1e293b dark) — admin sidebar uses slate palette distinct from page border"
  - "Added --color-status-posted-bg/posted (#dbeafe/#2563eb light, blue-dark variants) — status badge needs dedicated semantic var"
  - "RankingTabs low-floor badge: rgba(107,114,128,0.12)/color:#6b7280 → var(--color-surface-elevated)/var(--color-text-tertiary)"

patterns-established:
  - "Active button text: always var(--color-text-inverted), never #fff/#ffffff/white"
  - "Brand-specific exceptions: annotated with // brand: comment inline"
  - "Admin UI: --color-admin-border + --color-hero-via for sidebar bg"

requirements-completed: [DESIGN-01, DESIGN-03]

# Metrics
duration: 25min
completed: 2026-03-31
---

# Phase 21 Plan 02: Component Hex Color Sweep Summary

**11 component files cleaned of hardcoded hex colors — active tabs use var(--color-text-inverted), brand exceptions (Kakao/Naver) annotated, 3 new CSS vars added for admin/status**

## Performance

- **Duration:** 25 min
- **Started:** 2026-03-31T12:00:00Z
- **Completed:** 2026-03-31T12:25:00Z
- **Tasks:** 2
- **Files modified:** 12 (11 components + globals.css)

## Accomplishments

- Replaced all `color: "#fff"` active-state occurrences with `var(--color-text-inverted)` — dark mode inverts correctly
- Replaced `#059669` (brand green) with `var(--color-semantic-rise)` in UserMenu and LoginModal brand icon
- Replaced `#dc2626` error color with `var(--color-semantic-drop)`, `#f59e0b` with `var(--color-semantic-warn)`
- Replaced `#2563eb` blue buttons with `var(--color-brand-600)` in dam/content and dam/cron
- Admin sidebar: `#1e293b`/`#334155` → `var(--color-hero-via)`/`var(--color-admin-border)` with proper dark variant
- Kakao/Naver/Google brand colors retained with `// brand:` annotation as intentional exceptions
- Added 3 new CSS variables to globals.css with light/dark theme values

## Task Commits

1. **Task 1: Replace hardcoded hex colors in apt/home/onboarding components** - `d2eaee7` (feat)
2. **Task 2: Replace hardcoded hex colors in auth/share/dam components** - `b146e4e` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/components/apt/TransactionTabs.tsx` - Active tab + size button color → var(--color-text-inverted)
- `src/components/apt/AptDetailClient.tsx` - Active state colors + #F59E0B jeonse ratio → CSS vars
- `src/components/home/RankingTabs.tsx` - Low-floor badge #6b7280 → var(--color-text-tertiary)
- `src/components/onboarding/RegionSelector.tsx` - Save button color #fff → var(--color-text-inverted)
- `src/components/auth/LoginModal.tsx` - Brand icon bg, error color → CSS vars; Kakao/Naver annotated
- `src/components/auth/UserMenu.tsx` - #059669 × 3 → var(--color-semantic-rise)
- `src/components/ShareButtons.tsx` - Kakao colors annotated with // brand: comments
- `src/app/dam/AdminLayout.tsx` - Sidebar bg/border → var(--color-hero-via) + var(--color-admin-border)
- `src/app/dam/content/page.tsx` - Posted badge → var(--color-status-posted-*); post button → var(--color-brand-600)
- `src/app/dam/users/page.tsx` - Firebase Console button #f59e0b → var(--color-semantic-warn)
- `src/app/dam/cron/page.tsx` - Run button #2563eb → var(--color-brand-600)
- `src/app/globals.css` - Added --color-admin-border, --color-status-posted-bg, --color-status-posted

## Decisions Made

- `var(--color-text-inverted)` chosen over hardcoding `#fff` — in dark mode `--color-text-inverted` resolves to `#0f172a` (dark text), ensuring proper contrast on green/brand backgrounds
- Admin border kept separate from page border (`#334155` vs `#e2e8f0`) — admin UI intentionally uses slate-700 for a dark sidebar regardless of theme
- `--color-status-posted` family added (not reusing `--color-brand-600`) because posted status is informational blue, distinct from the green brand

## Deviations from Plan

None - plan executed exactly as written. The LoginModal.tsx had already been partially updated by a linter (border and Google button colors) from the previous session; remaining hex colors were updated per plan.

## Issues Encountered

- Pre-existing build failures (missing `pg` and `firebase-admin` packages in worktree) unrelated to this plan's changes — all 92 Vitest tests pass

## Next Phase Readiness

- DESIGN-01 (zero hardcoded hex in component inline styles) and DESIGN-03 (inline style elimination) requirements met for all non-chart components
- Plan 03 (chart component sweep) is next — chart files explicitly excluded from this plan's scope
- All changed components ready for dark mode testing

---
*Phase: 21-design-system-integration*
*Completed: 2026-03-31*
