# Requirements: v1.2 코드 품질 강화

**Defined:** 2026-03-28
**Core Value:** 장기 유지보수성 확보 — 테스트 가능하고 타입 안전한 코드베이스

## 테스트 인프라 (TEST)

- [x] **TEST-01**: Vitest가 설치·설정되어 `npm test`로 전체 테스트를 실행할 수 있다
- [x] **TEST-02**: price-normalization.ts의 모든 exported 함수에 유닛 테스트가 존재한다
- [x] **TEST-03**: cluster-index.ts의 computeClusterIndex에 유닛 테스트가 존재한다
- [x] **TEST-04**: 주요 API 라우트(fetch-transactions, fetch-rents, fetch-bank-rates)에 통합 테스트가 존재한다
- [x] **TEST-05**: Playwright가 설치되어 홈 페이지 로드 + 기본 네비게이션 E2E 테스트가 동작한다

## ORM 교체 (ORM)

- [x] **ORM-01**: Drizzle ORM이 설치·설정되어 Neon PostgreSQL에 연결된다
- [x] **ORM-02**: apt_transactions 테이블에 대한 Drizzle 스키마가 정의되고 기존 raw SQL 쿼리가 Drizzle 쿼리로 교체된다
- [x] **ORM-03**: apt_rent_transactions 테이블에 대한 Drizzle 스키마가 정의되고 기존 supabase 쿼리가 교체된다
- [x] **ORM-04**: finance_rates 테이블에 대한 Drizzle 스키마가 정의되고 기존 쿼리가 교체된다
- [x] **ORM-05**: apt_complexes 및 기타 테이블의 Drizzle 스키마가 정의되고 모든 DB 접근이 통일된다
- [x] **ORM-06**: getPool().query() 직접 호출이 0건이 된다 (cluster-index 포함)

## 코드 정리 (CLEAN)

- [x] **CLEAN-01**: `as any` 타입 캐스트가 프로덕션 코드에서 제거되거나 최소화된다 (5개 미만)
- [x] **CLEAN-02**: 미사용 import/변수가 프로덕션 코드에서 0건이 된다
- [x] **CLEAN-03**: 중복된 DB 연결 패턴(createClient, createRentServiceClient, getPool)이 Drizzle 단일 패턴으로 통일된다

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| TEST-01 | Phase 16 | Complete |
| TEST-02 | Phase 16 | Complete |
| TEST-03 | Phase 16 | Complete |
| TEST-04 | Phase 17 | Complete |
| TEST-05 | Phase 17 | Complete |
| ORM-01 | Phase 18 | Complete |
| ORM-02 | Phase 18 | Complete |
| ORM-03 | Phase 18 | Complete |
| ORM-04 | Phase 18 | Complete |
| ORM-05 | Phase 18 | Complete |
| ORM-06 | Phase 18 | Complete |
| CLEAN-01 | Phase 19 | Complete |
| CLEAN-02 | Phase 19 | Complete |
| CLEAN-03 | Phase 19 | Complete |

## Future Requirements (v2.0+)

- UI 전면 리디자인 — v3 마일스톤
- 동/호수(unit) 단위 가격 예측 — MOLIT API 호수 데이터 미제공
- 인구 이동 데이터 연동 — 외부 데이터 소스 필요
- 학군 정보 — 외부 데이터 소스 필요
- PIR (소득 대비 집값) — 소득 데이터 소스 필요
- 미분양 현황 — 국토부 별도 API 필요

## Out of Scope

- UI 리디자인 — v3 마일스톤
- 새 기능 추가 — v1.2는 품질 강화에 집중
- DB 스키마 변경 — Drizzle은 기존 스키마에 매핑 (마이그레이션 없음)

---
*Requirements defined: 2026-03-28*
