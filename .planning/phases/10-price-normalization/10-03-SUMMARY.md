---
phase: 10-price-normalization
plan: "03"
subsystem: price-normalization
tags: [normalization, floor-adjustment, chart, filtering]
dependency_graph:
  requires:
    - src/lib/price-normalization.ts (Plans 01+02 — filterTransactions, LOW_FLOOR_MAX)
    - src/components/apt/AptDetailClient.tsx (Plan 02 — normalization pipeline wired)
  provides:
    - src/lib/price-normalization.ts (FLOOR_ADJUSTMENT_FACTORS, adjustFloorPrice, lowFloorMode filterTransactions)
    - src/components/apt/AptDetailClient.tsx (lowFloorMode='adjust' default, "저층 원가 보기" toggle)
  affects:
    - Chart: low-floor transactions now appear in normalDots at adjusted prices (not excluded)
tech_stack:
  added: []
  patterns:
    - Floor price conversion via multiplicative factor (inverse of discount rate)
    - lowFloorMode union type ('adjust' | 'include' | 'exclude') for backward compat
    - Shallow copy with original_price field to preserve pre-adjustment trade_price
key_files:
  created: []
  modified:
    - src/lib/price-normalization.ts
    - src/components/apt/AptDetailClient.tsx
decisions:
  - "lowFloorMode='adjust' as default: low-floor transactions converted to high-floor equivalent prices and included in normal (NORM-02)"
  - "original_price field name (not adjusted_price): stores pre-adjustment value on adjusted transactions"
  - "lowFloorMode='exclude' retained for backward compatibility"
metrics:
  duration: "~5 minutes"
  completed: "2026-03-28"
  tasks_completed: 1
  tasks_total: 1
  files_created: 0
  files_modified: 2
---

# Phase 10 Plan 03: NORM-02 Gap Closure — Low Floor Price Adjustment Summary

**One-liner:** 저층 거래 제외(exclusion) → 고층 환산가 변환(conversion) 전환: adjustFloorPrice(1F x1.1494, 2F x1.1111, 3F x1.0417) + filterTransactions lowFloorMode 리팩터 + AptDetailClient 기본 모드 adjust

## What Was Built

### Task 1: adjustFloorPrice + filterTransactions refactor + AptDetailClient update (atomic)

**Part A: src/lib/price-normalization.ts**

Added two new exports:

| Export | 역할 |
|--------|------|
| `FLOOR_ADJUSTMENT_FACTORS` | 층별 고층 환산 계수 상수 (1층 x1.1494, 2층 x1.1111, 3층 x1.0417) |
| `adjustFloorPrice(tradePrice, floor)` | 저층 거래가를 고층 기준가로 환산 (4층 이상은 원가 그대로) |

`filterTransactions` 시그니처 변경:
- `opts.excludeLowFloor: boolean` → `opts.lowFloorMode: 'adjust' | 'include' | 'exclude'`
- 반환 타입: `{ normal: (T & { original_price?: number })[]; directDeals: T[]; excluded: T[] }`
- `'adjust'` (기본): 저층 거래를 고층 환산가로 변환 후 normal 포함. 환산 후에도 90% 미만이면 excluded.
- `'include'`: 저층 거래를 원가 그대로 normal 포함.
- `'exclude'`: 저층 거래를 excluded로 분류 (하위 호환).

**Part B: src/components/apt/AptDetailClient.tsx**

- `filterTransactions` 호출: `excludeLowFloor: !includeLowFloor` → `lowFloorMode: includeLowFloor ? 'include' : 'adjust'`
- 토글 라벨: `저층 포함` → `저층 원가 보기`
- 차트 annotation: `저층 거래는 고층 환산가 적용` 문구 추가

**파이프라인 흐름 (변경 후):**
```
saleTxns
  → size filter
  → filterTransactions({ lowFloorMode: 'adjust', recentMedian })
    → low-floor: adjustFloorPrice 적용 → original_price 보존 → normal 포함
    → high-floor: 기존 로직 그대로
  → normal + directDeals
  → PriceHistoryChart(normalDots=normal, ...)
```

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1 | `a84f142` | feat(10-03): add adjustFloorPrice and update filterTransactions to lowFloorMode |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. adjustFloorPrice is fully implemented with real coefficients. All low-floor transactions are converted and included in the normal array by default.

## Self-Check

### Files Created/Modified
- [x] `src/lib/price-normalization.ts` — FLOOR_ADJUSTMENT_FACTORS + adjustFloorPrice added, filterTransactions updated to lowFloorMode
- [x] `src/components/apt/AptDetailClient.tsx` — lowFloorMode wired, toggle label updated

### Commits
- [x] `a84f142` — Task 1 commit exists

### Verification
- [x] `grep "adjustFloorPrice"` — function exists and exported
- [x] `grep "1.1494"` — floor 1 coefficient present
- [x] `grep "lowFloorMode.*adjust"` — AptDetailClient default mode is adjust
- [x] `grep "excludeLowFloor"` — 0 matches (replaced)
- [x] `grep "original_price"` — correct field name used
- [x] `grep "3~4층"` — 0 matches (comment fixed to "3층")
- [x] `npx tsc --noEmit` — PASSED (no errors)

## Self-Check: PASSED
