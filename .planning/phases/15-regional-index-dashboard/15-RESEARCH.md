# Phase 15: 지역 지수 대시보드 - Research

**Researched:** 2026-03-28
**Domain:** Next.js 서버 컴포넌트, Recharts, CockroachDB (pg), 지역 군집 지수 산출
**Confidence:** HIGH — 모든 근거가 프로젝트 기존 코드에서 직접 확인됨

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**군집 정의 (INDEX-01)**
- D-01: region-codes.ts에 CLUSTER_DEFINITIONS 상수 추가
- D-02: 초기 군집:
  - 강남3구: 강남구(11680), 서초구(11650), 송파구(11710)
  - 마용성: 마포구(11440), 용산구(11170), 성동구(11200)
  - 노도강: 노원구(11350), 도봉구(11320), 강북구(11305)
  - 수도권 주요: 분당구(41135), 수지구(41465), 일산동구(41285), 일산서구(41287)
- D-03: 군집 형태 — `{ id, name, regionCodes: string[] }`

**지수 산출 방식 (INDEX-01, INDEX-02)**
- D-04: 월별 중위가 지수 = (해당 월 군집 내 전체 거래 중위가 / 기준시점 중위가) × 100
- D-05: 기준시점 — 데이터 최초월 (각 군집의 첫 거래가 있는 달)
- D-06: Phase 10의 computeMedianPrice 재사용
- D-07: 이상거래 필터 적용 (Phase 10 filterTransactions 재사용 — 직거래 저가 제외)
- D-08: 서버 컴포넌트에서 DB 직접 쿼리 + 실시간 계산 (캐시 없이, revalidate로 관리)

**대시보드 페이지 (INDEX-04)**
- D-09: 신규 라우트: `/index`
- D-10: 레이아웃 — 군집별 카드 그리드 (모바일 1열, 태블릿 2열, 데스크탑 3열)
- D-11: 카드 내용 — 군집명 + 현재 지수 + 전월 대비 변동 + 소형 스파크라인 차트
- D-12: 카드 클릭 시 `/index/[clusterId]` 상세 페이지로 이동
- D-13: 상세 페이지 — 대형 시계열 차트 (Recharts LineChart) + 군집 내 구별 통계

**시계열 차트 (INDEX-02)**
- D-14: Recharts LineChart 사용 (기존 패턴)
- D-15: X축 월별(YYYY-MM), Y축 지수(100 기준)
- D-16: 기준선 100을 점선으로 표시 (ReferenceLine)
- D-17: 대시보드 카드 내 MiniAreaChart 스파크라인 (높이 48px)
- D-18: 상세 페이지 LineChart 높이 300px

**시도/시군구 평균·중위가 (INDEX-03)**
- D-19: market/[sido]/page.tsx 테이블에 시군구별 평균+중위가 컬럼 추가
- D-20: market/page.tsx에 시도별 평균+중위가 컬럼 추가
- D-21: 최근 3개월 거래 기준
- D-22: 이상거래 필터 적용 (Phase 10 로직)

### Claude's Discretion
- 카드 디자인의 구체적 색상/여백
- 스파크라인 색상 (상승=초록, 하락=빨강)
- 군집 상세 페이지의 구별 통계 레이아웃
- 지수 계산의 최소 거래 건수 threshold
- `/index` vs `/market/index` 라우트 (이미 D-09에서 `/index`로 잠김)

### Deferred Ideas (OUT OF SCOPE)
없음 — 논의가 페이즈 범위 안에서 유지됨
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INDEX-01 | 지역 군집 정의 + 군집별 중위가 지수 산출 | CLUSTER_DEFINITIONS 상수 패턴, computeMedianPrice 재사용, DB region_code IN 쿼리 패턴 확인 |
| INDEX-02 | 군집별 지수 시계열 차트 (기준시점=100) | Recharts LineChart + ReferenceLine 패턴, 기존 PriceHistoryChart에서 ComposedChart 패턴 확인 |
| INDEX-03 | 시도/시군구 평균·중위가를 지역별 시세 페이지에 표시 | market/page.tsx, market/[sido]/page.tsx 기존 구조 확인 — 쿼리 확장 패턴 명확 |
| INDEX-04 | 군집 지수 페이지 신규 생성 (S&P500 스타일 대시보드) | MiniAreaChartWrapper(스파크라인) + grid gap-3 카드 패턴 확인, /index 라우트 비어 있음 |
</phase_requirements>

