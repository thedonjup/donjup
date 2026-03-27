# 아파트 가격 정규화 및 지수 산출 방법론

**Domain:** 아파트 실거래가 데이터 분석 / 가격 지수 산출
**Researched:** 2026-03-27
**Overall confidence:** MEDIUM
**Data schema:** `apt_transactions(id, apt_name, region_code, size_sqm, floor, trade_price, trade_date, deal_type, is_new_high, is_significant_drop, change_rate, highest_price)`

---

## 1. 층별 가격 보정 (Floor Price Normalization)

### 1.1 실거래 기반 층별 가격 패턴

국내 아파트 실거래가 분석 결과(복수 출처 종합):

| 층 구분 | 기준가(로열층) 대비 보정율 | 비고 |
|---------|--------------------------|------|
| 1층 | -13% (범위: -10 ~ -20%) | 보안·습기 우려 |
| 2층 | -10% | |
| 3~4층 | -3 ~ -4% | |
| 5층~(전체층수×1/3) | 기준점 접근 | 저층 할인 종료 |
| 로열층 (전체층수×2/3 이상) | 기준(0%) | 가격 기준점 |
| 최상층부 (고층 프리미엄) | +6 ~ +20% | 조망권 따라 차등 |
| 한강변 최상층 | +20 ~ +50%+ | 조망 프리미엄 극대화 |

**1층↔로열층 평균 가격 격차: 약 19%** (분양가 사례: 14~15%)

**주요 근거:**
- 은평 스카이뷰 자이 84A㎡: 3층 4억9,950만원 vs 33층 5억7,290만원 (격차 14.7%)
- 래미안 구의 파크스위트 84A㎡: 저층 6억600만원 vs 고층 6억9,400만원 (격차 14.5%)

**Confidence: MEDIUM** — 복수 언론/부동산 사이트 종합이나, 지역·단지별 편차 크고 공식 통계 없음

### 1.2 로열층 기준 정의

법적 정의 없음. 실무에서 통용되는 기준:

```
로열층 = floor >= ceil(total_floors * 2/3)
        AND floor <= total_floors - 2
저층    = floor <= ceil(total_floors * 1/4)   (최소 4층까지)
중층    = 그 사이
```

**한국부동산원 실거래가지수의 층 구분:**
- basement (지하), 1층(1st), 상층(upper) — 3단계만 구분
- 상층 내 세부 고/저층 구분 없음 (지수 산출 단순화 목적)

### 1.3 층별 보정계수 산출 방법

#### 방법 A: 경험적 고정 계수 (단순, 즉시 적용 가능)

```typescript
function floorAdjustmentFactor(floor: number, totalFloors: number): number {
  // totalFloors 없을 경우 절대 층수 기준 추정
  const relativePosition = totalFloors > 0
    ? floor / totalFloors
    : Math.min(floor / 20, 1.0); // 20층 기준 정규화 fallback

  if (floor === 1)                    return 0.87;  // -13%
  if (floor === 2)                    return 0.90;  // -10%
  if (floor <= 4)                     return 0.96;  // -4%
  if (relativePosition >= 0.67)       return 1.05;  // +5% (로열층 중간값)
  return 1.00;                                       // 중층 기준
}
```

**한계:** 단지 특성(조망, 한강, 향)을 반영하지 못함. 전국 평균 수준으로만 보정.

#### 방법 B: 데이터 기반 동적 보정 (돈줍 데이터로 구현 가능)

같은 단지(apt_name) + 같은 면적(size_sqm) 내 층별 실거래가를 회귀 분석:

```sql
-- 단지별 층-가격 상관관계 분석
SELECT
  apt_name,
  size_sqm,
  floor,
  AVG(trade_price) AS avg_price,
  COUNT(*) AS tx_count
FROM apt_transactions
WHERE trade_date >= NOW() - INTERVAL '3 years'
  AND deal_type != '직거래'   -- 직거래 우선 제외 (이상거래 포함 가능성)
GROUP BY apt_name, size_sqm, floor
HAVING COUNT(*) >= 2          -- 최소 거래 건수 필터
ORDER BY apt_name, size_sqm, floor;
```

