---
phase: 01-seo
plan: "01"
subsystem: seo
tags: [canonical, metadata, title, seo]
dependency_graph:
  requires: []
  provides: [canonical-url-all-pages, dam-title-template]
  affects: [search-engine-indexing]
tech_stack:
  added: []
  patterns: [Next.js metadata alternates.canonical, Next.js title template]
key_files:
  created: []
  modified:
    - src/app/page.tsx
    - src/app/layout.tsx
    - src/app/dam/layout.tsx
decisions:
  - "루트 레이아웃의 alternates를 canonical: '/'로 설정하여 홈페이지 기본값 확립"
  - "dam 관리자는 noindex이므로 SEO 영향 없음, title template으로 하위 페이지 구분 개선"
metrics:
  duration: "8m"
  completed_date: "2026-03-26"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 3
requirements:
  - SEO-01
  - SEO-02
---

# Phase 01 Plan 01: Canonical URL 및 Title 설정 Summary

**One-liner:** 홈페이지 canonical `/` 추가, 루트 레이아웃 빈 alternates 수정, dam 레이아웃 title template 구조 적용

## What Was Done

모든 공개 페이지에 canonical URL이 올바르게 설정되도록 홈페이지와 루트 레이아웃을 수정하고, dam 관리자 레이아웃의 title을 template 구조로 개선했다.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | 전체 페이지 canonical URL 점검 및 홈페이지 canonical 추가 | 8bb17a5 | src/app/page.tsx, src/app/layout.tsx |
| 2 | dam 관리자 하위 페이지에 개별 title 추가 | 4580cf1 | src/app/dam/layout.tsx |

## Changes Made

### Task 1: Canonical URL

**src/app/page.tsx**
- `Metadata` import 추가
- `metadata` export 신규 추가: `{ alternates: { canonical: "/" } }`

**src/app/layout.tsx**
- `alternates: {}` → `alternates: { canonical: "/" }` 수정
- 하위 페이지에서 자체 canonical 오버라이드하지 않는 경우 루트를 가리키는 기본값 확립

**Canonical 현황 (점검 결과)**
- 모든 공개 서브 페이지에 이미 개별 canonical 설정 완료
- about, apt/[region]/[slug], compare, daily/archive, daily/[date], map, market/*, new-highs, privacy, profile, rate/*, rent, search, themes/*, today, trend 모두 포함

### Task 2: Dam Title Template

**src/app/dam/layout.tsx**
- `title: "관리자"` → `title: { default: "관리자", template: "%s | 관리자" }` 변경
- 하위 페이지별 개별 layout.tsx에서 title 추가 시 자동 조합 가능
- dam은 noindex이므로 SEO 직접 영향 없음

**Title 현황 (점검 결과)**
- compare: "아파트 비교" (기존 설정 확인)
- profile: "내 프로필" (기존 설정 확인)
- dam: template 구조로 개선 (이번 작업)

## Verification

- `grep -n "canonical" src/app/page.tsx` → `alternates: { canonical: "/" }` 존재 확인
- `grep -n "canonical" src/app/layout.tsx` → `alternates: { canonical: "/" }` 존재 확인
- `grep -rn "canonical" src/app/` → 20개 페이지/레이아웃에 canonical 설정 확인
- `pnpm build` 성공

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- src/app/page.tsx: canonical "/" 포함 확인
- src/app/layout.tsx: canonical "/" 포함 확인
- src/app/dam/layout.tsx: title template 구조 확인
- Commits 8bb17a5, 4580cf1 존재 확인
- pnpm build 성공
