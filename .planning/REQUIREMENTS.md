# Requirements: 돈줍 사이트 안정화

**Defined:** 2026-03-26
**Core Value:** 사이트의 모든 페이지가 정상 동작하고, 데이터가 정확하게 표시되며, 사용자가 신뢰할 수 있는 안정적인 서비스를 제공하는 것.

## v1 Requirements

### SEO / 메타데이터

- [ ] **SEO-01**: 모든 페이지의 canonical URL이 해당 페이지의 실제 URL을 가리킨다
- [ ] **SEO-02**: compare, profile, dam 페이지에 고유 title이 설정된다
- [x] **SEO-03**: 지도 페이지 SSR에서 빈 상태 대신 유의미한 콘텐츠가 렌더링된다
- [x] **SEO-04**: 주요 서브 페이지(today, new-highs, market, rate)에 전용 OG Image가 생성된다

### 코드 정리 / 리팩토링

- [ ] **CLN-01**: formatPrice 함수가 단일 소스(src/lib/format.ts)에서만 정의된다
- [ ] **CLN-02**: Instagram API 클라이언트가 하나로 통합된다
- [ ] **CLN-03**: 미사용 PostgreSQL 패키지(postgres, @neondatabase/serverless)가 제거된다
- [ ] **CLN-04**: src/lib/supabase/ 디렉토리가 실제 역할에 맞게 src/lib/db/로 리네이밍된다
- [ ] **CLN-05**: Storage stub이 제거되거나 적절한 구현으로 교체된다
- [ ] **CLN-06**: 대형 컴포넌트(calculator 1101줄, KakaoMap 640줄)가 서브 컴포넌트로 분할된다

### 에러 핸들링 / 로깅

- [ ] **ERR-01**: error.tsx와 global-error.tsx가 브랜드 에러 페이지로 구현된다
- [ ] **ERR-02**: API 라우트에서 내부 에러 메시지가 클라이언트에 노출되지 않는다
- [ ] **ERR-03**: console.log 기반 로깅이 구조화된 로깅 유틸로 교체된다
- [ ] **ERR-04**: 크론잡 실패 시 일관된 알림(Slack)이 발송된다

### 성능

- [ ] **PERF-01**: 검색 API가 pg_trgm GIN 인덱스를 활용한다
- [ ] **PERF-02**: DB 커넥션 풀 설정이 크론잡 동시 실행에 대응한다
- [ ] **PERF-03**: 크론잡 스케줄 겹침이 해소된다
- [ ] **PERF-04**: 인메모리 rate limiter가 서버리스 환경에 맞게 개선된다

### TypeScript / 타입 안전성

- [ ] **TYPE-01**: 핵심 DB 모델(apt_transactions, apt_complexes, finance_rates)에 타입 인터페이스가 정의된다
- [ ] **TYPE-02**: API 라우트 응답에 타입이 적용된다
- [ ] **TYPE-03**: 주요 컴포넌트(page.tsx, KakaoMap)의 any 타입이 구체 타입으로 교체된다

### 접근성

- [ ] **A11Y-01**: 주요 인터랙티브 요소(탭, 버튼, 링크)에 ARIA 속성이 추가된다
- [ ] **A11Y-02**: 키보드 내비게이션이 주요 페이지에서 동작한다
- [ ] **A11Y-03**: 차트/지도에 텍스트 대안이 제공된다
- [ ] **A11Y-04**: skip navigation 링크가 레이아웃에 추가된다

### 보안

- [ ] **SEC-01**: ADMIN_EMAILS가 서버 전용 환경변수로 이동된다
- [ ] **SEC-02**: DAM content 엔드포인트에 인증이 추가된다
- [ ] **SEC-03**: push subscribe 엔드포인트에 보안이 강화된다
- [ ] **SEC-04**: SSL rejectUnauthorized가 true로 설정된다
- [ ] **SEC-05**: CSP 헤더가 추가된다 (Kakao SDK, GA, AdSense, Firebase 허용)
- [ ] **SEC-06**: proxy.ts의 rate limiter가 서버리스 대응으로 교체되거나 제거된다

## v2 Requirements

### 테스트 인프라

- **TEST-01**: 핵심 유틸리티(format.ts, calculator.ts)에 단위 테스트가 있다
- **TEST-02**: 쿼리 빌더에 통합 테스트가 있다
- **TEST-03**: 크론잡 데이터 파싱에 테스트가 있다

### 모니터링

- **MON-01**: 에러 추적 서비스(Sentry 등) 연동
- **MON-02**: 성능 모니터링 대시보드

## Out of Scope

| Feature | Reason |
|---------|--------|
| 새 기능 추가 (DSR 계산기 등) | 리뉴얼 v3 마일스톤에서 별도 진행 |
| UI 리디자인 | 안정화 완료 후 별도 마일스톤 |
| ORM 전면 교체 (Drizzle/Kysely) | 리스크 크고 별도 마일스톤으로 분리 |
| 테스트 프레임워크 전체 구축 | 이번 범위 초과, v2로 분류 |
| 모바일 앱 | 웹 우선 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEO-01 | Phase 1 | Pending |
| SEO-02 | Phase 1 | Pending |
| SEO-03 | Phase 1 | Complete |
| SEO-04 | Phase 1 | Complete |
| CLN-01 | Phase 2 | Pending |
| CLN-02 | Phase 2 | Pending |
| CLN-03 | Phase 2 | Pending |
| CLN-04 | Phase 2 | Pending |
| CLN-05 | Phase 2 | Pending |
| CLN-06 | Phase 3 | Pending |
| ERR-01 | Phase 4 | Pending |
| ERR-02 | Phase 4 | Pending |
| ERR-03 | Phase 4 | Pending |
| ERR-04 | Phase 4 | Pending |
| PERF-01 | Phase 5 | Pending |
| PERF-02 | Phase 5 | Pending |
| PERF-03 | Phase 5 | Pending |
| PERF-04 | Phase 5 | Pending |
| TYPE-01 | Phase 6 | Pending |
| TYPE-02 | Phase 6 | Pending |
| TYPE-03 | Phase 6 | Pending |
| A11Y-01 | Phase 7 | Pending |
| A11Y-02 | Phase 7 | Pending |
| A11Y-03 | Phase 7 | Pending |
| A11Y-04 | Phase 7 | Pending |
| SEC-01 | Phase 8 | Pending |
| SEC-02 | Phase 8 | Pending |
| SEC-03 | Phase 8 | Pending |
| SEC-04 | Phase 8 | Pending |
| SEC-05 | Phase 8 | Pending |
| SEC-06 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 31 total
- Mapped to phases: 31
- Unmapped: 0

---
*Requirements defined: 2026-03-26*
*Last updated: 2026-03-26 after initial definition*
