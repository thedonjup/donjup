# Phase 11: 전세가율·갭 분석 - Research

**Researched:** 2026-03-28
**Domain:** React/Next.js 클라이언트 컴포넌트 — Recharts LineChart, 기존 AptDetailClient 확장
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**전세가율 산출 기준 (GAP-01)**
- D-01: 면적별 최근 순수전세(rent_type === '전세', monthly_rent === 0) 보증금 기준으로 산출
- D-02: 매매가는 해당 면적의 최근 매매가 사용 (Phase 10의 정규화된 가격이 아닌 원 거래가)
- D-03: 전세가율 = (전세 보증금 / 매매가) × 100 — 소수점 1자리

**갭 금액 표시 (GAP-02)**
- D-04: 갭 금액 = 매매가 - 전세가 (양수 = 투자 필요 금액)
- D-05: formatPrice 유틸 사용하여 억/만원 단위 표시
- D-06: 기존 page.tsx의 전체 기준 StatCard 2개(최근 전세가, 전세가율)를 면적별 연동으로 변경

**표시 위치 및 UI (GAP-01, GAP-02)**
- D-07: 기존 page.tsx Row 2의 StatCard(최근 전세가, 전세가율)를 AptDetailClient 내부로 이동하여 selectedSize 연동
- D-08: 면적 선택 칩 아래, 차트 위에 전세가율/갭 금액 카드 배치
- D-09: 전세가율 70% 이상 = 위험(빨강), 60-70% = 주의(노랑), 60% 미만 = 양호(초록) 색상 표시

**전세가율 추이 차트 (GAP-03)**
- D-10: 기존 PriceHistoryChart 아래에 별도 소형 LineChart 추가 (높이 160px)
- D-11: X축: 월별, Y축: 전세가율(%) — 해당 면적의 월별 전세가율 추이
- D-12: 월별 전세가율 산출: 해당 월 전세 중위가 / 해당 월 매매 중위가 × 100
- D-13: 데이터 5건 미만 월은 점선 처리 (Phase 10과 동일한 패턴)

**데이터 부족 시 처리**
- D-14: 전세 데이터 없는 면적: 전세가율 "-", 갭 금액 "-", 추이 차트 미표시
- D-15: 매매 데이터 없는 면적: 전세가율 산출 불가 — "-" 표시

### Claude's Discretion
- 전세가율 추이 차트의 구체적 색상/스타일
- 월별 중위가 산출 시 최소 거래 건수 threshold
- StatCard 이동 시 레이아웃 미세 조정
- 전세가율 추이 차트의 기간 범위 (전체 데이터 vs 최근 N년)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GAP-01 | 아파트 상세 페이지에 면적별 전세가율(매매가 대비 전세 비율)을 표시한다 | sizeInfoMap 확장, StatCard 이동 패턴 확인, 색상 임계값 로직 확인 |
| GAP-02 | 아파트 상세 페이지에 갭 금액(매매가 - 전세가)을 표시한다 | formatPrice 유틸 존재 확인, AptDetailClient sizePriceMap 확장 패턴 확인 |
| GAP-03 | 전세가율 추이 차트를 면적별로 제공한다 | groupByMonth + computeMedianPrice 재사용 확인, Recharts LineChart 패턴, 점선 처리 패턴(isLowConfidence) 확인 |
</phase_requirements>

---

## Summary

Phase 11은 신규 기술 도입 없이 기존 코드베이스를 확장하는 작업이다. 핵심 변경 사항은 세 가지: (1) `page.tsx`의 Row 2 StatCard 두 개를 제거하고 `AptDetailClient` 내부로 이동, (2) `AptDetailClient`의 `sizePriceMap` useMemo를 확장하여 면적별 전세가율·갭 금액을 계산, (3) 신규 `JeonseRatioChart` 소형 컴포넌트를 생성하여 PriceHistoryChart 아래에 배치.

