---
phase: 11-jeonse-gap-analysis
plan: 02
subsystem: ui
tags: [react, typescript, recharts, jeonse, gap-analysis, trend-chart]

# Dependency graph
requires:
  - "11-01 (AptDetailClient with AptTransaction/AptRentTransaction interfaces)"
provides:
  - "면적별 전세가율 추이 차트 (월별 LineChart, solid/dashed 듀얼 라인)"
  - "JeonseRatioChart 컴포넌트 (재사용 가능)"
affects:
  - AptDetailClient.tsx (PriceHistoryChart 아래 전세가율 추이 섹션)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Recharts LineChart dual-line pattern: solidRatio/dashedRatio dataKey with null gaps for connectNulls=false"
    - "groupByMonth + computeMedianPrice for monthly jeonse ratio computation"
    - "isLowConfidence = (rentCount + saleCount) < 5 threshold for dashed line"

key-files:
  created:
    - "src/components/charts/JeonseRatioChart.tsx"
  modified:
    - "src/components/apt/AptDetailClient.tsx"

key-decisions:
  - "Tooltip formatter uses any type to avoid Recharts ValueType | undefined widening issue"
  - "totalCount (rentCount + saleCount) < 5 for isLowConfidence: combined count threshold per D-13"
  - "Size-filtered txns passed as props to JeonseRatioChart (selectedSizeRentTxns/selectedSizeSaleTxns) for efficiency; chart also filters pure jeonse internally"

requirements-completed: [GAP-03]

# Metrics
duration: ~13min
completed: 2026-03-28
---

# Phase 11 Plan 02: 전세가율 추이 차트 Summary

**면적별 전세가율 추이를 월별 LineChart로 표시 — solid/dashed 듀얼 라인 패턴, PriceHistoryChart 아래 배치**

## Performance

- **Duration:** ~13 min
- **Started:** 2026-03-28T02:37:00Z
- **Completed:** 2026-03-28T02:50:01Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- JeonseRatioChart 신규 컴포넌트 생성: 월별 전세 중위가 / 매매 중위가 비율 계산
- 순수전세 필터 (rent_type === "전세" && monthly_rent === 0, D-01)
- solid/dashed 듀얼 라인: 5건 미만 월은 점선, 이상은 실선 (D-13)
- chartData.length < 2 시 null 반환 (D-14)
- AptDetailClient에 JeonseRatioChart 연결: selectedSizeRentTxns/selectedSizeSaleTxns useMemo 추가
- 전세 데이터 없는 면적은 차트 미표시 (selectedSizeRentTxns.length > 0 가드)

## Task Commits

1. **Task 1: Create JeonseRatioChart component** - `d7a5fc1` (feat)
2. **Task 2: Wire JeonseRatioChart into AptDetailClient** - `014393f` (feat)

## Files Created/Modified

- `src/components/charts/JeonseRatioChart.tsx` - 신규: 월별 전세가율 추이 LineChart, 135줄
- `src/components/apt/AptDetailClient.tsx` - JeonseRatioChart import + 2개 useMemo + render JSX 추가

## Decisions Made

- Recharts Tooltip formatter에 `any` 타입 사용: ValueType | undefined 처리 위한 실용적 선택
- isLowConfidence 기준을 rentCount + saleCount 합산으로: 단독 데이터 부족도 감지
- selectedSizeSaleTxns/selectedSizeRentTxns useMemo: 차트 내부 groupByMonth 호출 최소화

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Recharts Tooltip formatter type error**
- **Found during:** Task 1 (build verification)
- **Issue:** Recharts formatter value type is `ValueType | undefined` — TypeScript rejected `number`-only annotation
- **Fix:** Used `any` type with runtime isNaN guard for safe formatting
- **Files modified:** src/components/charts/JeonseRatioChart.tsx
- **Commit:** d7a5fc1

**2. [Rule 1 - Bug] Recharts labelFormatter type error**
- **Found during:** Task 1 (build verification)
- **Issue:** labelFormatter label type is `any` in Recharts — TypeScript rejected string-only annotation
- **Fix:** Used `any` with String() coercion
- **Files modified:** src/components/charts/JeonseRatioChart.tsx
- **Commit:** d7a5fc1

## Issues Encountered

None blocking.

## User Setup Required

None.

## Self-Check: PASSED

All files exist and commits verified.

## Next Phase Readiness

- Phase 11 fully complete (GAP-01, GAP-02, GAP-03 all done)
- 전세가율 카드 + 추이 차트 모두 아파트 상세 페이지에 표시 중
