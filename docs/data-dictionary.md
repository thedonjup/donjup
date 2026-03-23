# 돈줍 데이터 딕셔너리 (Data Dictionary)

> 모든 DB 테이블의 컬럼 정의, 축약 코드, 데이터 규약을 정리한 문서입니다.
> 데이터를 읽거나 쓸 때 반드시 이 문서를 참조하세요.

---

## 1. 축약 코드 규약

### 1.1 부동산 유형 코드 (property_type)

| 코드 | 의미 | API 엔드포인트 |
|------|------|---------------|
| `1` | 아파트 | RTMSDataSvcAptTradeDev |
| `2` | 연립다세대 (빌라) | RTMSDataSvcRHTradeDev |
| `3` | 오피스텔 | RTMSDataSvcOffiTradeDev |
| `4` | 토지 | RTMSDataSvcLandTradeDev |
| `5` | 상업업무용 | RTMSDataSvcSHTradeDev |

### 1.2 하락 등급 코드 (drop_level)

| 코드 | 의미 | 기준 (3년 최고가 대비) |
|------|------|---------------------|
| `normal` | 정상 | 변동률 > -10% |
| `decline` | 하락 | -10% ~ -15% |
| `crash` | 폭락 | -15% ~ -25% |
| `severe` | 대폭락 | -25% 이하 |

### 1.3 지역 코드 (region_code)

5자리 법정동코드. 앞 2자리가 시/도, 뒤 3자리가 시/군/구.

| 시/도 코드 | 시/도명 | 약칭 |
|-----------|--------|------|
| `11` | 서울특별시 | 서울 |
| `26` | 부산광역시 | 부산 |
| `27` | 대구광역시 | 대구 |
| `28` | 인천광역시 | 인천 |
| `29` | 광주광역시 | 광주 |
| `30` | 대전광역시 | 대전 |
| `31` | 울산광역시 | 울산 |
| `36` | 세종특별자치시 | 세종 |
| `41` | 경기도 | 경기 |
| `42` | 강원특별자치도 | 강원 |
| `43` | 충청북도 | 충북 |
| `44` | 충청남도 | 충남 |
| `45` | 전북특별자치도 | 전북 |
| `46` | 전라남도 | 전남 |
| `47` | 경상북도 | 경북 |
| `48` | 경상남도 | 경남 |
| `50` | 제주특별자치도 | 제주 |

예시: `11680` = 서울(11) + 강남구(680)

> 전체 시군구 코드 목록: `src/lib/constants/region-codes.ts`

### 1.4 금리 유형 코드 (rate_type)

| 코드 | 의미 | 출처 |
|------|------|------|
| `BASE_RATE` | 기준금리 | ECOS |
| `CD_91` | CD 91일물 | ECOS |
| `TREASURY_3Y` | 국고채 3년 | ECOS |
| `COFIX_NEW` | COFIX 신규취급액 | ECOS |
| `COFIX_BAL` | COFIX 잔액기준 | ECOS |
| `BANK_KB` | KB국민은행 주담대 최저금리 | FinLife |
| `BANK_SHINHAN` | 신한은행 주담대 최저금리 | FinLife |
| `BANK_WOORI` | 우리은행 주담대 최저금리 | FinLife |
| `BANK_HANA` | 하나은행 주담대 최저금리 | FinLife |
| `BANK_NH` | NH농협 주담대 최저금리 | FinLife |
| `BANK_IBK` | IBK기업은행 주담대 최저금리 | FinLife |

### 1.5 가격지수 유형 코드 (index_type)

| 코드 | 의미 | 출처 |
|------|------|------|
| `apt_trade` | 아파트 매매가격지수 | 한국부동산원 |
| `apt_jeonse` | 아파트 전세가격지수 | 한국부동산원 |

### 1.6 거래 유형 (deal_type)

| 값 | 의미 |
|----|------|
| `중개거래` | 공인중개사 통한 거래 |
| `직거래` | 매수자-매도자 직접 거래 |
| `(빈값)` | API에서 미제공 |

### 1.7 전월세 유형 (rent_type)

| 값 | 의미 | 판단 기준 |
|----|------|----------|
| `전세` | 전세 계약 | monthly_rent = 0 |
| `월세` | 월세 계약 | monthly_rent > 0 |

### 1.8 콘텐츠 상태 (content_queue.status)

| 값 | 의미 |
|----|------|
| `ready` | 생성 완료, 발행 대기 |
| `posted` | 발행 완료 |
| `failed` | 발행 실패 |
| `hold` | 보류 |

### 1.9 시딩 상태 (seeding_queue.status)

| 값 | 의미 |
|----|------|
| `pending` | 생성 완료, 수동 게시 대기 |
| `posted` | 게시 완료 |

---

## 2. 테이블별 컬럼 정의

### 2.1 apt_complexes (아파트 단지 마스터)

