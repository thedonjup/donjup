---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: 데이터 분석 고도화
current_phase: 10
status: ready_to_plan
last_updated: "2026-03-28"
progress:
  total_phases: 15
  completed_phases: 9
  total_plans: 0
  completed_plans: 0
---

# Project State: 돈줍

**Current Phase:** 10 — 가격 정규화 엔진
**Milestone:** v1.1 — 데이터 분석 고도화
**Status:** Ready to plan Phase 10

## Current Position

Phase: 10 of 15 (가격 정규화 엔진)
Plan: 0 of TBD
Status: Ready to plan
Last activity: 2026-03-28 — v1.1 roadmap created (Phases 10-15)

Progress: [██████░░░░░░░░░] 9/15 phases complete (v1.0 done)

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

---
*Last updated: 2026-03-28 — v1.1 roadmap created*
