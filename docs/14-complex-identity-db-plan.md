# 돈줍 단지 식별자 DB 구축 계획

기준일: 2026-06-17 KST

## 1. 결론

`답십리동 두산` 문제는 배포 문제가 아니라 단지 식별자 DB 문제다.

현재 돈줍은 매매 데이터의 `aptSeq`를 `govt_complex_id`로 사용해 `/apt/11230-2036` 같은 canonical URL을 만든다. 그러나 전월세 원천에는 `aptSeq`가 없어서 전세-only 단지는 `govt_complex_id = null`인 fallback 단지로 만들어진다. 이 때문에 `답십리동 두산`은 검색에는 나오지만 `답십리동 두산위브`처럼 숫자형 공식 ID URL로 바뀌지 않는다.

완전 해결은 다음 3가지를 동시에 하는 것이다.

1. `apt_complex_identity` 마스터 DB를 만든다.
2. 매매, 전월세, KAB/외부 단지코드를 모두 이 마스터에 매핑한다.
3. 전월세 거래에도 `complex_id`를 저장하고, 검색/상세/지도/사이트맵은 이 마스터 기준 canonical URL을 사용한다.

## 2. 현재 확인된 사실

### 2.1 답십리동 두산과 두산위브 차이

현재 운영 DB 기준:

| 항목 | 답십리동 두산 | 답십리동 두산위브 |
| --- | --- | --- |
| apt_name | 두산 | 두산위브 |
| dong_name | 답십리동 | 답십리동 |
| region_code | 11230 | 11230 |
| built_year | 2000 | 2007 |
| slug | 11230-답십리동-두산 | 11230-2036 |
| govt_complex_id | null | 11230-2036 |
| 데이터 | 전세 2건 | 매매 2건 + 전월세 5건 |

`두산위브`는 매매 API에서 `aptSeq=11230-2036`이 들어와 공식 ID URL을 만들 수 있다. `두산`은 현재 로컬/운영 데이터에 전월세 거래만 있고 매매 `aptSeq`가 없어 fallback URL을 쓴다.

### 2.2 원천 데이터 한계

현재 코드 기준:

- `src/lib/api/molit.ts`: 아파트 매매 API 응답에서 `aptSeq`를 파싱한다.
- `src/lib/api/molit-rent.ts`: 아파트 전월세 API 응답에는 `aptSeq` 파싱이 없다.
- `src/app/api/cron/fetch-rents/route.ts`: 전월세-only 단지를 `govtComplexId: null`로 생성한다.
- `scripts/local-data-pipeline.mjs`: 로컬 누적 파이프라인도 전월세-only 단지를 `govt_complex_id: null`로 생성한다.

즉 전월세만 있는 단지는 구조적으로 `govt_complex_id`를 채울 수 없다.

## 3. 하면 안 되는 해결책

### 3.1 Kakao/Naver ID를 govt_complex_id에 넣기

하지 않는다.

`govt_complex_id`는 돈줍 URL에서 국토부 매매 `aptSeq` 계열 ID로 쓰고 있다. Kakao place id, Naver complexNo, K-apt kaptCode를 여기에 섞으면 같은 컬럼 안에 서로 다른 ID 체계가 섞인다. 단기적으로 URL이 숫자처럼 보여도 이후 매매 데이터, 사이트맵, 비교, 즐겨찾기, 지도에서 오매칭이 난다.

### 3.2 두산위브 ID를 두산에 붙이기

하지 않는다.

운영 DB에 있는 동대문구 두산 계열 공식 ID는 다음과 같이 서로 다른 단지다.

- `11230-1`: 용두동 두산베어스타워
- `11230-2036`: 답십리동 두산위브
- `11230-2164`: 용두동 용두두산위브

`답십리동 두산`에 위 ID 중 하나를 붙이면 잘못된 단지 병합이다.

## 4. 목표 구조

### 4.1 신규 테이블

```sql
CREATE TABLE IF NOT EXISTS apt_complex_identities (
  id TEXT PRIMARY KEY,
  canonical_id TEXT NOT NULL UNIQUE,
  region_code TEXT NOT NULL,
  region_name TEXT NOT NULL,
  dong_name TEXT,
  apt_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  built_year INT,
  bonbun TEXT,
  bubun TEXT,
  address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  identity_status TEXT NOT NULL DEFAULT 'active',
  confidence INT NOT NULL DEFAULT 100,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS apt_complex_identity_sources (
  id TEXT PRIMARY KEY,
  identity_id TEXT NOT NULL,
  source TEXT NOT NULL,
  source_complex_id TEXT NOT NULL,
  source_payload JSONB,
  confidence INT NOT NULL DEFAULT 100,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE (source, source_complex_id)
);

CREATE TABLE IF NOT EXISTS apt_complex_aliases (
  id TEXT PRIMARY KEY,
  identity_id TEXT NOT NULL,
  alias_type TEXT NOT NULL,
  alias_value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE (alias_type, alias_value)
);
```

