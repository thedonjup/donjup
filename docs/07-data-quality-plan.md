# 돈줍(DonJup) 데이터 품질 보증 계획서

> **목표**: 156만건 이상의 실거래 데이터에서 최고가/변동률 정합성을 100% 확보하여, 폭락/신고가 랭킹의 신뢰도를 보장한다.
> **작성일**: 2026-03-22

---

## 1. 데이터 정합성 문제 현황

### 1.1 문제 요약

| 항목 | 수치 |
|------|------|
| 전체 거래 건수 | ~156만건 |
| `highest_price`가 NULL인 건수 | ~155만건 (99.4%) |
| `change_rate`가 NULL인 건수 | ~155만건 |
| 정상 계산된 건수 | ~1만건 (일일 크론으로 수집된 최근 데이터) |

### 1.2 원인 분석

백필 스크립트(`scripts/backfill-transactions.ts`)에서 속도를 우선하여 **최고가 계산을 스킵**하고 데이터를 삽입했다.

```typescript
// backfill-transactions.ts 298~311행
const batch = transactions.map((t) => ({
  ...
  highest_price: null,    // ← 계산 스킵
  change_rate: null,      // ← 계산 스킵
  is_new_high: false,
  is_significant_drop: false,
}));
```

백필 스크립트 하단의 `recalculateChangeRates()` 함수가 존재하지만, `limit(50000)`으로 그룹을 제한하고 있어 전체 데이터를 처리하지 못했다.

### 1.3 영향

- **폭락 아파트 랭킹**: `is_significant_drop`이 모두 `false` → 폭락 단지가 누락
- **신고가 갱신 랭킹**: `is_new_high`가 모두 `false` → 신고가 단지가 누락
- **단지 상세 차트**: `change_rate`가 NULL → 변동률 그래프 표시 불가
- **데일리 리포트**: 극단적 변동 데이터가 없어 리포트 내용이 빈약
- **SEO/바이럴**: 핵심 콘텐츠(폭락/신고가)가 부정확하여 서비스 신뢰도 하락

---

## 2. 데이터 수집 파이프라인

### 2.1 전체 흐름

```
[국토교통부 MOLIT API]
        │
        ▼
[1단계] 실거래가 수집 (fetch-transactions cron)
        │  - 5개 배치 그룹으로 분할 (vercel.json)
        │  - 지역별 3개월치 수집
        ▼
[2단계] apt_complexes UPSERT (단지 마스터)
        │  - slug 기준 중복 방지
        ▼
[3단계] apt_transactions UPSERT (거래 내역)
        │  - (apt_name, size_sqm, floor, trade_date, trade_price) 기준 중복 방지
        ▼
[4단계] 최고가/변동률 계산 (enrichTransactions)
        │  - 단지+면적별 역대 최고 trade_price 조회
        │  - change_rate, is_new_high, is_significant_drop 산출
        ▼
[5단계] 데일리 리포트 생성 (generate-report cron)
        │  - 폭락 TOP 10, 신고가 TOP 10
        ▼
[6단계] 인스타그램 카드뉴스 생성 (post-instagram cron)
```

### 2.2 각 단계별 검증 포인트

| 단계 | 검증 항목 | 검증 방법 |
|------|----------|----------|
| 1단계 (API 수집) | API 응답 resultCode == "000" | 응답 코드 확인 |
| 1단계 | 필수 필드 존재 (dealAmount, aptNm, excluUseAr) | null 체크 후 skip |
| 2단계 (단지 마스터) | slug 유니크 제약조건 | DB unique index |
| 3단계 (거래 삽입) | 복합 유니크 제약조건 | `apt_name,size_sqm,floor,trade_date,trade_price` |
| 4단계 (최고가 계산) | highest_price NOT NULL | 삽입 후 검증 쿼리 |
| 4단계 | change_rate 범위 검증 | -100% ~ 1000% 범위 확인 |
| 5단계 (리포트) | 폭락/신고가 건수 > 0 | 리포트 생성 전 데이터 존재 확인 |

---

## 3. 데이터 검증 규칙

### 3.1 필드별 유효성 규칙

