---
phase: 11-jeonse-gap-analysis
plan: 01
subsystem: ui
tags: [react, typescript, tailwind, recharts, rent, jeonse, gap-analysis]

# Dependency graph
requires: []
provides:
  - "면적별 전세가율(%) 계산 및 색상 분기 (70%+ 빨강, 60-70% 노랑, 60% 미만 초록)"
  - "면적별 갭 금액(매매가 - 전세가) 계산 및 표시"
  - "면적별 최근 전세가 카드 (selectedSize 연동)"
  - "page.tsx Row 2 StatCard (전세가/전세가율) 제거"
affects:
  - 11-02-jeonse-trend-chart

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "sizePriceMap IIFE render pattern: selectedSize && (() => { ... })()"
    - "CSS variable color tokens for semantic states (drop/rise)"

key-files:
  created: []
  modified:
    - "src/components/apt/AptDetailClient.tsx"
    - "src/app/apt/[region]/[slug]/page.tsx"

key-decisions:
  - "월세 포함 전세 필터링: monthly_rent === 0 조건 추가로 순수전세만 사용 (D-01)"
  - "latestSale은 sizeMatches[0] 원 거래가 사용 (Phase 10 정규화가 아닌 raw price, D-02)"
  - "3-column GAP 카드: 최근 전세가 / 전세가율 / 갭 금액 — 면적 칩 아래, 차트 위 (D-08)"

patterns-established:
  - "getJeonseRatioColor: null safe, CSS variable 기반 색상 분기"
  - "sizePriceMap 확장: GAP 지표 추가 (latestSale, gapAmount, jeonseRatio)"

requirements-completed: [GAP-01, GAP-02]

# Metrics
duration: 8min
completed: 2026-03-28
---

# Phase 11 Plan 01: 전세가율/갭 지표 카드 Summary

**면적별 순수전세가율(%) + 갭 금액(매매가 - 전세가)을 3-column 카드로 AptDetailClient에 추가, page.tsx 전체 기준 StatCard 2개 제거**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-28T02:27:00Z
- **Completed:** 2026-03-28T02:35:14Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- sizePriceMap에 latestSale, gapAmount, jeonseRatio 필드 추가 (면적별 GAP 계산)
- jeonseTx 필터에 monthly_rent === 0 조건 추가 (순수전세만 사용, D-01)
- getJeonseRatioColor 헬퍼 추가 (70%+ 빨강, 60-70% 노랑, 60% 미만 초록)
- 3-column GAP 카드(최근 전세가/전세가율/갭 금액) — 면적 칩 아래, 차트 위
- page.tsx Row 2 StatCard(최근 전세가, 전세가율) 및 latestJeonseDeposit 변수 제거

## Task Commits

1. **Task 1: Extend sizePriceMap + add GAP indicator cards** - `1516da3` (feat)
2. **Task 2: Remove Row 2 StatCards from page.tsx** - `f2481cb` (feat)

## Files Created/Modified

- `src/components/apt/AptDetailClient.tsx` - sizePriceMap 확장 + getJeonseRatioColor + 3-column GAP 카드 JSX
- `src/app/apt/[region]/[slug]/page.tsx` - Row 2 StatCard 및 latestJeonseDeposit 제거

## Decisions Made

- monthly_rent === 0 조건 추가: 반전세(월세 있는 전세)를 제외하여 순수전세만 전세가율 산출에 사용
- latestSale은 raw trade_price 사용: Phase 10 보정가가 아닌 원 거래가 (D-02)
- selectedSize null guard: IIFE 패턴으로 selectedSize 없을 때 카드 미렌더링

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- GAP 지표 카드 완료. Plan 02 (전세가율 추이 차트) 진행 가능
- rentTxns limit 200건 — 추이 차트에서 더 많은 데이터 필요 시 limit 조정 검토

---
*Phase: 11-jeonse-gap-analysis*
*Completed: 2026-03-28*