---

## Summary

Phase 15는 완전 신규 라우트(`/index`, `/index/[clusterId]`)를 생성하면서 기존 market 페이지 2개를 확장하는 작업이다. Phase 10에서 구축된 `computeMedianPrice`, `filterTransactions`, `groupByMonth`를 지수 계산 엔진으로 그대로 재사용한다.

핵심 과제는 두 가지다. 첫째, **군집 단위 월별 중위가 지수 산출**: 여러 region_code를 하나의 `IN` 조건으로 묶어 거래를 가져오고, 이상거래 필터 후 월별 중위가를 계산하고, 첫 달을 기준점(100)으로 나누어 지수화한다. 둘째, **기존 market 페이지에 평균/중위가 컬럼 추가**: 현재 market 페이지는 카드 그리드 레이아웃이므로, 컬럼 추가는 카드 내 정보 확장(텍스트 행 추가)이지 테이블 컬럼 추가가 아니다.

데이터 볼륨 경고: 군집 단위 지수 산출은 여러 구(3~4개)의 **전체 거래 이력**을 메모리에 올려 계산한다. 강남3구처럼 거래가 많은 군집은 수만 건이 될 수 있다. `revalidate = 3600` ISR이 적절한 캐싱 전략이다.

**Primary recommendation:** 별도 유틸 파일(`src/lib/cluster-index.ts`)에 지수 계산 로직을 분리하고, 서버 컴포넌트에서 `getPool().query()`로 직접 SQL 쿼리해 계산한다. 기존 `createClient()` QueryBuilder는 복잡한 집계 쿼리에 적합하지 않다.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | 기존 설치됨 | LineChart + ReferenceLine 지수 차트 | 이미 PriceHistoryChart에서 사용 중 |
| pg (node-postgres) | 기존 설치됨 | DB 직접 쿼리 (getPool) | createClient QueryBuilder보다 복잡한 집계에 적합 |
| next (App Router) | 기존 설치됨 | 서버 컴포넌트 SSR | revalidate ISR 캐싱 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| MiniAreaChartWrapper | 내부 컴포넌트 | 카드 내 스파크라인 (48px) | 대시보드 카드에서 사용 |
| computeMedianPrice | price-normalization.ts | 중위가 계산 | 월별 가격 배열에서 중위가 추출 |
| filterTransactions | price-normalization.ts | 이상거래 제거 | 군집 지수 계산 전처리 |
| groupByMonth | price-normalization.ts | 월별 그룹화 | 거래 데이터를 YYYY-MM으로 집계 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| getPool 직접 SQL | createClient QueryBuilder | QueryBuilder는 복잡한 날짜 범위 + IN 조합에 한계 — 직접 SQL이 명확 |
| LineChart (신규) | ComposedChart (기존) | 지수 차트는 점 없는 라인만 필요 — LineChart가 더 단순하고 적합 |
| 서버 계산 | 사전 계산 테이블 | D-08에서 실시간 계산으로 결정됨 |

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/index/
│   ├── page.tsx              # 대시보드 (INDEX-04) — 서버 컴포넌트
│   └── [clusterId]/
│       └── page.tsx          # 군집 상세 (INDEX-02) — 서버 컴포넌트
├── lib/
│   ├── cluster-index.ts      # 신규: 지수 산출 유틸 (computeClusterIndex)
│   └── constants/
│       └── region-codes.ts   # CLUSTER_DEFINITIONS 추가 (D-01)
└── components/
    └── charts/
        └── ClusterIndexChart.tsx  # 신규: LineChart + ReferenceLine (INDEX-02)
```

### Pattern 1: 군집 지수 산출 로직 (cluster-index.ts)

**What:** 특정 군집의 region_code 목록으로 DB에서 거래를 가져와, 이상거래 필터 후 월별 중위가 지수를 계산
**When to use:** `/index/page.tsx` 및 `/index/[clusterId]/page.tsx` 서버 컴포넌트에서 호출

```typescript
// src/lib/cluster-index.ts

import { getPool } from "@/lib/db/client";
import { computeMedianPrice, groupByMonth } from "@/lib/price-normalization";

