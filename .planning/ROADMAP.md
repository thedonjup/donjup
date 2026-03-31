# Roadmap: 돈줍

## Milestones

- ✅ **v1.0 사이트 안정화** - Phases 1-9 (shipped 2026-03-28)
- ✅ **v1.1 데이터 분석 고도화** - Phases 10-15 (shipped 2026-03-28)
- ✅ **v1.2 코드 품질 강화** - Phases 16-19 (shipped 2026-03-28)
- 🔄 **v1.3 서비스 품질 개선** - Phases 20-24 (in progress)

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

<details>
<summary>✅ v1.2 코드 품질 강화 (Phases 16-19) - SHIPPED 2026-03-28</summary>

- [x] **Phase 16: 테스트 인프라 기반** - Vitest 설정 + 핵심 유틸 유닛 테스트 (completed 2026-03-28)
- [x] **Phase 17: 통합 테스트 & E2E** - API 통합 테스트 + Playwright E2E 기반 (completed 2026-03-28)
- [x] **Phase 18: Drizzle ORM 교체** - 전체 DB 접근 Drizzle 단일 패턴으로 교체 (completed 2026-03-28)
- [x] **Phase 19: 코드 정리** - as any 제거, 미사용 import 0건, 연결 패턴 통일 (completed 2026-03-28)

</details>

---

### v1.3 서비스 품질 개선 (In Progress)

**Milestone Goal:** 디자인 시스템 통합, 데이터 표현 정규화, URL 구조 개편, 깨진 기능 복구로 사용자 경험 품질을 근본적으로 개선한다

- [ ] **Phase 20: 포맷 유틸 중앙화 + 데이터 표현 정규화** - 가격/면적/날짜/null 포맷 단일 모듈 확립
- [ ] **Phase 21: 디자인 시스템 통합** - 다크모드 정상화 + 하드코딩 색상 제거 + 인라인 style 제거
- [ ] **Phase 22: URL 구조 개편** - aptSeq 기반 canonical URL + 301 리다이렉트 + Sitemap 완성
- [ ] **Phase 23: 깨진 기능 복구** - Vercel Blob 연동 + Instagram 포스팅 파이프라인 완성
- [ ] **Phase 24: UX 개선** - 검색 결과 보강 + 차트 범례 개선

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
- [x] 18-02-PLAN.md — Server Component 페이지 17개 Drizzle 마이그레이션 (ORM-02, ORM-05)
- [x] 18-03-PLAN.md — API 라우트 + 크론잡 27개 Drizzle 마이그레이션 (ORM-02, ORM-03, ORM-04, ORM-05)
- [x] 18-04-PLAN.md — Raw SQL 8개 마이그레이션 + 레거시 삭제 + 테스트 업데이트 (ORM-06)

### Phase 19: 코드 정리
**Goal**: 프로덕션 코드에서 타입 안전하지 않은 패턴과 미사용 코드가 제거되어 코드베이스가 깔끔하다
**Depends on**: Phase 18 (ORM 교체 완료 후 — CLEAN-03이 ORM 단일화에 의존)
**Requirements**: CLEAN-01, CLEAN-02, CLEAN-03
**Success Criteria** (what must be TRUE):
  1. 프로덕션 코드(`src/` 내)에서 `as any` 캐스트가 5개 미만이다
  2. ESLint `no-unused-vars` / `no-unused-imports` 규칙 위반이 0건이다
  3. DB 연결 패턴이 Drizzle 단일 패턴으로 통일되어 createClient, createRentServiceClient, getPool 패턴이 코드베이스에 존재하지 않는다
**Plans**: 1 plan

Plans:
- [x] 19-01-PLAN.md — unused imports 제거 + as any 수정 + 레거시 DB 패턴 확인 (CLEAN-01, CLEAN-02, CLEAN-03)

---

### Phase 20: 포맷 유틸 중앙화 + 데이터 표현 정규화
**Goal**: 모든 페이지에서 가격·면적·날짜·null 값이 단일 유틸 함수로 일관되게 표시된다
**Depends on**: Phase 19 (v1.2 완료)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04
**Success Criteria** (what must be TRUE):
  1. 랭킹, 상세, 차트 등 모든 페이지에서 가격이 "3억 2,000만원" 형식 또는 "3.2억" 축약형으로 일관되게 표시된다 (페이지마다 다른 형식 혼용 없음)
  2. 데이터가 없는 모든 필드에서 0이나 빈 문자열 대신 "-"가 표시된다
  3. 면적이 있는 모든 페이지에서 "84.93㎡ (25.7평)" 병기 형식으로 통일된다
  4. `formatPrice`, `formatPriceShort`, `formatArea`, `formatNullable` 등 포맷 함수가 `src/lib/format.ts` 단일 파일에서만 정의되고, 다른 파일의 로컬 중복 정의가 존재하지 않는다
