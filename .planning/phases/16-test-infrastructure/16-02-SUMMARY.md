---
phase: 16-test-infrastructure
plan: 02
subsystem: test-infrastructure
tags: [vitest, unit-tests, db-mock, cluster-index]
dependency_graph:
  requires: [16-01]
  provides: [cluster-index-unit-tests]
  affects: [CI pipeline, future cluster-index refactoring]
tech_stack:
  added: []
  patterns: [vi.mock for DB isolation, mockReturnValue pattern for pg.Pool]
key_files:
  created:
    - tests/unit/cluster-index.test.ts
  modified: []
decisions:
  - "vi.mock('@/lib/db/client') hoisted by Vitest — factory cannot reference outer variables"
  - "vi.mocked(getPool).mockReturnValue({ query: mockQuery }) — avoids full Pool type instantiation"
  - "mockPoolQuery helper centralizes mock setup to keep each test concise"
metrics:
  duration: "5 minutes"
  completed: "2026-03-28"
  tasks_completed: 1
  files_created: 1
  files_modified: 0
requirements: [TEST-03]
---

# Phase 16 Plan 02: computeClusterIndex Unit Tests Summary

computeClusterIndex 함수에 대한 유닛 테스트 12개를 작성. vi.mock으로 pg.Pool DB 의존성을 완전 격리하여 실제 DB 연결 없이 모든 분기 검증.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | computeClusterIndex 유닛 테스트 작성 | d7429c9 | tests/unit/cluster-index.test.ts |

## What Was Built

- **tests/unit/cluster-index.test.ts** (265 lines): 12개 테스트, 7개 describe 블록
  - 빈 입력 (1): `regionCodes=[]` → 즉시 `[]` + DB 미호출 검증
  - 정상 데이터 3개월 (3): 기준월 index=100, 비율 계산, 필드 존재 검증, string trade_price 변환
  - 직거래 필터링 (2): 직거래 행 제외 후 medianPrice 검증, 직거래만 있는 월 skip
  - minTransactions 미달 (2): 1건 월 제외, 모든 월 미달 시 `[]`
  - 기준월 중위가 0 (1): baseMedian=0 guard → `[]`
  - 커스텀 minTransactions (2): minTransactions=1/5 동작 검증
  - 여러 regionCodes (1): DB query 1회 호출 검증

## Test Results

```
Test Files  2 passed (2)
     Tests  54 passed (54)
  Duration  498ms
```

(42 price-normalization + 12 cluster-index)

## Decisions Made

1. `vi.mock` factory에서 외부 변수 참조 금지 — Vitest hoisting 제약으로 factory는 순수해야 함
2. `vi.mocked(getPool).mockReturnValue(...)` — TypeScript strict 환경에서 타입 안전한 mock
3. `mockPoolQuery` 헬퍼로 각 테스트의 mock 설정을 3줄로 압축

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- tests/unit/cluster-index.test.ts: FOUND
- Commit d7429c9: FOUND
- npm test: 54 tests passed (exit code 0)