### 4.2 기존 테이블 확장

```sql
ALTER TABLE apt_complexes
  ADD COLUMN IF NOT EXISTS identity_id TEXT;

ALTER TABLE apt_rent_transactions
  ADD COLUMN IF NOT EXISTS complex_id TEXT,
  ADD COLUMN IF NOT EXISTS identity_id TEXT;

CREATE INDEX IF NOT EXISTS idx_rent_complex_id
  ON apt_rent_transactions(complex_id);

CREATE INDEX IF NOT EXISTS idx_rent_identity_id
  ON apt_rent_transactions(identity_id);
```

`apt_complexes`는 당장 유지한다. 대신 장기적으로는 `apt_complex_identities`가 canonical source of truth가 되고, `apt_complexes`는 화면/검색용 materialized view 성격으로 낮춘다.

## 5. canonical_id 규칙

### 5.1 우선순위

1. 매매 `aptSeq`가 있으면 `govt:{regionCode}-{aptSeq}`를 canonical source로 저장한다.
2. KAB 매매전월세 단지코드가 있으면 `kab:{kabComplexCode}`를 source로 저장한다.
3. K-apt code가 있으면 `kapt:{kaptCode}`를 source로 저장한다.
4. 외부 공식 코드가 모두 없으면 `natural:{regionCode}:{dongName}:{aptName}:{builtYear}`를 임시 canonical_id로 둔다.

URL은 기존 호환성을 위해 아래처럼 운영한다.

- `govt_complex_id`가 있으면 기존 `/apt/{govt_complex_id}` 유지
- 없고 `identity_id`가 있으면 `/apt/id/{identity_id}` 또는 `/apt/{canonical_id-safe}` 신규 경로 사용
- 기존 fallback `/apt/11230-답십리동-두산`은 새 canonical URL로 308 리다이렉트

실제 URL 형태는 SEO와 호환성을 고려해 별도 선택이 필요하지만, 핵심은 `govt_complex_id` 한 컬럼에 모든 외부 ID를 섞지 않는 것이다.

## 6. 매칭 알고리즘

### 6.1 정규화 키

기본 natural key:

```text
region_code + dong_name + normalized(apt_name) + built_year + property_type
```

보조 key:

```text
region_code + normalized(apt_name) + built_year
region_code + dong_name + normalized(apt_name)
```

`두산`처럼 흔한 단지명은 `dong_name`과 `built_year`가 모두 맞아야 자동 매칭한다.

### 6.2 자동 매칭 confidence

| 조건 | confidence | 자동 반영 |
| --- | ---: | --- |
| region + dong + normalized name + built_year 일치 | 100 | 가능 |
| region + dong + normalized name 일치, 후보 1개 | 90 | 가능 |
| region + normalized name + built_year 일치, 후보 1개 | 85 | 가능 |
| 후보 2개 이상 | 50 이하 | 수동 검토 |
| 이름만 유사 | 40 이하 | 수동 검토 |

## 7. 구축 순서

### 7.1 1단계: 현재 DB에서 마스터 생성

1. `apt_complexes` 전체를 `apt_complex_identities`로 복사한다.
2. `govt_complex_id`가 있는 행은 source `molit_apt_seq`로 기록한다.
3. `govt_complex_id`가 없는 행은 `natural:*` canonical_id로 기록한다.
4. `apt_transactions.complex_id`는 기존 `apt_complexes.id` 기준으로 `identity_id`를 채운다.
5. `apt_rent_transactions`는 natural key로 `identity_id`와 `complex_id`를 채운다.

### 7.2 2단계: 공식 코드 파일 결합

공공데이터의 매매전월세 단지 코드 파일은 기존 `15063990/15063991` 링크가 현재 폐기 응답을 준다. 교육데이터 미러는 VWorld 다운로드 페이지를 가리키지만 자동 다운로드는 로그인/리소스 목록 제한이 있다.

따라서 운영 방식은 둘 중 하나다.

1. 사용자가 VWorld 또는 공공데이터에서 파일을 수동 다운로드해 `.donjup-local-data/reference/complex-codes/`에 저장한다.
2. 다운로드 가능한 대체 공식 출처가 확인되면 `scripts/import-complex-code-reference.ts`로 자동 수집한다.

파일을 확보하면 다음을 한다.

1. KAB 단지코드, 단지명, 법정동코드, 본번, 부번, 법정동명, 건축년도를 staging table에 적재한다.
2. confidence 100/90 후보만 자동 매칭한다.
3. 충돌 후보는 `.donjup-local-data/runs/complex-identity-review-*.json`에 남긴다.