모든 필요 유틸(`groupByMonth`, `computeMedianPrice`, `formatPrice`, `formatPriceShort`)이 이미 프로젝트에 존재하며, Recharts의 점선 처리 패턴도 Phase 10에서 `isLowConfidence` 플래그로 이미 확립되어 있다. 가장 복잡한 부분은 추이 차트용 월별 전세가율 산출로, rent 거래와 sale 거래의 월을 각각 그룹화한 뒤 동일 월이 존재하는 경우만 비율을 계산해야 한다.

**Primary recommendation:** StatCard 이동을 Plan 01, 갭 지표 카드를 Plan 01에 통합, 전세가율 추이 차트를 Plan 02로 분리하여 2-plan 구조로 진행.

---

## Standard Stack

### Core (이미 프로젝트에 설치됨 — 신규 설치 불필요)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | 기존 사용 중 | LineChart (전세가율 추이) | PriceHistoryChart에서 이미 사용 |
| react | 기존 사용 중 | useMemo, useState | 기존 AptDetailClient 패턴 |
| next.js | 기존 사용 중 | 서버 컴포넌트 + 클라이언트 분리 | 기존 page.tsx 패턴 |

**신규 npm 설치: 없음.** 모든 의존성 이미 존재.

---

## Architecture Patterns

### Recommended Project Structure (변경 범위)

```
src/
├── app/apt/[region]/[slug]/
│   └── page.tsx               ← Row 2 StatCard 제거 (최근 전세가, 전세가율)
├── components/apt/
│   └── AptDetailClient.tsx    ← sizePriceMap 확장 + GAP 지표 카드 + JeonseRatioChart 탑재
└── components/charts/
    └── JeonseRatioChart.tsx   ← 신규 생성 (소형 LineChart, 높이 160px)
```

### Pattern 1: sizePriceMap 확장 (GAP-01, GAP-02)

AptDetailClient의 기존 `sizePriceMap` useMemo에 `gapAmount`와 `jeonseRatio` 필드를 추가한다.

**현재 sizePriceMap 타입:**
```typescript
Map<number, {
  highFloorSale: number | null;
  lowFloorSale: number | null;
  latestJeonse: number | null;
}>
```

**확장 후:**
```typescript
Map<number, {
  highFloorSale: number | null;
  lowFloorSale: number | null;
  latestJeonse: number | null;
  latestSale: number | null;      // 해당 면적 최근 매매가 (원 거래가, D-02)
  gapAmount: number | null;       // 매매가 - 전세가 (D-04)
  jeonseRatio: number | null;     // 전세가 / 매매가 × 100 (D-03)
}>
```

**주의사항 (D-01):** 순수전세 기준 — `rent_type === '전세' && monthly_rent === 0` 조건 확인 필요. 현재 코드(line 106)는 `rent_type === "전세"`만 체크하고 `monthly_rent === 0` 조건이 없다. 추가 필요.

**주의사항 (D-02):** 매매가는 Phase 10 정규화된 가격이 아닌 원 거래가. `saleTxns`에서 해당 면적의 `trade_price`를 직접 사용 (adjusted 아님). `sizePriceMap`은 `saleTxns`를 직접 참조하므로 이미 원 거래가를 사용하게 됨.

