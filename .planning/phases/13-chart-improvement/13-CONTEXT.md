# Phase 13: 차트 개선 - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

아파트 상세 페이지의 가격 추이 차트에 기간 선택 탭, 매매가+전세가 듀얼 라인, 전세가율 오버레이를 추가한다. Phase 10의 정규화 엔진 위에 구축하고, Phase 11의 별도 전세가율 차트를 통합 오버레이로 대체한다.

</domain>

<decisions>
## Implementation Decisions

### 1. 기간 선택 탭 (CHART-01)
- **D-01:** 차트 상단에 기간 탭: 1개월 / 3개월 / 6개월 / 1년 / 전체
- **D-02:** 기본 선택: "전체" (현재 동작 유지)
- **D-03:** 기간 필터는 AptDetailClient에서 적용 — 선택된 기간에 따라 saleTxns/rentTxns를 날짜 필터링한 후 차트에 전달
- **D-04:** 기간 탭 UI: 수평 칩 형태 (Phase 9에서 확립된 면적 선택 칩 패턴 재사용)
- **D-05:** 기간 변경 시 추이선(trendLine)도 재계산 (필터된 데이터 기반)

### 2. 매매가 + 전세가 듀얼 라인 (CHART-02)
- **D-06:** PriceHistoryChart에 전세가 추이선 추가 — 좌측 Y축 공유 (가격 단위 동일)
- **D-07:** 전세가 추이선 데이터: rentTxns에서 순수전세(monthly_rent === 0) 거래만 추출 → Phase 10 computeMovingMedian으로 3개월 이동중위가 산출
- **D-08:** 매매가 추이선: 기존 파란색 실선 유지 / 전세가 추이선: 초록색 실선 (구분 명확)
- **D-09:** 전세가 거래 점(dots)은 표시하지 않음 — 추이선만 표시 (차트 과밀 방지)
- **D-10:** 범례(legend): "매매 추이" / "전세 추이" 표시

### 3. 전세가율 오버레이 (CHART-03)
- **D-11:** PriceHistoryChart에 전세가율(%) 오버레이 라인 추가 — 우측 Y축 (%, 별도 스케일)
- **D-12:** 오버레이 토글: "전세가율 표시" 체크박스 — 기본 OFF
- **D-13:** 전세가율 데이터: Phase 11 JeonseRatioChart의 산출 로직 재사용 (월별 전세중위가/매매중위가 × 100)
- **D-14:** 오버레이 선 색상: 주황색 점선 (기존 파란/초록과 구분)
- **D-15:** 전세가율 Y축: 0-100% 범위, 우측 배치

### 4. Phase 11 JeonseRatioChart 처리
- **D-16:** JeonseRatioChart 컴포넌트 제거 — PriceHistoryChart 오버레이로 기능 통합
- **D-17:** AptDetailClient에서 JeonseRatioChart import/render 제거
- **D-18:** JeonseRatioChart.tsx 파일 삭제

### Claude's Discretion
- 기간 탭과 면적 칩의 정확한 배치 관계 (같은 줄 vs 별도 줄)
- 듀얼 Y축 시 좌/우축 라벨 포맷
- 오버레이 활성 시 차트 높이 조정 여부
- 추이선 두께/스타일 미세 조정

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 차트 컴포넌트 (핵심 수정 대상)
- `src/components/charts/PriceHistoryChart.tsx` — Phase 10 ComposedChart (normalDots, directDealDots, trendLine)
- `src/components/charts/PriceHistoryChartWrapper.tsx` — 동적 import wrapper, props 인터페이스
- `src/components/charts/JeonseRatioChart.tsx` — Phase 11 전세가율 추이 차트 (제거 대상, 로직 재사용)

### 데이터 처리
- `src/components/apt/AptDetailClient.tsx` — selectedSize, 면적 필터링, filterTransactions, JeonseRatioChart 배치
- `src/lib/price-normalization.ts` — computeMovingMedian, groupByMonth, computeMedianPrice, filterTransactions

### 데이터 모델
- `src/types/db.ts` — AptTransaction
- AptRentTransaction (AptDetailClient.tsx line 55-64)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `computeMovingMedian` — 3개월 이동중위가 산출 (전세 추이선에도 적용)
- `groupByMonth`, `computeMedianPrice` — 월별 그룹화 + 중위가 (전세가율 산출에 사용)
- `filterTransactions` — 이상거래 필터 + 저층 처리
- 면적 선택 칩 패턴 — AptDetailClient에서 확립, 기간 탭에 재사용

### Established Patterns
- ComposedChart: Scatter(거래점) + Line(추이선) + Customized(직거래 연결선)
- 동적 import: PriceHistoryChartWrapper → PriceHistoryChart (SSR 비활성)
- 데이터 흐름: AptDetailClient → filterTransactions → computeMovingMedian → PriceHistoryChart props

### Integration Points
- PriceHistoryChart props 확장: rentTrendLine, jeonseRatioLine 추가
- PriceHistoryChartWrapper props 확장 필요
- AptDetailClient: 기간 state 추가, 날짜 필터링 로직 추가
- JeonseRatioChart 제거 + import 정리

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

*Phase: 13-chart-improvement*
*Context gathered: 2026-03-28*