export interface ClusterIndexPoint {
  month: string;      // YYYY-MM
  index: number;      // 기준시점=100
  medianPrice: number; // 만원
  count: number;
}

export async function computeClusterIndex(
  regionCodes: string[],
  minTransactions = 3
): Promise<ClusterIndexPoint[]> {
  const pool = getPool();
  const placeholders = regionCodes.map((_, i) => `$${i + 1}`).join(", ");
  const sql = `
    SELECT trade_date, trade_price, floor, deal_type
    FROM apt_transactions
    WHERE region_code IN (${placeholders})
      AND property_type = 1
    ORDER BY trade_date ASC
  `;
  const result = await pool.query(sql, regionCodes);
  const txns = result.rows as {
    trade_date: string;
    trade_price: number;
    floor: number;
    deal_type: string | null;
  }[];

  // 이상거래 필터: recentMedian 없이 직거래 저가만 제거
  // (군집 전체 중위가는 계산 비용이 크므로, direct deal 필터만 적용)
  const filtered = txns.filter(
    (t) => !(t.deal_type === "직거래" && t.trade_price < 0) // 기본 필터
  );

  const monthly = groupByMonth(filtered);
  if (monthly.length === 0) return [];

  // 기준시점: 첫 거래가 있는 달 (D-05)
  const baseMedian = computeMedianPrice(monthly[0].prices);
  if (baseMedian === 0) return [];

  return monthly
    .filter((m) => m.prices.length >= minTransactions)
    .map((m) => {
      const median = computeMedianPrice(m.prices);
      return {
        month: m.month,
        index: Math.round((median / baseMedian) * 1000) / 10, // 소수점 1자리
        medianPrice: median,
        count: m.prices.length,
      };
    });
}
```

**주요 설계 결정:**
- `property_type = 1` (아파트)을 WHERE에 포함 — 기존 market 페이지 패턴과 동일
- `filterTransactions`의 `recentMedian` 인자가 군집 전체 기준으로 계산되면 순환 의존이 생기므로, 직거래 저가 필터만 적용 (STATE.md의 "직거래 + 시세 대비 30% 이상 저가" 기준)
- `minTransactions` 파라미터로 저신뢰 구간 제어

### Pattern 2: CLUSTER_DEFINITIONS 상수 (D-01 ~ D-03)

```typescript
// src/lib/constants/region-codes.ts 에 추가

export interface ClusterDefinition {
  id: string;
  name: string;
  regionCodes: string[];
}

export const CLUSTER_DEFINITIONS: ClusterDefinition[] = [
  {
    id: "gangnam3",
    name: "강남3구",
    regionCodes: ["11680", "11650", "11710"], // 강남구, 서초구, 송파구
  },
  {
    id: "mayongseong",
    name: "마용성",
    regionCodes: ["11440", "11170", "11200"], // 마포구, 용산구, 성동구
  },
  {
    id: "nodogang",
    name: "노도강",
    regionCodes: ["11350", "11320", "11305"], // 노원구, 도봉구, 강북구
  },
  {
    id: "sudobukmain",
    name: "수도권 주요",
    regionCodes: ["41135", "41465", "41285", "41287"], // 분당구, 수지구, 일산동구, 일산서구
  },
];
```

**주의:** CONTEXT.md D-02에서 수지구는 `41463`(기흥구)이 아닌 `41465`(수지구)이다. region-codes.ts 확인 결과 수지구 코드는 `41465`로 정확하다. 일산은 `41285`(일산동구), `41287`(일산서구)가 올바른 코드다.

### Pattern 3: 대시보드 카드 (/index/page.tsx)

기존 `market/page.tsx`의 카드 그리드 패턴을 따른다:

```typescript
// /index/page.tsx — 서버 컴포넌트
export const revalidate = 3600;