```typescript
// AptDetailClient.tsx — sizePriceMap useMemo 수정 예시
const sizePriceMap = useMemo(() => {
  const map = new Map<number, SizeInfo>();
  for (const size of sizeOptions) {
    const sizeMatches = saleTxns.filter((t) => t.size_sqm === size);
    const highFloorTx = sizeMatches.find((t) => t.floor > LOW_FLOOR_MAX);
    const lowFloorTx = sizeMatches.find((t) => t.floor <= LOW_FLOOR_MAX);
    // D-01: 순수전세 = rent_type === '전세' AND monthly_rent === 0
    const jeonseTx = rentTxns.find(
      (t) => t.size_sqm === size && t.rent_type === "전세" && t.monthly_rent === 0
    );
    // D-02: 원 거래가 (최근 거래 = 첫 번째 요소, 이미 내림차순 정렬)
    const latestSale = sizeMatches[0]?.trade_price ?? null;
    const latestJeonse = jeonseTx?.deposit ?? null;

    // D-03, D-04
    const gapAmount =
      latestSale !== null && latestJeonse !== null
        ? latestSale - latestJeonse
        : null;
    const jeonseRatio =
      latestSale !== null && latestJeonse !== null && latestSale > 0
        ? (latestJeonse / latestSale) * 100
        : null;

    map.set(size, {
      highFloorSale: highFloorTx?.trade_price ?? null,
      lowFloorSale: lowFloorTx?.trade_price ?? null,
      latestJeonse,
      latestSale,
      gapAmount,
      jeonseRatio,
    });
  }
  return map;
}, [sizeOptions, saleTxns, rentTxns]);
```

### Pattern 2: GAP 지표 카드 렌더링 (D-07, D-08, D-09)

면적 선택 칩 div 아래, PriceHistoryChart div 위에 인라인으로 배치. StatCard를 재사용하거나 인라인 div로 구현.

**색상 로직 (D-09):**
```typescript
function getJeonseRatioAccent(ratio: number | null): { color: string; label: string } {
  if (ratio === null) return { color: "var(--color-text-primary)", label: "" };
  if (ratio >= 70) return { color: "var(--color-semantic-drop)", label: "위험" };
  if (ratio >= 60) return { color: "#F59E0B", label: "주의" };   // amber (노랑)
  return { color: "var(--color-semantic-rise)", label: "양호" };
}
```

**StatCard는 현재 page.tsx 내부 함수**로 정의되어 있다 (`page.tsx` line 492). AptDetailClient에서 사용하려면:
- 방법 A: StatCard를 별도 파일로 추출 (`src/components/ui/StatCard.tsx`)
- 방법 B: AptDetailClient에 인라인 카드 div 직접 작성

방법 B가 리팩토링 범위가 작아 Phase 11 범위에 적합. Claude의 재량으로 결정.

### Pattern 3: JeonseRatioChart 컴포넌트 (GAP-03)

새 파일 `src/components/charts/JeonseRatioChart.tsx` 생성.

**입력 props:**
```typescript
interface JeonseRatioChartProps {
  saleTxns: AptTransaction[];    // 해당 면적의 매매 거래
  rentTxns: AptRentTransaction[]; // 해당 면적의 전세 거래
  // 면적 필터링은 호출 측에서 완료된 데이터를 넘기거나 내부에서 처리
}
```

**월별 전세가율 산출 로직 (D-12):**
1. `groupByMonth(rentTxns filtered 순수전세)` → 월별 전세 가격 배열
2. `groupByMonth(saleTxns)` → 월별 매매 가격 배열
3. 두 맵에서 공통 월만 추출
4. 각 월: `computeMedianPrice(rentPrices) / computeMedianPrice(salePrices) * 100`
5. 건수 < 5인 월은 `isLowConfidence = true` → 점선 처리

**점선 처리 패턴 (D-13):** PriceHistoryChart와 동일하게 solid/dashed 두 개의 Line 컴포넌트 사용. `isLowConfidence` 플래그로 분기.

```typescript
// JeonseRatioChart 데이터 구조
interface RatioPoint {
  month: string;       // YYYY-MM
  ratio: number;       // 전세가율 (%)
  isLowConfidence: boolean;
  rentCount: number;
  saleCount: number;
}
```

