# Roadmap: 돈줍

## Milestones

- ✅ **v1.0 사이트 안정화** - Phases 1-9 (shipped 2026-03-28)
- ✅ **v1.1 데이터 분석 고도화** - Phases 10-15 (shipped 2026-03-28)
- 🚧 **v1.2 코드 품질 강화** - Phases 16-19 (in progress)

## Phases

<details>
<summary>✅ v1.0 사이트 안정화 (Phases 1-9) - SHIPPED 2026-03-28</summary>

### Phase 1: SEO / 메타데이터 수정
**Goal**: 검색엔진이 모든 페이지를 개별적으로 인식하고 적절한 미리보기를 생성한다
**Plans**: 2/2 plans complete

Plans:
- [x] 01-01-PLAN.md — Canonical URL 수정 및 고유 title 설정 (SEO-01, SEO-02)
- [x] 01-02-PLAN.md — 지도 SSR 콘텐츠 추가 및 OG Image 확인 (SEO-03, SEO-04)

### Phase 2: 코드 정리 (패키지/네이밍)
**Goal**: 미사용 코드와 혼란스러운 네이밍이 정리되어 유지보수성이 향상된다
**Plans**: 2/2 plans complete

Plans:
- [x] 02-01-PLAN.md — formatPrice 중복 제거, Instagram 클라이언트 통합, 미사용 패키지 제거
- [x] 02-02-PLAN.md — supabase→db 리네이밍 + Storage stub 제거

### Phase 3: 컴포넌트 분할
**Goal**: 대형 단일 파일 컴포넌트가 관리 가능한 크기로 분할된다
**Plans**: 1/1 plans complete

Plans:
- [x] 03-01-PLAN.md — 대형 컴포넌트 분할

### Phase 4: 에러 핸들링 / 로깅
**Goal**: 에러가 사용자에게 친절하게 표시되고, 서버에서 구조화 로깅으로 추적 가능하다
**Plans**: 2/2 plans complete

Plans:
- [x] 04-01-PLAN.md — 구조화 로깅 유틸 + 브랜드 에러 페이지
- [x] 04-02-PLAN.md — API 에러 응답 정리 + 크론잡 Slack 알림

### Phase 5: 성능 최적화
**Goal**: 검색 응답 속도 개선, DB 안정성 확보, 크론잡 충돌 해소
**Plans**: 2/2 plans complete

Plans:
- [x] 05-01-PLAN.md — pg_trgm GIN 인덱스 + DB 커넥션 풀 조정
- [x] 05-02-PLAN.md — 크론잡 스케줄 정리 + 인메모리 rate limiter 제거

### Phase 6: TypeScript 타입 강화
**Goal**: 핵심 모듈의 타입 안전성이 확보되어 런타임 에러 가능성이 줄어든다
**Plans**: 2/2 plans complete

Plans:
- [x] 06-01-PLAN.md — DB 모델 인터페이스 정의 + API 라우트 응답 타입 적용
- [x] 06-02-PLAN.md — 주요 컴포넌트/페이지 any 제거 + KakaoMap/client.ts 타입 강화

### Phase 7: 접근성 (a11y)
**Goal**: 보조 기술 사용자가 주요 기능을 이용할 수 있다
**Plans**: 2/2 plans complete

Plans:
- [x] 07-01-PLAN.md — ARIA 속성 + 키보드 내비게이션 + skip-to-content
- [x] 07-02-PLAN.md — 차트/지도 텍스트 대안

### Phase 8: 보안 강화
**Goal**: 알려진 보안 취약점이 모두 해소된다
**Plans**: 2/2 plans complete

Plans:
- [x] 08-01-PLAN.md — ADMIN_EMAILS 서버 전용 이동 + SSL 설정 수정
- [x] 08-02-PLAN.md — DAM content API 인증 + push subscribe 보안 + CSP

### Phase 9: 모바일 UI 전면 개편
**Goal**: 모바일(width < 768px)에서 모든 페이지가 읽기/터치/탐색에 최적화된다
**Plans**: 3/3 plans complete

