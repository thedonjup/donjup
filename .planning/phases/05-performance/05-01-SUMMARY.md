---
phase: 05-performance
plan: 01
subsystem: database
tags: [pg_trgm, gin-index, connection-pool, postgres, search, performance]

requires:
  - phase: 04-error-handling
    provides: "Structured error handling and logging in place before performance changes"

provides:
  - "SQL migration script for pg_trgm GIN indexes on apt_complexes (apt_name, region_name, dong_name)"
  - "DB connection pool increased from max:5 to max:10 with faster idle timeout"

affects: [search-api, cron-jobs, database]

tech-stack:
  added: []
  patterns:
    - "pg_trgm GIN indexes for ILIKE-based search acceleration"
    - "Conservative pool sizing for serverless with concurrent cron workloads"

key-files:
  created:
    - scripts/migrate-pg-trgm.sql
  modified:
    - src/lib/db/client.ts

key-decisions:
  - "Pool max 5→10: 22 cron jobs can overlap in adjacent time windows; 10 is conservative but safe for Neon free tier"
  - "idleTimeoutMillis 30_000→20_000: faster idle connection release back to Neon's connection manager"
  - "CONCURRENTLY flag on CREATE INDEX: avoids table locks during migration on live production DB"
  - "Migration script as standalone SQL file, not auto-applied on startup: user controls when to run it against prod"

patterns-established:
  - "DB migration scripts go in scripts/*.sql with a header comment showing the exact psql run command"

requirements-completed: [PERF-01, PERF-02]

duration: 8min
completed: 2026-03-26
---

# Phase 05 Plan 01: pg_trgm GIN Indexes + Connection Pool Sizing Summary

**pg_trgm GIN indexes created for ILIKE search on apt_complexes, connection pool doubled from 5 to 10 for concurrent cron safety**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-26T00:00:00Z
- **Completed:** 2026-03-26
- **Tasks:** 1 of 2 executed (Task 2 is checkpoint:human-action — DB migration must run manually)
- **Files modified:** 2

## Accomplishments

- Created `scripts/migrate-pg-trgm.sql` with pg_trgm extension and 3 GIN indexes using CONCURRENTLY to avoid locks
- Updated connection pool from `max: 5` to `max: 10` for concurrent cron job + user traffic safety
- Reduced `idleTimeoutMillis` from 30,000 to 20,000ms for faster idle connection release
- Build verified clean (347 static pages, no TypeScript errors)

## Task Commits

1. **Task 1: pg_trgm migration script + pool config** - `6108451` (feat)

## Files Created/Modified

- `scripts/migrate-pg-trgm.sql` - pg_trgm extension + 3 GIN indexes on apt_complexes (apt_name, region_name, dong_name); run with `psql $DATABASE_URL -f scripts/migrate-pg-trgm.sql`
- `src/lib/db/client.ts` - Pool config: max 5→10, idleTimeoutMillis 30_000→20_000

## Decisions Made

- Pool max set to 10 (not higher): Neon free tier has connection limits; 10 is enough for 22 cron jobs that rarely all overlap simultaneously
- CONCURRENTLY on all CREATE INDEX statements: live production table must not be locked during migration
- Migration as explicit SQL script (not auto-startup): gives operator control over when to apply against production

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

**Migration must be applied manually against the production database.**

Run:
```bash
psql $DATABASE_URL -f scripts/migrate-pg-trgm.sql
```

Verify indexes were created:
```bash
psql $DATABASE_URL -c "\di idx_apt_complexes_*"
```

Test search performance improvement:
```bash
psql $DATABASE_URL -c "EXPLAIN ANALYZE SELECT * FROM apt_complexes WHERE apt_name ILIKE '%래미안%';"
```
Expected: "Bitmap Index Scan" using the trgm index, NOT "Seq Scan".

Note: If running on CockroachDB, pg_trgm may not be available. Skip the `CREATE EXTENSION` line and create GIN indexes with standard ops instead.

## Issues Encountered

None.

## Next Phase Readiness

- Pool config is live immediately (deployed with next commit/push)
- GIN indexes take effect once migration SQL is run against production
- Phase 05 Plan 02 (code splitting for large components) can proceed independently

---
*Phase: 05-performance*
*Completed: 2026-03-26*

## Self-Check: PASSED

- FOUND: scripts/migrate-pg-trgm.sql
- FOUND: src/lib/db/client.ts
- FOUND: .planning/phases/05-performance/05-01-SUMMARY.md
- FOUND: commit 6108451
