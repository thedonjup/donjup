---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: 서비스 품질 개선
current_phase: null
status: defining_requirements
stopped_at: null
last_updated: "2026-03-31"
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State: 돈줍

**Current Phase:** Not started (defining requirements)
**Milestone:** v1.3 — 서비스 품질 개선
**Status:** Defining requirements

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-03-31 — Milestone v1.3 started

## Key Context

**v1.3 target areas (from codebase audit):**

1. **디자인 시스템** — 하드코딩 색상 82개, CSS변수+Tailwind+인라인 3층 혼재, 다크모드 깨짐
2. **데이터 표현** — 가격 포맷 3종 혼용, null 표시 불일치, 면적 단위 불일치
3. **URL 구조** — aptSeq 미적용(2회 지시), makeSlug 5곳 중복, Profile 링크 깨짐, Sitemap 불완전
4. **깨진 기능** — 카드뉴스 Storage 미구현 → Instagram 포스팅 실패
5. **UX** — 검색 결과 정보 부족, 차트 범례 불명확

**Critical constraints:**
- CockroachDB Serverless (donjup-23714, ap-southeast-1)
- Firebase Auth + Firestore (댓글)
- Vercel serverless 환경
- 최소 비용 원칙

## Accumulated Context

(v1.2 decisions archived — see PROJECT.md Key Decisions)

## Pending Todos

None.

## Blockers/Concerns

- URL 변경 시 기존 인덱싱된 URL 301 리다이렉트 필요
- 카드뉴스 Storage: Vercel Blob vs Cloudflare R2 vs 기타 — 비용 비교 필요

## Decisions

(v1.3 decisions will be tracked here)

## Last Session

Stopped at: Milestone v1.3 started
Last updated: 2026-03-31

---
*Last updated: 2026-03-31 — v1.3 milestone initialized*