**Recharts 구성:**
```tsx
<LineChart data={ratioPoints} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
  <XAxis dataKey="month" tick={{ fontSize: 10 }} ... />
  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} ... />
  <Tooltip content={<RatioTooltip />} />
  {/* solid line — high confidence */}
  <Line dataKey="solidRatio" ... stroke="#3B82F6" strokeWidth={2} connectNulls={false} />
  {/* dashed line — low confidence */}
  <Line dataKey="dashedRatio" ... stroke="#3B82F6" strokeWidth={2} strokeDasharray="5 5" connectNulls={false} />
</LineChart>
```

### Pattern 4: page.tsx Row 2 제거 (D-06, D-07)

`page.tsx` lines 390-401의 Row 2 div (grid gap-3 grid-cols-2 mb-8)를 삭제. AptDetailClient에서 대체 렌더링.

**단, rentTxns prop이 이미 AptDetailClient에 전달되고 있음** (line 404). 추가 prop 전달 불필요.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 월별 그룹화 | 직접 Map 구현 | `groupByMonth()` (price-normalization.ts) | 이미 존재 |
| 중위가 산출 | 직접 정렬 | `computeMedianPrice()` (price-normalization.ts) | 이미 존재 |
| 가격 포맷 | 직접 억/만원 변환 | `formatPrice()` / `formatPriceShort()` in AptDetailClient | 이미 존재 |
| 점선 추이선 | 커스텀 SVG | Recharts Line dual (solid + dashed) 패턴 | Phase 10에서 확립됨 |

---

## Common Pitfalls

### Pitfall 1: monthly_rent === 0 조건 누락
**What goes wrong:** 반전세(월세 있는 전세)가 전세가율 계산에 포함되어 전세가율이 왜곡됨
**Why it happens:** 현재 `sizePriceMap` line 106은 `rent_type === "전세"` 만 체크
**How to avoid:** `jeonseTx` 조회 시 `monthly_rent === 0` 조건 추가 (D-01)
**Warning signs:** 전세가율이 비정상적으로 낮게 나오거나 전세가 0원으로 표시

### Pitfall 2: 정규화된 가격 vs 원 거래가 혼용
**What goes wrong:** Phase 10의 `adjustFloorPrice`로 환산된 가격이 매매가로 쓰이면 전세가율이 부정확해짐
**Why it happens:** `filterTransactions`의 `normal` 배열은 저층 거래가 환산가로 대체됨
**How to avoid:** D-02 준수 — `sizePriceMap`에서는 `saleTxns` 원본을 직접 사용 (`saleTxns.find(...)`, not `normal.find(...)`)
**Warning signs:** 저층 많은 단지에서 전세가율이 80%+ 이상으로 나오는 경우

### Pitfall 3: rentTxns limit=200으로 추이 차트 데이터 부족
**What goes wrong:** 오래된 단지에서 200건 limit이 전체 전세 이력을 커버하지 못해 추이 차트가 최근 일부만 표시
**Why it happens:** `page.tsx` line 221: `.limit(200)` 고정
**How to avoid:** 추이 차트 목적상 월별 중위가만 필요하므로 200건이면 대부분 충분 (월 5건 기준 40개월치). 단지에 따라 부족할 수 있음 — 추이 차트가 짧게 나오는 것은 데이터 한계로 허용 가능. 필요하면 limit을 500으로 증가 고려.
**Warning signs:** 추이 차트에 12개월 미만 데이터만 표시되는 경우

### Pitfall 4: 전월세 시점 불일치 (rent/sale 동일 월 없음)
**What goes wrong:** 전세 거래와 매매 거래가 같은 달에 없으면 해당 월 전세가율 산출 불가
**Why it happens:** 매매·전세 거래 빈도 차이, 특히 소규모 단지
**How to avoid:** 공통 월만 추이 포인트로 사용. 빈 월은 null로 처리 → `connectNulls={false}` 로 그래프 단절 허용.
**Warning signs:** 추이 차트에 포인트가 드문드문 끊겨 보이는 경우

