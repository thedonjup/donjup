---
phase: 16-test-infrastructure
plan: 01
subsystem: test-infrastructure
tags: [vitest, unit-tests, ci, price-normalization]
dependency_graph:
  requires: []
  provides: [vitest-config, price-normalization-unit-tests, github-actions-ci]
  affects: [all future plans requiring npm test]
tech_stack:
  added: [vitest@4.1.2, "@vitest/coverage-v8@4.1.2"]
  patterns: [TDD unit test structure, node environment vitest config]
key_files:
  created:
    - vitest.config.ts
    - tests/unit/price-normalization.test.ts
    - .github/workflows/test.yml
  modified:
    - package.json
decisions:
  - "vitest globals:false — describe/it/expect explicitly imported for TypeScript strict safety"
  - "environment:node — server-side pure functions, no DOM needed"
  - "pnpm used for install (project standard), but CI uses npm ci for compatibility"
metrics:
  duration: "2 minutes"
  completed: "2026-03-28"
  tasks_completed: 2
  files_created: 3
  files_modified: 1
requirements: [TEST-01, TEST-02]
---

# Phase 16 Plan 01: Vitest Setup + price-normalization Unit Tests Summary

Vitest 설치 및 설정, price-normalization.ts의 7개 exported 함수 전체 유닛 테스트(42개) 작성, GitHub Actions CI 워크플로우 구성.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Vitest 설치, 설정 및 CI 워크플로우 생성 | 0b3e931 | vitest.config.ts, package.json, .github/workflows/test.yml |
| 2 | price-normalization.ts 유닛 테스트 작성 | d9b14a8 | tests/unit/price-normalization.test.ts |

## What Was Built

- **Vitest 4.1.2** + `@vitest/coverage-v8` 설치
- **vitest.config.ts**: `environment: 'node'`, `@/` 경로 alias (`./src` 매핑), globals 없이 명시적 import
- **package.json scripts**: `test` (vitest run), `test:watch`, `test:coverage`
- **42개 유닛 테스트** across 8 describe blocks:
  - Constants (5): LOW_FLOOR_MAX, FLOOR_ADJUSTMENT_FACTORS 값 검증
  - adjustFloorPrice (6): 1/2/3층 환산, 4층+/0층 원가 반환
  - isDirectDeal (4): 직거래/null/중개거래/빈문자열
  - isDealSuspicious (5): 경계값 포함 직거래+가격 조합
  - computeMedianPrice (5): 빈배열/홀수/짝수/단일/정렬없음
  - computeMovingMedian (5): 1개월/3개월/isLowConfidence/정렬
  - filterTransactions (9): adjust/exclude/include 모드, 90% 필터, directDeals
  - groupByMonth (4): 빈배열/그룹화/정렬/단일
- **GitHub Actions** `.github/workflows/test.yml`: push/PR 시 ubuntu-latest에서 `npm ci && npm test` 실행 — 실패 시 빌드 실패

## Test Results

```
Test Files  1 passed (1)
     Tests  42 passed (42)
  Duration  361ms
```

## Decisions Made

1. `globals: false` — TypeScript strict 환경에서 명시적 import가 더 안전
2. `environment: 'node'` — price-normalization.ts는 순수 함수, DOM 불필요
3. CI에서 `npm ci` 사용 — pnpm은 CI 설정 없이 npm이 더 단순

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- vitest.config.ts: FOUND
- tests/unit/price-normalization.test.ts: FOUND
- .github/workflows/test.yml: FOUND
- Commit 0b3e931: FOUND
- Commit d9b14a8: FOUND
- npm test: 42 tests passed