Plans:
- [x] 09-01-PLAN.md — 신고가 모바일 카드 + 금리 은행명 한국어화 + 홈 히어로 타이포그래피
- [x] 09-02-PLAN.md — MobileNav 터치 차단 + 면적 선택 수평 칩 + 차트 모바일 최적화
- [x] 09-03-PLAN.md — 거래 테이블 모바일 카드 전환 + 지도 페이지 모바일 레이아웃

</details>

<details>
<summary>✅ v1.1 데이터 분석 고도화 (Phases 10-15) - SHIPPED 2026-03-28</summary>

### Phase 10: 가격 정규화 엔진
**Goal**: 차트가 노이즈 없는 정확한 가격 추이를 보여준다 — 저층 거래 보정, 이상거래 자동 제거, 3개월 이동중위가 기반
**Depends on**: Phase 9 (v1.0 완료)
**Requirements**: NORM-01, NORM-02, NORM-03, NORM-04, NORM-05
**Plans**: 3/3 plans complete

Plans:
- [x] 10-01-PLAN.md — 가격 정규화 유틸 모듈 + 전체 면적 탭 제거
- [x] 10-02-PLAN.md — 차트 재구성 (거래점+추이선+직거래 표시) + 저층 토글
- [x] 10-03-PLAN.md — [GAP] NORM-02 저층 거래 고층 환산가 보정

### Phase 11: 전세가율·갭 분석
**Goal**: 아파트 상세 페이지에서 투자자가 갭 리스크를 즉시 파악할 수 있다
**Depends on**: Phase 9 (v1.0 완료, 독립적)
**Requirements**: GAP-01, GAP-02, GAP-03
**Plans**: 2/2 plans complete

Plans:
- [x] 11-01-PLAN.md — sizePriceMap 확장 + GAP 지표 카드 + Row 2 StatCard 제거
- [x] 11-02-PLAN.md — 전세가율 추이 차트 (JeonseRatioChart 컴포넌트)

### Phase 12: 금리 표현 개선
**Goal**: 금리 페이지가 핵심 정보를 즉시 보여주고 상세는 요청 시에만 펼쳐진다
**Depends on**: Phase 9 (v1.0 완료, 독립적)
**Requirements**: RATE-01, RATE-02, RATE-03
**Plans**: 2/2 plans complete

Plans:
- [x] 12-01-PLAN.md — RateIndicatorAccordion + BankRateExpandable 클라이언트 컴포넌트 생성
- [x] 12-02-PLAN.md — page.tsx 재구성: 히어로 카드 + accordion + 확장 은행 테이블

### Phase 13: 차트 개선
**Goal**: 사용자가 원하는 기간과 지표 조합으로 가격 추이를 분석할 수 있다
**Depends on**: Phase 10 (정규화 엔진 완료 후 차트에 적용)
**Requirements**: CHART-01, CHART-02, CHART-03
**Plans**: 2/2 plans complete

Plans:
- [x] 13-01-PLAN.md — 기간 탭 + 날짜 필터링 + rentTrendLine/jeonseRatioLine 데이터 계산
- [x] 13-02-PLAN.md — PriceHistoryChart 듀얼 라인 + 듀얼 Y축 + JeonseRatioChart 삭제

### Phase 14: 랭킹 정교화
**Goal**: 폭락·신고가 랭킹이 저층 노이즈와 이상거래를 제거한 신뢰할 수 있는 순위를 보여준다
**Depends on**: Phase 10 (층별 보정 로직 완료 후 랭킹에 적용)
**Requirements**: RANK-01, RANK-02, RANK-03
**Plans**: 1/1 plans complete

Plans:
- [x] 14-01-PLAN.md — 랭킹 정규화 (고층 환산 + 이상거래 필터 + 저층 뱃지)

### Phase 15: 지역 지수 대시보드
**Goal**: 사용자가 강남3구·마용성·노도강 등 군집별 가격 흐름을 S&P500 스타일 대시보드로 파악할 수 있다
**Depends on**: Phase 10 (정규화 로직 — 저층 제외, 이상거래 필터 공유)
**Requirements**: INDEX-01, INDEX-02, INDEX-03, INDEX-04
**Plans**: 2/2 plans complete