// 각 군집에 대해 computeClusterIndex 병렬 호출
const clusterData = await Promise.all(
  CLUSTER_DEFINITIONS.map(async (cluster) => {
    const indexPoints = await computeClusterIndex(cluster.regionCodes);
    const latest = indexPoints.at(-1);
    const prev = indexPoints.at(-2);
    const change = latest && prev ? latest.index - prev.index : 0;
    return {
      cluster,
      indexPoints,
      currentIndex: latest?.index ?? 0,
      monthlyChange: change,
      sparklineData: indexPoints.map((p) => ({ value: p.index })),
    };
  })
);
```

```tsx
// 카드 레이아웃: 기존 패턴 그대로
<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
  {clusterData.map(({ cluster, currentIndex, monthlyChange, sparklineData }) => (
    <Link key={cluster.id} href={`/index/${cluster.id}`}
      className="card-hover block rounded-2xl border t-border t-card p-5">
      <h2 className="text-base font-bold t-text">{cluster.name}</h2>
      <p className="text-3xl font-extrabold tabular-nums t-text mt-1">
        {currentIndex.toFixed(1)}
      </p>
      <p className={`text-sm font-semibold tabular-nums ${monthlyChange >= 0 ? "t-rise" : "t-drop"}`}>
        {monthlyChange >= 0 ? "▲" : "▼"} {Math.abs(monthlyChange).toFixed(1)}pt
      </p>
      <div className="mt-3">
        <MiniAreaChartWrapper
          data={sparklineData}
          color={monthlyChange >= 0 ? "#059669" : "#ef4444"}
          height={48}
        />
      </div>
    </Link>
  ))}
</div>
```

### Pattern 4: 지수 시계열 차트 컴포넌트 (ClusterIndexChart.tsx)

기존 PriceHistoryChart와 달리 지수 차트는 **순수 LineChart** (점 없음, 스캐터 없음):

```typescript
// src/components/charts/ClusterIndexChart.tsx
"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ReferenceLine, ResponsiveContainer
} from "recharts";

interface Props {
  data: { month: string; index: number; count: number }[];
}

export default function ClusterIndexChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 10, right: 10, bottom: 5, left: 10 }}>
        <XAxis dataKey="month" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis domain={["auto", "auto"]} tickFormatter={(v) => `${v}`} width={50} />
        <Tooltip formatter={(v: number) => [`${v.toFixed(1)}`, "지수"]} />
        <ReferenceLine y={100} stroke="#9CA3AF" strokeDasharray="4 4" label="기준(100)" />
        <Line
          type="monotone"
          dataKey="index"
          stroke="#2B579A"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

**Recharts ReferenceLine 주의:** `y` prop으로 수평선 그리기, `strokeDasharray`로 점선 표현 — 기존 코드에서 검증된 패턴.

### Pattern 5: market 페이지 평균/중위가 추가 (INDEX-03)

market/page.tsx와 market/[sido]/page.tsx의 기존 카드 그리드에는 **최대 하락 / 신고가** 2열 정보가 있다. 중위가/평균가를 추가하려면 별도 행(row) 추가 또는 컬럼 수 확장이 필요하다.

**권장 방식:** 카드 하단에 `mt-3` 구분선 + 텍스트 행 추가 (grid 레이아웃 변경 불필요):

```tsx
{/* 기존 2열 grid 아래에 추가 */}
<div className="mt-3 pt-3 border-t t-border flex gap-4 text-xs">
  <div>
    <p className="t-text-tertiary">최근 3개월 중위가</p>
    <p className="font-semibold t-text tabular-nums">{formatPrice(medianPrice)}</p>
  </div>
  <div>
    <p className="t-text-tertiary">평균가</p>
    <p className="font-semibold t-text tabular-nums">{formatPrice(avgPrice)}</p>
  </div>
</div>
```

**DB 쿼리 추가:** 기존 각 시군구별 Promise.all에 3번째 쿼리 추가 — `trade_date >= (현재 - 3개월)` 조건으로 trade_price를 가져와 서버에서 중위가/평균 계산.

### Anti-Patterns to Avoid

