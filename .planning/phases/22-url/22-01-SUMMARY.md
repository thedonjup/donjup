---
phase: 22-url
plan: 01
subsystem: routing
tags: [url-migration, seo, redirect, apt-detail]
dependency_graph:
  requires: []
  provides: [aptUrl-function, govtComplexId-route, proxy-redirect, backfill-api]
  affects: [apt-detail-page, og-image, proxy, internal-links]
tech_stack:
  added: []
  patterns: [central-url-builder, 308-permanent-redirect, govtComplexId-lookup]
key_files:
  created:
    - src/app/apt/[govtComplexId]/page.tsx
    - src/app/apt/[govtComplexId]/opengraph-image.tsx
    - src/app/api/backfill-govt-id/route.ts
  modified:
    - src/lib/apt-url.ts
    - src/proxy.ts
decisions:
  - "aptUrl() falls back to /apt/{regionCode}/{urlSlug} for complexes without govtComplexId, ensuring zero broken links during transition"
  - "Backfill derives govtComplexId from slug pattern {regionCode}-{aptSeq} — Korean-name slugs skipped (require MOLIT API)"
  - "proxy.ts pattern-matching approach (no DB query) for 308 redirect — edge-compatible and fast"
metrics:
  duration_seconds: 359
  completed_date: "2026-04-03"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 2
---

# Phase 22 Plan 01: URL Foundation — New Route + Redirect + Backfill Summary

**One-liner:** New `/apt/[govtComplexId]` route with govtComplexId DB lookup, aptUrl() central builder, proxy 308 redirect from old slug URLs, and slug-pattern backfill API.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | aptUrl() + /apt/[govtComplexId] route + OG image | 015e191 | src/lib/apt-url.ts, src/app/apt/[govtComplexId]/page.tsx, src/app/apt/[govtComplexId]/opengraph-image.tsx |
| 2 | proxy.ts 308 redirect + backfill API | a6faa0f | src/proxy.ts, src/app/api/backfill-govt-id/route.ts |

## What Was Built

**aptUrl() function** (`src/lib/apt-url.ts`): Central URL builder that returns `/apt/{govtComplexId}` when available, with fallback to `/apt/{regionCode}/{urlSlug}` for pre-backfill complexes.

**New apt detail route** (`src/app/apt/[govtComplexId]/page.tsx`): Full apartment detail page with:
- Primary DB lookup via `eq(aptComplexes.govtComplexId, govtComplexId)`
- Fallback slug lookup for edge cases
- Nearby complex links using `aptUrl()` with `govt_complex_id` in query select
- FavoriteButton, Comments, ViewDetailTracker all keyed on `govtComplexId`
- Canonical URL and OG URLs pointing to `/apt/{govtComplexId}`

**OG image route** (`src/app/apt/[govtComplexId]/opengraph-image.tsx`): govtComplexId-based lookup, identical layout to the old route.

**proxy.ts 308 redirect**: Pattern `/^\/apt\/(\d{5})\/(.+)$/` matches old URLs, redirects to `/apt/{region}-{slug}` with status 308. matcher array extended to include `/apt/:region/:slug*`.

**Backfill API** (`/api/backfill-govt-id`): One-shot GET endpoint that finds complexes with null `govtComplexId`, derives the value from slug pattern `{regionCode}-{aptSeq}`, and updates per-row. Returns count of updated/remaining rows.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed redundant double-update in backfill route**
- **Found during:** Task 2 implementation
- **Issue:** Plan code had two consecutive `db.update()` calls per row — the first updated `isNull(govtComplexId)` (all null rows) then immediately overrode with per-row update. Logic was contradictory.
- **Fix:** Kept only the per-row `eq(aptComplexes.id, row.id)` update, removed the bulk update. Also inlined `eq` import at top level instead of dynamic import.
- **Files modified:** src/app/api/backfill-govt-id/route.ts
- **Commit:** a6faa0f

## Known Stubs

None — all data is wired to live DB queries.

## Notes

- Pre-existing build failure (`firebase-admin` module not found) is out of scope — confirmed to exist before these changes
- TypeScript: no errors in any new/modified files (only pre-existing firebase-admin and test type errors)

## Self-Check: PASSED
