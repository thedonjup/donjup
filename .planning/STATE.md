---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: 데이터 분석 고도화
current_phase: 10
status: executing
last_updated: "2026-03-27T18:13:54.377Z"
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 2
  completed_plans: 1
---

# Project State: 돈줍

**Current Phase:** 10
**Milestone:** v1.1 — 데이터 분석 고도화
**Status:** Ready to execute

## Current Position

Phase: 10 (price-normalization) — EXECUTING
Plan: 2 of 2

## Active Phase

**Phase 10: 가격 정규화 엔진**
Foundation phase — all NORM requirements. CHART and RANK depend on this.

Parallel candidates (no dependency on Phase 10):

- Phase 11: 전세가율·갭 분석 (GAP-01~03)
- Phase 12: 금리 표현 개선 (RATE-01~03)

## Key Context

**v1.1 phase structure:**

- Wave 1 (parallel): Phase 10 (NORM foundation) + Phase 11 (GAP) + Phase 12 (RATE)
- Wave 2 (after Phase 10): Phase 13 (CHART) + Phase 14 (RANK)
- Wave 3 (after Phase 10): Phase 15 (INDEX — new page)

**Critical technical decisions (v1.1):**

- 층별 보정계수: 경험적 고정값 사용 (1층 -13%, 2층 -10%, 3~4층 -4%)
- 대표가 방식: 중위가 (평균 아님) — 이상거래 저항성
- 차트 추이선: 3개월 이동 중위가
- 이상거래 기준: 직거래 + 시세 대비 30% 이상 저가
- 지역 지수: 라스파이레스 변형 (중위 단가 기반 체인 지수)
- 지수 기준시점: 2020년 1월 = 100

**Data availability:**

- `apt_complexes.floor_count` — NULL 가능, fallback 필요
- `apt_transactions.deal_type` — '직거래'/'중개거래' 등 enum 확인 필요
- 전세: 별도 rents 테이블 존재 (매매·전세 시점 불일치 주의)

## Pending Todos

None.

## Blockers/Concerns

- `apt_complexes.floor_count` NULL 비율 미확인 — 보정계수 정확도 영향
- `deal_type` 실제 enum 값 확인 필요 (코드 실행 전 쿼리 검증)

## Decisions

- [10-01] LOW_FLOOR_MAX 단일 소스화: price-normalization.ts export, AptDetailClient import
- [10-01] filterTransactions 90% threshold: 중위가 90% 미만 거래는 deal_type 무관 제외
- [10-01] mostTradedSize via useMemo + useState initializer: 최다 거래 면적 자동 선택 (전체 탭 대체)

## Last Session

Stopped at: Completed 10-01-PLAN.md
Last updated: 2026-03-28T18:13:00Z

---
*Last updated: 2026-03-28 — Phase 10 Plan 01 complete*