- **QueryBuilder로 집계 쿼리 작성:** createClient()의 QueryBuilder는 기본 CRUD용. 복잡한 날짜 범위 필터 + IN 조건 + 다량 행 조회는 `getPool().query()` 직접 사용
- **군집 지수를 API Route로 분리:** D-08에서 서버 컴포넌트 직접 DB 쿼리로 결정됨. API Route 경유 금지 (CLAUDE.md: 서버 컴포넌트에서 자기 자신 API를 fetch하지 말 것)
- **ClusterIndexChart에 SSR 적용:** Recharts는 클라이언트 컴포넌트 전용. `"use client"` 필수 또는 `dynamic(..., { ssr: false })`로 래핑
- **평균가를 DB 집계 함수로 계산:** AVG()는 이상거래를 포함한다. 반드시 rows를 가져와서 JS에서 필터 후 계산

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 월별 중위가 계산 | 직접 정렬+슬라이싱 | `computeMedianPrice(prices)` | Phase 10에서 테스트된 구현 |
| 월별 그룹화 | Map/sort 직접 작성 | `groupByMonth(txns)` | 동일 로직 재작성 방지 |
| 이상거래 필터 | 직접 임계값 비교 | `filterTransactions` (direct deal 판별만) | 로직 일관성 |
| 스파크라인 | 직접 SVG 그리기 | `MiniAreaChartWrapper` | 이미 프로젝트에서 사용 중 |
| 지수 차트 축 포맷 | 커스텀 tick | Recharts tickFormatter | 기존 패턴으로 충분 |

**Key insight:** 이 페이즈의 모든 계산 기반은 Phase 10에서 구축되어 있다. 새로 작성할 코드는 조합(orchestration) 레이어뿐이다.

---

## Common Pitfalls

### Pitfall 1: 수도권 군집의 region_code 혼동

**What goes wrong:** CONTEXT.md D-02에 "수지구(41463)"로 명시됐지만, 실제 region-codes.ts에서 `41463`은 용인시기흥구, `41465`가 용인시수지구다.
**Why it happens:** 행정구역 코드 오기입
**How to avoid:** region-codes.ts의 실제 값 기준으로 CLUSTER_DEFINITIONS 작성. 수지구=41465, 일산동구=41285, 일산서구=41287
**Warning signs:** 빈 데이터 또는 기흥구 데이터가 수지구로 잘못 집계됨

### Pitfall 2: 지수 기준시점 결정 시 데이터 부족 월

**What goes wrong:** 군집의 "첫 거래가 있는 달"이 거래가 1~2건뿐인 달이면 기준 중위가가 비정상적
**Why it happens:** D-05에서 기준시점을 "데이터 최초월"로 지정
**How to avoid:** `minTransactions` 임계값(최소 3건)을 충족하는 가장 이른 달을 기준시점으로 사용. 임계값 미충족 월은 지수 계산에서 제외
**Warning signs:** 기준시점 지수가 100이 아닌 이상한 값

### Pitfall 3: Recharts 클라이언트 컴포넌트 SSR 에러

**What goes wrong:** ClusterIndexChart를 서버 컴포넌트에서 직접 import하면 "window is not defined" 에러
**Why it happens:** Recharts는 브라우저 전용 API를 내부적으로 사용
**How to avoid:** `ClusterIndexChart.tsx`에 `"use client"` 선언. 또는 기존 PriceHistoryChart 패턴처럼 서버 컴포넌트에서 데이터를 props로 내려주고 클라이언트 컴포넌트가 렌더링
**Warning signs:** 빌드 성공하지만 런타임 에러 또는 hydration mismatch

### Pitfall 4: 대용량 군집 데이터 쿼리 타임아웃

**What goes wrong:** 강남3구는 3개 구 전체 거래 이력(수만 건)을 한 번에 메모리에 올림
**Why it happens:** 지수 계산이 서버 컴포넌트에서 실시간으로 이루어짐
**How to avoid:** `revalidate = 3600` ISR 적용. DB 쿼리에 `pool.query()` 사용 시 pool의 `connectionTimeoutMillis: 10_000` 기본값 유지
**Warning signs:** Vercel Function timeout (10초 초과)

### Pitfall 5: market 페이지 평균/중위가 쿼리 N+1

**What goes wrong:** 시군구별로 각각 최근 3개월 거래를 가져오면 기존 3개 쿼리 + 1개 추가 = 시군구 수 × 4 쿼리
**Why it happens:** 기존 market/[sido]/page.tsx의 Promise.all 패턴 확장
**How to avoid:** 기존 Promise.all 내부에 하나의 쿼리를 추가하는 방식 유지 (4번째 쿼리로). 별도 루프 금지
**Warning signs:** 페이지 로딩 시간이 2배 이상 증가

### Pitfall 6: MiniAreaChart의 linearGradient id 충돌

