---
phase: 06-typescript
plan: 02
subsystem: types
tags: [typescript, any-removal, kakao-sdk, query-builder]
dependency_graph:
  requires: [06-01]
  provides: [typed-page-components, typed-kakao-map, typed-db-client]
  affects: [src/app/page.tsx, src/app/rate/page.tsx, src/components/map/KakaoMap.tsx, src/lib/db/client.ts]
tech_stack:
  added: [src/types/kakao.d.ts]
  patterns: [generic-filter-function, namespace-type-declaration, unknown-over-any]
key_files:
  created:
    - src/types/kakao.d.ts
  modified:
    - src/app/page.tsx
    - src/app/rate/page.tsx
    - src/app/daily/[date]/page.tsx
    - src/app/daily/archive/page.tsx
    - src/app/search/page.tsx
    - src/app/compare/page.tsx
    - src/app/market/page.tsx
    - src/app/market/[sido]/page.tsx
    - src/app/market/[sido]/[sigungu]/page.tsx
    - src/components/map/KakaoMap.tsx
    - src/lib/db/client.ts
decisions:
  - "Kakao SDK 공식 TS 타입 없음 → src/types/kakao.d.ts에 미니멀 namespace 선언"
  - "client.ts then()/execute() 반환 타입은 any 유지 — unknown으로 변경 시 전 codebase 연쇄 오류 발생"
  - "pg 라이브러리 호출부만 eslint-disable inline으로 허용 (pg가 any[] 요구)"
  - "applyTypeFilter를 제네릭 함수로 변환 — 3개 파일 공통 패턴"
  - "infoWindowRef.close() → setMap(null) 수정 — CustomOverlay API 반영"
metrics:
  duration: "~15min"
  completed: "2026-03-26T01:34:32Z"
  tasks_completed: 2
  files_modified: 12
---

# Phase 06 Plan 02: 주요 컴포넌트/페이지 any 타입 제거 Summary

핵심 페이지 9개와 KakaoMap.tsx, client.ts에서 any를 구체 타입 및 unknown으로 교체. 파일 수준 eslint-disable 제거, 카카오 SDK 타입 선언 신규 추가.

## Tasks Completed

### Task 1: 페이지 컴포넌트 any 제거

**Commit:** f953000

| File | Before | After |
|------|--------|-------|
| src/app/page.tsx | `drops/highs/volume/recent: any[]`, `rates: any[]`, `filterByType(rows: any[])` | `AptTransaction[]`, `FinanceRate[]`, 제네릭 `filterByType<T extends { property_type: number }>` |
| src/app/rate/page.tsx | `allRates: any[] \| null`, `bankRatesRaw: any[] \| null` | `FinanceRate[] \| null` |
| src/app/daily/[date]/page.tsx | `report: any` | `DailyReport \| null` |
| src/app/daily/archive/page.tsx | `(r: any) =>` | `(r: DailyReport) =>` |
| src/app/search/page.tsx | `(d: any) =>` | 인라인 인터페이스로 타입 명시 |
| src/app/compare/page.tsx | `rents: any[]`, `catch (e: any)` | 구체 인터페이스, `catch (e: unknown)` |
| src/app/market/page.tsx | `applyTypeFilter = (q: any)` | 제네릭 `<Q extends { eq(...) }>` |
| src/app/market/[sido]/page.tsx | `topDrop: any; topHigh: any` | 구체 인라인 타입 |
| src/app/market/[sido]/[sigungu]/page.tsx | `applyTypeFilter = (q: any)` | 제네릭 변환 |

### Task 2: KakaoMap.tsx + client.ts 타입 강화

**Commit:** d012d44

**KakaoMap.tsx:**
- `src/types/kakao.d.ts` 신규 생성 — Map, LatLng, Marker, CustomOverlay, ZoomControl, MarkerClusterer 등 미니멀 namespace 선언
- `useRef<any>(null)` → `useRef<kakao.maps.Map | null>(null)` 등 구체 타입 적용
- `Window.kakao: any` → `Window.kakao: typeof kakao`
- `markers: any[]` → `kakao.maps.CustomOverlay[]`
- 버그 수정: `infoWindowRef.current.close()` → `infoWindowRef.current.setMap(null)` (CustomOverlay API에는 close() 없음)

**client.ts:**
- 파일 최상단 `/* eslint-disable @typescript-eslint/no-explicit-any */` 제거
- `Condition.values: any[]` → `unknown[]`
- `insertData/updateData: Record<string, any>` → `Record<string, unknown>`
- 필터 메서드 (eq, neq, lt, gt, gte, lte, in, not): `val: any` → `val: unknown`
- `buildWhere/buildSelectSQL/buildCountSQL/buildInsertSQL`: `any[]` → `unknown[]`
- `catch (e: any)` → `catch (e: unknown)` + 안전한 메시지 추출
- `query()`: pg 라이브러리 호출부만 `as any[]` 캐스팅 (inline eslint-disable)
- `then()/execute()`: 공개 API 호환성 위해 any 유지 (unknown으로 변경 시 전체 코드베이스 연쇄 오류)
- `RpcCaller.args: Record<string, unknown>` 강화

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] KakaoMap infoWindowRef.close() → setMap(null)**
- **Found during:** Task 2
- **Issue:** `CustomOverlay`는 `close()` 메서드가 없음. `InfoWindow`에만 존재.
- **Fix:** `infoWindowRef.current.close()` → `infoWindowRef.current.setMap(null)`
- **Files modified:** src/components/map/KakaoMap.tsx
- **Commit:** d012d44

**2. [Rule 2 - Missing handling] rate/page.tsx instanceof Date 제거**
- **Found during:** Task 1
- **Issue:** `FinanceRate.base_date`가 `string` 타입인데 `instanceof Date` 검사 → TS 오류
- **Fix:** `String(r.base_date ?? "")` 직접 사용, 객체 변경 대신 spread로 새 객체 생성
- **Files modified:** src/app/rate/page.tsx
- **Commit:** f953000

**3. [Plan-adjusted] client.ts then()/execute() 반환 타입**
- **Issue:** `then()` 반환을 `unknown`으로 변경 시 전체 codebase 80+ 파일에서 `.data`/`.error`/`.count` 접근 오류 발생
- **Resolution:** `then()/execute()` 공개 API만 `any` 유지 (targeted inline eslint-disable), 나머지 내부 값은 모두 `unknown` 강화
- **Plan note:** 계획서가 경고한 "cascading type errors" 케이스에 해당

## Verification

- `pnpm build`: 성공
- `grep -c "any" src/app/page.tsx`: 0 (baseline: ~10)
- `grep -c "any" src/app/rate/page.tsx`: 0 (baseline: ~2)
- `grep -c "any" src/components/map/KakaoMap.tsx`: 0 (baseline: 6)
- `grep "eslint-disable.*no-explicit-any" src/lib/db/client.ts`: 파일 수준 제거, 인라인 6개만 남음

## Known Stubs

None - 모든 변경은 기존 데이터 플로우를 타입만 강화한 것이며 새 기능/스텁 없음.

## Self-Check: PASSED