**Plans**: 3 plans

Plans:
- [x] 20-01-PLAN.md — TDD: format utility functions + makeSlug + unit tests (DATA-01, DATA-02, DATA-03, DATA-04)
- [ ] 20-02-PLAN.md — Price format duplicate sweep: PriceHistoryChart, OG image, cardnews, generate-seeding, AptDetailClient (DATA-01, DATA-04)
- [ ] 20-03-PLAN.md — Area/slug/date/null duplicate sweep: TransactionTabs, rent, today, new-highs, themes, RankingTabs, dam/users (DATA-02, DATA-03, DATA-04)

### Phase 21: 디자인 시스템 통합
**Goal**: 다크모드가 전체 서비스에서 정상 동작하고, 하드코딩된 색상이 CSS 변수 체계로 완전히 전환된다
**Depends on**: Phase 20 (포맷 유틸 중앙화 후 컴포넌트 스윕 진행)
**Requirements**: DESIGN-01, DESIGN-02, DESIGN-03, DESIGN-04
**Success Criteria** (what must be TRUE):
  1. `[data-theme="dark"]` 전환 시 모든 페이지의 텍스트·배경·차트 색상이 다크 테마로 변경된다 (하드코딩 색상으로 인한 미반영 요소 없음)
  2. `globals.css`에 `@custom-variant dark` 선언이 추가되어 `dark:` Tailwind 유틸리티가 `[data-theme="dark"]`에서 정상 활성화된다
  3. 컴포넌트 코드에서 인라인 `style={{ color: '#...' }}` 패턴이 `className` 또는 CSS 변수 기반으로 전환된다
  4. 드롭레벨·전세가율 등 동적으로 계산되는 색상이 CSS 변수 맵 또는 유틸클래스로 관리되어 다크모드에서도 올바르게 표시된다
**Plans**: 3 plans

Plans:
- [ ] 20-01-PLAN.md — TDD: format utility functions + makeSlug + unit tests (DATA-01, DATA-02, DATA-03, DATA-04)
- [ ] 20-02-PLAN.md — Price format duplicate sweep: PriceHistoryChart, OG image, cardnews, generate-seeding, AptDetailClient (DATA-01, DATA-04)
- [ ] 20-03-PLAN.md — Area/slug/date/null duplicate sweep: TransactionTabs, rent, today, new-highs, themes, RankingTabs, dam/users (DATA-02, DATA-03, DATA-04)
**UI hint**: yes

### Phase 22: URL 구조 개편
**Goal**: 아파트 상세 페이지가 govtComplexId 기반의 안정적인 canonical URL을 가지고, 기존 URL은 301 리다이렉트된다
**Depends on**: Phase 20 (makeSlug 중앙화가 Phase 20 DATA-04에서 완료됨)
**Requirements**: URL-01, URL-02, URL-03, URL-04, URL-05, URL-06
**Success Criteria** (what must be TRUE):
  1. 아파트 상세 페이지 URL이 `/apt/[govtComplexId]` 형식으로 접근 가능하고, 해당 단지 정보가 정상 표시된다
  2. 기존 `/apt/[region]/[slug]` 형식 URL로 접근하면 새 URL로 308 리다이렉트된다 (브라우저 주소창 URL 변경 확인)
  3. `makeSlug` 함수가 `src/lib/apt-url.ts` 단일 모듈에만 존재하고, 기존 4개 산재 정의가 제거된다
  4. `sitemap.xml`에 모든 아파트 단지의 `/apt/[govtComplexId]` URL이 포함된다
  5. Profile 페이지의 아파트 링크 클릭 시 404 없이 해당 단지 상세 페이지로 이동한다
**Plans**: 3 plans

