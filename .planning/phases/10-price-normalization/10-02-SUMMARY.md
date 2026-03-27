---
phase: 10-price-normalization
plan: "02"
subsystem: price-normalization
tags: [chart, normalization, recharts, composed-chart, direct-deals, trend-line]
dependency_graph:
  requires:
    - src/lib/price-normalization.ts (Plan 01 — filterTransactions, computeMovingMedian, groupByMonth, computeMedianPrice, LOW_FLOOR_MAX)
  provides:
    - src/components/charts/PriceHistoryChart.tsx (ComposedChart with normalDots + directDealDots + trendLine)
    - src/components/apt/AptDetailClient.tsx (normalization pipeline wired + includeLowFloor toggle + prevPrice lookup)
  affects:
    - src/components/charts/PriceHistoryChartWrapper.tsx (updated to new props interface)
tech_stack:
  added: []
  patterns:
    - Recharts ComposedChart with Scatter + Line layers
    - Recharts Customized component for SVG overlay (direct deal connectors)
    - useMemo normalization pipeline in client component
    - Dashed line segments via dual Line render (solid + dashed overlay)
key_files:
  created: []
  modified:
    - src/components/charts/PriceHistoryChart.tsx
    - src/components/apt/AptDetailClient.tsx
    - src/components/charts/PriceHistoryChartWrapper.tsx
decisions:
  - "ComposedChart with dual Line strategy: render solid line for high-confidence months, dashed overlay line for low-confidence months (nulls for non-applicable months)"
  - "Direct deal connectors via Recharts Customized: access xAxisMap/yAxisMap scales to compute pixel coordinates for SVG line drawing"
  - "prevPrice lookup: find most recent normal (non-direct) transaction on or before direct deal date"
metrics:
  duration: "~15 minutes"
  completed: "2026-03-28"
  tasks_completed: 2
  tasks_total: 3
  files_created: 0
  files_modified: 3
---

# Phase 10 Plan 02: PriceHistoryChart Rebuild + AptDetailClient Normalization Wiring Summary

**One-liner:** PriceHistoryChart 완전 재구성(ComposedChart — 거래점 + 이동중위가 추이선 + 직거래 연결선) + AptDetailClient 정규화 파이프라인 배선 + 저층 포함 토글

## What Was Built

### Task 1: PriceHistoryChart 재구성

`src/components/charts/PriceHistoryChart.tsx`를 Recharts `ComposedChart` 기반으로 완전 교체.

**새 props 인터페이스:**
- `normalDots: ChartTransaction[]` — 정상 거래 (초록 점)
- `directDealDots: ChartTransaction[]` — 직거래 (회색 반투명 점 + prevPrice 연결선)
- `trendLine: TrendPoint[]` — 3개월 이동중위가 추이선
- `sizeUnit?: "sqm" | "pyeong"`

**차트 레이어 구성:**
1. `<Scatter data={normalDots}>` — 초록 점 (fill="#059669", opacity=0.7, r=3)
2. `<Scatter data={directDealDots}>` — 회색 반투명 점 (fill="#9CA3AF", opacity=0.4, r=3)
3. `<Line data={solidData}>` — 이동중위가 추이선 (고신뢰도 구간, stroke="#059669", 실선)
4. `<Line data={dashedData} strokeDasharray="5 5">` — 이동중위가 추이선 (저신뢰도 구간, 점선 오버레이)
5. `<Customized>` — SVG 오버레이: 직거래 prevPrice ↔ trade_price 회색 점선 연결 + prevPrice 위치 회색 점

**직거래 연결선 구현:**
- Recharts `xAxisMap`/`yAxisMap` scale 함수로 픽셀 좌표 계산
- SVG `<line>` strokeDasharray="3 3", stroke="#9CA3AF"
- prevPrice 위치에 `<circle r={2}>`

**`PriceHistoryChartWrapper.tsx`** 도 새 인터페이스로 업데이트 (Rule 3 — blocking 방지).

### Task 2: AptDetailClient 정규화 파이프라인 배선

`src/components/apt/AptDetailClient.tsx` 수정:

| 추가 내용 | 설명 |
|----------|------|
| `includeLowFloor` state | 저층 포함/제외 토글 (기본: false = 제외) |
| `recentMedian` useMemo | 최근 6개월 고층 거래 중위가 (필터 기준) |
| `filterTransactions` 적용 | normal / directDeals / excluded 3방향 분류 |
| `trendLine` useMemo | groupByMonth → computeMovingMedian |
| `directDealsWithPrev` useMemo | 각 직거래에 직전 정상거래가 매핑 |
| PriceHistoryChart 새 props | normalDots, directDealDots, trendLine, sizeUnit 전달 |
| 저층 포함 체크박스 | 차트 하단, annotation 텍스트 옆 |

**파이프라인 흐름:**
```
saleTxns
  → size filter (selectedSize)
  → filterTransactions({ excludeLowFloor: !includeLowFloor, recentMedian })
  → normal + directDeals
  → normal → groupByMonth → computeMovingMedian → trendLine
  → directDeals → prevPrice lookup → directDealsWithPrev
  → PriceHistoryChart(normalDots, directDealDots, trendLine)
```

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1 | `66af06e` | feat(10-02): rebuild PriceHistoryChart with ComposedChart dots + trend line + direct deal connectors |
| Task 2 | `ddcf9b6` | feat(10-02): wire normalization pipeline in AptDetailClient + low-floor toggle + prevPrice lookup |

## Task 3: Checkpoint (Human Verify)

Task 3 is a `checkpoint:human-verify` task. No code changes required — human visual inspection needed.

**What to verify (dev server: `npx next dev`):**
1. 면적 선택 영역에 "전체" 버튼 없음
2. 페이지 로드 시 가장 거래 많은 면적이 자동 선택
3. 차트에 초록색 점(개별 거래) + 부드러운 추이선이 함께 보임
4. 직거래 거래가 있으면 회색 반투명 점으로 표시됨
5. 직거래 점이 직전 정상거래가 위치에서 회색 점선으로 연결됨
6. "저층 포함" 체크박스가 차트 아래에 존재
7. 체크박스 토글 시 차트가 업데이트됨
8. 추이선 annotation "3개월 이동중위가" 표시

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated PriceHistoryChartWrapper to new props interface**
- Found during: Task 1 (TypeScript check)
- Issue: `PriceHistoryChartWrapper.tsx` used old `transactions` prop shape — broke TypeScript compilation
- Fix: Updated wrapper to accept new `normalDots`, `directDealDots`, `trendLine`, `sizeUnit` props
- Files modified: src/components/charts/PriceHistoryChartWrapper.tsx
- Commit: 66af06e (bundled with Task 1)

None other — plan executed as written.

## Known Stubs

None. All chart layers are wired to real data flowing through the normalization pipeline. The `prevPrice` lookup may return `undefined` for some direct deals (no prior transactions found) — this is correct behavior and the connector line is simply not rendered in that case.

## Self-Check

### Files Created/Modified
- [x] `src/components/charts/PriceHistoryChart.tsx` — rebuilt with ComposedChart
- [x] `src/components/apt/AptDetailClient.tsx` — normalization pipeline wired
- [x] `src/components/charts/PriceHistoryChartWrapper.tsx` — updated to new interface

### Commits
- [x] `66af06e` — Task 1 commit exists
- [x] `ddcf9b6` — Task 2 commit exists

### TypeScript
- [x] `npx tsc --noEmit` — PASSED (no errors)

## Self-Check: PASSED
