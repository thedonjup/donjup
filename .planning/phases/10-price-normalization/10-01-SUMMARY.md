---
phase: 10-price-normalization
plan: "01"
subsystem: price-normalization
tags: [utility, filtering, chart, normalization]
dependency_graph:
  requires: []
  provides:
    - src/lib/price-normalization.ts (LOW_FLOOR_MAX, filterTransactions, computeMovingMedian, isDealSuspicious, isDirectDeal, computeMedianPrice, groupByMonth)
    - AptDetailClient 전체 탭 제거 + mostTradedSize 자동 선택
  affects:
    - src/components/apt/AptDetailClient.tsx
    - Plan 02 (chart UI) will import price-normalization.ts
tech_stack:
  added: []
  patterns:
    - Pure utility functions with generics for type flexibility
    - useMemo for mostTradedSize computation (single render init)
key_files:
  created:
    - src/lib/price-normalization.ts
  modified:
    - src/components/apt/AptDetailClient.tsx
decisions:
  - "filterTransactions 90% threshold: 중위가 90% 미만은 deal_type 무관 제외 (CONTEXT decision 1)"
  - "mostTradedSize via useMemo + useState initializer: saleTxns 기반 최다 거래 면적 자동 선택"
  - "LOW_FLOOR_MAX 단일 소스: price-normalization.ts에서 export, AptDetailClient import"
metrics:
  duration: "~8 minutes"
  completed: "2026-03-28"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
---

# Phase 10 Plan 01: Price Normalization Utility Module Summary

**One-liner:** 가격 정규화 유틸 모듈 생성(7개 순수 함수) + AptDetailClient 전체 탭 제거/최다 거래 면적 자동 선택

## What Was Built

### Task 1: price-normalization.ts

새 모듈 `src/lib/price-normalization.ts` 생성. Plan 02(차트 UI)에서 소비할 순수 함수 7개 export:

| Export | 역할 |
|--------|------|
| `LOW_FLOOR_MAX = 3` | 저층 기준 상수 (1~3층) |
| `isDirectDeal(dealType)` | 직거래 여부 판별 |
| `isDealSuspicious(price, median, dealType)` | 직거래 + 시세 70% 미만 이상거래 판별 |
| `computeMedianPrice(prices)` | 배열 중위가 계산 |
| `computeMovingMedian(data)` | 3개월 이동중위가 (isLowConfidence: 5건 미만 = 점선) |
| `filterTransactions(txns, opts)` | normal/directDeals/excluded 3방향 필터 |
| `groupByMonth(txns)` | trade_date 기반 YYYY-MM 월별 그룹화 |

`filterTransactions` 핵심 로직:
- `excludeLowFloor=true` 시 3층 이하 → excluded
- 중위가 90% 미만 → excluded (deal_type 무관, CONTEXT 결정 1)
- 직거래(isDirectDeal) → directDeals (차트 회색 점용)
- 나머지 → normal (추이선 포함)

### Task 2: AptDetailClient 수정

- `LOW_FLOOR_MAX` 로컬 상수 제거 → `@/lib/price-normalization` import
- "전체" 면적 선택 버튼 완전 제거 (NORM-01)
- `mostTradedSize` useMemo로 saleTxns 기반 최다 거래 면적 계산 → `useState` 초기값 사용
- 저층 제외 annotation 텍스트 제거 (Plan 02에서 종합 annotation 추가 예정)

## Commits

| Task | Commit | Message |
|------|--------|---------|
| Task 1 | `4d444d0` | feat(10-01): create price normalization utility module |
| Task 2 | `eb96908` | feat(10-01): remove 전체 tab and auto-select most-traded size in AptDetailClient |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused `monthIndex` Map in `computeMovingMedian`**
- Found during: Task 2 code review before commit
- Issue: `monthIndex` Map was created but only used via `void monthIndex` (no-op statement)
- Fix: Removed both the Map creation and void statement
- Files modified: src/lib/price-normalization.ts
- Commit: eb96908 (bundled with Task 2)

None other — plan executed as written.

## Known Stubs

None. All functions are fully implemented with real logic. AptDetailClient `selectedSize` state is properly initialized via `mostTradedSize` and wired to chart and transaction tabs as before.

## Self-Check

### Files Created/Modified
- [x] `src/lib/price-normalization.ts` — exists, 7 exports
- [x] `src/components/apt/AptDetailClient.tsx` — modified, "전체" button removed, `mostTradedSize` present

### Commits
- [x] `4d444d0` — Task 1 commit exists
- [x] `eb96908` — Task 2 commit exists

### TypeScript
- [x] `npx tsc --noEmit` — PASSED (no errors)

## Self-Check: PASSED
