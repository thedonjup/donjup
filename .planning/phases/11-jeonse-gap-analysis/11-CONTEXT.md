# Phase 11: 전세가율·갭 분석 - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

아파트 상세 페이지에서 면적별 전세가율(%)과 갭 금액(매매가 - 전세가)을 표시하고, 전세가율 추이 차트를 제공한다. 투자자가 갭 리스크를 즉시 파악할 수 있게 하는 것이 목적.

</domain>

<decisions>
## Implementation Decisions

### 1. 전세가율 산출 기준 (GAP-01)
- **D-01:** 면적별 최근 순수전세(rent_type === '전세', monthly_rent === 0) 보증금 기준으로 산출
- **D-02:** 매매가는 해당 면적의 최근 매매가 사용 (Phase 10의 정규화된 가격이 아닌 원 거래가)
- **D-03:** 전세가율 = (전세 보증금 / 매매가) × 100 — 소수점 1자리

### 2. 갭 금액 표시 (GAP-02)
- **D-04:** 갭 금액 = 매매가 - 전세가 (양수 = 투자 필요 금액)
- **D-05:** formatPrice 유틸 사용하여 억/만원 단위 표시
- **D-06:** 기존 page.tsx의 전체 기준 StatCard 2개(최근 전세가, 전세가율)를 면적별 연동으로 변경 — AptDetailClient 내부 면적 선택과 동기화

### 3. 표시 위치 및 UI (GAP-01, GAP-02)
- **D-07:** 기존 page.tsx Row 2의 StatCard (최근 전세가, 전세가율)를 AptDetailClient 내부로 이동하여 selectedSize 연동
- **D-08:** 면적 선택 칩 아래, 차트 위에 전세가율/갭 금액 카드 배치
- **D-09:** 전세가율 70% 이상 = 위험(빨강), 60-70% = 주의(노랑), 60% 미만 = 양호(초록) 색상 표시

### 4. 전세가율 추이 차트 (GAP-03)
- **D-10:** 기존 PriceHistoryChart 아래에 별도 소형 LineChart 추가 (높이 160px)
- **D-11:** X축: 월별, Y축: 전세가율(%) — 해당 면적의 월별 전세가율 추이
- **D-12:** 월별 전세가율 산출: 해당 월 전세 중위가 / 해당 월 매매 중위가 × 100
- **D-13:** 데이터 5건 미만 월은 점선 처리 (Phase 10과 동일한 패턴)

### 5. 데이터 부족 시 처리
- **D-14:** 전세 데이터 없는 면적: 전세가율 "-", 갭 금액 "-", 추이 차트 미표시
- **D-15:** 매매 데이터 없는 면적: 전세가율 산출 불가 — "-" 표시

### Claude's Discretion
- 전세가율 추이 차트의 구체적 색상/스타일
- 월별 중위가 산출 시 최소 거래 건수 threshold
- StatCard 이동 시 레이아웃 미세 조정
- 전세가율 추이 차트의 기간 범위 (전체 데이터 vs 최근 N년)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 상세 페이지 (핵심 수정 대상)
- `src/app/apt/[region]/[slug]/page.tsx` — 현재 전세가/전세가율 StatCard (line 390-401), rentTxns 쿼리 (line 212-226)
- `src/components/apt/AptDetailClient.tsx` — 면적별 전세가 계산 (line 106-110), selectedSize 상태, rentTxns prop
- `src/components/apt/TransactionTabs.tsx` — 전월세 거래 테이블 (면적 필터링 포함)

### 차트 컴포넌트
- `src/components/charts/PriceHistoryChart.tsx` — Phase 10에서 재구성된 ComposedChart
- `src/components/charts/PriceHistoryChartWrapper.tsx` — 차트 props 인터페이스

### 가격 정규화 유틸 (재사용 가능)
- `src/lib/price-normalization.ts` — computeMedianPrice, computeMovingMedian, groupByMonth 등 재사용

### 데이터 모델
- `src/types/db.ts` — AptTransaction, 기타 DB 타입
- AptRentTransaction 인터페이스 (AptDetailClient.tsx line 55-64)

### 비교 페이지 (참고 — 전세가율 산출 패턴)
- `src/app/compare/page.tsx` — 전세가율 계산 로직 (line 333-337)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AptDetailClient.tsx` sizeInfoMap: 이미 면적별 최근 전세가(latestJeonse) 계산 — 확장 가능
- `price-normalization.ts` groupByMonth, computeMedianPrice: 월별 중위가 산출에 재사용
- `formatPrice()`, `formatPriceShort()`: 가격 포맷팅 유틸
- `StatCard` 컴포넌트: 기존 지표 카드 — 색상 accent prop 지원

### Established Patterns
- 면적 선택: AptDetailClient → selectedSize → 하위 컴포넌트 prop drilling
- 차트: Recharts ComposedChart/LineChart 사용
- 데이터 흐름: page.tsx(서버) → AptDetailClient(클라이언트) → 차트/테이블

### Integration Points
- page.tsx: 기존 전세가/전세가율 StatCard 제거 또는 면적 연동으로 이동
- AptDetailClient: sizeInfoMap에 갭 금액/전세가율 추가 계산
- 전세가율 추이 차트: PriceHistoryChart 아래 새 차트 컴포넌트 추가
- rentTxns limit: 현재 200건 — 추이 차트용으로 더 많은 데이터 필요할 수 있음

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

*Phase: 11-jeonse-gap-analysis*
*Context gathered: 2026-03-28*