Plans:
- [ ] 20-01-PLAN.md — TDD: format utility functions + makeSlug + unit tests (DATA-01, DATA-02, DATA-03, DATA-04)
- [ ] 20-02-PLAN.md — Price format duplicate sweep: PriceHistoryChart, OG image, cardnews, generate-seeding, AptDetailClient (DATA-01, DATA-04)
- [ ] 20-03-PLAN.md — Area/slug/date/null duplicate sweep: TransactionTabs, rent, today, new-highs, themes, RankingTabs, dam/users (DATA-02, DATA-03, DATA-04)

### Phase 23: 깨진 기능 복구
**Goal**: 카드뉴스 이미지가 Vercel Blob에 저장되고, Instagram 자동 포스팅 파이프라인이 정상 동작한다
**Depends on**: Phase 19 (v1.2 완료, 독립적으로 실행 가능)
**Requirements**: FIX-01, FIX-02, FIX-03
**Success Criteria** (what must be TRUE):
  1. 카드뉴스 생성 크론잡 실행 후 생성된 이미지가 Vercel Blob에 업로드되어 `https://*.public.blob.vercel-storage.com/...` 형식의 공개 URL이 반환된다
  2. Instagram 자동 포스팅 크론잡이 해당 Blob URL을 사용하여 인스타그램에 카드뉴스를 정상 게시한다 (Instagram Graph API 성공 응답 확인)
  3. `next.config.ts`의 CSP `img-src`에 `https://*.public.blob.vercel-storage.com`이 포함되어 브라우저에서 Blob 이미지가 차단 없이 렌더링된다
**Plans**: 3 plans

Plans:
- [ ] 20-01-PLAN.md — TDD: format utility functions + makeSlug + unit tests (DATA-01, DATA-02, DATA-03, DATA-04)
- [ ] 20-02-PLAN.md — Price format duplicate sweep: PriceHistoryChart, OG image, cardnews, generate-seeding, AptDetailClient (DATA-01, DATA-04)
- [ ] 20-03-PLAN.md — Area/slug/date/null duplicate sweep: TransactionTabs, rent, today, new-highs, themes, RankingTabs, dam/users (DATA-02, DATA-03, DATA-04)

### Phase 24: UX 개선
**Goal**: 검색 결과에 단지 핵심 정보가 표시되고, 차트 범례가 명확하여 사용자가 데이터를 즉시 해석할 수 있다
**Depends on**: Phase 20 (포맷 유틸 중앙화 후 검색 결과 표시에 formatPrice 등 활용)
**Requirements**: UX-01, UX-02
**Success Criteria** (what must be TRUE):
  1. 검색 결과 드롭다운 또는 목록에서 각 단지의 준공년도, 세대수, 최근 거래가가 표시된다
  2. 가격 추이 차트의 범례에서 추이선, 직거래, 저신뢰구간 각 계열이 명확하게 구분되어 사용자가 어느 선이 무엇인지 즉시 알 수 있다
**Plans**: 3 plans

Plans:
- [ ] 20-01-PLAN.md — TDD: format utility functions + makeSlug + unit tests (DATA-01, DATA-02, DATA-03, DATA-04)
- [ ] 20-02-PLAN.md — Price format duplicate sweep: PriceHistoryChart, OG image, cardnews, generate-seeding, AptDetailClient (DATA-01, DATA-04)
- [ ] 20-03-PLAN.md — Area/slug/date/null duplicate sweep: TransactionTabs, rent, today, new-highs, themes, RankingTabs, dam/users (DATA-02, DATA-03, DATA-04)
**UI hint**: yes

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
| 16. 테스트 인프라 기반 | v1.2 | 2/2 | Complete | 2026-03-28 |
| 17. 통합 테스트 & E2E | v1.2 | 2/2 | Complete | 2026-03-28 |
| 18. Drizzle ORM 교체 | v1.2 | 4/4 | Complete | 2026-03-28 |
| 19. 코드 정리 | v1.2 | 1/1 | Complete | 2026-03-28 |
| 20. 포맷 유틸 중앙화 + 데이터 표현 정규화 | v1.3 | 1/3 | In Progress|  |
| 21. 디자인 시스템 통합 | v1.3 | 0/? | Not started | - |
| 22. URL 구조 개편 | v1.3 | 0/? | Not started | - |
| 23. 깨진 기능 복구 | v1.3 | 0/? | Not started | - |
| 24. UX 개선 | v1.3 | 0/? | Not started | - |

---
*Roadmap created: 2026-03-26 (v1.0)*
*v1.1 phases added: 2026-03-28*
*v1.2 phases added: 2026-03-28*
*v1.3 phases added: 2026-03-31*
