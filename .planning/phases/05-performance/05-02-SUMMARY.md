---
phase: 05-performance
plan: 02
subsystem: infra
tags: [cron, rate-limiting, serverless, db-connections]
dependency_graph:
  requires: []
  provides: [staggered-crons, clean-proxy]
  affects: [vercel.json, src/proxy.ts]
tech_stack:
  added: []
  patterns: [staggered-cron-scheduling]
key_files:
  created: []
  modified:
    - vercel.json
    - src/proxy.ts
decisions:
  - "fetch-bank-rates moved from 10:00 Mon to 10:30 Mon to avoid collision with fetch-reb-index"
  - "fetch-rents batch 0-4 moved from 20:05-20:45 to 21:00-21:40 — fully after transaction window"
  - "enrich-complexes left at 21:50 — safe 10-min gap after rents batch=4 at 21:40"
  - "In-memory rate limiter removed with Vercel WAF recommendation documented in code"
metrics:
  duration: "5 minutes"
  completed: "2026-03-26"
  tasks_completed: 2
  files_modified: 2
---

# Phase 05 Plan 02: Cron Staggering + Rate Limiter Removal Summary

Staggered 23 cron schedules to prevent DB connection pool exhaustion and removed the useless in-memory rate limiter that reset on every serverless cold start.

## Tasks Completed

### Task 1: Stagger cron schedules in vercel.json
**Commit:** b522e21

Changed cron scheduling to fully separate transaction and rent batch windows:

| Job Group | Before | After |
|-----------|--------|-------|
| fetch-transactions batch=0-4 | 20:00, 20:10, 20:20, 20:30, 20:40 | unchanged |
| fetch-rents batch=0-4 | 20:05, 20:15, 20:25, 20:35, 20:45 (interleaved!) | 21:00, 21:10, 21:20, 21:30, 21:40 |
| fetch-reb-index | 10:00 Mon | unchanged |
| fetch-bank-rates | 10:00 Mon (collision!) | 10:30 Mon |
| fetch-rates | 22:00 | 22:10 |
| validate-data | 22:50 | 22:30 |
| send-push | 23:05 | 23:10 |

All 23 cron paths are identical to the original — only schedule values changed.

### Task 2: Remove in-memory rate limiter from proxy.ts
**Commit:** ed6fbcc

Replaced 68-line rate limiter implementation with 14-line pass-through. Removed:
- `rateLimitMap` (Map that reset on every cold start)
- `WINDOW_MS`, `MAX_REQUESTS` constants
- `cleanup()` function
- IP extraction and rate-check logic

Added comment pointing to Vercel WAF as the correct approach for serverless rate limiting.

## Verification

- `grep -c "fetch-rents" vercel.json` = 5 (all 5 rent batches present)
- No rent jobs between 20:00-20:50 (moved to 21:00+)
- fetch-reb-index (10:00) and fetch-bank-rates (10:30) no longer share the same minute
- `grep "rateLimitMap" src/proxy.ts` = 0 matches
- `pnpm build` succeeds with no TypeScript errors

## Deviations from Plan

### Minor: Cron count is 23, not 22

The plan's acceptance criteria stated "exactly 22 cron entries" but the original vercel.json had 23. The count of 23 is preserved correctly — all original paths are present. The acceptance criteria had an off-by-one error.

## Known Stubs

None.

## Self-Check: PASSED

- vercel.json exists with 23 cron entries: FOUND
- src/proxy.ts has no rateLimitMap: CONFIRMED
- Commits b522e21 and ed6fbcc: FOUND
- pnpm build: PASSED