### 7.3 3단계: 수집 파이프라인 변경

매매 수집:

1. `aptSeq`가 있으면 `molit_apt_seq` source를 upsert한다.
2. 기존 natural identity가 있으면 같은 identity에 `molit_apt_seq` source를 연결한다.
3. `apt_complexes.govt_complex_id`와 `slug`는 필요 시 canonical 값으로 승격한다.

전월세 수집:

1. 전월세 row 수집 시 natural key로 identity를 찾는다.
2. 없으면 `natural:*` identity를 만든다.
3. `apt_rent_transactions.identity_id`와 `complex_id`를 저장한다.
4. 전월세-only 단지도 상세 페이지에서 전월세 이력을 안정적으로 조회한다.

### 7.4 4단계: URL/검색 변경

1. `aptUrl()`은 `govtComplexId` 우선, `identityId` 다음, legacy slug 마지막으로 바꾼다.
2. 검색 API는 `identity_id`를 함께 반환한다.
3. 상세 페이지는 `govtComplexId`, `identityId`, legacy slug를 모두 lookup할 수 있어야 한다.
4. 사이트맵은 `govtComplexId`가 없는 단지도 identity URL로 포함한다.
5. legacy fallback URL은 308로 identity URL에 연결한다.

## 8. 답십리동 두산 적용 시나리오

### 현재 상태

`답십리동 두산`은 전세-only 단지라 `natural:11230:답십리동:두산:2000` identity가 된다.

### 공식 코드 파일 확보 후

KAB/공식 단지코드 파일에서 다음 조건의 단일 후보를 찾는다.

```text
법정동코드 = 11230
법정동명 = 답십리동
KAB단지명 또는 단지명 = 두산
건축년도 = 2000
```

단일 후보면:

1. `apt_complex_identity_sources`에 `source='kab_complex_code'`로 저장한다.
2. 해당 identity confidence를 100으로 올린다.
3. `apt_complexes.identity_id`와 `apt_rent_transactions.identity_id`를 backfill한다.
4. URL은 identity URL로 고정한다.

과거 매매 API에서 `aptSeq`가 발견되면:

1. 같은 identity에 `source='molit_apt_seq'`를 추가한다.
2. `apt_complexes.govt_complex_id`를 채운다.
3. 기존 fallback URL은 `/apt/{govt_complex_id}`로 308 리다이렉트한다.

## 9. 검증 기준

### DB 검증

```sql
SELECT COUNT(*) FROM apt_complexes WHERE govt_complex_id IS NULL;
SELECT COUNT(*) FROM apt_complexes WHERE identity_id IS NULL;
SELECT COUNT(*) FROM apt_rent_transactions WHERE identity_id IS NULL;
SELECT * FROM apt_complex_identity_sources WHERE identity_id = '<답십리동 두산 identity>';
```

### 공개 검증

1. `/api/search?q=답십리 두산`이 `두산`, `두산위브`를 모두 반환한다.
2. `두산` 결과의 URL이 legacy fallback이 아니라 identity/canonical URL이다.
3. `두산` 상세 페이지에 전월세 2건이 표시된다.
4. 기존 `/apt/11230-답십리동-두산`은 새 canonical URL로 308 리다이렉트된다.
5. 사이트맵에 `두산` canonical URL이 포함된다.

## 10. 현실적인 작업 단위

### Batch A: 스키마와 내부 identity 도입

- `apt_complex_identities`
- `apt_complex_identity_sources`
- `apt_complex_aliases`
- `apt_complexes.identity_id`
- `apt_rent_transactions.identity_id`
- local/DB backfill script

### Batch B: 수집 파이프라인 연결

- 매매 수집 identity upsert
- 전월세 수집 identity upsert
- 로컬 누적 파일 업로드 시 identity 생성

### Batch C: URL/상세/사이트맵 전환

- `aptUrl()` identity 지원
- 검색 API identity 반환
- 상세 lookup identity 지원
- sitemap identity URL 포함
- legacy redirect 유지

### Batch D: 공식 코드 파일 import

- 수동 파일 저장 경로: `.donjup-local-data/reference/complex-codes/`
- importer 작성
- confidence 자동 매칭
- review 파일 생성
- 답십리동 두산 매핑 검증

## 11. 최종 판단

`답십리동 두산` 하나만 급히 고치려면 수동 ID를 찾는 방법도 있다. 하지만 돈줍 서비스 특성상 전월세-only 단지는 계속 생긴다. 따라서 지금은 단건 수정보다 `단지 식별자 DB`를 먼저 구축하는 것이 맞다.

이 설계대로 가면 매매-only, 전월세-only, 향후 외부 단지코드가 모두 같은 identity에 붙고, URL/검색/지도/상세/사이트맵이 같은 기준으로 움직인다.