같은 단지/면적 내 중층(기준층) 대비 각 층의 비율을 계산하여 단지별 보정계수 생성.

**한계:** 거래 건수가 적은 단지는 보정계수 신뢰도 낮음. 층별로 1~2건밖에 없으면 노이즈가 더 큼.

#### 방법 C: 헤도닉 회귀 (학술적 표준, 구현 복잡)

```
ln(price) = β0 + β1*ln(size) + β2*floor_ratio + β3*floor_ratio² + β4*year + ε
```

- `floor_ratio = floor / total_floors`
- 2차항으로 저층 할인 + 고층 프리미엄의 비선형성 포착
- 국토부 실거래가 전체 데이터가 있을 때 유효

**돈줍에서 즉시 적용 권고:** 방법 A (경험적 고정 계수). 데이터 충분한 단지는 방법 B 추후 보완.

---

## 2. 대표가격 산출

### 2.1 기관별 산출 방식 비교

#### 한국부동산원 — 주간 아파트 가격지수 (조사기반)
- **방법:** 전국 36,800호 표본 아파트를 현장 조사원이 매주 시세 조사
- **기준:** 2021년 6월 = 100 (base period)
- **특징:** 실거래가가 아닌 호가/시세 기반. 시장 분위기를 반영하나 실거래 지연 반영

#### 한국부동산원 — 공동주택 실거래가격지수 (거래기반)
- **방법:** Bailey-Muth-Nourse 반복매매 모형
  ```
  ln(Ps_t / Pf_t) = Σ βt × Dt + √ω × ε
  지수 It = 100 × exp(βt)
  ```
- **거래쌍 구성:** 동일 단지+면적+동(동호수 또는 층 그룹) 기준 2회 이상 거래 매칭
- **기준:** 2017년 11월 = 100
- **이상치 제거:** 2단계 — 1) 분양권 전매, 특수거래, 중복 제거 → 2) 가격 이상치 분류 제거
- **Confidence: HIGH** (공식 문서 확인)

#### KB부동산 — 주간 시세 (상한가/일반가/하한가)
- **방법:** 라스파이레스(Laspeyres) 지수
  ```
  지수 = Σ(현재 추정가 × 세대수) / Σ(기준 시점 시세 × 세대수) × 100
  ```
- **표본:** 2022년 기준 전국 36,300호 (시세 중개사 네트워크 조사)
- **상한/일반/하한 구분:** 중개사가 보고하는 가격대 범위. 상한은 즉시 팔리는 가격, 하한은 급매 수준, 일반은 정상 거래 예상가
- **업데이트:** 매주 금요일
- **Confidence: MEDIUM** — 구체 산출식은 비공개, 라스파이레스 구조는 다수 연구에서 확인

### 2.2 실거래가 기반 대표가격 산출 옵션 비교

| 방법 | 노이즈 저항성 | 거래 지연 반영 | 건수 적을 때 | 추이 표현 | 권장 |
|------|------------|--------------|------------|----------|------|
| 단순 평균 | 낮음 | 빠름 | 불안정 | 들쭉날쭉 | X |
| **중위가(Median)** | 높음 | 빠름 | 중간 | 안정적 | **1순위** |
| 가중평균(면적비례) | 중간 | 빠름 | 불안정 | 중간 | 보조 |
| 3개월 이동평균 | 높음 | 느림 | 안정적 | 매우 안정 | 차트용 |
| 3개월 이동 중위가 | 매우 높음 | 느림 | 안정적 | 최적 | **차트 1순위** |

**결론:** 단일 시점 대표가는 중위가, 차트 시계열은 3개월 이동 중위가.

### 2.3 저층/이상거래 필터링

이상거래 제거 후 대표가 산출이 표준:

```sql
-- 대표가 산출용 필터링 기준 (추천)
WHERE
  -- 1. 층별 필터: 저층 제외 옵션
  floor > 2                           -- 1~2층 제외 (선택적)

  -- 2. 직거래 필터: 직거래는 저가 거래 포함 가능성 높음
  AND (deal_type IS NULL OR deal_type != '직거래')

  -- 3. 가격 이상치: IQR 기준 (같은 단지+면적 내)
  AND trade_price BETWEEN
    (Q1 - 1.5 * IQR)  -- IQR 하한
    AND
    (Q3 + 1.5 * IQR)  -- IQR 상한

  -- 4. 기간 필터: 최근 12개월 (유동적)
  AND trade_date >= NOW() - INTERVAL '12 months'
```

