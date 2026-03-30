# Requirements: 돈줍 v1.3

**Defined:** 2026-03-31
**Core Value:** 사용자가 아파트 시장 흐름을 정확히 읽고, 신뢰할 수 있는 데이터 기반 의사결정을 할 수 있게 하는 것.

## v1.3 Requirements

Requirements for 서비스 품질 개선. Each maps to roadmap phases.

### 디자인 시스템 (DESIGN)

- [ ] **DESIGN-01**: 하드코딩된 색상(82개)이 CSS 변수 또는 Tailwind 유틸클래스로 전환되어 다크모드에서 정상 표시된다
- [ ] **DESIGN-02**: `@custom-variant dark` 추가로 Tailwind dark: 유틸리티가 [data-theme="dark"]에서 활성화된다
- [ ] **DESIGN-03**: 컴포넌트의 인라인 style이 className 또는 CSS 변수 기반으로 전환된다 (동적 색상 포함)
- [ ] **DESIGN-04**: 동적 색상(드롭레벨, 전세가율 등)이 CSS 변수 맵 또는 유틸클래스로 관리되어 다크모드 대응된다

### 데이터 표현 (DATA)

- [ ] **DATA-01**: 가격 표시가 formatPrice 단일 함수로 통일되고, 축약형은 formatPriceShort로 명확히 분리된다
- [ ] **DATA-02**: null/빈값 표시가 전체 페이지에서 일관된 규칙("-")으로 통일된다
- [ ] **DATA-03**: 면적 표시가 모든 페이지에서 "㎡ (평)" 병기 형식으로 통일된다
- [ ] **DATA-04**: 포맷 유틸 함수(formatPrice, sqmToPyeong, makeSlug 등)가 중복 없이 단일 모듈에서 관리된다

### URL 구조 (URL)

- [ ] **URL-01**: 아파트 상세 페이지 URL이 govtComplexId(aptSeq) 기반으로 변환된다
- [ ] **URL-02**: 기존 `/apt/[region]/[slug]` URL이 새 URL로 301/308 리다이렉트된다
- [ ] **URL-03**: makeSlug 함수가 단일 유틸 모듈(`lib/apt-url.ts`)로 중앙화된다
- [ ] **URL-04**: Sitemap에 모든 아파트 상세 페이지가 포함된다
- [ ] **URL-05**: Profile 페이지의 아파트 링크가 정상 동작한다 (region 파라미터 포함)
- [ ] **URL-06**: govtComplexId가 null인 단지에 대해 백필이 완료된다

### 깨진 기능 복구 (FIX)

- [ ] **FIX-01**: 카드뉴스 이미지가 Vercel Blob에 저장되어 공개 URL이 생성된다
- [ ] **FIX-02**: Instagram 자동 포스팅이 저장된 이미지 URL로 정상 동작한다
- [ ] **FIX-03**: CSP에 Vercel Blob 도메인이 추가된다

### UX 개선 (UX)

- [ ] **UX-01**: 검색 결과에 준공년도, 세대수, 최근 거래가가 일관되게 표시된다
- [ ] **UX-02**: 차트 범례가 명확하게 표시되어 추이선/직거래/저신뢰구간을 사용자가 구분할 수 있다

## v2 Requirements

Deferred to future release.

### 추가 기능
- **FEAT-01**: 실시간 가격 알림 (특정 단지 가격 변동 Push)
- **FEAT-02**: 단지 비교 기능 고도화 (3개 이상 동시 비교)
- **FEAT-03**: 지역별 시세 지도 히트맵

## Out of Scope

| Feature | Reason |
|---------|--------|
| UI 전면 리디자인 | v3 마일스톤 — 현재는 일관성 확보에 집중 |
| 동/호수 단위 가격 예측 | MOLIT API에 호수 데이터 미제공 |
| OAuth 추가 (카카오/네이버 로그인) | 현재 Google 로그인으로 충분 |
| Cloudflare R2 | Vercel Blob이 기존 스택에 더 자연스럽고 비용 동등 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 20 | Pending |
| DATA-02 | Phase 20 | Pending |
| DATA-03 | Phase 20 | Pending |
| DATA-04 | Phase 20 | Pending |
| DESIGN-01 | Phase 21 | Pending |
| DESIGN-02 | Phase 21 | Pending |
| DESIGN-03 | Phase 21 | Pending |
| DESIGN-04 | Phase 21 | Pending |
| URL-01 | Phase 22 | Pending |
| URL-02 | Phase 22 | Pending |
| URL-03 | Phase 22 | Pending |
| URL-04 | Phase 22 | Pending |
| URL-05 | Phase 22 | Pending |
| URL-06 | Phase 22 | Pending |
| FIX-01 | Phase 23 | Pending |
| FIX-02 | Phase 23 | Pending |
| FIX-03 | Phase 23 | Pending |
| UX-01 | Phase 24 | Pending |
| UX-02 | Phase 24 | Pending |

**Coverage:**
- v1.3 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 — traceability filled after roadmap creation*