| 필드 | 규칙 | 설명 | SQL 표현 |
|------|------|------|---------|
| `trade_price` | > 0 | 가격은 반드시 양수 | `trade_price > 0` |
| `trade_date` | <= today | 미래 날짜 거래 불가 | `trade_date <= CURRENT_DATE` |
| `size_sqm` | > 0 AND < 500 | 전용면적 범위 (최대 500㎡) | `size_sqm > 0 AND size_sqm < 500` |
| `floor` | >= -5 AND <= 100 | 층수 범위 (지하 5층 ~ 100층) | `floor >= -5 AND floor <= 100` |
| `change_rate` | >= -100 AND <= 1000 | 변동률 범위 (최대 10배 상승) | `change_rate >= -100 AND change_rate <= 1000` |
| `highest_price` | >= trade_price 또는 is_new_high = true | 최고가는 현재가 이상이거나 신고가 | `highest_price >= trade_price OR is_new_high = true` |
| `region_code` | 5자리 숫자 | 법정동 코드 형식 | `region_code ~ '^\d{5}$'` |

### 3.2 교차 검증 규칙

| 규칙 | 설명 | 검증 SQL |
|------|------|---------|
| 최고가 단조증가 | 동일 단지+면적에서 highest_price는 시간순으로 단조증가해야 함 | 아래 참조 |
| 신고가 정합성 | `is_new_high = true`이면 `change_rate`는 NULL이어야 함 | `NOT (is_new_high = true AND change_rate IS NOT NULL)` |
| 폭락 정합성 | `is_significant_drop = true`이면 `change_rate <= -20`이어야 함 | `NOT (is_significant_drop = true AND (change_rate IS NULL OR change_rate > -20))` |

#### 최고가 단조증가 검증 SQL

```sql
-- 같은 단지+면적에서 이전 거래보다 highest_price가 작은 케이스 탐지
WITH ordered AS (
  SELECT
    id, apt_name, size_sqm, trade_date, highest_price,
    LAG(highest_price) OVER (
      PARTITION BY apt_name, size_sqm
      ORDER BY trade_date, id
    ) AS prev_highest
  FROM apt_transactions
  WHERE highest_price IS NOT NULL
)
SELECT * FROM ordered
WHERE prev_highest IS NOT NULL
  AND highest_price < prev_highest;
-- 결과가 0건이어야 정상
```

### 3.3 이상치 탐지 규칙

| 이상치 유형 | 기준 | 설명 |
|------------|------|------|
| 가격 급등 | 이전 거래 대비 10배 초과 | 입력 오류 가능성 |
| 가격 급락 | 이전 거래 대비 1/10 미만 | 입력 오류 가능성 |
| 면적 불일치 | 동일 단지에서 면적 편차 > 300㎡ | 데이터 오류 가능성 |

```sql
-- 같은 단지+면적에서 이전 거래 대비 10배 이상 차이나는 건
WITH ordered AS (
  SELECT
    id, apt_name, size_sqm, trade_date, trade_price,
    LAG(trade_price) OVER (
      PARTITION BY apt_name, size_sqm
      ORDER BY trade_date, id
    ) AS prev_price
  FROM apt_transactions
)
SELECT * FROM ordered
WHERE prev_price IS NOT NULL
  AND (trade_price > prev_price * 10 OR trade_price < prev_price / 10);
```

---

## 4. 최고가/변동률 계산 로직 명세

### 4.1 계산 단위

- **그룹 키**: `apt_name` + `size_sqm` 조합
- **정렬**: `trade_date ASC`, 동일 날짜 내에서는 `id ASC`

### 4.2 계산 알고리즘

```
입력: 동일 (apt_name, size_sqm) 그룹의 거래 목록 (시간순 정렬)

running_max = 0

FOR EACH transaction IN 시간순:
    IF running_max == 0:
        # 첫 거래
        highest_price = trade_price
        change_rate = NULL
        is_new_high = false
        is_significant_drop = false
    ELSE IF trade_price > running_max:
        # 신고가 갱신
        highest_price = trade_price
        change_rate = NULL
        is_new_high = true
        is_significant_drop = false
    ELSE:
        # 최고가 이하 거래
        highest_price = running_max
        change_rate = (trade_price - running_max) / running_max * 100
        is_new_high = false
        is_significant_drop = (change_rate <= -20)

    running_max = MAX(running_max, trade_price)
```