**IQR 계산 (PostgreSQL):**
```sql
WITH price_stats AS (
  SELECT
    apt_name,
    size_sqm,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY trade_price) AS q1,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY trade_price) AS q3
  FROM apt_transactions
  WHERE trade_date >= NOW() - INTERVAL '12 months'
  GROUP BY apt_name, size_sqm
)
SELECT
  t.apt_name,
  t.size_sqm,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.trade_price) AS median_price
FROM apt_transactions t
JOIN price_stats s ON t.apt_name = s.apt_name AND t.size_sqm = s.size_sqm
WHERE
  t.trade_price BETWEEN (s.q1 - 1.5*(s.q3-s.q1)) AND (s.q3 + 1.5*(s.q3-s.q1))
  AND t.trade_date >= NOW() - INTERVAL '12 months'
GROUP BY t.apt_name, t.size_sqm;
```

---

## 3. 지역 지수 산출

### 3.1 주요 지수 방법론 비교

| 방법 | 수식 | 장점 | 단점 | 한국 사용 기관 |
|------|------|------|------|--------------|
| **라스파이레스(Laspeyres)** | Σ(Pt×Q0) / Σ(P0×Q0) | 계산 단순, 기준 고정 | 대체효과 미반영, 상방편의 | KB부동산 |
| 파셰(Paasche) | Σ(Pt×Qt) / Σ(P0×Qt) | 현재 거래량 반영 | 과거 소급 불가, 하방편의 | 잘 안 씀 |
| 피셔(Fisher) | √(라스파이레스×파셰) | 이론적 이상적 | 계산 복잡 | 잘 안 씀 |
| **반복매매(Repeat Sales)** | 로그 가격비 회귀 | 품질 통제 우수 | 거래 적은 지역 불안정 | 한국부동산원 실거래지수 |
| **헤도닉 회귀(Hedonic)** | 품질 변수 포함 OLS | 모든 거래 활용 | 변수 수집 필요 | 학술/IMF 권장 |

**돈줍 구현 권장:** 라스파이레스 변형. 반복매매는 거래 쌍 부족 문제 발생 가능성 높음.

### 3.2 라스파이레스 기반 지역 지수 구현

```sql
-- 기준 시점: 2022년 1월 (예시)
-- 가중치: 단지별 세대수 (total_units) — apt_complexes 테이블 활용

WITH base_period AS (
  SELECT
    c.id AS complex_id,
    c.apt_name,
    c.total_units,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.trade_price / t.size_sqm) AS base_price_per_sqm
  FROM apt_complexes c
  JOIN apt_transactions t ON t.apt_name = c.apt_name AND t.region_code = c.region_code
  WHERE t.trade_date BETWEEN '2022-01-01' AND '2022-03-31'   -- 기준기간 (3개월 평균 권장)
    AND t.floor > 2                                            -- 저층 제외
  GROUP BY c.id, c.apt_name, c.total_units
  HAVING COUNT(*) >= 3
),
current_period AS (
  SELECT
    c.id AS complex_id,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY t.trade_price / t.size_sqm) AS curr_price_per_sqm
  FROM apt_complexes c
  JOIN apt_transactions t ON t.apt_name = c.apt_name AND t.region_code = c.region_code
  WHERE t.trade_date BETWEEN '2025-01-01' AND '2025-03-31'   -- 현재 기간
    AND t.floor > 2
  GROUP BY c.id
  HAVING COUNT(*) >= 3
)
SELECT
  SUM(b.base_price_per_sqm * COALESCE(b.total_units, 100) *
      (cp.curr_price_per_sqm / b.base_price_per_sqm)) /
  SUM(b.base_price_per_sqm * COALESCE(b.total_units, 100)) * 100 AS laspeyres_index
FROM base_period b
JOIN current_period cp ON b.complex_id = cp.complex_id;
```

