---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: 코드 품질 강화
current_phase: 19
status: planning
stopped_at: Completed 18-04-PLAN.md
last_updated: "2026-03-28T14:05:48.567Z"
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 8
  completed_plans: 8
---

# Project State: 돈줍

**Current Phase:** 19
**Milestone:** v1.2 — 코드 품질 강화
**Status:** Ready to plan

## Current Position

Phase: 18 (drizzle-orm) — EXECUTING
Plan: Not started

## Active Phase

**Phase 16: 테스트 인프라 기반**
TEST-01, TEST-02, TEST-03 — Vitest 설정 + price-normalization + cluster-index 유닛 테스트

Parallel candidate (independent of Phase 16):

- Phase 18: Drizzle ORM 교체 (ORM-01~06) — can start alongside Phase 16/17

Dependency chain:

- Phase 16 → Phase 17 (통합/E2E는 Vitest 환경 필요)
- Phase 18 → Phase 19 (CLEAN-03은 ORM 단일화 완료 후)

## Key Context

**v1.2 phase structure:**

- Wave 1 (parallel): Phase 16 (Vitest + unit tests) + Phase 18 (Drizzle ORM)
- Wave 2: Phase 17 (API integration + E2E — needs Phase 16)
- Wave 3: Phase 19 (코드 정리 — needs Phase 18)

**Critical constraints:**

- DB 스키마 변경 없음 — Drizzle은 기존 스키마에 매핑 (마이그레이션 없음)
- Neon PostgreSQL ssl: { rejectUnauthorized: false } 유지 필수
- Vercel serverless 환경 — Drizzle 커넥션 풀 호환성 확인 필요

## Pending Todos

None.

## Blockers/Concerns

- Drizzle + Neon serverless 커넥션 방식 확인 필요 (@neondatabase/serverless adapter vs pg)
- Playwright E2E: Vercel preview URL vs localhost — 테스트 환경 전략 결정 필요

## Decisions

(v1.1 decisions archived — see PROJECT.md Key Decisions)

- [Phase 16]: vitest globals:false + environment:node for strict TypeScript safety in server-side unit tests
- [Phase 16]: vi.mock('@/lib/db/client') hoisted by Vitest; mockPoolQuery helper centralizes Pool mock setup
- [Phase 17-integration-e2e-tests]: vi.mock(@/lib/db/client) covers both createServiceClient and createRentServiceClient since both delegate to createDbClient
- [Phase 17-integration-e2e-tests]: makeMockDb() thenable chain pattern established for QueryBuilder mock in integration tests
- [Phase 17-integration-e2e-tests]: Playwright chromium-only project, webServer dev mode with reuseExistingServer
- [Phase 18-drizzle-orm]: casing:'snake_case' on drizzle instance preserves existing snake_case destructuring across all 35 call sites
- [Phase 18-drizzle-orm]: pnpm used for drizzle install — npm has arborist bug with closure-net git dep
- [Phase 18-drizzle-orm]: onConflictDoNothing for apt_transactions and apt_rent_transactions upserts; onConflictDoUpdate for financeRates and rebPriceIndices; crypto.randomUUID() defaultFn for auto-generated UUIDs in text PK schemas
- [Phase 18-drizzle-orm]: Explicit snake_case aliases used for pages with snake_case downstream types; single db instance handles all tables
- [Phase 18-drizzle-orm]: Supabase RPC get_monthly_volume removed; replaced with direct query + server-side JS aggregation
- [Phase 18-drizzle-orm]: db.execute(sql tagged template) for search/page dynamic WHERE — sql.join() with individually constructed sql chunks handles multi-part OR conditions with shared parameter values
- [Phase 18-drizzle-orm]: Legacy DB files (client.ts, server.ts, rent-client.ts) deleted — codebase now has single db entry point at src/lib/db/index.ts

## Last Session

Stopped at: Completed 18-04-PLAN.md
Last updated: 2026-03-28

---
*Last updated: 2026-03-28 — v1.2 roadmap initialized*
