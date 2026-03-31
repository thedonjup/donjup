---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: 서비스 품질 개선
current_phase: 21
status: executing
stopped_at: Completed 21-01-PLAN.md
last_updated: "2026-03-31T02:55:41.233Z"
progress:
  total_phases: 9
  completed_phases: 5
  total_plans: 15
  completed_plans: 13
---

# Project State: 돈줍

**Current Phase:** 21
**Milestone:** v1.3 — 서비스 품질 개선
**Status:** Ready to execute

## Current Position

Phase: 21 (design-system-integration) — EXECUTING
Plan: 2 of 3

## Key Context

**v1.3 phase structure:**

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 20 | 포맷 유틸 중앙화 + 데이터 표현 정규화 | DATA-01~04 | Not started |
| 21 | 디자인 시스템 통합 | DESIGN-01~04 | Not started |
| 22 | URL 구조 개편 | URL-01~06 | Not started |
| 23 | 깨진 기능 복구 | FIX-01~03 | Not started |
| 24 | UX 개선 | UX-01~02 | Not started |

**Dependency order:**

- Phase 20 must complete before Phase 21 and Phase 24
- Phase 20 (DATA-04, makeSlug) must complete before Phase 22
- Phase 23 is fully independent (can run any time after v1.2)

**Critical constraints:**

- CockroachDB Serverless (Neon PostgreSQL, ap-southeast-1)
- Firebase Auth + Firestore (댓글)
- Vercel serverless 환경
- 최소 비용 원칙

## Accumulated Context

**v1.3 key decisions:**

- Vercel Blob (`@vercel/blob@^2.3.2`) 선택 — Cloudflare R2 대비 기존 스택과 통합 자연스럽고 비용 동등
- URL migration: `/apt/[region]/[slug]` → `/apt/[govtComplexId]`, 308 redirect via `src/middleware.ts`
- `@custom-variant dark` 추가가 다크모드 전체 문제의 핵심 one-line fix
- Phase 20의 `makeSlug` 중앙화가 Phase 22 URL 개편의 선행 조건

**Research flags (from SUMMARY.md):**

- Phase 22 전: `SELECT COUNT(*) FROM apt_complexes WHERE govt_complex_id IS NULL` 실행 필요 — 5% 초과 시 backfill migration 선행 필요
- Phase 23 전: `@vercel/blob` v2.3.2 `put()` + `handleUpload` API 시그니처 확인 필요
- Vercel serverless 4.5MB body limit → 이미지 업로드는 client-side upload 패턴 사용 필수

## Pending Todos

- [ ] Phase 22 시작 전 govtComplexId null coverage 쿼리 실행
- [ ] Phase 23 시작 전 `vercel env pull .env.local`로 `BLOB_READ_WRITE_TOKEN` 확인

## Blockers/Concerns

None — roadmap complete, ready to plan Phase 20.

## Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-31 | Vercel Blob 선택 | 기존 스택 자연스러운 통합, Cloudflare R2 대비 비용 동등 |
| 2026-03-31 | Phase 20 먼저 (데이터 포맷) | pure refactor, zero runtime risk, de-risks Phase 21/24 |
| 2026-03-31 | URL migration 308 (not 301) | 308 preserves POST method, Next.js middleware edge-compatible, Google treats same as 301 for SEO |

- [Phase 20]: formatArea = formatSizeWithPyeong alias — avoids duplicate functions, existing callers unaffected
- [Phase 20]: makeSlug centralized in src/lib/apt-url.ts — prerequisite for Phase 22 URL structure
- [Phase 20]: generate-seeding uses formatKrw (원 units) not formatPrice — unit semantics preserved
- [Phase 20]: Price format functions: always import from @/lib/format, never define locally
- [Phase 20]: Compact area display uses Math.round(sqmToPyeong(sqm))평, full-width uses formatArea(sqm) for DATA-03
- [Phase 21]: @custom-variant dark uses [data-theme='dark'] selector to activate all Tailwind dark: utilities
- [Phase 21]: DROP_LEVEL_CONFIG centralized in src/lib/constants/drop-level.ts with CSS variable references for automatic dark mode response

## Last Session

Stopped at: Completed 21-01-PLAN.md
Last updated: 2026-03-31

---
*Last updated: 2026-03-31 — v1.3 roadmap created (Phases 20-24)*