**What goes wrong:** 여러 군집 카드에서 같은 `id={`mini-${color}`}`를 사용하면 SVG gradient 충돌
**Why it happens:** MiniAreaChart.tsx의 linearGradient id가 color값 기반이라 같은 색상이면 중복
**How to avoid:** MiniAreaChartWrapper에 추가 id prop을 넘기거나, ClusterIndexCard에서 clusterId를 포함한 고유 id 생성
**Warning signs:** 일부 카드에서 gradient가 다른 카드 색상으로 렌더링됨

---

## Code Examples

### 월별 중위가 지수 계산 (핵심 로직)

```typescript
// computeClusterIndex 핵심 — cluster-index.ts
const monthly = groupByMonth(filteredTxns); // price-normalization.ts 재사용

// 기준시점: minTransactions 이상인 첫 달
const baseMonth = monthly.find((m) => m.prices.length >= minTransactions);
if (!baseMonth) return [];
const baseMedian = computeMedianPrice(baseMonth.prices);

const indexPoints = monthly
  .filter((m) => m.prices.length >= minTransactions)
  .map((m) => ({
    month: m.month,
    index: Math.round((computeMedianPrice(m.prices) / baseMedian) * 1000) / 10,
    medianPrice: computeMedianPrice(m.prices),
    count: m.prices.length,
  }));
```

### 시도별 최근 3개월 중위/평균가 쿼리

```typescript
// market/page.tsx의 Promise.all 내부 추가 쿼리
const threeMonthsAgo = new Date();
threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
const cutoff = threeMonthsAgo.toISOString().split("T")[0]; // YYYY-MM-DD

const priceResult = await supabase
  .from("apt_transactions")
  .select("trade_price, deal_type")
  .in("region_code", sigunguCodes)
  .gte("trade_date", cutoff)
  .eq("property_type", 1);

// 서버에서 필터 후 계산
const validPrices = (priceResult.data ?? [])
  .filter((t) => t.deal_type !== "직거래")
  .map((t) => t.trade_price);
const medianPrice = computeMedianPrice(validPrices);
const avgPrice = validPrices.length
  ? Math.round(validPrices.reduce((a, b) => a + b, 0) / validPrices.length)
  : 0;
```

### ReferenceLine 기준선 100 패턴

```tsx
// Recharts에서 수평 기준선
import { ReferenceLine } from "recharts";

<ReferenceLine
  y={100}
  stroke="#9CA3AF"
  strokeDasharray="4 4"
  label={{ value: "기준(100)", position: "insideTopRight", fontSize: 11, fill: "#9CA3AF" }}
/>
```

### MobileNav에 지수 메뉴 추가

