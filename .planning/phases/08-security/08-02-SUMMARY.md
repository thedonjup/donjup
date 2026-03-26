---
phase: 08-security
plan: 02
subsystem: security
tags: [auth, csp, ssl, firebase, api-security]
completed: "2026-03-26"
duration_seconds: 320

dependency_graph:
  requires: [07-01, 07-02]
  provides: [SEC-01, SEC-02, SEC-03, SEC-04, SEC-05]
  affects: [src/app/api/dam/content/route.ts, src/app/api/push/subscribe/route.ts, src/lib/admin/auth.ts, src/lib/db/client.ts, next.config.ts]

tech_stack:
  added: []
  patterns:
    - "Firebase ID token 검증 (verifyIdToken) — DAM admin API 보호"
    - "Origin allowlist — push subscribe 악용 방지"
    - "CSP 헤더 — Content-Security-Policy 선언"

key_files:
  created: []
  modified:
    - src/app/api/dam/content/route.ts
    - src/app/dam/content/page.tsx
    - src/app/api/push/subscribe/route.ts
    - src/lib/admin/auth.ts
    - src/app/dam/settings/page.tsx
    - src/lib/db/client.ts
    - next.config.ts

decisions:
  - "DAM content API에 Firebase ID token 인증 추가 — 클라이언트(dam/content 페이지)가 Firebase Auth를 이미 사용하므로 CRON_SECRET보다 적합"
  - "push subscribe origin 허용 목록을 도메인 2개(donjup.com, www.donjup.com)로 제한 — 개발환경(NODE_ENV=development)은 제외"
  - "ADMIN_EMAILS를 서버 전용으로 — NEXT_PUBLIC 변수는 클라이언트 번들에 포함되어 이메일 노출 위험"
  - "SSL rejectUnauthorized: true — Neon PostgreSQL은 유효한 CA 서명 인증서 사용"
  - "CSP에 unsafe-inline, unsafe-eval 포함 — Next.js 16 + Tailwind CSS 4 인라인 스크립트/스타일 필요"

metrics:
  tasks_completed: 5
  tasks_total: 5
  files_modified: 7
  commits: 5
---

# Phase 8 Plan 2: 보안 강화 (SEC-01~05) Summary

**One-liner:** Firebase ID token으로 DAM content API 보호, push subscribe origin+입력 검증, ADMIN_EMAILS 서버 전용 이동, SSL rejectUnauthorized true, CSP 헤더 추가

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | DAM content API Firebase 인증 | b8d37ae | route.ts, content/page.tsx |
| 2 | push subscribe 보안 강화 | 8146a9f | push/subscribe/route.ts |
| 3 | ADMIN_EMAILS 서버 전용 이동 | 9e2726c | admin/auth.ts, settings/page.tsx |
| 4 | SSL rejectUnauthorized true | 8b01036 | db/client.ts |
| 5 | CSP 헤더 추가 | 89931db | next.config.ts |

## What Was Built

### Task 1: DAM content API 인증 (SEC-02)

`/api/dam/content` GET/PATCH 핸들러에 `verifyAdminToken()` 미들웨어를 추가했다.
- Firebase Admin SDK `verifyIdToken()` + `isAdmin()` 이메일 확인
- 클라이언트(`dam/content/page.tsx`)에서 `user.getIdToken()`으로 Authorization 헤더 전송
- 인증 실패 시 401, 관리자 아닌 경우 403 반환

### Task 2: push subscribe 보안 강화 (SEC-03)

- `ALLOWED_ORIGINS` 허용 목록 검증 (donjup.com, www.donjup.com; 개발환경 제외)
- 입력 데이터 검증: `endpoint`가 `https://`로 시작하는지, `keys.p256dh`/`keys.auth`가 비어있지 않은 문자열인지 확인

### Task 3: ADMIN_EMAILS 서버 전용 (SEC-01)

- `src/lib/admin/auth.ts`: `NEXT_PUBLIC_ADMIN_EMAILS` → `ADMIN_EMAILS`
- `dam/settings/page.tsx`: 클라이언트에서 서버 전용 환경변수 참조 제거, 정적 텍스트로 대체

### Task 4: SSL 설정 수정 (SEC-04)

- `src/lib/db/client.ts`: `rejectUnauthorized: false` → `rejectUnauthorized: true`
- Neon PostgreSQL은 공인 CA 서명 인증서 사용하므로 안전

### Task 5: CSP 헤더 추가 (SEC-05)

`next.config.ts`에 `Content-Security-Policy` 헤더 추가:
- Kakao SDK (`dapi.kakao.com`, `t1.kakaocdn.net`)
- Google Analytics, GTM, AdSense 도메인
- Firebase (`.googleapis.com`, `.firebaseapp.com`, `.firebase.com`)
- Google Fonts
- PWA 서비스워커(`worker-src blob:`)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Verification Results

- `grep "verifyIdToken" src/app/api/dam/content/route.ts` — match found
- `grep "origin" src/app/api/push/subscribe/route.ts` — match found
- `grep "NEXT_PUBLIC_ADMIN_EMAILS" src/lib/admin/auth.ts` — 0 matches
- `grep "rejectUnauthorized" src/lib/db/client.ts` — "true"
- `grep "Content-Security-Policy" next.config.ts` — match found
- `pnpm build` — success

## Self-Check: PASSED