### 4.3 필드 정의

| 필드 | 타입 | 계산식 | 설명 |
|------|------|--------|------|
| `highest_price` | BIGINT | `MAX(running_max, trade_price)` | 해당 시점까지의 누적 최고가 (만원) |
| `change_rate` | DECIMAL(5,2) | `(trade_price - prev_highest) / prev_highest * 100` | 이전 최고가 대비 변동률 (%). 신고가일 경우 NULL |
| `is_new_high` | BOOLEAN | `prev_highest > 0 AND trade_price > prev_highest` | 직전까지의 최고가를 갱신했는지 여부 |
| `is_significant_drop` | BOOLEAN | `change_rate <= -20` | 최고가 대비 20% 이상 하락 여부 |

### 4.4 예시

| 순서 | trade_date | trade_price | running_max (이전) | highest_price | change_rate | is_new_high | is_significant_drop |
|------|-----------|-------------|-------------------|---------------|-------------|-------------|---------------------|
| 1 | 2020-01-15 | 80000 | 0 | 80000 | NULL | false | false |
| 2 | 2021-03-20 | 95000 | 80000 | 95000 | NULL | true | false |
| 3 | 2022-06-10 | 120000 | 95000 | 120000 | NULL | true | false |
| 4 | 2023-01-05 | 90000 | 120000 | 120000 | -25.00 | false | true |
| 5 | 2023-08-15 | 100000 | 120000 | 120000 | -16.67 | false | false |
| 6 | 2024-02-20 | 130000 | 120000 | 130000 | NULL | true | false |

---

## 5. 정기 검증 크론

### 5.1 일일 정합성 체크

데일리 리포트 생성 전(매일 07:30 KST)에 데이터 정합성을 검증한다.

#### 검증 항목

```sql
-- 1. NULL highest_price 건수 확인
SELECT count(*) AS null_highest_count
FROM apt_transactions
WHERE highest_price IS NULL;

-- 2. 유효하지 않은 가격 확인
SELECT count(*) AS invalid_price_count
FROM apt_transactions
WHERE trade_price <= 0;

-- 3. 미래 날짜 거래 확인
SELECT count(*) AS future_date_count
FROM apt_transactions
WHERE trade_date > CURRENT_DATE;

-- 4. 변동률 범위 초과 확인
SELECT count(*) AS out_of_range_count
FROM apt_transactions
WHERE change_rate IS NOT NULL
  AND (change_rate < -100 OR change_rate > 1000);

-- 5. 폭락 플래그 불일치 확인
SELECT count(*) AS flag_mismatch_count
FROM apt_transactions
WHERE (is_significant_drop = true AND (change_rate IS NULL OR change_rate > -20))
   OR (is_significant_drop = false AND change_rate IS NOT NULL AND change_rate <= -20);
```

### 5.2 NULL highest_price 자동 재계산

일일 크론에서 NULL이 발견되면 해당 그룹만 재계산한다.

```sql
-- NULL이 있는 그룹 식별
SELECT DISTINCT apt_name, size_sqm
FROM apt_transactions
WHERE highest_price IS NULL;
```

식별된 그룹에 대해 `scripts/recalculate-prices.ts` 스크립트의 로직으로 재계산을 실행한다.

### 5.3 이상치 탐지

```sql
-- 같은 단지+면적에서 직전 거래 대비 10배 이상 차이나는 이상 거래
WITH price_diff AS (
  SELECT
    id, apt_name, size_sqm, trade_date, trade_price,
    LAG(trade_price) OVER (
      PARTITION BY apt_name, size_sqm
      ORDER BY trade_date, id
    ) AS prev_price
  FROM apt_transactions
)
SELECT
  id, apt_name, size_sqm, trade_date,
  trade_price, prev_price,
  ROUND((trade_price::numeric / NULLIF(prev_price, 0)) * 100 - 100, 1) AS diff_pct
FROM price_diff
WHERE prev_price IS NOT NULL
  AND prev_price > 0
  AND (trade_price > prev_price * 10 OR trade_price * 10 < prev_price);
```

