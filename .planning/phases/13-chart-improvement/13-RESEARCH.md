# Phase 13: 차트 개선 - Research

**Researched:** 2026-03-28
**Domain:** Recharts 3.x ComposedChart — dual Y-axis, multi-series line overlay, date range filtering
**Confidence:** HIGH

## Summary

Phase 13은 기존 PriceHistoryChart(ComposedChart 기반)를 세 방향으로 확장한다: (1) 기간 선택 탭을 AptDetailClient에 추가하여 saleTxns/rentTxns를 날짜 필터링하고 필터된 데이터를 차트에 내려보낸다, (2) 전세 추이선을 PriceHistoryChart에 두 번째 Line으로 추가한다(좌측 Y축 공유), (3) 전세가율 오버레이를 우측 Y축(0–100%)으로 추가하고 체크박스로 토글한다.

모든 결정이 CONTEXT.md에 확정(locked)되어 있고 Phase 10·11의 유틸리티(computeMovingMedian, groupByMonth, computeMedianPrice)를 그대로 재사용하므로, 이 phase는 순수하게 **기존 컴포넌트 확장** 작업이다. 새 라이브러리 없이 Recharts 3.8의 `yAxisId` / `orientation="right"` 조합으로 듀얼 Y축을 구현하고, JeonseRatioChart는 삭제한다.

**Primary recommendation:** Recharts 3.8 `yAxisId` prop을 활용해 PriceHistoryChart에 두 번째 YAxis(orientation="right")를 추가하고, jeonseRatioLine 데이터를 전달하는 Line 컴포넌트에 `yAxisId="right"`를 지정한다.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### 1. 기간 선택 탭 (CHART-01)
- D-01: 차트 상단에 기간 탭: 1개월 / 3개월 / 6개월 / 1년 / 전체
- D-02: 기본 선택: "전체" (현재 동작 유지)
- D-03: 기간 필터는 AptDetailClient에서 적용 — 선택된 기간에 따라 saleTxns/rentTxns를 날짜 필터링한 후 차트에 전달
- D-04: 기간 탭 UI: 수평 칩 형태 (Phase 9에서 확립된 면적 선택 칩 패턴 재사용)
- D-05: 기간 변경 시 추이선(trendLine)도 재계산 (필터된 데이터 기반)

#### 2. 매매가 + 전세가 듀얼 라인 (CHART-02)
- D-06: PriceHistoryChart에 전세가 추이선 추가 — 좌측 Y축 공유 (가격 단위 동일)
- D-07: 전세가 추이선 데이터: rentTxns에서 순수전세(monthly_rent === 0) 거래만 추출 → Phase 10 computeMovingMedian으로 3개월 이동중위가 산출
- D-08: 매매가 추이선: 기존 파란색 실선 유지 / 전세가 추이선: 초록색 실선 (구분 명확)
- D-09: 전세가 거래 점(dots)은 표시하지 않음 — 추이선만 표시 (차트 과밀 방지)
- D-10: 범례(legend): "매매 추이" / "전세 추이" 표시

