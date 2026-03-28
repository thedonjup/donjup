# 돈줍(DonJup) — 부동산 데이터 플랫폼

## What This Is

돈줍은 매일 자동 업데이트되는 전국 아파트 실거래가 폭락/신고가 랭킹과 금리 정보를 제공하는 부동산 데이터 플랫폼(donjup.com)이다. Next.js 16 + Neon PostgreSQL + Firebase Auth 기반으로 운영 중.

## Core Value

사용자가 아파트 시장 흐름을 정확히 읽고, 신뢰할 수 있는 데이터 기반 의사결정을 할 수 있게 하는 것.

## Current Milestone: v1.1 데이터 분석 고도화

**Goal:** 가격 노이즈 제거 + 일관된 추이/지수 제공 + 업계 기본 지표 추가로 사용자가 시장을 정확히 읽게 한다.

**Target features:**
- 가격 정규화 엔진 — 층별 보정계수, 전체 합산 제거, 중위가 기반 차트
- 차트 재구현 — 기간 선택, 저층 필터 토글, 이동중위가 추이선
- 랭킹 정교화 — 고층 환산 변동률, 이상거래 필터
- 지역 지수 — 군집별(강남3구, 마용성, 노도강 등) 중위가 지수 + 시계열 차트
- 금리 표현 개선 — 초기 화면 시중금리 평균 1개, 상세는 펼침
- 전세가율/갭 분석 — 단지별 전세가율 + 갭 금액 표시

## Requirements

### Validated (v1.0 완료)

- ✓ SEO / 메타데이터 정상화 — v1.0 Phase 1
- ✓ 코드 정리 (패키지/네이밍) — v1.0 Phase 2
- ✓ 컴포넌트 분할 — v1.0 Phase 3
- ✓ 에러 핸들링 / 구조화 로깅 — v1.0 Phase 4
- ✓ 성능 최적화 (pg_trgm, 크론잡) — v1.0 Phase 5
- ✓ TypeScript 타입 강화 — v1.0 Phase 6
- ✓ 접근성 (a11y) — v1.0 Phase 7
- ✓ 보안 강화 (CSP, SSL, 인증) — v1.0 Phase 8
- ✓ 모바일 UI 전면 개편 — v1.0 Phase 9
- ✓ 기존 기능 전체 (실거래가, 금리, 검색, 지도, 계산기 등)
- ✓ 가격 정규화 엔진 — v1.1 Phase 10
- ✓ 전세가율/갭 분석 — v1.1 Phase 11
- ✓ 금리 표현 개선 — v1.1 Phase 12

### Active

(v1.1 REQUIREMENTS.md에서 관리)

### Out of Scope

- 동/호수(unit) 단위 가격 예측 — MOLIT API에 호수 데이터 미제공 확인 필요, 별도 검증 후 진행
- ORM 전면 교체 (Drizzle/Kysely) — 별도 마일스톤
- 테스트 인프라 구축 — 별도 마일스톤
- UI 전면 리디자인 — v3 마일스톤

## Context

- **v1.0 완료**: 9 phases, 21 plans — SEO/코드정리/컴포넌트/에러/성능/타입/접근성/보안/모바일UI
- **코드베이스 분석**: .planning/codebase/ 7개 문서 (2026-03-28 리프레시)
- **리서치 완료**: .planning/research/ — 저층 기준, 벤치마킹, 가격 정규화 방법론
- **배포**: Vercel (donjup.com), Neon PostgreSQL, Firebase Auth/Firestore
- **폭락 기준**: docs/10-crash-criteria-v2.md — 3단계 분류 체계

## Constraints

- **Tech Stack**: Next.js 16 + React 19 + Tailwind CSS 4 + TypeScript — 변경 없음
- **배포**: Vercel serverless — 서버리스 환경 제약
- **DB**: Neon PostgreSQL — 커넥션 풀 max 10
- **비용**: 최소 비용 (외부 서비스 추가 최소화)
- **데이터**: 국토교통부 실거래가 + 금감원 금리 — 추가 데이터 소스 없음

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| v1.0 안정화 먼저, v1.1 데이터 고도화 | 품질 기반 위에 분석 기능 쌓기 | v1.0 완료 |
| 층별 보정계수 경험적 값 사용 | 공식 통계 없음, 업계 통용값 활용 | Pending |
| 중위가 기반 대표가 (평균 아님) | 이상거래에 강건, 통계적 우위 | Pending |
| 전체 면적 합산 차트 삭제 | 면적별 가격 차이로 그래프 왜곡 | Pending |
| 지역 지수 자체 산출 | 경쟁사 미제공, 블루오션 기회 | Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-28 — Phase 12 complete, Phase 13 next*