| 컬럼 | 타입 | 설명 | 예시 |
|------|------|------|------|
| id | UUID | PK | |
| region_code | VARCHAR(10) | 법정동 5자리 코드 | `11680` |
| region_name | VARCHAR(100) | 시군구명 | `강남구` |
| dong_name | VARCHAR(50) | 법정동명 | `역삼동` |
| apt_name | VARCHAR(200) | 단지명 (MOLIT 원본) | `래미안퍼스티지` |
| address | VARCHAR(300) | 도로명주소 | |
| total_units | INTEGER | 세대수 | `2444` |
| built_year | INTEGER | 준공년도 | `2009` |
| slug | VARCHAR(200) | URL 슬러그 (UNIQUE) | `11680-래미안퍼스티지` |
| parking_count | INTEGER | 총 주차대수 | `3200` |
| heating_method | VARCHAR(50) | 난방방식 | `지역난방` |
| floor_count | INTEGER | 지상 최고층수 | `35` |
| floor_area_ratio | DECIMAL(6,2) | 용적률 (%) | `249.50` |
| building_coverage | DECIMAL(6,2) | 건폐율 (%) | `18.30` |
| energy_grade | VARCHAR(10) | 에너지효율등급 | `2` |
| elevator_count | INTEGER | 승강기 수 | `56` |
| land_area | DECIMAL(10,2) | 대지면적 (㎡) | `52340.00` |
| building_area | DECIMAL(10,2) | 건축면적 (㎡) | `9578.00` |
| total_floor_area | DECIMAL(12,2) | 연면적 (㎡) | `130500.00` |
| latitude | DECIMAL(10,7) | 위도 | `37.5084000` |
| longitude | DECIMAL(10,7) | 경도 | `127.0280000` |
| property_type | SMALLINT | 부동산 유형 (§1.1 참조) | `1` |
| created_at | TIMESTAMPTZ | 생성일 | |
| updated_at | TIMESTAMPTZ | 수정일 | |

### 2.2 apt_transactions (실거래 내역)

| 컬럼 | 타입 | 설명 | 예시 |
|------|------|------|------|
| id | UUID | PK | |
| complex_id | UUID | FK → apt_complexes | |
| region_code | VARCHAR(10) | 법정동 코드 | `11680` |
| region_name | VARCHAR(100) | 지역명 | `강남구 역삼동` |
| apt_name | VARCHAR(200) | 단지명 | `래미안퍼스티지` |
| size_sqm | DECIMAL(6,2) | 전용면적 (㎡) | `84.93` |
| floor | INTEGER | 거래 층수 | `15` |
| trade_price | BIGINT | 거래가 (만원) | `280000` = 28억 |
| trade_date | DATE | 거래일 | `2026-03-15` |
| highest_price | BIGINT | 해당 단지+면적 최고가 (만원) | `320000` |
| change_rate | DECIMAL(5,2) | 최고가 대비 변동률 (%) | `-12.50` |
| is_new_high | BOOLEAN | 신고가 여부 | `false` |
| is_significant_drop | BOOLEAN | 폭락 여부 (≤-15%) | `false` |
| deal_type | VARCHAR(20) | 거래유형 (§1.6 참조) | `중개거래` |
| drop_level | VARCHAR(10) | 하락등급 (§1.2 참조) | `normal` |
| property_type | SMALLINT | 부동산유형 (§1.1 참조) | `1` |
| raw_data | JSONB | MOLIT 원본 응답 | |
| created_at | TIMESTAMPTZ | 수집일 | |

**가격 단위 규약:** `trade_price`, `highest_price`는 **만원 단위**.
- `280000` = 28억원 = 280,000만원
- 화면 표시 시 `formatPrice()` 함수로 변환: `28억`

**면적 단위 규약:** `size_sqm`은 **㎡ 단위**.
- 평 변환: `size_sqm / 3.3058`
- 화면 표시 시 `formatSizeWithPyeong()`: `84.93㎡ (25.7평)`

### 2.3 apt_rent_transactions (전월세 거래)

| 컬럼 | 타입 | 설명 | 예시 |
|------|------|------|------|
| id | UUID | PK | |
| region_code | VARCHAR(10) | 법정동 코드 | `11680` |
| region_name | VARCHAR(100) | 지역명 | `강남구 역삼동` |
| apt_name | VARCHAR(200) | 단지명 | `래미안퍼스티지` |
| size_sqm | DECIMAL(6,2) | 전용면적 (㎡) | `84.93` |
| floor | INTEGER | 층수 | `15` |
| deposit | BIGINT | 보증금 (만원) | `120000` = 12억 |
| monthly_rent | BIGINT | 월세 (만원, 전세=0) | `0` |
| rent_type | VARCHAR(10) | 전세/월세 (§1.7 참조) | `전세` |
| contract_type | VARCHAR(20) | 신규/갱신 | `신규` |
| trade_date | DATE | 계약일 | `2026-03-10` |
| pre_deposit | BIGINT | 종전 보증금 (갱신 시) | `110000` |
| pre_monthly_rent | BIGINT | 종전 월세 (갱신 시) | `0` |
| raw_data | JSONB | MOLIT 원본 응답 | |
| created_at | TIMESTAMPTZ | 수집일 | |

