# Phase 15: 지역 지수 대시보드 - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

강남3구·마용성·노도강 등 군집별 중위가 지수(기준시점 100)를 산출하고, S&P500 스타일 대시보드 페이지를 신규 생성하며, 기존 시도/시군구 시세 페이지에 평균/중위가를 추가한다.

</domain>

<decisions>
## Implementation Decisions

### 1. 군집 정의 (INDEX-01)
- **D-01:** region-codes.ts에 CLUSTER_DEFINITIONS 상수 추가
- **D-02:** 초기 군집:
  - 강남3구: 강남구(11680), 서초구(11650), 송파구(11710)
  - 마용성: 마포구(11440), 용산구(11170), 성동구(11200)
  - 노도강: 노원구(11350), 도봉구(11320), 강북구(11305)
  - 수도권 주요: 분당구(41135), 수지구(41463), 일산동구(41281), 일산서구(41285)
- **D-03:** 군집은 { id, name, regionCodes: string[] } 형태

### 2. 지수 산출 방식 (INDEX-01, INDEX-02)
- **D-04:** 월별 중위가 지수 = (해당 월 군집 내 전체 거래 중위가 / 기준시점 중위가) × 100
- **D-05:** 기준시점: 데이터 최초월 (각 군집의 첫 거래가 있는 달)
- **D-06:** Phase 10의 computeMedianPrice 재사용
- **D-07:** 이상거래 필터 적용 (Phase 10 filterTransactions 재사용 — 직거래 저가 제외)
- **D-08:** 서버 컴포넌트에서 DB 직접 쿼리 + 실시간 계산 (캐시 없이, revalidate로 관리)

### 3. 대시보드 페이지 (INDEX-04)
- **D-09:** 신규 라우트: `/index` (지역 지수 대시보드)
- **D-10:** 레이아웃: 군집별 카드 그리드 (모바일 1열, 태블릿 2열, 데스크탑 3열)
- **D-11:** 카드 내용: 군집명 + 현재 지수 + 전월 대비 변동 + 소형 스파크라인 차트
- **D-12:** 카드 클릭 시 해당 군집의 상세 시계열 차트 페이지로 이동 (`/index/[clusterId]`)
- **D-13:** 상세 페이지: 대형 시계열 차트 (Recharts LineChart, X축 월별, Y축 지수) + 군집 내 구별 통계

### 4. 시계열 차트 (INDEX-02)
- **D-14:** Recharts LineChart 사용 (기존 패턴)
- **D-15:** X축: 월별 (YYYY-MM), Y축: 지수 (100 기준)
- **D-16:** 기준선 100을 점선으로 표시 (ReferenceLine)
- **D-17:** 대시보드 카드 내: MiniAreaChart 스파크라인 (높이 48px)
- **D-18:** 상세 페이지: 전체 크기 LineChart (높이 300px)

### 5. 시도/시군구 평균·중위가 (INDEX-03)
- **D-19:** 기존 market/[sido]/page.tsx에 시군구별 평균 매매가 + 중위가 컬럼 추가
- **D-20:** 기존 market/page.tsx에 시도별 평균 매매가 + 중위가 컬럼 추가
- **D-21:** 최근 3개월 거래 기준으로 산출
- **D-22:** 이상거래 필터 적용 (Phase 10 로직)

### Claude's Discretion
- 카드 디자인의 구체적 색상/여백
- 스파크라인의 색상 (상승=초록, 하락=빨강 등)
- 군집 상세 페이지의 구별 통계 레이아웃
- 지수 계산의 최소 거래 건수 threshold
- `/index` vs `/market/index` 라우트 결정

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 기존 시세 페이지 (수정 대상)
- `src/app/market/page.tsx` — 시도별 시세 (sidoStats 쿼리)
- `src/app/market/[sido]/page.tsx` — 시군구별 시세
- `src/app/market/[sido]/[sigungu]/page.tsx` — 시군구 상세

### 지역 코드
- `src/lib/constants/region-codes.ts` — REGION_HIERARCHY, Sido 타입, sigungu 매핑

### 가격 정규화 (재사용)
- `src/lib/price-normalization.ts` — computeMedianPrice, filterTransactions, isDirectDeal, isDealSuspicious

### 차트 패턴
- `src/components/charts/MiniAreaChartWrapper.tsx` — 스파크라인 패턴 (금리 페이지에서 사용)
- `src/components/charts/PriceHistoryChart.tsx` — Recharts ComposedChart 패턴

### API
- `src/lib/api/reb.ts` — 한국부동산원 지수 API (참고용 — 자체 지수와 별도)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `computeMedianPrice(prices)` — 중위가 산출
- `filterTransactions` — 이상거래 필터
- `MiniAreaChartWrapper` — 스파크라인 차트 (높이 48px)
- `REGION_HIERARCHY` — 시도/시군구 코드 매핑
- `formatPrice`, `formatPriceShort` — 가격 포맷팅

### Established Patterns
- market 페이지: 서버 컴포넌트에서 DB 직접 쿼리 → SSR 렌더링
- 카드 그리드: `grid gap-3 sm:grid-cols-2 lg:grid-cols-3`
- 반응형: `sm:hidden` / `hidden sm:block`
- 라우트: `/market/[sido]/[sigungu]` 패턴

### Integration Points
- `/index` 신규 라우트 + `/index/[clusterId]` 동적 라우트
- MobileNav에 지수 메뉴 링크 추가
- market 페이지에 평균/중위가 컬럼 추가 (기존 테이블 확장)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 15-regional-index-dashboard*
*Context gathered: 2026-03-28*
