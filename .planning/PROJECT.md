# 돈줍(DonJup) 사이트 안정화

## What This Is

돈줍은 매일 자동 업데이트되는 전국 아파트 실거래가 폭락/신고가 랭킹과 금리 정보를 제공하는 부동산 데이터 플랫폼(donjup.com)이다. Next.js 16 + Neon PostgreSQL + Firebase Auth 기반으로 운영 중이며, 이번 마일스톤은 **새 기능 추가 없이 기존 사이트의 버그 수정, 기능 이상 해결, 코드 품질 개선, 보안 강화**에 집중한다.

## Core Value

사이트의 모든 페이지가 정상 동작하고, 데이터가 정확하게 표시되며, 사용자가 신뢰할 수 있는 안정적인 서비스를 제공하는 것.

## Requirements

### Validated

- ✓ 메인 홈페이지 실거래가 데이터 표시 — existing
- ✓ 오늘의 거래/신고가 SSR 렌더링 — existing
- ✓ 지역별 시세 (시도/시군구) — existing
- ✓ 전월세 실거래가 — existing
- ✓ 금리 현황 대시보드 — existing
- ✓ 대출 이자 계산기 — existing
- ✓ 부동산 트렌드 차트 — existing
- ✓ 테마 컬렉션 (재건축, 대단지 등) — existing
- ✓ 아파트 비교 기능 — existing
- ✓ 아파트 검색 — existing
- ✓ 지도 실거래가 (카카오맵) — existing
- ✓ 데일리 리포트 아카이브 — existing
- ✓ Firebase 인증 (Google 로그인) — existing
- ✓ 22개 크론잡 자동 데이터 수집 — existing
- ✓ sitemap.xml / robots.txt SEO 기본 — existing
- ✓ PWA manifest / 다크모드 — existing

### Active

- [ ] SEO: canonical URL이 모든 페이지에서 루트를 가리키는 치명적 버그 수정
- [ ] SEO: compare, profile, dam 페이지 title 미설정 수정
- [ ] 지도 페이지 SSR 빈 상태 개선
- [ ] 중복 코드 정리 (formatPrice 이중 정의, Instagram 클라이언트 이중화)
- [ ] 미사용 PostgreSQL 패키지 제거 (postgres, @neondatabase/serverless)
- [ ] Supabase 네이밍 잔재 정리 (src/lib/supabase/ → 실제 DB 클라이언트 명칭)
- [ ] Storage stub 처리 (항상 실패하는 upload 스텁)
- [ ] 에러 메시지 내부 정보 노출 차단 (search API e.message 직접 반환)
- [ ] TypeScript any 타입 남용 개선 (핵심 모듈 위주)
- [ ] 에러 바운더리 누락 (error.tsx / global-error.tsx 없음)
- [ ] 성능: 검색 API ILIKE 쿼리 → pg_trgm 인덱스 또는 full-text search
- [ ] 성능: 대형 컴포넌트 코드 분할 (calculator 1101줄, KakaoMap 640줄 등)
- [ ] 인메모리 rate limiter → 서버리스 환경에 맞는 방식으로 개선
- [ ] DB 커넥션 풀 (max:5) 크론잡 동시 실행 시 고갈 위험 대응
- [ ] 크론잡 스케줄 겹침 정리
- [ ] 접근성(a11y) 최소 기준 충족 (ARIA, 키보드 내비게이션)
- [ ] ADMIN_EMAILS를 NEXT_PUBLIC에서 서버 전용으로 이동
- [ ] DAM content 엔드포인트 인증 추가
- [ ] push subscribe 엔드포인트 보안 강화
- [ ] SSL rejectUnauthorized:false 수정
- [ ] CSP 헤더 추가
- [ ] 로깅 인프라 구축 (console.log → 구조화 로깅)

### Out of Scope

- 새 기능 추가 (멀티 부동산 유형, DSR 계산기 등) — 리뉴얼 v3 마일스톤에서 별도 진행
- UI 리디자인 — 안정화 완료 후 별도 마일스톤
- 테스트 인프라 구축 — 중요하지만 이번 범위 초과, 별도 진행
- Supabase→ORM 마이그레이션 (Drizzle/Kysely) — 코드 품질 개선은 하되 전면 교체는 별도

## Context

- **현재 상태**: 21개 페이지 중 18개 정상, 2개 부분 이슈, SEO에 치명적 canonical 버그
- **코드베이스 분석 완료**: .planning/codebase/ 7개 문서 (STACK, INTEGRATIONS, ARCHITECTURE, STRUCTURE, CONVENTIONS, TESTING, CONCERNS)
- **QA 리포트**: docs/qa-report.md — 2026-03-25 자동화 점검 결과
- **서비스 기획서**: docs/01-service-plan.md — 핵심 가치 및 타겟 사용자 정의
- **리뉴얼 마스터플랜**: docs/11-renewal-v3-master-plan.md — 향후 확장 방향 (이번 범위 아님)
- **폭락 기준**: docs/10-crash-criteria-v2.md — 3단계 분류 체계 설계 완료
- **배포**: Vercel (donjup.com), Neon PostgreSQL, Firebase Auth/Firestore
- **테스트 없음**: 전체 코드베이스에 테스트 파일 0개

## Constraints

- **Tech Stack**: Next.js 16 + React 19 + Tailwind CSS 4 + TypeScript — 변경 없음
- **배포**: Vercel serverless — 서버리스 환경 제약 (인메모리 상태 비영속)
- **DB**: Neon PostgreSQL — max 5 커넥션 풀 제약
- **보안 순서**: 보안 관련 작업은 마지막에 진행 — 다른 수정 후 발생할 수 있는 보안 이슈까지 한번에 처리
- **비용**: 최소 비용으로 진행 (외부 서비스 추가 최소화)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 보안 작업을 마지막 페이즈에 배치 | 다른 수정 과정에서 보안 이슈가 추가 발생할 수 있으므로 마지막에 일괄 처리 | — Pending |
| 새 기능 추가 없이 안정화만 | 현재 사이트 품질 문제가 많아 안정화가 우선 | — Pending |
| ORM 전면 교체 없이 기존 쿼리빌더 개선만 | 전면 교체는 리스크가 크고 별도 마일스톤으로 분리 | — Pending |

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
*Last updated: 2026-03-26 after initialization*
