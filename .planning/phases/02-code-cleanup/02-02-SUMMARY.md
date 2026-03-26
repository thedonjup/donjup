---
phase: 02-code-cleanup
plan: "02"
subsystem: db-layer
tags: [refactor, cleanup, naming, dead-code]
dependency_graph:
  requires: []
  provides: [db-layer-clean-imports]
  affects: [all-pages, all-api-routes, cron-jobs]
tech_stack:
  added: []
  patterns: [path-alias-consistency, no-dead-code]
key_files:
  created:
    - src/lib/db/server.ts
    - src/lib/db/rent-client.ts
  modified:
    - src/lib/db/client.ts
    - src/app/api/cron/generate-cardnews/route.ts
    - "44 files: all pages and API routes with @/lib/supabase imports"
  deleted:
    - src/lib/supabase/server.ts
    - src/lib/supabase/rent-client.ts
    - src/lib/supabase/client.ts
    - src/lib/supabase/ (directory)
decisions:
  - "Storage stub removal: generate-cardnews was the sole storage.upload caller; replaced with URL-pattern generation since no Supabase JS client is installed and upload was always failing"
metrics:
  duration: "~10 minutes"
  completed: "2026-03-26T00:04:20Z"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 47
requirements: [CLN-04, CLN-05]
---

# Phase 02 Plan 02: Supabase Naming Cleanup Summary

Renamed src/lib/supabase/ to src/lib/db/ by creating wrapper files and updating all 44 import paths, then removed the always-failing StorageApi/StorageBucketApi stub from db/client.ts.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Remove storage stub and move supabase wrappers to db/ | ec8e198 | src/lib/db/client.ts, src/lib/db/server.ts (new), src/lib/db/rent-client.ts (new), src/lib/supabase/ (deleted) |
| 2 | Update all import paths from @/lib/supabase to @/lib/db | bbce317 | 44 files: pages, API routes, sitemaps, OG images |

## Verification

- `grep -rn "@/lib/supabase" src/` returns 0 results
- `src/lib/supabase/` directory does not exist
- `grep "StorageBucketApi|StorageApi" src/lib/db/client.ts` returns 0 results
- `pnpm build` passes with exit code 0

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] generate-cardnews used storage.upload which was always failing**
- **Found during:** Task 2 (build TypeScript check)
- **Issue:** `src/app/api/cron/generate-cardnews/route.ts` was calling `supabase.storage.from("content").upload(...)` — the storage stub in db/client.ts always returned an error, making this cron job always fail at the upload step
- **Fix:** Removed the upload loop; replaced with direct URL pattern construction using `NEXT_PUBLIC_SUPABASE_URL`. The `content_queue` row is now inserted with empty storage_urls array (same effective result since uploads were failing anyway)
- **Files modified:** src/app/api/cron/generate-cardnews/route.ts
- **Commit:** bbce317

## Known Stubs

- `generate-cardnews/route.ts`: `storageUrls` is always an empty array (no actual file upload). The `content_queue.storage_urls` field will be empty. This is intentional — Supabase JS client is not installed and there is no storage adapter. Future plan needed to wire up real storage if card news upload is required.

## Self-Check: PASSED

- src/lib/db/server.ts: FOUND
- src/lib/db/rent-client.ts: FOUND
- src/lib/supabase/ directory: CONFIRMED DELETED
- Commits ec8e198 and bbce317: FOUND in git log
- pnpm build: PASSED
- @/lib/supabase imports remaining: 0
