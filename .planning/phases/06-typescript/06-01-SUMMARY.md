---
phase: 06-typescript
plan: 01
subsystem: types
tags: [typescript, types, db-models, api-routes]
dependency_graph:
  requires: []
  provides: [src/types/db.ts, src/types/api.ts]
  affects: [src/app/api/search/route.ts, src/app/api/bank-rates/route.ts, src/app/api/apt/route.ts, src/app/api/daily/[date]/route.ts, src/app/api/apt/[id]/route.ts, src/app/api/apt/extremes/route.ts, src/app/api/rate/history/route.ts]
tech_stack:
  added: []
  patterns: [type-import, Pick, Partial, unknown-for-jsonb]
key_files:
  created:
    - src/types/db.ts
    - src/types/api.ts
  modified:
    - src/app/api/search/route.ts
    - src/app/api/bank-rates/route.ts
    - src/app/api/apt/route.ts
    - src/app/api/daily/[date]/route.ts
    - src/app/api/apt/[id]/route.ts
    - src/app/api/apt/extremes/route.ts
    - src/app/api/rate/history/route.ts
decisions:
  - "JSONB 컬럼은 unknown 타입 사용 — any 대신 타입 안전성 확보"
  - "extremes route는 partial select이므로 Partial<AptTransaction> 사용"
  - "rate/history는 Pick<FinanceRate> 사용 — 실제 select 컬럼과 일치"
metrics:
  duration: "~4 minutes"
  completed: "2026-03-26T01:23:00Z"
  tasks: 2
  files_created: 2
  files_modified: 7
---

# Phase 06 Plan 01: DB 모델 인터페이스 + API 응답 타입 정의 Summary

cockroach-schema.sql 기반 8개 테이블 TypeScript 인터페이스를 src/types/db.ts에 정의하고, API 라우트 7개의 any 타입을 구체적 타입으로 교체하여 타입 안전성 확보.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | DB 모델 인터페이스 + API 응답 타입 정의 | 6f68e51 | src/types/db.ts, src/types/api.ts |
| 2 | API 라우트에 타입 적용 | d631e6e | 7개 API route 파일 |

## What Was Built

### src/types/db.ts
8개 테이블 인터페이스: AptComplex, AptTransaction, FinanceRate, DailyReport, PageView, ContentQueue, SeedingQueue, PushSubscription. Date/timestamp 컬럼은 client.ts가 ISO string으로 변환하므로 string 타입 사용. JSONB 컬럼은 unknown 타입.

### src/types/api.ts
API 응답 공통 타입: ApiResponse<T>, PaginatedResponse<T>, SearchResult, BankRateResponse. BankRateResponse는 Pick<FinanceRate>를 재사용.

### API Route 변경사항
- search/route.ts: `any[]` → `(string | number)[]`
- bank-rates/route.ts: FinanceRate Pick 타입으로 Map 제네릭 교체
- apt/route.ts: AptComplex[] 캐스팅 추가
- daily/[date]/route.ts: DailyReport 캐스팅 추가
- apt/[id]/route.ts: AptComplex, AptTransaction 명시적 캐스팅
- apt/extremes/route.ts: Partial<AptTransaction>[] 타입 적용 (partial select)
- rate/history/route.ts: Pick<FinanceRate> 타입 적용

## Verification

- `grep -c ": any" src/types/db.ts` → 0
- `grep -c ": any" src/types/api.ts` → 0
- `pnpm build` → 성공

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED
- src/types/db.ts: FOUND
- src/types/api.ts: FOUND
- Commit 6f68e51: FOUND
- Commit d631e6e: FOUND
- Build: PASSED