### 2.4 finance_rates (금리)

| 컬럼 | 타입 | 설명 | 예시 |
|------|------|------|------|
| id | UUID | PK | |
| rate_type | VARCHAR(50) | 금리유형 (§1.4 참조) | `BASE_RATE` |
| rate_value | DECIMAL(5,3) | 금리값 (%) | `2.750` |
| prev_value | DECIMAL(5,3) | 이전 금리값 (%) | `3.000` |
| change_bp | INTEGER | 변동폭 (bp) | `-25` |
| base_date | DATE | 기준일 | `2026-03-15` |
| source | VARCHAR(50) | 출처 | `ECOS` 또는 `FINLIFE` |
| created_at | TIMESTAMPTZ | 수집일 | |

### 2.5 daily_reports (데일리 리포트)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| report_date | DATE | 리포트 날짜 (UNIQUE) |
| title | VARCHAR(300) | 제목 |
| summary | TEXT | 요약 |
| top_drops | JSONB | 폭락 TOP 10 거래 배열 |
| top_highs | JSONB | 신고가 TOP 10 거래 배열 |
| rate_summary | JSONB | 금리 현황 |
| volume_summary | JSONB | 거래량 핫스팟 |
| og_image_url | VARCHAR(500) | OG 이미지 URL |
| created_at | TIMESTAMPTZ | 생성일 |

### 2.6 기타 테이블

| 테이블 | 용도 |
|--------|------|
| page_views | 페이지 조회수 (page_path + view_date 기준 UPSERT) |
| content_queue | 카드뉴스 콘텐츠 큐 (§1.8 상태 코드) |
| seeding_queue | SNS 시딩 큐 (§1.9 상태 코드) |
| push_subscriptions | 웹 푸시 구독자 (endpoint, p256dh, auth) |

---

## 3. 인덱스 목록

| 인덱스 | 테이블 | 컬럼 | 용도 |
|--------|--------|------|------|
| idx_complexes_region | apt_complexes | region_code | 지역별 단지 조회 |
| idx_complexes_name | apt_complexes | apt_name | 단지명 검색 |
| idx_complexes_coords | apt_complexes | latitude, longitude | 지도 좌표 검색 |
| idx_txn_region_date | apt_transactions | region_code, trade_date DESC | 지역별 최근 거래 |
| idx_txn_trade_date | apt_transactions | trade_date DESC | 최근 거래 정렬 |
| idx_txn_change_rate | apt_transactions | change_rate ASC | 폭락 랭킹 |
| idx_txn_property_type | apt_transactions | property_type | 유형별 필터 |
| idx_txn_unique | apt_transactions | apt_name, size_sqm, floor, trade_date, trade_price | 중복 방지 |
| idx_rates_unique | finance_rates | rate_type, base_date | 중복 방지 |
| idx_views_path_date | page_views | page_path, view_date | 조회수 UPSERT |

---

## 4. 데이터 흐름

```
MOLIT API → 크론잡 (fetch-transactions) → apt_transactions + apt_complexes
건축물대장 API → 크론잡 (enrich-complexes) → apt_complexes (보강 컬럼)
카카오 REST API → 크론잡 (geocode-complexes) → apt_complexes (좌표)
ECOS API → 크론잡 (fetch-rates) → finance_rates
FinLife API → 크론잡 (fetch-bank-rates) → finance_rates
부동산원 API → 크론잡 (fetch-reb-index) → reb_price_indices (보조 DB)
```

---

## 5. 변환 함수 참조

| 함수 | 위치 | 입력 → 출력 |
|------|------|------------|
| `formatPrice(v)` | src/lib/format.ts | `280000` → `"28억"` |
| `formatSizeWithPyeong(sqm)` | src/lib/format.ts | `84.93` → `"84.93㎡ (25.7평)"` |
| `sqmToPyeong(sqm)` | src/lib/format.ts | `84.93` → `25.7` |
| `PROPERTY_TYPE_LABELS[n]` | src/lib/constants/property-types.ts | `1` → `"아파트"` |
| `REGION_HIERARCHY[code]` | src/lib/constants/region-codes.ts | `"11"` → `{ name: "서울특별시", ... }` |
| `getSidoBySlug(slug)` | src/lib/constants/region-codes.ts | `"seoul"` → `Sido 객체` |
| `getSidoForCode(code)` | src/lib/constants/region-codes.ts | `"11680"` → `Sido 객체` |

---

## 6. 업데이트 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2026-03-22 | 초기 작성 |
| 2026-03-23 | CockroachDB 이전, property_type/drop_level 추가 |
| 2026-03-24 | 건축물대장 확장 컬럼 추가 (용적률, 건폐율, 에너지등급 등) |