Plans:
- [x] 15-01-PLAN.md — 군집 지수 엔진 + 대시보드 페이지 (INDEX-01, INDEX-02, INDEX-04)
- [x] 15-02-PLAN.md — market 페이지 중위가/평균가 추가 (INDEX-03)

</details>

---

### v1.2 코드 품질 강화 (In Progress)

**Milestone Goal:** 테스트 인프라 구축 + ORM 교체 + 코드 품질 기반 정비로 장기 유지보수성을 확보한다

- [x] **Phase 16: 테스트 인프라 기반** - Vitest 설정 + 핵심 유틸 유닛 테스트 (completed 2026-03-28)
- [x] **Phase 17: 통합 테스트 & E2E** - API 통합 테스트 + Playwright E2E 기반 (completed 2026-03-28)
- [ ] **Phase 18: Drizzle ORM 교체** - 전체 DB 접근 Drizzle 단일 패턴으로 교체
- [ ] **Phase 19: 코드 정리** - as any 제거, 미사용 import 0건, 연결 패턴 통일

## Phase Details

### Phase 16: 테스트 인프라 기반
**Goal**: 개발자가 `npm test`로 핵심 비즈니스 로직의 정확성을 즉시 검증할 수 있다
**Depends on**: Phase 15 (v1.1 완료)
**Requirements**: TEST-01, TEST-02, TEST-03
**Success Criteria** (what must be TRUE):
  1. `npm test`를 실행하면 Vitest가 동작하고 전체 테스트 결과가 터미널에 출력된다
  2. price-normalization.ts의 adjustFloorPrice, filterTransactions 등 exported 함수 각각에 대해 입력/출력을 검증하는 유닛 테스트가 존재한다
  3. computeClusterIndex 함수에 대해 군집 계산 결과를 검증하는 유닛 테스트가 존재한다
  4. CI 환경에서 테스트가 실패하면 빌드도 실패한다 (test script이 non-zero exit)
**Plans**: 2 plans

Plans:
- [x] 16-01-PLAN.md — Vitest 설치/설정 + price-normalization 유닛 테스트 (TEST-01, TEST-02)
- [x] 16-02-PLAN.md — computeClusterIndex 유닛 테스트 (TEST-03)

### Phase 17: 통합 테스트 & E2E
**Goal**: API 라우트가 실제 DB 응답을 올바르게 처리하는지 검증되고, 브라우저에서 기본 사용자 흐름이 자동 테스트된다
**Depends on**: Phase 16 (Vitest 환경 확립 후)
**Requirements**: TEST-04, TEST-05
**Success Criteria** (what must be TRUE):
  1. fetch-transactions, fetch-rents, fetch-bank-rates API 라우트 각각에 대해 응답 구조와 에러 케이스를 검증하는 통합 테스트가 존재한다
  2. Playwright가 설치되어 홈 페이지(`/`)가 성공적으로 로드되는 E2E 테스트가 `npm run test:e2e`로 실행된다
  3. 홈 → 검색 → 아파트 상세 기본 네비게이션이 E2E 테스트로 커버된다
**Plans**: 2 plans

Plans:
- [x] 17-01-PLAN.md — API 통합 테스트: fetch-bank-rates, fetch-rents, fetch-transactions (TEST-04)
- [x] 17-02-PLAN.md — Playwright E2E 설치 + 홈 로드 + 기본 네비게이션 테스트 (TEST-05)

### Phase 18: Drizzle ORM 교체
**Goal**: 모든 DB 접근이 타입 안전한 Drizzle 쿼리로 통일되어 raw SQL과 복수 클라이언트 패턴이 제거된다
**Depends on**: Phase 15 (v1.1 완료, Phase 16/17과 병렬 가능)
**Requirements**: ORM-01, ORM-02, ORM-03, ORM-04, ORM-05, ORM-06
**Success Criteria** (what must be TRUE):
  1. `import { db } from '@/lib/db'` 단일 진입점으로 모든 DB 쿼리가 실행된다
  2. apt_transactions, apt_rent_transactions, finance_rates, apt_complexes 테이블 각각에 대해 Drizzle 스키마가 정의되어 있다
  3. 코드베이스에서 `getPool().query(`, `createClient(`, `createRentServiceClient(` 호출이 0건이다
  4. 기존과 동일한 데이터를 반환하면서 모든 페이지가 정상 동작한다 (배포 후 회귀 없음)