### Pitfall 5: StatCard가 page.tsx 내부 함수
**What goes wrong:** AptDetailClient에서 StatCard를 import 하려 하면 파일을 찾을 수 없음
**Why it happens:** `StatCard`는 현재 `page.tsx`의 내부 지역 함수 (line 492)
**How to avoid:** AptDetailClient 내부에 직접 인라인 카드 div 작성하거나, StatCard를 별도 파일로 추출 후 양쪽에서 import

---

## Code Examples

### 월별 전세가율 산출 (GAP-03 핵심 로직)
```typescript
// Source: price-normalization.ts groupByMonth + computeMedianPrice 재사용
function computeJeonseRatioTrend(
  saleTxns: AptTransaction[],
  rentTxns: AptRentTransaction[]
): { month: string; ratio: number; isLowConfidence: boolean }[] {
  // 순수전세만 필터
  const pureTxns = rentTxns.filter(
    (r) => r.rent_type === "전세" && r.monthly_rent === 0
  );

  // 월별 그룹화 — AptRentTransaction은 deposit 필드를 trade_price처럼 매핑
  const rentByMonth = groupByMonth(
    pureTxns.map((r) => ({ trade_date: r.trade_date, trade_price: r.deposit }))
  );
  const saleByMonth = groupByMonth(saleTxns);

  const rentMonthMap = new Map(rentByMonth.map((m) => [m.month, m.prices]));
  const saleMonthMap = new Map(saleByMonth.map((m) => [m.month, m.prices]));

  // 공통 월만 추출
  const commonMonths = [...rentMonthMap.keys()].filter((m) => saleMonthMap.has(m)).sort();

  return commonMonths.map((month) => {
    const rentPrices = rentMonthMap.get(month)!;
    const salePrices = saleMonthMap.get(month)!;
    const rentMedian = computeMedianPrice(rentPrices);
    const saleMedian = computeMedianPrice(salePrices);
    const ratio = saleMedian > 0 ? (rentMedian / saleMedian) * 100 : 0;
    const totalCount = rentPrices.length + salePrices.length;
    return {
      month,
      ratio: Math.round(ratio * 10) / 10,
      isLowConfidence: totalCount < 5,
    };
  });
}
```

### 전세가율 색상 분기 (D-09)
```typescript
function getJeonseRatioStyle(ratio: number | null): React.CSSProperties {
  if (ratio === null) return { color: "var(--color-text-primary)" };
  if (ratio >= 70) return { color: "var(--color-semantic-drop)" };      // 빨강 — 위험
  if (ratio >= 60) return { color: "#F59E0B" };                          // 노랑 — 주의
  return { color: "var(--color-semantic-rise)" };                        // 초록 — 양호
}
```

### GAP 지표 카드 인라인 (면적 선택 아래, 차트 위)
```tsx
{/* GAP 지표 카드 — D-07, D-08 */}
{selectedSize && (() => {
  const info = sizePriceMap.get(selectedSize);
  const ratio = info?.jeonseRatio ?? null;
  const gap = info?.gapAmount ?? null;
  const ratioStyle = getJeonseRatioStyle(ratio);
  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      <div className="rounded-2xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}>
        <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>최근 전세가</p>
        <p className="mt-1 text-xl font-extrabold tabular-nums t-text">
          {info?.latestJeonse ? formatPriceShort(info.latestJeonse) : "-"}
        </p>
      </div>
      <div className="rounded-2xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}>
        <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>전세가율</p>
        <p className="mt-1 text-xl font-extrabold tabular-nums" style={ratioStyle}>
          {ratio !== null ? `${ratio.toFixed(1)}%` : "-"}
        </p>
      </div>
      <div className="rounded-2xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface-card)" }}>
        <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>갭 금액</p>
        <p className="mt-1 text-xl font-extrabold tabular-nums t-text">
          {gap !== null ? formatPriceShort(gap) : "-"}
        </p>
      </div>
    </div>
  );
})()}
```

---

## Runtime State Inventory