### 3.3 군집(클러스터) 지수 — 강남3구, 마용성 등

```sql
-- 강남3구 지수 (강남+서초+송파)
WHERE region_code LIKE '11680%'   -- 강남구
   OR region_code LIKE '11650%'   -- 서초구
   OR region_code LIKE '11710%'   -- 송파구
```

**가중치 방법 선택:**
- **세대수 가중 (권장):** `COALESCE(total_units, 100)` — 대단지가 지수에 더 많이 반영
- **균등 가중:** 모든 단지 동일 가중. 소형 단지 과대 반영 위험
- **거래량 가중:** 많이 거래된 단지 중시. 시장 활성도 반영

**기준 시점 설정:**
- 한국부동산원: 2021년 6월
- 한국부동산원 실거래지수: 2017년 11월
- KB: 별도 기준(비공개)
- **돈줍 권장:** 2020년 1월 = 100 (코로나 이전 안정기, 직관적)

### 3.4 단순 구현 가능한 지역 지수 (돈줍 현실적 버전)

복잡한 가중 라스파이레스 대신, 중위 단가(원/㎡) 기반 체인 지수:

```sql
-- 월별 중위 단가 시계열 → 기준월 대비 지수
WITH monthly_median AS (
  SELECT
    DATE_TRUNC('month', trade_date::date) AS ym,
    PERCENTILE_CONT(0.5) WITHIN GROUP (
      ORDER BY trade_price / size_sqm
    ) AS median_unit_price
  FROM apt_transactions
  WHERE region_code LIKE '11%'          -- 서울 전체
    AND floor > 2                        -- 저층 제외
    AND (deal_type IS NULL OR deal_type != '직거래')
    AND trade_date >= '2020-01-01'
  GROUP BY DATE_TRUNC('month', trade_date::date)
  HAVING COUNT(*) >= 10                 -- 최소 10건 이상
)
SELECT
  ym,
  median_unit_price,
  ROUND(
    median_unit_price /
    FIRST_VALUE(median_unit_price) OVER (ORDER BY ym) * 100
  , 1) AS index_value                   -- 2020년 1월 = 100
FROM monthly_median
ORDER BY ym;
```

---

## 4. 이상거래 탐지

### 4.1 탐지 대상 유형

| 유형 | 특징 | 탐지 방법 |
|------|------|----------|
| **친족 직거래 저가** | 시세 대비 30% 이상 저가 | 직거래 + 가격 기준 이하 |
| **증여성 거래** | 법적으로 실거래 신고 대상 아님 (증여는 신고 제외) | 데이터상 탐지 어려움 |
| **분양권 전매** | 입주 전 전매 → 전용면적과 공급면적 혼용 오류 가능 | raw_data 확인 |
| **통계적 이상치** | 같은 단지/면적 대비 극단값 | IQR / Z-score |
| **오타/신고 오류** | 0이나 비정상 가격 | 절대값 하한 필터 |

### 4.2 국토부 직거래 이상거래 기준

- 가족 간 거래: 시세 대비 **30%** 이내 저가는 정상 인정
- 30% 초과 저가 → 증여 추정 → 국세청 통보 대상
- 국토부는 실거래가 신고분을 상시 모니터링, 이상거래 조사 실시

**데이터 필터링 적용:**
```typescript
// 이상거래 의심 판단 기준 (돈줍 기준)
function isSuspiciousTransaction(
  tradePrice: number,
  medianPrice: number,
  dealType: string | null
): boolean {
  // 직거래 AND 중위가 대비 30% 이상 저가
  if (dealType === '직거래' && tradePrice < medianPrice * 0.70) {
    return true;
  }
  return false;
}
```

### 4.3 통계적 이상치 탐지 — IQR vs Z-score

**IQR 권장 이유 (부동산 데이터에 더 적합):**
- 부동산 가격은 우편향 분포 (고가 극단값 존재)
- Z-score는 정규분포 가정 → 부동산 데이터에 부적합
- IQR은 분포 가정 없는 비모수 방법