> **주의**: CONTEXT.md D-08에서 매매가를 "기존 파란색"이라 했으나 현재 코드(PriceHistoryChart.tsx)에서 매매가 추이선은 `#059669`(초록색)이고 정상 거래 점도 초록색이다. 실제 구현 시 매매가는 현재 색상(초록, #059669) 유지, 전세가 추이선은 새 색상(파란색, #3B82F6)을 사용하는 것이 현재 코드와 충돌 없이 자연스럽다. 또는 매매가를 파란색(#3B82F6), 전세가를 초록색(#10B981)으로 변경하는 옵션도 있다. Planner가 결정 필요.

#### 3. 전세가율 오버레이 (CHART-03)
- D-11: PriceHistoryChart에 전세가율(%) 오버레이 라인 추가 — 우측 Y축 (%, 별도 스케일)
- D-12: 오버레이 토글: "전세가율 표시" 체크박스 — 기본 OFF
- D-13: 전세가율 데이터: Phase 11 JeonseRatioChart의 산출 로직 재사용 (월별 전세중위가/매매중위가 × 100)
- D-14: 오버레이 선 색상: 주황색 점선 (기존 파란/초록과 구분)
- D-15: 전세가율 Y축: 0-100% 범위, 우측 배치

#### 4. Phase 11 JeonseRatioChart 처리
- D-16: JeonseRatioChart 컴포넌트 제거 — PriceHistoryChart 오버레이로 기능 통합
- D-17: AptDetailClient에서 JeonseRatioChart import/render 제거
- D-18: JeonseRatioChart.tsx 파일 삭제

### Claude's Discretion
- 기간 탭과 면적 칩의 정확한 배치 관계 (같은 줄 vs 별도 줄)
- 듀얼 Y축 시 좌/우축 라벨 포맷
- 오버레이 활성 시 차트 높이 조정 여부
- 추이선 두께/스타일 미세 조정

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHART-01 | 기간 선택 탭(1개월/3개월/6개월/1년/전체)을 차트에 추가한다 | AptDetailClient의 날짜 필터링 로직 추가 + 칩 UI 패턴 재사용. ISO date string 비교로 구현 가능. |
| CHART-02 | 면적별 차트에서 매매가 + 전세가를 동시에 표시한다 (듀얼 라인) | Recharts 3.8 ComposedChart에 `Line yAxisId="left"` 2개 추가 방식으로 구현. computeMovingMedian 재사용. |
| CHART-03 | 전세가율(매매가 대비 전세 비율) 오버레이 라인을 차트에 추가한다 | Recharts 3.8 `YAxis orientation="right" yAxisId="right"` + `Line yAxisId="right"` 확인됨. JeonseRatioChart 로직 이식. |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | 3.8.0 (installed) | ComposedChart, Line, YAxis, Scatter | 이미 사용 중, 프로젝트 유일 차트 라이브러리 |
| React | 19.2.4 | useState, useMemo | 이미 사용 중 |
| Next.js | 16.2.1 | dynamic import wrapper | PriceHistoryChartWrapper 패턴 확립됨 |

### No New Libraries Needed
이 phase는 새 라이브러리를 설치하지 않는다. 모든 기능은 Recharts 3.8의 기존 API로 구현 가능하다.

---

## Architecture Patterns

### Recommended File Change Map
```
src/
├── components/
│   ├── apt/
│   │   └── AptDetailClient.tsx        # 기간 state + 날짜 필터 + rentTrendLine/jeonseRatioLine 계산
│   └── charts/
│       ├── PriceHistoryChart.tsx       # props 확장: rentTrendLine, jeonseRatioLine, showJeonseRatio
│       ├── PriceHistoryChartWrapper.tsx # props 타입 추가 전달
│       └── JeonseRatioChart.tsx        # [삭제]
```

### Pattern 1: 기간 필터 (AptDetailClient)
**What:** `selectedPeriod` state로 "1m" | "3m" | "6m" | "1y" | "all" 관리. saleTxns/rentTxns를 날짜 컷오프로 필터링한 후 기존 정규화 파이프라인에 투입.
**When to use:** D-03 결정에 따라 AptDetailClient에서 필터링, 차트에 이미 필터된 데이터 전달.
**Example:**
```typescript
// AptDetailClient.tsx 추가
type PeriodKey = "1m" | "3m" | "6m" | "1y" | "all";
const PERIOD_MONTHS: Record<PeriodKey, number | null> = {
  "1m": 1, "3m": 3, "6m": 6, "1y": 12, "all": null,
};

const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>("all");

const periodCutoff = useMemo(() => {
  const months = PERIOD_MONTHS[selectedPeriod];
  if (!months) return null;
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}, [selectedPeriod]);

const filteredSaleTxns = useMemo(() => {
  if (!periodCutoff) return saleTxns;
  return saleTxns.filter((t) => t.trade_date >= periodCutoff);
}, [saleTxns, periodCutoff]);

const filteredRentTxns = useMemo(() => {
  if (!periodCutoff) return rentTxns;
  return rentTxns.filter((t) => t.trade_date >= periodCutoff);
}, [rentTxns, periodCutoff]);
```

**중요:** `recentMedian` 계산은 필터링된 데이터가 아닌 **전체 saleTxns** 기반으로 유지해야 한다. 기간 단축 시 중위가 기준이 왜곡되는 것을 방지.

### Pattern 2: 기간 탭 UI (AptDetailClient)
**What:** 면적 선택 칩과 동일한 패턴으로 수평 칩 렌더링. 현재 면적 칩은 overflow-x-auto 스크롤 컨테이너 안에 있음.
**Example:**
```tsx
// 기간 탭 UI — 면적 칩 컨테이너 위 또는 차트 헤더 안에 배치
const PERIOD_LABELS: Record<PeriodKey, string> = {
  "1m": "1개월", "3m": "3개월", "6m": "6개월", "1y": "1년", "all": "전체",
};

<div className="flex gap-1.5 mb-3">
  {(["1m", "3m", "6m", "1y", "all"] as PeriodKey[]).map((p) => (
    <button
      key={p}
      onClick={() => setSelectedPeriod(p)}
      className="rounded-full px-2.5 py-1 text-xs font-bold transition"
      style={
        selectedPeriod === p
          ? { background: "var(--color-brand-600)", color: "#fff" }
          : { background: "var(--color-surface-elevated)", color: "var(--color-text-secondary)" }
      }
    >
      {PERIOD_LABELS[p]}
    </button>
  ))}
</div>
```

### Pattern 3: rentTrendLine 계산 (AptDetailClient)
**What:** 기존 `trendLine` 계산 패턴을 전세 거래에 동일하게 적용.
**Example:**
```typescript
// AptDetailClient.tsx 추가
const rentTrendLine = useMemo(() => {
  if (!selectedSize) return [];
  const pureJeonse = filteredRentTxns.filter(
    (t) => t.size_sqm === selectedSize && t.monthly_rent === 0
  );
  // groupByMonth expects { trade_date, trade_price }
  const forGrouping = pureJeonse.map((r) => ({
    trade_date: r.trade_date,
    trade_price: r.deposit,
  }));
  const monthly = groupByMonth(forGrouping);
  return computeMovingMedian(monthly);
}, [filteredRentTxns, selectedSize]);
```

### Pattern 4: jeonseRatioLine 계산 (AptDetailClient)
**What:** JeonseRatioChart의 `ratioPoints` useMemo 로직을 AptDetailClient로 이식. 인터페이스 정의도 이동.
**Example:**
```typescript
// RatioPoint 인터페이스 정의 (PriceHistoryChart에서도 사용)
export interface RatioPoint {
  month: string;    // YYYY-MM — x축에서 "{month}-15" 형태로 매핑
  ratio: number;    // 전세가율 (%)
  isLowConfidence: boolean;
}

const jeonseRatioLine = useMemo((): RatioPoint[] => {
  if (!selectedSize) return [];
  const pureJeonse = filteredRentTxns.filter(
    (t) => t.size_sqm === selectedSize && t.rent_type === "전세" && t.monthly_rent === 0
  );
  const jeonseForGrouping = pureJeonse.map((r) => ({
    trade_date: r.trade_date,
    trade_price: r.deposit,
  }));
  const saleForGrouping = filteredSaleTxns
    .filter((t) => t.size_sqm === selectedSize)
    .map((t) => ({ trade_date: t.trade_date, trade_price: t.trade_price }));

  const rentByMonth = groupByMonth(jeonseForGrouping);
  const saleByMonth = groupByMonth(saleForGrouping);
  const rentMap = new Map(rentByMonth.map((r) => [r.month, r.prices]));
  const saleMap = new Map(saleByMonth.map((s) => [s.month, s.prices]));
  const commonMonths = [...rentMap.keys()].filter((m) => saleMap.has(m));

  return commonMonths
    .map((month) => {
      const rentPrices = rentMap.get(month)!;
      const salePrices = saleMap.get(month)!;
      const rentMedian = computeMedianPrice(rentPrices);
      const saleMedian = computeMedianPrice(salePrices);
      if (saleMedian === 0) return null;
      const ratio = Math.round((rentMedian / saleMedian) * 1000) / 10;
      const isLowConfidence = (rentPrices.length + salePrices.length) < 5;
      return { month, ratio, isLowConfidence };
    })
    .filter((p): p is RatioPoint => p !== null)
    .sort((a, b) => a.month.localeCompare(b.month));
}, [filteredRentTxns, filteredSaleTxns, selectedSize]);
```

### Pattern 5: PriceHistoryChart 듀얼 Y축 (Recharts 3.8)
**What:** ComposedChart에 두 번째 YAxis를 추가하고 각 Line에 `yAxisId`를 지정. Recharts 3.8에서 `yAxisId?: string | number` (기본 0), `orientation?: "left" | "right"` 확인됨.
**Example:**
```tsx
// PriceHistoryChart.tsx props 확장
interface PriceHistoryChartProps {
  normalDots: ChartTransaction[];
  directDealDots: ChartTransaction[];
  trendLine: TrendPoint[];           // 매매가 추이 (기존)
  rentTrendLine?: TrendPoint[];      // 전세가 추이 (신규)
  jeonseRatioLine?: RatioPoint[];   // 전세가율 (신규)
  showJeonseRatio?: boolean;         // 오버레이 토글 (신규)
  sizeUnit?: "sqm" | "pyeong";
}

// ComposedChart 내부
<YAxis yAxisId="left" /* 기존 YAxis */ domain={yDomain} orientation="left" />
{showJeonseRatio && (
  <YAxis
    yAxisId="right"
    orientation="right"
    domain={[0, 100]}
    tickFormatter={(v: number) => `${v}%`}
    tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }}
    axisLine={false}
    tickLine={false}
    width={40}
  />
)}

{/* 기존 Scatter와 Line에 yAxisId="left" 추가 */}
<Scatter data={normalDots} yAxisId="left" ... />
<Scatter data={directDealDots} yAxisId="left" ... />
<Line data={solidData} yAxisId="left" ... />
<Line data={dashedData} yAxisId="left" ... />

{/* 전세가 추이선 */}
{(rentTrendLine?.length ?? 0) >= 2 && (
  <Line
    data={solidRentData}
    yAxisId="left"
    type="monotone"
    dataKey="y"
    stroke="#3B82F6"
    strokeWidth={2}
    dot={false}
    connectNulls={false}
    isAnimationActive={false}
  />
)}

{/* 전세가율 오버레이 */}
{showJeonseRatio && (jeonseRatioLine?.length ?? 0) >= 2 && (
  <Line
    data={ratioChartData}
    yAxisId="right"
    type="monotone"
    dataKey="y"
    stroke="#F97316"
    strokeWidth={2}
    strokeDasharray="5 5"
    dot={false}
    connectNulls={false}
    isAnimationActive={false}
  />
)}
```

**중요:** 기존 YAxis는 반드시 `yAxisId="left"`를 명시해야 한다. `yAxisId` 기본값은 `0`(숫자)이고 새 축은 문자열 `"left"`/"right"`를 사용할 것이므로, 기존 Scatter/Line들도 전부 `yAxisId="left"`로 업데이트해야 일치한다. 또는 기존 축에 `yAxisId={0}`, 새 축에 `yAxisId="right"`를 써도 된다 — 중요한 것은 일치성.

### Pattern 6: jeonseRatioLine 데이터를 Line용 x값으로 매핑
**What:** `TrendPoint`의 x값은 `${month}-15`(날짜 문자열). `RatioPoint`도 동일 방식으로 x 매핑 필요.
**Example:**
```typescript
// PriceHistoryChart 내부 helper
function ratioLineData(ratioPoints: RatioPoint[]) {
  return ratioPoints.map((p) => ({
    x: `${p.month}-15`,
    y: p.ratio,
    month: p.month,
    isLowConfidence: p.isLowConfidence,
  }));
}
```

### Pattern 7: 범례(Legend) 렌더링
**What:** D-10 결정에 따라 범례 표시 필요. Recharts `<Legend>` 컴포넌트를 쓰거나, 커스텀 인라인 범례(색상 원 + 텍스트)를 차트 상단 헤더 영역에 렌더링하는 것이 모바일 레이아웃에 더 적합하다.
**Recommendation:** 커스텀 인라인 범례를 차트 div의 `h2` 옆에 배치 (헤더 row에 flex 정렬). Recharts `<Legend>` 는 차트 높이를 차지하므로 모바일에서 불리함.
**Example:**
```tsx
// 차트 헤더 영역
<div className="flex items-center justify-between mb-4">
  <h2 className="font-bold t-text">가격 추이</h2>
  <div className="flex items-center gap-3 text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
    <span className="flex items-center gap-1">
      <span className="inline-block w-3 h-0.5 bg-[#059669]" />매매 추이
    </span>
    {(rentTrendLine?.length ?? 0) >= 2 && (
      <span className="flex items-center gap-1">
        <span className="inline-block w-3 h-0.5 bg-[#3B82F6]" />전세 추이
      </span>
    )}
  </div>
</div>
```

### Pattern 8: 전세가율 토글 체크박스 (AptDetailClient)
**What:** 저층 포함 토글과 동일한 패턴으로 AptDetailClient의 차트 하단 annotation 영역에 배치. 상태는 AptDetailClient에 두고 PriceHistoryChart에 prop으로 전달.
**Example:**
```tsx
const [showJeonseRatio, setShowJeonseRatio] = useState(false); // D-12: 기본 OFF

// 차트 하단 annotation 영역
<div className="mt-2 flex items-center justify-between">
  <p className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
    ...
  </p>
  <div className="flex items-center gap-3">
    <label className="flex items-center gap-1.5 cursor-pointer">
      <span className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>전세가율 표시</span>
      <input
        type="checkbox"
        checked={showJeonseRatio}
        onChange={(e) => setShowJeonseRatio(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-gray-300 accent-brand-600"
      />
    </label>
    <label className="flex items-center gap-1.5 cursor-pointer">
      <span className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>저층 원가 보기</span>
      <input ... />
    </label>
  </div>
</div>
```

### Anti-Patterns to Avoid
- **yAxisId 불일치:** 새 YAxis 추가 후 기존 Scatter/Line에 yAxisId를 추가하지 않으면 Recharts가 첫 번째 YAxis(id=0)에 모두 바인딩하려 하다가 스케일 오류 발생.
- **전체 saleTxns로 필터 후 재계산 실수:** `recentMedian`은 필터링 전 전체 데이터 기반으로 유지해야 함 — 기간 단축 시 중위가 기준이 이상해지는 문제 방지.
- **JeonseRatioChart 삭제 전 컴파일 오류:** AptDetailClient에서 import를 제거하고 파일을 삭제해야 하는 순서를 지켜야 함. 파일 삭제 먼저 → import 에러.
- **x축 날짜 범위 불일치:** 기간 필터 후 trendLine/rentTrendLine의 x값은 자동으로 필터된 범위에 맞게 줄어들지만, jeonseRatioLine의 month도 동일 filteredSaleTxns/filteredRentTxns 기반으로 계산해야 x축에서 범위 밖 데이터가 렌더링되지 않음.
- **PriceHistoryChartWrapper 누락 업데이트:** Wrapper가 단순 passthrough이지만 새 props 타입을 선언하지 않으면 TypeScript 빌드 실패.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 듀얼 Y축 스케일 계산 | 수동 y좌표 변환 | `<YAxis yAxisId="right" orientation="right">` | Recharts 3.8에 `yAxisId` + `orientation` props 확인됨 |
| 전세가율 계산 로직 | 새 유틸리티 | JeonseRatioChart.tsx의 useMemo 로직 직접 이식 | 이미 검증된 코드, 재사용 |
| 3개월 이동중위가 | 새 함수 | `computeMovingMedian` (price-normalization.ts) | 기존 export 함수 |
| 월별 그룹화 | 새 함수 | `groupByMonth` (price-normalization.ts) | 기존 export 함수 |
| 기간 필터 날짜 비교 | 라이브러리 | ISO 날짜 문자열 직접 비교 (`"YYYY-MM-DD" >= cutoff`) | trade_date가 이미 ISO 문자열 |

**Key insight:** 이 phase에서 새로 만들어야 할 로직은 거의 없다. 모든 데이터 변환 함수가 이미 존재하며, Recharts의 built-in 듀얼 축 기능만 활성화하면 된다.

---

## Common Pitfalls

### Pitfall 1: Recharts 3.x에서 yAxisId 지정 방식 변경
**What goes wrong:** 기존 Scatter/Line에 `yAxisId` 명시 없이 새 YAxis를 추가하면, Recharts가 default yAxisId(0)로 바인딩하려다 id 불일치로 렌더링 실패 또는 잘못된 스케일 적용.
**Why it happens:** Recharts는 각 데이터 컴포넌트의 `yAxisId`와 `<YAxis yAxisId>`를 매칭하는데, 기존 코드에 `yAxisId` prop이 없으므로 기본값 0이 사용됨. 새 YAxis 추가 시 두 YAxis가 존재하면 Recharts는 yAxisId 매핑을 강제.
**How to avoid:** 기존 모든 `<Scatter>`, `<Line>`, `<Customized>`에 `yAxisId="left"` (또는 `yAxisId={0}`)를 추가하고, 기존 `<YAxis>`에도 동일 값 지정.
**Warning signs:** 차트가 빈 화면이거나 모든 점이 y=0에 몰리는 현상.

### Pitfall 2: DirectDealConnectors의 yAxisMap 참조
**What goes wrong:** `<Customized>` 컴포넌트의 `yAxisMap` prop이 single-axis 환경을 가정하고 `yAxisMap[0]`으로 접근 중. 듀얼 축 추가 후에도 매매가 점은 left axis이므로 `yAxisMap[0]` 또는 `yAxisMap["left"]`로 접근해야 함.
**Why it happens:** yAxisId를 숫자 0으로 쓰면 `yAxisMap[0]`으로 유지. 문자열 "left"로 바꾸면 `yAxisMap["left"]`로 변경 필요.
**How to avoid:** yAxisId 값을 숫자 `0`으로 유지하면 기존 ConnectorProps 코드 변경 불필요.

### Pitfall 3: 기간 필터가 recentMedian 계산에 영향
**What goes wrong:** `filteredSaleTxns`를 `recentMedian` 계산에도 사용하면 1개월 선택 시 데이터가 너무 적어 중위가가 0이 되고, filterTransactions의 이상거래 필터가 비활성화됨.
**Why it happens:** `recentMedian`은 "최근 6개월 동일 면적 중위가"로 이상거래 필터 기준점. 기간 필터와 독립적으로 항상 전체 saleTxns 기반으로 계산해야 함.
**How to avoid:** `recentMedian` useMemo는 `saleTxns`(원본)를 참조 유지. `filteredSaleTxns`는 차트 및 추이선 계산에만 사용.

### Pitfall 4: 전세가율 오버레이 토글 OFF 시 우측 Y축 공간
**What goes wrong:** `showJeonseRatio=false`일 때도 우측 Y축이 공간을 차지하면 차트 영역이 좁아짐.
**Why it happens:** YAxis를 조건부 렌더링(`{showJeonseRatio && <YAxis ...>}`)하지 않고 항상 렌더링하면 발생.
**How to avoid:** `showJeonseRatio` 값에 따라 오른쪽 YAxis와 오버레이 Line을 함께 조건부 렌더링.

### Pitfall 5: jeonseRatioLine x값과 chart x축 매핑
**What goes wrong:** 매매/전세 추이선의 x값은 `${month}-15`(날짜 문자열)인데, jeonseRatioLine도 동일 형식으로 변환하지 않으면 x축에서 포지션을 못 잡고 연결선이 깨짐.
**Why it happens:** XAxis `dataKey="trade_date"` type="category"를 쓰는 ComposedChart에서 각 데이터 배열의 x값이 같은 category pool에서 매핑됨. jeonseRatioLine의 x를 `month` 그대로 쓰면 `"YYYY-MM"` vs `"YYYY-MM-15"` 불일치.
**How to avoid:** `ratioLineData` helper에서 `x: \`${p.month}-15\`` 변환 적용.

---

## Code Examples

Verified patterns from existing codebase:

### 현재 PriceHistoryChart props 인터페이스 (확장 전)
```typescript
// src/components/charts/PriceHistoryChart.tsx:35-40
interface PriceHistoryChartProps {
  normalDots: ChartTransaction[];
  directDealDots: ChartTransaction[];
  trendLine: TrendPoint[];
  sizeUnit?: "sqm" | "pyeong";
}
```

### 현재 AptDetailClient 매매가 추이선 계산 패턴
```typescript
// src/components/apt/AptDetailClient.tsx:189-193
const trendLine = useMemo(() => {
  const monthly = groupByMonth(normal);
  return computeMovingMedian(monthly);
}, [normal]);
```

### JeonseRatioChart 전세가율 계산 (이식 소스)
```typescript
// src/components/charts/JeonseRatioChart.tsx:22-59
const ratioPoints = useMemo(() => {
  const pureJeonse = rentTxns.filter(
    (r) => r.rent_type === "전세" && r.monthly_rent === 0
  );
  // ... groupByMonth, computeMedianPrice, Math.round((rentMedian / saleMedian) * 1000) / 10
}, [saleTxns, rentTxns]);
```

### Recharts 3.8 YAxis type signature (검증됨)
```typescript
// node_modules/recharts/types/cartesian/YAxis.d.ts
yAxisId?: string | number;   // default: 0
orientation?: YAxisOrientation;  // "left" | "right", default: "left"
```

### Recharts 3.8 Line yAxisId (검증됨)
```typescript
// node_modules/recharts/types/cartesian/Line.d.ts:175
yAxisId?: AxisId;  // AxisId = string | number
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JeonseRatioChart 독립 컴포넌트 | PriceHistoryChart 오버레이 통합 | Phase 13 (D-16) | 컴포넌트 1개 삭제, 차트 섹션 간소화 |
| 기간 제한 없는 전체 데이터 표시 | 기간 탭으로 뷰 슬라이싱 | Phase 13 (D-01~D-05) | 단기 추이 분석 가능 |

---

## Open Questions

1. **매매가 추이선 색상 충돌 (Claude's Discretion)**
   - What we know: CONTEXT.md D-08에서 "매매가 파란색"이라 했으나 현재 코드의 매매가 추이선은 `#059669`(초록).
   - What's unclear: 매매가를 파란색으로 변경하고 전세가를 초록으로 할지, 아니면 매매가를 초록 유지하고 전세가를 파란색으로 할지.
   - Recommendation: 매매가는 기존 `#059669`(초록) 유지 (거래 dot과 색상 일치), 전세가 추이선은 `#3B82F6`(파란색)으로 사용. 이미 JeonseRatioChart에서 `#3B82F6`을 전세가율에 사용 중이었으므로 관례 연장.

2. **기간 탭 배치 (Claude's Discretion)**
   - What we know: 면적 선택 칩과 별도 배치해야 한다. 면적 칩은 별도 카드에 있고 차트는 그 아래에 있음.
   - Recommendation: 기간 탭을 PriceHistoryChart 내부 헤더 영역(h2 아래, 차트 위)에 배치. 이 경우 PriceHistoryChart가 selectedPeriod/setSelectedPeriod를 prop으로 받는 방식이 되는데, 이는 D-03(AptDetailClient에서 필터링)과 상충됨. 따라서 **기간 탭 UI는 AptDetailClient에 두고 차트 섹션 바로 위에 렌더링**하는 것이 더 깔끔.

3. **1개월 선택 시 데이터 부족**
   - What we know: 거래 빈도에 따라 1개월 내 거래가 0~2건일 수 있음.
   - What's unclear: 이 경우 차트를 숨길지, 빈 차트를 보여줄지.
   - Recommendation: 기존 패턴(`allDots.length < 2 && trendLine.length < 2 → return null`) 유지. 기간 탭 선택으로 데이터가 없어지면 차트 자체가 null 반환.

---

## Environment Availability

Step 2.6: SKIPPED — 이 phase는 외부 도구/서비스 의존성이 없는 순수 프론트엔드 컴포넌트 변경이다.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | 없음 (테스트 인프라 Out of Scope, REQUIREMENTS.md) |
| Config file | none |
| Quick run command | `npx tsc --noEmit` (TypeScript 타입 검사) |
| Full suite command | `npx next build` (빌드 성공 여부) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHART-01 | 기간 탭 5개 존재, 선택 시 차트 데이터 변경 | manual | `npx tsc --noEmit` (타입 확인) | ❌ Wave 0 불필요 (테스트 인프라 없음) |
| CHART-02 | 매매 + 전세 추이선 동시 표시 | manual | `npx next build` | ❌ Wave 0 불필요 |
| CHART-03 | 전세가율 체크박스 토글, 우측 Y축 표시 | manual | `npx next build` | ❌ Wave 0 불필요 |

### Sampling Rate
- **Per task commit:** `npx tsc --noEmit` — 타입 에러 즉시 확인
- **Per wave merge:** `npx next build` — 빌드 성공 확인
- **Phase gate:** 빌드 성공 + 브라우저 수동 확인 before `/gsd:verify-work`

### Wave 0 Gaps
없음 — 프로젝트에 테스트 인프라가 없으며 이는 Out of Scope로 확정됨.

---

## Sources

### Primary (HIGH confidence)
- `node_modules/recharts/types/cartesian/YAxis.d.ts` — yAxisId, orientation prop 타입 직접 확인 (v3.8.0)
- `node_modules/recharts/types/cartesian/Line.d.ts:175` — Line yAxisId prop 확인
- `src/components/charts/PriceHistoryChart.tsx` — 현재 구현 패턴 직접 분석
- `src/components/charts/JeonseRatioChart.tsx` — 전세가율 계산 로직 직접 분석
- `src/components/apt/AptDetailClient.tsx` — 면적 칩 패턴, 데이터 흐름 직접 분석
- `src/lib/price-normalization.ts` — 재사용 가능 함수 직접 확인

### Secondary (MEDIUM confidence)
- `package.json` — recharts@^3.8.0, next@16.2.1, react@19.2.4 버전 확인

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 설치된 버전과 타입 정의 직접 확인
- Architecture: HIGH — 기존 코드 패턴 직접 분석, Recharts API 타입 검증
- Pitfalls: HIGH — 실제 코드에서 잠재적 충돌 지점 직접 식별

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (Recharts 3.x는 stable, 변경 위험 낮음)