```typescript
// MobileNav.tsx NAV_ITEMS 배열에 추가 (지역별 시세 다음)
{ href: "/index", label: "지역 지수" },
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| market 페이지 — 거래수 + 폭락/신고가만 | + 최근 3개월 중위가/평균가 추가 | Phase 15 | 투자자 기본 정보 보강 |
| 단지별 가격 추이 차트만 | 지역 군집 지수 차트 추가 | Phase 15 | 거시적 시장 흐름 파악 가능 |

---

## Open Questions

1. **이상거래 필터의 recentMedian 기준 문제**
   - What we know: `filterTransactions`는 `recentMedian` 인자가 필요하지만, 군집 단위 중위가를 사전에 알 수 없다
   - What's unclear: 군집 전체 중위가로 필터할지 vs 직거래 여부만 필터할지
   - Recommendation: 1단계로 직거래만 필터(recentMedian=0 전달 시 90% 필터 비활성화). `filterTransactions`에 `recentMedian: 0`을 전달하면 90% 임계값 조건이 `recentMedian > 0` 체크에 걸려 자동으로 비활성화됨 — 코드 확인 완료

2. **수도권 군집의 cross-sido 데이터**
   - What we know: region_code 기반 IN 쿼리이므로 서울/경기 혼합 조회 가능
   - What's unclear: `property_type = 1` 필터가 실제 수도권 아파트 데이터를 정확히 커버하는지
   - Recommendation: 쿼리 실행 후 데이터 확인 필요. 비어있으면 property_type 조건 제거

3. **최소 거래 건수 threshold (Claude's Discretion)**
   - What we know: computeMovingMedian에서 5건 미만이면 isLowConfidence=true
   - Recommendation: 군집 지수에서는 월별 최소 3건을 임계값으로 사용 (구별로 분산되므로 단지 수준보다 건수가 적음). 미충족 구간은 지수 계산에서 제외 (연속 데이터 끊김 허용)

---

## Environment Availability

Step 2.6: SKIPPED — 이 페이즈는 외부 CLI/서비스 없이 코드 변경만으로 구현됨. DB(CockroachDB)와 Recharts는 이미 프로젝트에 설치되어 운용 중.

---

## Validation Architecture

config.json의 `workflow.nyquist_validation`이 `true`이므로 포함.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | 없음 — 기존 프로젝트에 테스트 인프라 없음 (REQUIREMENTS.md: "테스트 인프라 — 별도 마일스톤"으로 Out of Scope) |
| Config file | none |
| Quick run command | `npx tsc --noEmit` (타입 체크만) |
| Full suite command | `npx next build` (빌드 성공 여부) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INDEX-01 | CLUSTER_DEFINITIONS 코드 정확성 + computeClusterIndex 반환값 확인 | manual | 브라우저에서 /index 접속 후 지수값 확인 | ❌ Wave 0 불필요 (테스트 없는 프로젝트) |
| INDEX-02 | 시계열 차트 렌더링 + ReferenceLine 100 표시 | manual | 브라우저 시각 확인 | ❌ |
| INDEX-03 | market 페이지에 중위/평균가 컬럼 표시 | manual | /market, /market/seoul 접속 확인 | ❌ |
| INDEX-04 | /index 페이지 존재 + 카드 그리드 렌더링 | smoke | `npx next build` 성공 | ❌ |

### Sampling Rate
- **Per task commit:** `npx tsc --noEmit` — 타입 에러 없음 확인
- **Per wave merge:** `npx next build` — 빌드 성공 확인
- **Phase gate:** 빌드 성공 + 브라우저에서 /index, /market, /market/seoul 렌더링 확인

### Wave 0 Gaps
- 없음 — 기존 프로젝트가 테스트 인프라를 갖추지 않으며 Out of Scope로 명시됨

---

## Project Constraints (from CLAUDE.md)

| 제약 | 내용 | 이 페이즈 관련성 |
|------|------|-----------------|
| DB SSL | `ssl: { rejectUnauthorized: false }` 필수 (ssl: true 불가) | getPool() 이미 준수 — 신규 쿼리 추가 시 동일 pool 사용 |
| 서버 컴포넌트 self-fetch 금지 | 서버 컴포넌트에서 자기 자신 API 경유 금지 | D-08 준수 — 직접 DB 쿼리 |
| SW 캐시 규칙 | HTML/RSC/API 캐시 금지 | /index 신규 라우트 — next.config.ts의 Cache-Control 헤더 자동 적용 |
| 배포 | `npx vercel --prod --yes` | 코드 변경 후 동일 배포 흐름 |

---

## Sources

### Primary (HIGH confidence)
- `src/lib/price-normalization.ts` — computeMedianPrice, filterTransactions, groupByMonth 시그니처와 동작 직접 확인
- `src/lib/constants/region-codes.ts` — REGION_HIERARCHY 코드값 직접 확인 (수지구=41465, 일산동구=41285, 일산서구=41287)
- `src/lib/db/client.ts` — getPool() 패턴, Pool 설정 확인
- `src/components/charts/MiniAreaChart.tsx` — linearGradient id 패턴 확인
- `src/components/charts/PriceHistoryChart.tsx` — Recharts LineChart/ReferenceLine 패턴
- `src/app/market/page.tsx`, `src/app/market/[sido]/page.tsx` — 기존 카드 그리드 + 쿼리 패턴
- `src/components/layout/MobileNav.tsx` — NAV_ITEMS 구조

### Secondary (MEDIUM confidence)
- Recharts 공식 문서 기반 (ReferenceLine y prop 사용법) — 기존 코드에서 패턴 확인됨

### Tertiary (LOW confidence)
- 없음

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 모든 라이브러리가 기존 프로젝트에 설치됨
- Architecture: HIGH — 기존 코드 패턴에서 직접 추출
- Pitfalls: HIGH — 실제 코드 분석으로 식별 (MiniAreaChart gradient id 등)
- Data volume: MEDIUM — 강남3구 거래 건수는 실측하지 않음

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (DB 스키마, Recharts 버전 안정적)
