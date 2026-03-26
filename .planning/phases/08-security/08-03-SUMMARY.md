---
phase: 08-security
plan: "03"
subsystem: security
tags: [csp, security-headers, xss-prevention]
dependency_graph:
  requires: []
  provides: [SEC-05]
  affects: [next.config.ts]
tech_stack:
  added: []
  patterns: [Content-Security-Policy enforce mode, CSP directive array join pattern]
key_files:
  created: []
  modified:
    - next.config.ts
decisions:
  - "unsafe-inline for scripts: theme init, GA dataLayer init, JSON-LD are inline scripts in layout.tsx — nonce-based approach deferred"
  - "unsafe-eval retained: Kakao Maps SDK uses eval internally"
  - "enforce mode (not report-only): fast feedback via browser console on CSP violations"
  - "wss://*.firebaseio.com in connect-src: Firebase Firestore uses WebSocket connections"
metrics:
  duration: "5m"
  completed: "2026-03-26"
  tasks_completed: 1
  files_modified: 1
---

# Phase 08 Plan 03: CSP Header Summary

Content-Security-Policy 헤더를 next.config.ts에 enforce 모드로 추가. Kakao SDK, Google Analytics/AdSense, Firebase, Vercel, Supabase 스토리지 이미지 도메인을 화이트리스트에 포함하여 외부 서비스가 차단 없이 정상 동작하도록 구성.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | CSP 헤더 추가 (SEC-05) | dd46ba9 | next.config.ts |

## Checkpoint

Task 2 (checkpoint:human-verify) — auto-approved per user instruction. Build succeeded with CSP header present.

## Decisions Made

1. `unsafe-inline` 유지: layout.tsx에 theme init 인라인 스크립트, GA dataLayer 초기화, JSON-LD structured data가 있어 필수. nonce 기반 전환은 App Router 복잡도로 인해 향후 과제.
2. `unsafe-eval` 유지: Kakao Maps SDK가 내부적으로 eval 사용 가능성. 문제 발생 시 제거.
3. enforce 모드 직접 적용: report-only 단계 건너뜀. 브라우저 콘솔에서 즉시 위반 확인 가능.
4. `wss://*.firebaseio.com` 추가: Firebase Firestore WebSocket 연결 허용.
5. `https://*.supabase.co` 추가: 스토리지 이미지 도메인 허용 (사용자 지시).

## CSP Directives Summary

| Directive | Key Allowed Sources |
|-----------|-------------------|
| default-src | 'self' |
| script-src | 'self' 'unsafe-inline' 'unsafe-eval' + Kakao, GTM, GA, AdSense, Vercel |
| style-src | 'self' 'unsafe-inline' (Tailwind) |
| img-src | 'self' data: blob: https: http: |
| connect-src | 'self' + Kakao, GA, Firebase, AdSense, Supabase, Vercel |
| frame-src | 'self' + Google accounts, AdSense, DoubleClick, Vercel Live |
| object-src | 'none' |
| frame-ancestors | 'none' (XSS clickjacking prevention) |

## Deviations from Plan

None — plan executed exactly as written. Added `t1.daumcdn.net` (mentioned in user prompt as required for Kakao) and Supabase/Vercel domains per explicit user instructions.

## Self-Check: PASSED

- next.config.ts contains "Content-Security-Policy": confirmed (grep count: 1)
- commit dd46ba9 exists: confirmed
- pnpm build succeeded: confirmed (no error output)