**Plans**: 4 plans

Plans:
- [x] 18-01-PLAN.md — Drizzle 설치 + 13 테이블 스키마 정의 + db 진입점 (ORM-01)
- [ ] 18-02-PLAN.md — Server Component 페이지 17개 Drizzle 마이그레이션 (ORM-02, ORM-05)
- [ ] 18-03-PLAN.md — API 라우트 + 크론잡 27개 Drizzle 마이그레이션 (ORM-02, ORM-03, ORM-04, ORM-05)
- [ ] 18-04-PLAN.md — Raw SQL 8개 마이그레이션 + 레거시 삭제 + 테스트 업데이트 (ORM-06)

### Phase 19: 코드 정리
**Goal**: 프로덕션 코드에서 타입 안전하지 않은 패턴과 미사용 코드가 제거되어 코드베이스가 깔끔하다
**Depends on**: Phase 18 (ORM 교체 완료 후 — CLEAN-03이 ORM 단일화에 의존)
**Requirements**: CLEAN-01, CLEAN-02, CLEAN-03
**Success Criteria** (what must be TRUE):
  1. 프로덕션 코드(`src/` 내)에서 `as any` 캐스트가 5개 미만이다
  2. ESLint `no-unused-vars` / `no-unused-imports` 규칙 위반이 0건이다
  3. DB 연결 패턴이 Drizzle 단일 패턴으로 통일되어 createClient, createRentServiceClient, getPool 패턴이 코드베이스에 존재하지 않는다
**Plans**: TBD

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. SEO / 메타데이터 | v1.0 | 2/2 | Complete | 2026-03-26 |
| 2. 코드 정리 | v1.0 | 2/2 | Complete | 2026-03-26 |
| 3. 컴포넌트 분할 | v1.0 | 1/1 | Complete | 2026-03-26 |
| 4. 에러 핸들링 / 로깅 | v1.0 | 2/2 | Complete | 2026-03-26 |
| 5. 성능 최적화 | v1.0 | 2/2 | Complete | 2026-03-26 |
| 6. TypeScript 타입 강화 | v1.0 | 2/2 | Complete | 2026-03-27 |
| 7. 접근성 (a11y) | v1.0 | 2/2 | Complete | 2026-03-27 |
| 8. 보안 강화 | v1.0 | 2/2 | Complete | 2026-03-27 |
| 9. 모바일 UI 전면 개편 | v1.0 | 3/3 | Complete | 2026-03-28 |
| 10. 가격 정규화 엔진 | v1.1 | 3/3 | Complete | 2026-03-27 |
| 11. 전세가율·갭 분석 | v1.1 | 2/2 | Complete | 2026-03-28 |
| 12. 금리 표현 개선 | v1.1 | 2/2 | Complete | 2026-03-28 |
| 13. 차트 개선 | v1.1 | 2/2 | Complete | 2026-03-28 |
| 14. 랭킹 정교화 | v1.1 | 1/1 | Complete | 2026-03-28 |
| 15. 지역 지수 대시보드 | v1.1 | 2/2 | Complete | 2026-03-28 |
| 16. 테스트 인프라 기반 | v1.2 | 2/2 | Complete    | 2026-03-28 |
| 17. 통합 테스트 & E2E | v1.2 | 2/2 | Complete    | 2026-03-28 |
| 18. Drizzle ORM 교체 | v1.2 | 1/4 | In Progress|  |
| 19. 코드 정리 | v1.2 | 0/TBD | Not started | - |

---
*Roadmap created: 2026-03-26 (v1.0)*
*v1.1 phases added: 2026-03-28*
*v1.2 phases added: 2026-03-28*