Step 2.5 SKIPPED — 이 phase는 rename/refactor/migration이 아닌 신규 기능 추가.

---

## Environment Availability

Step 2.6 SKIPPED — 외부 툴/서비스 의존성 없음. DB는 기존 `apt_rent_transactions` 테이블(CockroachDB)을 이미 조회 중.

---

## Validation Architecture

> nyquist_validation = true이므로 포함.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | 없음 — REQUIREMENTS.md "테스트 인프라 Out of Scope" |
| Config file | 없음 |
| Quick run command | 수동 브라우저 확인 |
| Full suite command | 수동 브라우저 확인 |

테스트 인프라가 out of scope로 명시되어 있으므로 자동화 테스트는 해당 없음.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GAP-01 | 면적 선택 시 전세가율 수치 표시 | manual | — | N/A |
| GAP-02 | 면적 선택 시 갭 금액 표시 | manual | — | N/A |
| GAP-03 | 전세가율 추이 차트 렌더링 | manual | — | N/A |

### Sampling Rate
- 각 task 완료 후: 브라우저에서 아파트 상세 페이지 로드, 면적 전환 시 갱신 확인
- Phase gate: `/gsd:verify-work` 전 실제 데이터 있는 단지에서 전세가율·갭·차트 3가지 확인

### Wave 0 Gaps
없음 — 테스트 인프라 별도 마일스톤. 검증은 수동 브라우저 확인으로 대체.

---

## Open Questions

1. **rentTxns limit 200 충분한가?**
   - What we know: 현재 200건 limit, 추이 차트는 월별 데이터 필요
   - What's unclear: 분석 대상 단지의 전세 거래 빈도
   - Recommendation: 우선 200건으로 진행. 추이 차트가 너무 짧으면 limit을 500으로 증가. 플래너가 task에 "limit 충분성 확인" 스텝 포함 권장.

2. **전세가율 추이 차트 기간 범위**
   - What we know: Claude의 재량으로 결정
   - What's unclear: 전체 데이터 vs 최근 N년
   - Recommendation: 전체 데이터 사용 (rentTxns에 있는 모든 기간). 데이터가 많으면 X축이 자동으로 압축됨. 별도 기간 필터는 Phase 13(CHART-01)에서 다룸.

3. **월별 전세가율 산출 시 최소 건수 threshold**
   - What we know: Claude의 재량
   - What's unclear: rent + sale 각각 몇 건 미만을 low confidence로 볼지
   - Recommendation: Phase 10 패턴 일치 — 합산 5건 미만 (`rentCount + saleCount < 5`)을 `isLowConfidence: true`로 처리.

---

## Sources

### Primary (HIGH confidence)
- 직접 코드 탐색: `AptDetailClient.tsx` — sizePriceMap 구조, selectedSize 상태, rentTxns prop 확인
- 직접 코드 탐색: `page.tsx` lines 390-401, 492-513 — StatCard 구현 및 Row 2 위치 확인
- 직접 코드 탐색: `price-normalization.ts` — groupByMonth, computeMedianPrice, computeMovingMedian 함수 시그니처 확인
- 직접 코드 탐색: `PriceHistoryChart.tsx` — solid/dashed dual Line 패턴, isLowConfidence 플래그 확인
- 직접 코드 탐색: `compare/page.tsx` lines 333-345 — 전세가율 산출 패턴 (deposit / trade_price * 100) 확인

### Secondary (MEDIUM confidence)
- CONTEXT.md 결정사항 D-01~D-15: 사용자 locked decision

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 신규 의존성 없음, 기존 코드 직접 확인
- Architecture: HIGH — 기존 패턴 직접 분석, 확장 방법 명확
- Pitfalls: HIGH — 코드 직접 확인으로 실제 누락 사항(monthly_rent 조건, StatCard 위치) 발견

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable — Next.js/Recharts 버전 변경 없을 경우)
