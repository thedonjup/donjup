---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: 코드 품질 강화
current_phase: 16
status: ready_to_plan
stopped_at: v1.2 roadmap created — Phase 16 ready to plan
last_updated: "2026-03-28"
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State: 돈줍

**Current Phase:** 16
**Milestone:** v1.2 — 코드 품질 강화
**Status:** Ready to plan Phase 16

## Current Position

Phase: 16 of 19 (테스트 인프라 기반) — Ready to plan
Plan: Not started
Last activity: 2026-03-28 — v1.2 roadmap created

Progress: [░░░░░░░░░░] 0% (v1.2)

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

## Last Session

Stopped at: v1.2 roadmap created — all 4 phases defined
Last updated: 2026-03-28

---
*Last updated: 2026-03-28 — v1.2 roadmap initialized*
