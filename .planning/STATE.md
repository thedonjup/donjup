---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: 데이터 분석 고도화
current_phase: 15
status: completed
stopped_at: Completed 15-01-PLAN.md
last_updated: "2026-03-28T07:09:34.127Z"
progress:
  total_phases: 6
  completed_phases: 6
  total_plans: 12
  completed_plans: 12
---

# Project State: 돈줍

**Current Phase:** 15
**Milestone:** v1.1 — 데이터 분석 고도화
**Status:** v1.1 milestone complete

## Current Position

Phase: 15 (regional-index-dashboard) — EXECUTING
Plan: Not started

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
- [Phase 10]: ComposedChart dual Line strategy: solid + dashed overlay for low-confidence trend segments
- [Phase 10]: Direct deal connectors via Recharts Customized SVG overlay using xAxisMap/yAxisMap scale functions
- [Phase 10-price-normalization]: lowFloorMode='adjust' as default: low-floor transactions converted to high-floor equivalent prices and included in normal (NORM-02)
- [Phase 10-price-normalization]: original_price field name on adjusted transactions: stores pre-adjustment trade_price for reference
- [Phase 11-jeonse-gap-analysis]: monthly_rent === 0 필터로 순수전세만 전세가율 산출에 사용
- [Phase 11-jeonse-gap-analysis]: latestSale은 raw trade_price 사용 (Phase 10 정규화가 아닌 원 거래가, D-02)
- [Phase 11]: Recharts Tooltip formatter uses any type — ValueType | undefined widening requires runtime guard
- [Phase 12-rate-display-improvement]: CSS max-height transition for accordion animation (no library); desktop expand uses conditional tr row with colSpan=4
- [Phase 12-rate-display-improvement]: Filter BANK_UNKNOWN before computing avgRate on /rate hero card — avoids catch-all skewing average
- [Phase 13]: RatioPoint exported from AptDetailClient; recentMedian kept on unfiltered saleTxns; showJeonseRatio default OFF
- [Phase 13-chart-improvement]: yAxisId=0 (numeric) on all existing chart elements to preserve DirectDealConnectors yAxisMap[0] access
- [Phase 13-chart-improvement]: hasRatioOverlay guards both showJeonseRatio flag AND data length to avoid empty right axis render
- [Phase 14-ranking-refinement]: Use highest_price as median proxy for suspicious direct deal detection in ranking context (no per-complex median available)
- [Phase 14-ranking-refinement]: Re-sort drops by change_rate ASC after applyRankingNormalization so adjusted rankings reflect true severity order
- [Phase 15]: PriceRow typed locally in market pages to satisfy strict no-implicit-any TypeScript config
- [Phase 15]: CLUSTER_DEFINITIONS 4 clusters: gangnam3/mayongseong/nodogang/sudobukmain with correct 수지구=41465
- [Phase 15]: computeClusterIndex: isDirectDeal() filter only at cluster level (no floor adjust needed)

## Last Session

Stopped at: Completed 15-01-PLAN.md
Last updated: 2026-03-28T18:13:00Z

---
*Last updated: 2026-03-28 — Phase 10 Plan 01 complete*
