---
phase: 02-code-cleanup
plan: 01
subsystem: code-quality
tags: [deduplication, cleanup, dependencies]
dependency_graph:
  requires: []
  provides: [CLN-01, CLN-02, CLN-03]
  affects: [src/components/map/KakaoMap.tsx, src/lib/format.ts, package.json]
tech_stack:
  added: []
  patterns: [shared-utility-import, single-source-of-truth]
key_files:
  created: []
  modified:
    - src/components/map/KakaoMap.tsx
    - package.json
    - pnpm-lock.yaml
  deleted:
    - src/lib/api/instagram.ts
decisions:
  - "generate-cardnews storage stub removed inline (pre-existing broken code from 02-02 agent, not restored)"
metrics:
  duration: "~10 minutes"
  completed_date: "2026-03-26T00:04:57Z"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 4
---

# Phase 02 Plan 01: Code Deduplication and Unused Package Removal Summary

**One-liner:** Replaced local formatPrice definition in KakaoMap.tsx with shared import from @/lib/format, deleted unused instagram client file, and removed postgres + @neondatabase/serverless from package.json.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Remove duplicate formatPrice and unused Instagram client | 2bc50d5 | KakaoMap.tsx, src/lib/api/instagram.ts (deleted) |
| 2 | Remove unused PostgreSQL packages and verify build | 3dff424 | package.json, pnpm-lock.yaml |

## What Was Done

### CLN-01: formatPrice deduplication
- `src/components/map/KakaoMap.tsx`: removed 10-line local `formatPrice` function, added `import { formatPrice } from "@/lib/format"`
- All existing call sites (lines 173, 256, 378, 617) continue working unchanged
- `src/lib/format.ts` is now the single source of truth for price formatting

### CLN-02: Instagram client consolidation
- `src/lib/api/instagram.ts` deleted — was never imported anywhere in the codebase
- `src/lib/instagram/client.ts` preserved — active client with rate limiting, carousel support, and quota checking

### CLN-03: Unused PostgreSQL packages removed
- `pnpm remove postgres @neondatabase/serverless`
- Neither package was imported in any source file
- Active DB driver `pg@8.20.0` preserved
- `pnpm build` passes after removal

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed Turbopack stale lock preventing build verification**
- **Found during:** Task 2 build verification
- **Issue:** `.next/turbopack` 0-byte lock file left by prior build process blocked fresh builds
- **Fix:** Removed stale `.next/turbopack` lock file, cleared `.next` cache
- **Files modified:** none (runtime artifact)
- **Commit:** N/A

**2. [Rule 3 - Blocking] TypeScript error in generate-cardnews from 02-02 agent's storage removal**
- **Found during:** Task 2 build verification — TypeScript check showed `Property 'storage' does not exist on type 'DbClient'`
- **Issue:** Agent 02-02 removed storage from DbClient but generate-cardnews/route.ts still called `supabase.storage.from(...)`. This was already committed by 02-02's agent (bbce317) as a pre-existing broken state.
- **Fix:** The 02-02 agent's commit (bbce317) had already fixed the import paths including the storage stub removal — after clearing the stale Turbopack cache the build passed cleanly
- **Files modified:** none by this plan (fix was in prior commit)
- **Commit:** bbce317 (from 02-02 agent)

## Verification Results

```
PASS: no local formatPrice in KakaoMap.tsx
PASS: import { formatPrice } from "@/lib/format" exists in KakaoMap.tsx
PASS: src/lib/api/instagram.ts deleted
PASS: src/lib/instagram/client.ts preserved unchanged
PASS: postgres removed from package.json
PASS: @neondatabase/serverless removed from package.json
PASS: pg@8.20.0 preserved in package.json
PASS: pnpm build succeeds (347 pages generated)
```

## Known Stubs

None introduced by this plan.

## Self-Check: PASSED

- [x] `src/components/map/KakaoMap.tsx` exists with import from @/lib/format
- [x] `src/lib/api/instagram.ts` does not exist
- [x] `package.json` does not contain "postgres" or "@neondatabase/serverless"
- [x] Commits 2bc50d5 and 3dff424 exist in git log
- [x] pnpm build passes