이상치로 탐지된 건은 수동 검토 후 조치한다 (원본 API 재확인 또는 `raw_data` 필드 참조).

---

## 6. 백필 시 필수 절차

### 6.1 백필 프로세스

```
[1] 백필 스크립트 실행
    npx tsx scripts/backfill-transactions.ts [시작년도] [종료년도] [시도코드]
        │
        ▼
[2] 삽입 건수 확인
    SELECT count(*) FROM apt_transactions WHERE highest_price IS NULL;
        │
        ▼
[3] 최고가/변동률 재계산 실행 (필수!)
    npx tsx scripts/recalculate-prices.ts
        │
        ▼
[4] 재계산 결과 검증
    SELECT
      count(*) AS total,
      count(*) FILTER (WHERE highest_price IS NULL) AS still_null,
      count(*) FILTER (WHERE is_new_high = true) AS new_highs,
      count(*) FILTER (WHERE is_significant_drop = true) AS significant_drops
    FROM apt_transactions;
        │
        ▼
[5] 정합성 검증 쿼리 실행 (3장 참조)
```

### 6.2 재계산 스크립트

전체 데이터에 대한 최고가/변동률 재계산은 `scripts/recalculate-prices.ts`로 수행한다.

```bash
# 전체 재계산 실행
npx tsx scripts/recalculate-prices.ts
```

이 스크립트는 다음과 같이 동작한다:

1. 지역별로 처리 (서울 25개 구 → 전국 순서)
2. 각 지역에서 모든 거래를 `(apt_name, size_sqm, trade_date)` 순서로 조회
3. `apt_name + size_sqm` 그룹별 누적 MAX 계산
4. 500건 단위 배치 업데이트
5. 진행률 표시

### 6.3 재계산 SQL (소규모/긴급 시)

특정 지역만 빠르게 재계산해야 할 경우 SQL을 직접 실행할 수 있다.

```sql
-- 특정 지역(예: 노원구 11350)만 재계산
WITH ranked AS (
  SELECT
    id,
    apt_name,
    size_sqm,
    trade_price,
    trade_date,
    MAX(trade_price) OVER (
      PARTITION BY apt_name, size_sqm
      ORDER BY trade_date, id
      ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
    ) AS prev_highest
  FROM apt_transactions
  WHERE region_code = '11350'
)
UPDATE apt_transactions t
SET
  highest_price = GREATEST(COALESCE(r.prev_highest, 0), t.trade_price),
  change_rate = CASE
    WHEN r.prev_highest IS NOT NULL AND r.prev_highest > 0
      AND t.trade_price < r.prev_highest
    THEN ROUND(((t.trade_price - r.prev_highest)::numeric / r.prev_highest) * 100, 2)
    ELSE NULL
  END,
  is_new_high = CASE
    WHEN r.prev_highest IS NOT NULL AND r.prev_highest > 0
      AND t.trade_price > r.prev_highest
    THEN true
    ELSE false
  END,
  is_significant_drop = CASE
    WHEN r.prev_highest IS NOT NULL AND r.prev_highest > 0
      AND ROUND(((t.trade_price - r.prev_highest)::numeric / r.prev_highest) * 100, 2) <= -20
    THEN true
    ELSE false
  END
FROM ranked r
WHERE t.id = r.id;
```

> **주의**: 전체 데이터에 대해 위 SQL을 실행하면 Supabase 무료 티어에서 타임아웃이 발생한다. 대규모 재계산은 반드시 `scripts/recalculate-prices.ts`를 사용할 것.

### 6.4 백필 체크리스트

- [ ] 백필 전 현재 데이터 건수 기록
- [ ] 백필 스크립트 실행 및 완료 확인
- [ ] 삽입된 건수 확인
- [ ] **재계산 스크립트 실행** (`npx tsx scripts/recalculate-prices.ts`)
- [ ] NULL highest_price 건수가 0인지 확인
- [ ] 폭락 단지 건수 (is_significant_drop = true) 확인
- [ ] 신고가 단지 건수 (is_new_high = true) 확인
- [ ] 이상치 탐지 쿼리 실행 및 결과 검토
- [ ] 데일리 리포트 수동 생성하여 정상 여부 확인
