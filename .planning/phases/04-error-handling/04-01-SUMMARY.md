---
phase: 04-error-handling
plan: "01"
subsystem: error-handling
tags: [logging, error-boundary, security, brand-ui]
dependency_graph:
  requires: []
  provides: [structured-logging, error-boundary, global-error-boundary]
  affects: [api-routes, app-shell]
tech_stack:
  added: []
  patterns: [structured-json-logging, error-boundary-pattern]
key_files:
  created:
    - src/lib/logger.ts
    - src/app/global-error.tsx
  modified:
    - src/app/error.tsx
decisions:
  - "외부 로깅 라이브러리(pino/winston) 미사용 — 서버리스 환경 오버헤드 최소화"
  - "global-error.tsx에 인라인 스타일 사용 — globals.css가 layout.tsx 밖에서 로드 불가"
metrics:
  duration: "~5m"
  completed: "2026-03-26"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 3
---

# Phase 04 Plan 01: 구조화 로깅 + 브랜드 에러 페이지 Summary

외부 의존성 없는 JSON 구조화 로깅 유틸(logger.ts)과 error.message 미노출 브랜드 에러 바운더리(error.tsx, global-error.tsx) 구현.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | 구조화 로깅 유틸리티 생성 | c10b264 | src/lib/logger.ts |
| 2 | 브랜드 에러 페이지 구현 | 53c3563 | src/app/error.tsx, src/app/global-error.tsx |

## What Was Built

**src/lib/logger.ts**
- `logger.debug/info/warn/error(message, context?)` 4개 레벨
- 개발환경: `console.*` 메서드 (가독성), 프로덕션: `JSON.stringify` 구조화 출력
- `context.error`가 Error 인스턴스일 때 `name/message/stack` 포함
- `sendSlackAlert` re-export 포함

**src/app/error.tsx**
- `error.message` 직접 표시 제거 (ERR-01 충족)
- `₩` 브랜드 아이콘 (not-found.tsx와 일관)
- "다시 시도" 버튼 + "홈으로 돌아가기" Link 추가

**src/app/global-error.tsx**
- `"use client"` + `html`/`body` 태그 포함
- 인라인 스타일 (CSS 로드 불가 환경 대응)
- 브랜드 컬러 `#2563eb` 사용

## Verification

- `grep "error.message" src/app/error.tsx` — 0건 확인
- `grep "html" src/app/global-error.tsx` — 존재 확인
- `pnpm build` — 성공

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- src/lib/logger.ts: EXISTS
- src/app/error.tsx: EXISTS (modified)
- src/app/global-error.tsx: EXISTS
- Commit c10b264: EXISTS
- Commit 53c3563: EXISTS
- pnpm build: PASSED
