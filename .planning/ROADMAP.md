# Roadmap: 돈줍

## Milestones

- ✅ **v1.0 사이트 안정화** - Phases 1-9 (shipped 2026-03-28)
- 🚧 **v1.1 데이터 분석 고도화** - Phases 10-15 (in progress)

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

---

### v1.1 데이터 분석 고도화 (In Progress)

**Milestone Goal:** 가격 노이즈 제거 + 일관된 추이/지수 제공 + 업계 기본 지표 추가로 사용자가 시장을 정확히 읽게 한다

## Phase Details

### Phase 10: 가격 정규화 엔진
**Goal**: 차트가 노이즈 없는 정확한 가격 추이를 보여준다 — 저층 거래 보정, 이상거래 자동 제거, 3개월 이동중위가 기반
**Depends on**: Phase 9 (v1.0 완료)
**Requirements**: NORM-01, NORM-02, NORM-03, NORM-04, NORM-05
**Success Criteria** (what must be TRUE):
  1. 차트에서 "전체 면적" 탭이 사라지고 면적별 탭만 표시된다
  2. 저층 거래는 기본적으로 고층 환산가로 보정되어 차트에 반영된다
  3. "저층 포함/제외" 토글로 저층 거래 원가를 다시 볼 수 있다
  4. 차트 추이선이 원 거래가 점이 아닌 3개월 이동중위가 기반 선으로 표시된다
  5. 직거래 + 시세 대비 30% 이상 저가 거래는 차트에서 자동으로 제외된다
**Plans**: 3 plans

Plans:
- [x] 10-01-PLAN.md — 가격 정규화 유틸 모듈 + 전체 면적 탭 제거
- [x] 10-02-PLAN.md — 차트 재구성 (거래점+추이선+직거래 표시) + 저층 토글
- [x] 10-03-PLAN.md — [GAP] NORM-02 저층 거래 고층 환산가 보정

**UI hint**: yes

### Phase 11: 전세가율·갭 분석
**Goal**: 아파트 상세 페이지에서 투자자가 갭 리스크를 즉시 파악할 수 있다
**Depends on**: Phase 9 (v1.0 완료, 독립적)
**Requirements**: GAP-01, GAP-02, GAP-03
**Success Criteria** (what must be TRUE):
  1. 아파트 상세 페이지에서 면적별 전세가율(%) 수치가 표시된다
  2. 아파트 상세 페이지에서 면적별 갭 금액(매매가 - 전세가)이 표시된다
  3. 면적별 전세가율 추이 차트를 볼 수 있다
**Plans**: 2 plans

Plans:
- [x] 11-01-PLAN.md — sizePriceMap 확장 + GAP 지표 카드 + Row 2 StatCard 제거
- [x] 11-02-PLAN.md — 전세가율 추이 차트 (JeonseRatioChart 컴포넌트)

**UI hint**: yes

### Phase 12: 금리 표현 개선
**Goal**: 금리 페이지가 핵심 정보를 즉시 보여주고 상세는 요청 시에만 펼쳐진다
**Depends on**: Phase 9 (v1.0 완료, 독립적)
**Requirements**: RATE-01, RATE-02, RATE-03
**Success Criteria** (what must be TRUE):
  1. 금리 페이지 초기 화면에 시중금리 평균값 1개만 대표로 표시된다
  2. 기준금리·COFIX 등 세부 지표는 펼침(accordion) 또는 상세 영역으로 분리된다
  3. 은행별 상세 금리는 터치/클릭 시 확장되는 형태로 표시된다
**Plans**: TBD
**UI hint**: yes

### Phase 13: 차트 개선
**Goal**: 사용자가 원하는 기간과 지표 조합으로 가격 추이를 분석할 수 있다
**Depends on**: Phase 10 (정규화 엔진 완료 후 차트에 적용)
**Requirements**: CHART-01, CHART-02, CHART-03
**Success Criteria** (what must be TRUE):
  1. 차트 상단에 1개월/3개월/6개월/1년/전체 기간 탭이 존재하고 전환된다
  2. 면적별 차트에서 매매가 선과 전세가 선이 동시에 표시된다 (듀얼 라인)
  3. 전세가율 오버레이 라인을 차트에서 켜고 끌 수 있다 (2차 Y축)
**Plans**: TBD
**UI hint**: yes

### Phase 14: 랭킹 정교화
**Goal**: 폭락·신고가 랭킹이 저층 노이즈와 이상거래를 제거한 신뢰할 수 있는 순위를 보여준다
**Depends on**: Phase 10 (층별 보정 로직 완료 후 랭킹에 적용)
**Requirements**: RANK-01, RANK-02, RANK-03
**Success Criteria** (what must be TRUE):
  1. 랭킹의 변동률이 층별 보정 후 고층 환산 기준으로 산출된다
  2. 직거래 저가·이상거래로 의심되는 거래는 랭킹 산정에서 자동 제외된다
  3. 랭킹 리스트에서 저층 거래는 "저층" 라벨이 표시되고 변동률은 고층 환산값으로 보인다
**Plans**: TBD

### Phase 15: 지역 지수 대시보드
**Goal**: 사용자가 강남3구·마용성·노도강 등 군집별 가격 흐름을 S&P500 스타일 대시보드로 파악할 수 있다
**Depends on**: Phase 10 (정규화 로직 — 저층 제외, 이상거래 필터 공유)
**Requirements**: INDEX-01, INDEX-02, INDEX-03, INDEX-04
**Success Criteria** (what must be TRUE):
  1. 강남3구·마용성·노도강 등 군집별 중위가 지수가 기준시점 100으로 산출된다
  2. 군집별 지수의 시계열 차트(월별)를 볼 수 있다
  3. 시도·시군구 단위 평균 매매가·중위가가 지역별 시세 페이지에 표시된다
  4. 신규 지역 지수 페이지(`/index` 또는 `/market`)가 존재하고 대시보드 형태로 모든 군집 지수를 보여준다
**Plans**: TBD
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
| 10. 가격 정규화 엔진 | v1.1 | 3/3 | Complete   | 2026-03-27 |
| 11. 전세가율·갭 분석 | v1.1 | 2/2 | Complete   | 2026-03-28 |
| 12. 금리 표현 개선 | v1.1 | 0/? | Not started | - |
| 13. 차트 개선 | v1.1 | 0/? | Not started | - |
| 14. 랭킹 정교화 | v1.1 | 0/? | Not started | - |
| 15. 지역 지수 대시보드 | v1.1 | 0/? | Not started | - |

---
*Roadmap created: 2026-03-26 (v1.0)*
*v1.1 phases added: 2026-03-28*
