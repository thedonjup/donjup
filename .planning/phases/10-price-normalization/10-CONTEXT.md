# Phase 10: 가격 정규화 엔진 - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

차트가 노이즈 없는 정확한 가격 추이를 보여준다. 저층 거래 제외, 이상거래 필터링, 3개월 이동중위가 추이선 표시. 기존 PriceHistoryChart + AptDetailClient 수정.

</domain>

<decisions>
## Implementation Decisions

### 1. 저층 기준 및 필터링 (NORM-01, NORM-02, NORM-05)
- 3층 이하 거래는 차트에서 제외 (현재 `LOW_FLOOR_MAX = 3` 유지)
- 추가로 최근 6개월 동일 면적 중위가의 90% 미만 거래도 제외 (이중 필터)
- "저층 포함/제외" 토글 제공 — 기본값은 제외
- 토글 켜면 저층 거래도 차트에 표시 (보정 없이 원가 그대로)

### 2. 이상거래 필터링 (NORM-04)
- 직거래는 차트에서 **회색 투명 점**으로 별도 표시 (추이선에 포함 안 함)
- 직거래 점은 직전 거래가 위치에 2개 점(직전가 + 직거래가)으로 연결 표시
- 중위가 90% 미만 필터가 증여성 직거래 대부분 걸러냄
- 필터 기준: `deal_type === '직거래'` → 회색 점, 중위가 90% 미만 → 비표시

### 3. 차트 추이선 (NORM-03)
- **거래점 + 추이선 병행 표시**
- 개별 거래: 작은 점(dot)으로 표시
- 추이선: 3개월 이동중위가 기반 부드러운 선
- 직거래 점: 회색 반투명 (추이선 계산에서 제외)
- 거래 건수 5건 미만 월은 추이선 점선 처리 (신뢰도 낮음 표시)

### 4. 전체 면적 합산 제거 (NORM-01)
- PriceHistoryChart에서 "전체" 탭 제거
- 면적 미선택 시 → 첫 번째 면적 자동 선택 (가장 거래 많은 면적)
- AptDetailClient에서 selectedSize 기본값을 null → 최다 거래 면적으로 변경

### Claude's Discretion
- 이동중위가 계산의 구체적 구현 (서버 vs 클라이언트)
- 차트 라이브러리 활용 방식 (Recharts AreaChart 커스터마이징)
- 직거래 점의 정확한 색상/투명도 값
- 거래 건수 부족 시 점선 처리의 구체적 threshold

</decisions>

<canonical_refs>
## Canonical References

### 차트 컴포넌트
- `src/components/charts/PriceHistoryChart.tsx` — 현재 차트 구현 (Recharts AreaChart)
- `src/components/apt/AptDetailClient.tsx` — 면적 선택 UI + 차트 데이터 필터링 (LOW_FLOOR_MAX = 3)

### 데이터 모델
- `src/types/db.ts` — AptTransaction 타입 (floor, size_sqm, trade_price, deal_type, change_rate)

### 리서치
- `.planning/research/PRICE-NORMALIZATION.md` — 층별 보정계수, 중위가 방법론, 이상거래 탐지
- `.planning/research/FLOOR-STANDARDS.md` — 업계 저층 기준 시장조사
- `.planning/research/BENCHMARK.md` — 경쟁사 차트 표현 방식 비교

### 상세 페이지
- `src/app/apt/[region]/[slug]/page.tsx` — 아파트 상세 데이터 쿼리 (floor, deal_type 포함)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PriceHistoryChart` — Recharts 기반, 이미 면적별 필터링 지원. 추이선 추가 필요
- `AptDetailClient` — `LOW_FLOOR_MAX = 3` 상수, 이미 차트에 고층만 전달
- `formatPrice()` — `@/lib/format` 에서 가격 포맷팅 유틸
- `sqmToPyeong()` — 면적 변환 유틸

### Established Patterns
- 면적 선택: AptDetailClient → selectedSize → PriceHistoryChart (prop drilling)
- 차트 데이터: AptDetailClient에서 saleTxns를 filter → map → PriceHistoryChart에 전달
- 반응형: `h-[280px] sm:h-[240px]` 차트 높이

### Integration Points
- AptDetailClient line 192-210: 차트 데이터 필터링 로직 수정 지점
- PriceHistoryChart: 추이선 추가, 직거래 점 별도 표시
- `src/app/apt/[region]/[slug]/page.tsx`: deal_type 쿼리 추가 필요 (현재 미포함 확인 필요)

</code_context>

<specifics>
## Specific Ideas

- "사람들은 가격이 비싸게 보이는 걸 좋아한다" — 차트가 높은 가격대를 강조하도록
- 직거래 2개 점 연결: 직전 거래가 위치에 점 하나, 직거래가 위치에 점 하나, 둘을 회색 점선으로 연결
- 전체 면적 합산 차트 완전 삭제 — "전체" 탭 자체를 없앰

</specifics>

<deferred>
## Deferred Ideas

- 동/호수별 가격 예측 — MOLIT API 호수 데이터 확인 필요 (v1.2+)
- 평균가 기반 필터링(하위 40% 제거) — 데이터 검증 결과 시장 하락 은폐 위험으로 보류
- 단지별 동적 보정계수 산출 — 거래 건수 부족한 단지가 많아 고정 계수가 현실적

</deferred>

---

*Phase: 10-price-normalization*
*Context gathered: 2026-03-28*