```typescript
// IQR 기반 이상치 탐지
function filterOutliers(prices: number[]): number[] {
  const sorted = [...prices].sort((a, b) => a - b);
  const n = sorted.length;
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  return prices.filter(p => p >= lower && p <= upper);
}
```

**Z-score는 사용 시 주의:**
- 임계값 ±3σ 기준 사용 시 부동산 고가 극단값을 포함할 수 있음
- 같은 단지 내 단기 시계열 분석에서는 Z-score도 활용 가능

### 4.4 단계별 필터링 파이프라인 (권장)

```
단계 1: 절대값 하한 필터
  → trade_price > 1000 (만원) AND size_sqm > 10

단계 2: 직거래 저가 필터
  → deal_type != '직거래' OR trade_price >= (중위가 × 0.70)

단계 3: 층별 필터 (선택)
  → floor > 2  (저층 포함 여부 목적에 따라)

단계 4: IQR 이상치 제거 (같은 단지+면적 그룹 내)
  → trade_price BETWEEN (Q1 - 1.5×IQR) AND (Q3 + 1.5×IQR)

단계 5: 기간 필터 (대표가 산출용)
  → trade_date >= NOW() - INTERVAL '12 months'
```

---

## 5. 돈줍 데이터 적용 가이드

### 5.1 현재 데이터 구조와 한계

**보유 컬럼:**
```
apt_transactions: floor, size_sqm, trade_price, trade_date, deal_type,
                  highest_price, change_rate, is_new_high, is_significant_drop
apt_complexes:    total_units, floor_count, built_year
```

**구현 가능 항목 (추가 데이터 없이):**

| 기능 | 구현 가능 여부 | 방법 |
|------|--------------|------|
| 층별 경험적 보정 | **가능** (즉시) | 방법 A 고정 계수 |
| 층별 데이터 기반 보정 | **가능** (단지 충분히 거래 있는 경우) | 방법 B SQL |
| 중위 단가 대표가 | **가능** (즉시) | PERCENTILE_CONT(0.5) |
| 3개월 이동 중위가 | **가능** (즉시) | SQL 윈도우 함수 |
| IQR 이상치 제거 | **가능** (즉시) | SQL |
| 직거래 필터 | **가능** (즉시) | `deal_type = '직거래'` |
| 지역 체인 지수 | **가능** (즉시) | 중위 단가 기준 |
| 가중 라스파이레스 지수 | **가능** (total_units 있는 단지만) | SQL |
| 반복매매 지수 | **부분 가능** (거래 쌍 적을 수 있음) | 거래 쌍 매칭 필요 |
| 헤도닉 회귀 | **어려움** | 추가 변수 필요 (조망, 향 등) |

### 5.2 즉시 적용 추천 구현

#### A. 아파트 상세 페이지 — 면적별 대표가 (현재 기능 개선)

```sql
-- 로열층 기준 대표가 (면적별)
SELECT
  size_sqm,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY trade_price) AS representative_price,
  COUNT(*) AS sample_count
FROM apt_transactions
WHERE apt_name = $1
  AND floor > 2                                          -- 저층 제외
  AND (deal_type IS NULL OR deal_type != '직거래')       -- 직거래 제외
  AND trade_date >= NOW() - INTERVAL '24 months'
GROUP BY size_sqm
HAVING COUNT(*) >= 3;
```

#### B. 가격 차트 — 3개월 이동 중위가 시계열

```sql
SELECT
  DATE_TRUNC('month', trade_date::date) AS month,
  size_sqm,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY trade_price) AS median_price,
  COUNT(*) AS tx_count
FROM apt_transactions
WHERE apt_name = $1
  AND size_sqm BETWEEN $2 - 5 AND $2 + 5   -- ±5㎡ 유사면적 포함
  AND floor > 2
GROUP BY DATE_TRUNC('month', trade_date::date), size_sqm
ORDER BY month;
-- 애플리케이션 레이어에서 3개월 이동평균 적용
```

#### C. 폭락/신고가 판단 개선 — 층별 보정 후 비교

현재 `change_rate`는 층 보정 없이 단순 가격 비교. 개선안:

