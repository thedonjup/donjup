# 돈줍(DonJup) — 부동산 데이터 플랫폼

## What This Is

돈줍은 매일 자동 업데이트되는 전국 아파트 실거래가 폭락/신고가 랭킹, 금리 정보, 가격 정규화 차트, 전세가율 분석, 군집별 지역 지수를 제공하는 부동산 데이터 플랫폼(donjup.com)이다. Next.js 16 + CockroachDB Serverless + Firebase Auth 기반으로 운영 중.

## Core Value

사용자가 아파트 시장 흐름을 정확히 읽고, 신뢰할 수 있는 데이터 기반 의사결정을 할 수 있게 하는 것.

## Current Milestone: v1.3 서비스 품질 개선

**Goal:** 디자인 시스템 통합, 데이터 표현 정규화, URL 구조 개편, 깨진 기능 복구로 사용자 경험 품질을 근본적으로 개선한다

**Target features:**
- 디자인 시스템 통합 — 하드코딩 색상 82개 → CSS 변수/유틸클래스, 인라인 style → className, 다크모드 정상화
- 데이터 표현 정규화 — 가격 포맷 단일화, null/빈값 표시 규칙 통일, 면적·날짜 단위 일관성
- URL 구조 개편 — aptSeq 기반 아파트 URL, makeSlug 중앙화, Sitemap 완성, 301 리다이렉트
- 깨진 기능 복구 — 카드뉴스 Storage 연동 + Instagram 포스팅 파이프라인 완성
- 추가 UX 개선 — 검색 결과 보강, 차트 범례 개선, Profile 링크 수정

## Previous States

**v1.2 코드 품질 강화 — SHIPPED 2026-03-28**

v1.0 + v1.1 + v1.2 총 19개 phase, 42개 plan 완료.

주요 성과:
- 테스트 인프라: Vitest 54 유닛 + 12 통합 + Playwright 4 E2E = 70 tests
- Drizzle ORM: 전체 DB 접근 단일 패턴 (35 call sites 마이그레이션)
- 코드 정리: `as any` 0건, 미사용 import 0건, 레거시 DB 패턴 0건

## Previous States

<details>
<summary>v1.2 코드 품질 강화 — SHIPPED 2026-03-28</summary>

- Phase 16: 테스트 인프라 (Vitest + 유닛 테스트)
- Phase 17: 통합 테스트 & E2E (API + Playwright)
- Phase 18: Drizzle ORM 전면 교체
- Phase 19: 코드 정리

</details>

<details>
<summary>v1.1 데이터 분석 고도화 — SHIPPED 2026-03-28</summary>

v1.0(사이트 안정화) + v1.1(데이터 분석 고도화) 총 15개 phase, 33개 plan 완료.

주요 배포 기능:
- 가격 정규화: 저층 보정, 이상거래 필터, 3개월 이동중위가 차트
- 전세가율/갭 분석: 면적별 전세가율·갭 금액 카드 + 추이 차트
- 차트 개선: 기간 선택 탭, 매매/전세 듀얼 라인, 전세가율 오버레이
- 금리 표현: 히어로 카드 + accordion + 은행별 확장
- 랭킹 정교화: 고층 환산 변동률, 이상거래 제외, 저층 뱃지
- 지역 지수: 군집별 중위가 지수 대시보드 (/index)

</details>

## Requirements

### Validated

- ✓ SEO / 메타데이터 정상화 — v1.0
- ✓ 코드 정리 (패키지/네이밍) — v1.0
- ✓ 컴포넌트 분할 — v1.0
- ✓ 에러 핸들링 / 구조화 로깅 — v1.0
- ✓ 성능 최적화 (pg_trgm, 크론잡) — v1.0
- ✓ TypeScript 타입 강화 — v1.0
- ✓ 접근성 (a11y) — v1.0
- ✓ 보안 강화 (CSP, SSL, 인증) — v1.0
- ✓ 모바일 UI 전면 개편 — v1.0
- ✓ 가격 정규화 엔진 — v1.1
- ✓ 전세가율/갭 분석 — v1.1
- ✓ 금리 표현 개선 — v1.1
- ✓ 차트 개선 (기간 탭, 듀얼 라인, 오버레이) — v1.1
- ✓ 랭킹 정교화 (고층 환산, 이상거래 필터) — v1.1
- ✓ 지역 지수 대시보드 — v1.1
- ✓ 테스트 인프라 구축 — v1.2
- ✓ Drizzle ORM 교체 — v1.2
- ✓ 코드 정리 — v1.2

### Active

- [ ] 디자인 시스템 통합 (CSS변수+Tailwind+하드코딩 3층 → CSS변수 단일 체계)
- [ ] 데이터 표현 정규화 (가격·면적·날짜·null 표시 일관성)
- [ ] URL 구조 개편 (aptSeq 기반 URL + makeSlug 중앙화 + Sitemap)
- [ ] 깨진 기능 복구 (카드뉴스 Storage + Instagram 포스팅)
- [ ] UX 개선 (검색·차트·Profile 링크 등)

### Out of Scope

- 동/호수(unit) 단위 가격 예측 — MOLIT API에 호수 데이터 미제공
- UI 전면 리디자인 — v3 마일스톤

## Context

- **v1.0 완료**: 9 phases, 21 plans — 사이트 안정화
- **v1.1 완료**: 6 phases, 12 plans — 데이터 분석 고도화
- **배포**: Vercel (donjup.com), CockroachDB Serverless, Firebase Auth/Firestore
- **폭락 기준**: docs/10-crash-criteria-v2.md — 3단계 분류 체계
- **아카이브**: .planning/milestones/ — v1.0, v1.1 로드맵/요구사항

## Constraints

- **Tech Stack**: Next.js 16 + React 19 + Tailwind CSS 4 + TypeScript
- **배포**: Vercel serverless
- **DB**: CockroachDB Serverless — 커넥션 풀 max 10
- **비용**: 최소 비용 (외부 서비스 추가 최소화)
- **데이터**: 국토교통부 실거래가 + 금감원 금리

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| v1.0 안정화 먼저, v1.1 데이터 고도화 | 품질 기반 위에 분석 기능 쌓기 | ✓ Good |
| 층별 보정계수 경험적 값 사용 | 공식 통계 없음, 업계 통용값 활용 | ✓ Good — 1층 +14.9%, 2층 +11.1%, 3층 +4.2% |
| 중위가 기반 대표가 (평균 아님) | 이상거래에 강건, 통계적 우위 | ✓ Good — 차트/지수 전면 적용 |
| 전체 면적 합산 차트 삭제 | 면적별 가격 차이로 그래프 왜곡 | ✓ Good — 면적 자동 선택으로 대체 |
| 지역 지수 자체 산출 | 경쟁사 미제공, 블루오션 기회 | ✓ Good — /index 페이지 배포 |
| DB 스키마 무변경 원칙 | 서비스 중단 최소화, 조회 시 보정 | ✓ Good — 랭킹/차트 전부 런타임 보정 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-03-31 after v1.3 milestone start*
