---
phase: "03"
plan: "03"
subsystem: component-split
tags: [refactor, components, home-page]
dependency_graph:
  requires: [CLN-01]
  provides: [CLN-06-partial]
  affects: [src/app/page.tsx, src/components/home/]
tech_stack:
  patterns: [single-responsibility, component-extraction]
key_files:
  created:
    - src/components/home/HeroSection.tsx
    - src/components/home/StatsBar.tsx
    - src/components/home/RateBar.tsx
    - src/components/home/SidebarRateCard.tsx
    - src/components/home/SearchCTA.tsx
    - src/components/home/QuickLinks.tsx
    - src/components/home/PopularComplexes.tsx
  modified:
    - src/app/page.tsx
decisions:
  - "StatBarItem + QuickLinkCard 인라인 컴포넌트는 각 파일 내부에 배치 (별도 파일 불필요)"
  - "filterByType 유틸은 page.tsx에 유지 (데이터 페칭과 밀접하게 결합)"
metrics:
  duration: "15분"
  completed_date: "2026-03-26"
  tasks: 5
  files_created: 7
  files_modified: 1
---

# Phase 03 Plan 03: src/app/page.tsx 컴포넌트 분할 Summary

## One-liner

HeroSection, StatsBar, RateBar, SearchCTA, QuickLinks, PopularComplexes, SidebarRateCard 7개 서브 컴포넌트 추출로 page.tsx 663줄 → 213줄 달성

## What Was Done

src/app/page.tsx (663줄)에 혼재하던 UI 섹션을 역할별로 분리하여 7개 서브 컴포넌트를 생성했다.

### 추출된 컴포넌트

| 파일 | 역할 | 줄수 |
|------|------|------|
| HeroSection.tsx | 드라마틱 헤드라인 + 서브라인 | 92 |
| StatsBar.tsx | 거래건수/단지수/폭락/신고가 통계 바 | 43 |
| RateBar.tsx | 상단 가로 금리 현황 바 | 55 |
| SidebarRateCard.tsx | 사이드바 금리 카드 | 56 |
| SearchCTA.tsx | "내 아파트 얼마나 떨어졌을까" CTA | 28 |
| QuickLinks.tsx | 검색/전월세/테마/비교 바로가기 | 72 |
| PopularComplexes.tsx | 인기 단지 TOP (7일 조회수) | 57 |

### page.tsx 변화

- **before:** 663줄, 인라인 함수 5개 (StatBarItem, QuickLinkCard + JSX 섹션들)
- **after:** 213줄, 데이터 페칭 + 컴포넌트 호출만 포함

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

Files exist:
- src/components/home/HeroSection.tsx: FOUND
- src/components/home/StatsBar.tsx: FOUND
- src/components/home/RateBar.tsx: FOUND
- src/components/home/SidebarRateCard.tsx: FOUND
- src/components/home/SearchCTA.tsx: FOUND
- src/components/home/QuickLinks.tsx: FOUND
- src/components/home/PopularComplexes.tsx: FOUND

page.tsx line count: 213 (< 300 target): PASSED
pnpm build: PASSED
Commit d85fdd2: FOUND