```typescript
// 층별 보정 후 change_rate 재계산
function normalizedChangeRate(
  tradePrice: number,
  floor: number,
  totalFloors: number | null,
  highestPrice: number
): number {
  const factor = floorAdjustmentFactor(floor, totalFloors ?? 20);
  const normalizedPrice = tradePrice / factor;  // 로열층 기준 환산가
  return ((normalizedPrice - highestPrice) / highestPrice) * 100;
}
```

### 5.3 한계점 및 주의사항

1. **거래 건수 부족:** 지방 소도시 단지는 월 1~2건 거래. 이동 중위가 계산 시 기간 늘리거나 건수 하한 낮춰야 함.

2. **면적 불일치:** 전용면적과 공급면적 혼용 가능성 (API 파싱 오류 시). `size_sqm`이 두 기준이 섞여 있으면 보정 불가. raw_data 확인 필요.

3. **total_floors 부재:** `apt_transactions`에 `total_floors` 없음. `apt_complexes.floor_count`로 조인해야 하지만 NULL이 있을 수 있음. 절대 층수 기반 fallback 필요.

4. **직거래 전부 배제 주의:** 정상 직거래도 있음. 시세 대비 30% 이상 저가인 직거래만 이상거래. 전수 제외하면 거래 건수 크게 줄 수 있음.

5. **지수 후행성:** 실거래가 신고 기한 30일 → 당월 지수는 다음달에야 완성. 최근 2개월은 잠정치로 표시 권장.

6. **지역 지수 대표성:** 거래가 집중된 단지 몇 곳이 지역 지수를 왜곡할 수 있음. 세대수 가중치로 완화.

7. **로열층 기준 변동:** 총 층수가 다르면 로열층 기준이 달라짐. 20층 아파트 로열층 ≠ 35층 아파트 로열층.

---

## 6. 추가 리서치 플래그

아래 항목은 이번 조사에서 충분히 검증되지 않았거나 추가 확인이 필요함:

- [ ] `apt_transactions.deal_type` 실제 값 확인 — '직거래', '중개거래' 등 정확한 enum 값
- [ ] `apt_complexes.total_units` NULL 비율 — 가중치 활용 가능 여부
- [ ] `size_sqm` 전용/공급 혼용 여부 — raw_data 파싱 확인
- [ ] KB부동산 층별 보정 내부 방식 — 비공개, 직접 확인 불가
- [ ] 반복매매 지수 거래쌍 충분성 — 실제 데이터로 샘플링 필요

---

## 참고 출처

- [한국부동산원 공동주택 실거래가격지수 방법론](https://www.reb.or.kr/reb/cm/cntnts/cntntsView.do?mi=10337&cntntsId=1193&statId=S231520283) — HIGH confidence
- [한국부동산원 전국주택가격동향조사](https://www.reb.or.kr/reb/cm/cntnts/cntntsView.do?mi=10333&cntntsId=1033&statId=S234820263) — HIGH confidence
- [KB부동산 데이터허브](https://data.kbland.kr/) — MEDIUM (라스파이레스 구조 다수 연구에서 확인)
- [KB Think — KB시세 조회하는 법](https://kbthink.com/main/asset-management/wealth-manage-tip/kbthink-original/202409/kb-real-estate-prices.html) — MEDIUM
- [주택부동산가이드 — 로열층 vs 저층 가격 차이](https://houseinfo.kr/blog/0153-floor-level-selection-guide/) — MEDIUM (경험적 수치)
- [한국경제 — 층수별 분양가 차이 사례](https://www.hankyung.com/article/2016042785871) — MEDIUM
- [기계학습 방법론을 활용한 아파트 매매가격지수 연구 (KCI)](https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART002901711) — MEDIUM
- [Repeat Sales House Price Index Methodology — Wharton](https://realestate.wharton.upenn.edu/wp-content/uploads/2017/03/724.pdf) — HIGH
- [IMF WP/16/213 — How to better measure hedonic residential property price indexes](https://www.imf.org/external/pubs/ft/wp/2016/wp16213.pdf) — HIGH
- [직거래 이상거래 30% 기준 — Daum 부동산](https://realestate.daum.net/news/detail/main/20220209103501659) — MEDIUM
