---
phase: 04-error-handling
plan: "02"
subsystem: api-security
tags: [error-handling, logging, security, slack, cron]
dependency_graph:
  requires: [04-01]
  provides: [api-error-sanitization, cron-slack-alerts, structured-logging-api]
  affects: [all-api-routes, all-cron-jobs]
tech_stack:
  added: []
  patterns: [logger-import-pattern, generic-error-response, sendSlackAlert-on-error]
key_files:
  created: []
  modified:
    - src/app/api/search/route.ts
    - src/app/api/bank-rates/route.ts
    - src/app/api/apt/route.ts
    - src/app/api/apt/extremes/route.ts
    - src/app/api/analytics/popular/route.ts
    - src/app/api/analytics/pageview/route.ts
    - src/app/api/daily/route.ts
    - src/app/api/dam/content/route.ts
    - src/app/api/push/subscribe/route.ts
    - src/app/api/rate/history/route.ts
    - src/app/api/seeding/route.ts
    - src/app/api/admin/users/route.ts
    - src/app/api/cron/analytics/route.ts
    - src/app/api/cron/coupang/route.ts
    - src/app/api/cron/enrich-complexes/route.ts
    - src/app/api/cron/fetch-bank-rates/route.ts
    - src/app/api/cron/fetch-rates/route.ts
    - src/app/api/cron/fetch-reb-index/route.ts
    - src/app/api/cron/fetch-rents/route.ts
    - src/app/api/cron/fetch-transactions/route.ts
    - src/app/api/cron/generate-cardnews/route.ts
    - src/app/api/cron/generate-report/route.ts
    - src/app/api/cron/generate-seeding/route.ts
    - src/app/api/cron/geocode-complexes/route.ts
    - src/app/api/cron/news/route.ts
    - src/app/api/cron/post-instagram/route.ts
    - src/app/api/cron/refresh-cache/route.ts
    - src/app/api/cron/send-push/route.ts
    - src/app/api/cron/validate-data/route.ts
decisions:
  - "크론잡 응답에는 e.message 허용 — CRON_SECRET 보호 내부 엔드포인트이므로 운영 디버깅 우선"
  - "generic 에러 메시지는 한국어 통일 — 서버 오류가 발생했습니다"
metrics:
  duration: "25min"
  completed_date: "2026-03-26"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 29
---

# Phase 04 Plan 02: API 에러 응답 정리 + 크론잡 Slack 알림 Summary

**One-liner:** 12개 클라이언트 API 라우트에서 e.message 노출 제거 + 17개 크론잡에 sendSlackAlert 일관성 확보

## What Was Built

### Task 1: 클라이언트 대면 API 라우트 에러 응답 정리 + logger 교체

12개 클라이언트 API 라우트에 `import { logger } from "@/lib/logger"` 추가, catch 블록에서 `e.message`/`error.message`/`String(e)` 를 응답에서 제거하고 `"서버 오류가 발생했습니다"` 로 교체. 내부 오류는 `logger.error(...)` 로 서버 측에 구조화 기록.

**변경 파일:**
- `search/route.ts` — `catch (e: any)` → `catch (e)`, `e.message` 응답 제거
- `bank-rates/route.ts` — `error.message` → generic 메시지
- `apt/route.ts`, `apt/extremes/route.ts` — 동일 패턴 (extremes는 2개 에러 경로)
- `analytics/popular/route.ts`, `analytics/pageview/route.ts` — logger 추가
- `daily/route.ts`, `rate/history/route.ts`, `seeding/route.ts` — logger 추가
- `dam/content/route.ts` — GET/PATCH 각각 2개 에러 경로 (error.message + String(e))
- `push/subscribe/route.ts` — error.message + e instanceof Error 분기 제거
- `admin/users/route.ts` — `detail: String(e)` 필드 제거

### Task 2: 크론잡 logger 교체 + Slack 알림 일관성 확보

17개 크론잡 라우트 전체에 `logger` import 추가. 16개에 `sendSlackAlert` import 추가 (fetch-transactions, validate-data는 기존 보유). 에러 발생 시 sendSlackAlert 호출 패턴 통일.

**알림 패턴:**
- `errors[]` 배열 보유 크론잡: `errors.length > 0` 시 `sendSlackAlert` 호출
- 단일 catch 크론잡: catch 블록 내 `sendSlackAlert` 호출
- DB fetch 실패 등 조기 반환 경로에도 알림 추가 (enrich-complexes, geocode-complexes)

**추가 수정:**
- `geocode-complexes/route.ts` — `catch (err: any)` → `catch (err)` + `err instanceof Error` 분기로 타입 개선
- `post-instagram/route.ts` — 내부 console.error 2개 → logger.error 교체
- `generate-report/route.ts` — push trigger console.error → logger.error 교체
- `refresh-cache/route.ts` — catch console.error → logger.error 교체

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] validate-data logger 추가**
- **Found during:** Task 2
- **Issue:** validate-data는 이미 sendSlackAlert를 보유하나 logger import 없음
- **Fix:** logger import 추가
- **Files modified:** `src/app/api/cron/validate-data/route.ts`
- **Commit:** f88bd1d

**2. [Rule 1 - Bug] geocode-complexes `catch (err: any)` 제거**
- **Found during:** Task 2
- **Issue:** `err: any` 사용으로 TypeScript strict 위반 가능성
- **Fix:** `catch (err)` + `err instanceof Error ? err.message : String(err)` 패턴 적용
- **Files modified:** `src/app/api/cron/geocode-complexes/route.ts`
- **Commit:** f88bd1d

## Out of Scope (Deferred)

`src/app/api/coupang/products/route.ts` — console.error 잔존. 이 파일은 계획 범위(cron 라우트)가 아닌 일반 API 라우트이며 계획 파일 목록에도 없으므로 다음 청소 시 처리.

## Verification Results

```
grep -rn "error\.message\|e\.message\|String(e)" src/app/api/ --include="*.ts"
  | grep -v "/cron/" | grep "status: 500"
→ 0건 (통과)

grep -rn "console\." src/app/api/cron/ --include="*.ts"
→ 0건 (통과)

sendSlackAlert 커버리지: 17/17 크론잡 (통과)

pnpm build → 성공 (TypeScript 오류 없음)
```

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 7bd0090 | feat(04-02): 클라이언트 API 라우트 에러 응답 정리 + logger 교체 |
| Task 2 | f88bd1d | feat(04-02): 크론잡 logger 교체 + Slack 알림 일관성 확보 |

## Self-Check: PASSED

- [x] 12개 클라이언트 API 라우트 수정 완료 (7bd0090)
- [x] 17개 크론잡 수정 완료 (f88bd1d)
- [x] pnpm build 성공
- [x] grep 검증 통과
