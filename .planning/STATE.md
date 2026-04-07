---
gsd_state_version: 1.0
milestone: v1.4
milestone_name: 전환 최적화 + 리텐션 기초
current_phase: 25
status: in_progress
stopped_at: Phase 25 범위 정의 및 v1.4 요구사항/로드맵 초안 작성 완료
last_updated: "2026-04-07T23:45:00.000Z"
progress:
  total_phases: 5
  completed_phases: 0
---

# Project State: 돈줍

**Current Phase:** 25 (광고/추적 기반 구축)
**Milestone:** v1.4 — 전환 최적화 + 리텐션 기초
**Status:** v1.4 planning started. Phase 25 scope identified; some implementation pieces already exist in codebase.

## Current Position

Phase: 25 (monetization-foundation) — IN PROGRESS
Plan: 0 of 1

## Key Context

**v1.4 phase structure:**

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 25 | 광고/추적 기반 구축 | MON-01, MON-02 | In Progress |
| 26 | 계산기/제휴 전환 강화 | MON-03, MON-04, FUN-04 | Planned |
| 27 | 탐색 퍼널 최적화 | FUN-01~03 | Planned |
| 28 | 리텐션 MVP | RET-01, RET-02, RET-04 | Planned |
| 29 | 알림/실험/분석 고도화 | RET-03, ANA-01~03 | Planned |

**Dependency order:**

- Phase 25 should land before wide conversion experiments
- Phase 26 should follow Phase 25 so CTA clicks can be measured
- Phase 28 should follow core funnel cleanup so saved-state UX is clear
- Phase 29 depends on at least one retention primitive from Phase 28

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
- Phase 24: 검색 결과에 세대수(`total_units`)와 최근 거래가(`latest_trade_price` via subquery) 추가하여 정보 밀도 향상
- Phase 24: 차트 범례에 직거래(점)와 저신뢰구간(도트) 추가 및 `isLowConfidence`에 따른 선 스타일 분기 처리

**Research flags (from SUMMARY.md):**

- Phase 22 전: `SELECT COUNT(*) FROM apt_complexes WHERE govt_complex_id IS NULL` 실행 필요 — 5% 초과 시 backfill migration 선행 필요
- Phase 23 전: `@vercel/blob` v2.3.2 `put()` + `handleUpload` API 시그니처 확인 필요
- Vercel serverless 4.5MB body limit → 이미지 업로드는 client-side upload 패턴 사용 필수

## Pending Todos

- [ ] Phase 25 구현 범위 확정 (광고 슬롯/스크립트/측정 기준)
- [ ] Phase 26 제휴 CTA 실제 연결 대상 확정
- [ ] Phase 28 저장/최근본단지 데이터 저장 위치 결정 (Firebase/Firestore vs local)
- [ ] v1.4 문서를 상위 ROADMAP/MILESTONES와 완전히 동기화

## Blockers/Concerns

- 실제 제휴 링크/운영 정책이 확정되지 않으면 Phase 26 범위가 축소될 수 있음
- 광고 밀도와 사용자 경험 균형을 잡아야 함
- 사용자 락인 기능은 인증/저장 구조 선택에 따라 구현 범위가 달라질 수 있음

## Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-31 | Vercel Blob 선택 | 기존 스택 자연스러운 통합, Cloudflare R2 대비 비용 동등 |
| 2026-03-31 | Phase 20 먼저 (데이터 포맷) | pure refactor, zero runtime risk, de-risks Phase 21/24 |
| 2026-03-31 | URL migration 308 (not 301) | 308 preserves POST method, Next.js middleware edge-compatible, Google treats same as 301 for SEO |
| 2026-04-05 | 검색 쿼리에 세대수/최신가 추가 | 정보 밀도 향상으로 사용자 이탈 방지 및 신뢰도 확보 (UX-01) |
| 2026-04-05 | 차트 범례에 직거래/신뢰도 추가 | 데이터 투명성 확보 및 이상거래 오인 방지 (UX-02) |

- [Phase 20]: formatArea = formatSizeWithPyeong alias — avoids duplicate functions, existing callers unaffected
- [Phase 20]: makeSlug centralized in src/lib/apt-url.ts — prerequisite for Phase 22 URL structure
- [Phase 20]: generate-seeding uses formatKrw (원 units) not formatPrice — unit semantics preserved
- [Phase 20]: Price format functions: always import from @/lib/format, never define locally
- [Phase 20]: Compact area display uses Math.round(sqmToPyeong(sqm))평, full-width uses formatArea(sqm) for DATA-03
- [Phase 21]: @custom-variant dark uses [data-theme='dark'] selector to activate all Tailwind dark: utilities
- [Phase 21]: DROP_LEVEL_CONFIG centralized in src/lib/constants/drop-level.ts with CSS variable references for automatic dark mode response
- [Phase 21-02]: var(--color-text-inverted) for active tab text — dark mode inverts correctly
- [Phase 21-02]: Brand-specific colors (Kakao/Naver) kept with // brand: annotations as intentional exceptions
- [Phase 21-02]: Admin sidebar: --color-admin-border (#334155) + --color-hero-via distinct from page theme vars
- [Phase 21]: CSS variables work directly as SVG stroke/fill attribute values in Recharts — no getComputedStyle needed
- [Phase 21]: Brand colors (Google/Kakao/Naver) extracted to named constants with brand: comments for audit exclusion
- [Phase 22-url]: aptUrl() falls back to /apt/{regionCode}/{urlSlug} for complexes without govtComplexId — ensures zero broken links during transition
- [Phase 22-url]: proxy.ts uses pattern-matching (no DB query) for 308 redirect — edge-compatible and fast
- [Phase 22-url]: aptUrl() used for all internal links — govtComplexId primary, slug fallback for pre-backfill complexes
- [Phase 22-url]: FavoriteButton stores govtComplexId instead of slug — legacy slug entries still matched for backward compat
- [Phase 24]: 검색 결과 카드에 built_year, total_units, latest_trade_price 일관되게 표시 (UX-01)
- [Phase 24]: 차트 범례에 매매/전세/직거래/전세가율/저신뢰구간 명시 (UX-02)
- [Phase 24]: isLowConfidence=true인 경우 전세가율 선을 도트 스타일(`2 4`)로 변경하여 시각적 주의 환기

## Last Session

Stopped at: v1.4 요구사항/로드맵 초안 작성 및 다음 단계 정의
Last updated: 2026-04-07

---
*Last updated: 2026-04-07 — v1.4 planning started*
