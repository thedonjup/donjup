# 돈줍 조회기간 확대 및 트래픽 절감 운영 계획

기준일: 2026-06-22 KST

## 1. 목적

돈줍의 매매/전월세 조회기간을 현재 2026년 5월 이후 중심의 단기 데이터에서 3개월, 6개월, 12개월, 필요 시 24~36개월까지 단계적으로 확장한다.

핵심 목표는 단순히 과거 데이터를 많이 넣는 것이 아니라 다음을 동시에 만족하는 것이다.

1. 공공 API 재호출을 최소화한다.
2. CockroachDB 저장량, RU, 쿼리량을 무료/저비용 범위에 맞춘다.
3. Vercel public traffic과 서버리스 실행 시간을 통제한다.
4. `.donjup-local-data`에 먼저 누적하고 검증된 변경분만 DB에 반영한다.
5. 기존 `identity_id`, `complex_id`, canonical URL 구조를 깨지 않는다.

## 2. 현재 상태 요약

### 2.1 확인한 repo 구조

현재 돈줍은 Next.js 앱과 운영 스크립트가 한 repo 안에 있다.

주요 경로:

| 경로 | 역할 |
| --- | --- |
| `src/app` | 화면, API, cron route |
| `src/lib` | DB query, 캐시, MOLIT client, identity helper |
| `src/lib/db/schema` | Drizzle schema |
| `scripts/local-data-pipeline.mjs` | 로컬 수집, 업로드, 정합성, 캐시 갱신 파이프라인 |
| `scripts/run-local-backup.py` | 긴 로컬 백업/업로드 실행기 |
| `scripts/run-db-maintenance.py` | daily DB health/backup 유지보수 |
| `scripts/check-db-health.py` | DB/로컬 상태 기록 |
| `scripts/show-db-status.py` | 최신 운영 상태 리포터 |
| `.donjup-local-data` | 로컬 JSONL 데이터, manifest, runs 로그 |
| `.donjup-local-data/runs` | `db-health`, `maintenance`, `backup`, `timer-audit`, 작업별 상세 로그 |

현재 작업트리는 다른 변경이 많으므로 조회기간 확대 구현 시에도 `git add .`는 금지하고 필요한 파일만 선별해야 한다.

### 2.2 package scripts 기준 운영 명령

중요 명령:

```bash
pnpm --silent db:status:ops
pnpm db:health
pnpm db:maintenance
pnpm db:backup
pnpm db:recalculate-signals
pnpm db:reconcile-rents
pnpm db:refresh-cache
node scripts/local-data-pipeline.mjs status
node scripts/local-data-pipeline.mjs collect --kind=both --months=1 --batch=0
node scripts/local-data-pipeline.mjs upload --apply=true
```

위 `upload --apply=true`는 기존 운영 명령 목록이다. 조회기간 확대 작업에서는 scoped upload 구현 전까지 이 명령을 바로 실행하지 않는다.

`db:status:ops`는 DB를 새로 호출하는 명령이 아니라 최신 run JSON과 systemd timer 상태를 읽어 운영상 문제가 있는지 판단한다. 따라서 실패하더라도 곧바로 서비스 장애로 보면 안 되고, public smoke와 direct DB count를 같이 확인해야 한다.

### 2.3 현재 DB/로컬 상태

2026-06-22 점검 기준 direct DB:

| 항목 | 값 |
| --- | ---: |
| `apt_complexes` | 26,234 |
| `apt_complex_identities` | 20,444 |
| `apt_transactions` | 38,551 |
| `apt_rent_transactions` | 67,219 |
| `page_views` | 57 |
| `homepage_cache` | 1 |
| 매매 기간 | 2026-05-01 ~ 2026-06-21 |
| 전월세 기간 | 2026-05-01 ~ 2026-06-21 |
| `apt_complexes.identity_id` 누락 | 0 |
| 매매 `identity_id` 누락 | 0 |
| 전월세 `identity_id` 누락 | 14 |
| 전월세 `complex_id` 누락 | 14 |

월별 direct DB count:

| 월 | 매매 | 전월세 |
| --- | ---: | ---: |
| 2026-05 | 22,552 | 38,064 |
| 2026-06 | 15,999 | 29,155 |

로컬 `.donjup-local-data` 상태:

| 항목 | 값 |
| --- | ---: |
| sale raw rows | 81,245 |
| sale unique rows | 38,480 |
| rent raw rows | 154,845 |
| rent unique rows | 67,084 |
| last collect | 2026-06-20T18:24:29.738Z |
| last collect scope | 202606, 70 regions, sale+rent |
| last collect requests | 140 |
| last upload inserted sale | 329 |
| last upload inserted rent | 0 |

최근 `pnpm --silent db:status:ops`:

```text
health: run=20260621-181439 verified=true warnings=0 age=11.0h
db: complexes=26228 sale=38511 rent=67149 pageViews=57
local: size=319.6MB saleUnique=38480 rentUnique=67084
alignment: saleDelta=-31 rentDelta=-65
timer audit: status=ok
```

`db:status:ops`는 정상으로 돌아왔고, DB와 로컬 차이도 작은 상태다. 단 direct DB count는 cron 실행 등으로 health snapshot보다 조금 더 최신일 수 있다.

### 2.4 현재 수집 경로의 특성

`scripts/local-data-pipeline.mjs` 기준:

| 항목 | 현재값 |
| --- | --- |
| 기본 수집 개월 | `DEFAULT_MONTH_COUNT = 1` |
| 한 번에 허용하는 최대 개월 | `MAX_MONTH_COUNT = 6` |
| API 요청 간 delay | `REQUEST_DELAY_MS = 300` |
| DB upload batch size | `UPLOAD_BATCH_SIZE = 500` |
| signal update batch size | `SIGNAL_UPDATE_BATCH_SIZE = 250` |
| local files | `sale-transactions.jsonl`, `rent-transactions.jsonl`, `manifest.json` |

현재 구조는 JSONL에 append한 뒤 id 기준 dedupe하여 DB upsert한다. 매매와 전월세 모두 identity row, identity source, alias, complex, transaction row를 함께 생성/연결한다.

Cron route 기준:

| route | 특징 |
| --- | --- |
| `src/app/api/cron/fetch-transactions/route.ts` | 매매 수집, `maxDuration=300`, 기존 ID 확인 후 insert, identity/source/alias 연결 |
| `src/app/api/cron/fetch-rents/route.ts` | 전월세 수집, rent-only complex/identity 생성, 기존 ID 확인 후 insert |
| `src/app/api/cron/refresh-cache/route.ts` | homepage cache refresh |

Cron은 공개 서비스의 daily incremental 용도로 유지하고, 긴 기간 backfill은 Vercel cron이 아니라 로컬 배치로 처리하는 것이 안전하다.

### 2.5 현재 캐시와 page_views

Public data cache:

| 파일 | 설정 |
| --- | --- |
| `src/lib/api/cache-headers.ts` | 기본 `s-maxage=120`, `stale-while-revalidate=600` |
| `src/lib/cache-tags.ts` | `apt-transactions`, `apt-rent-transactions`, `homepage`, `page-views` 등 tag |
| `src/lib/apt-detail-query.ts` | 상세 조회 `unstable_cache`, revalidate 3600초 |
| `src/lib/market-dashboard-query.ts` | 시장 대시보드 `unstable_cache`, revalidate 1800~3600초 |
| `src/lib/map-dashboard-query.ts` | 지도 거래 `unstable_cache`, revalidate 1800초 |
| `src/lib/apt-sitemap-query.ts` | sitemap item `unstable_cache`, revalidate 86400초 |

`page_views`는 `DONJUP_PAGEVIEW_WRITE_SAMPLE_RATE` 기반 샘플링을 지원한다. 2026-06-20 운영 점검 때는 production에 샘플링 값이 설정되어 있었고, 실제 row는 hit마다 1개씩 늘지 않고 샘플에 걸린 경우 `view_count`를 가중치로 올리는 방식이었다. 이 값은 환경변수에 따라 달라질 수 있으므로 조회기간 확대 착수 전 production env를 다시 확인한다.

## 3. 조회기간 확대 목표안

### 3.1 기본 원칙

조회기간 확대는 아래 순서로 한다.

1. 로컬 수집 dry-run 성격으로 누적한다.
2. manifest/checkpoint로 성공한 month-region-kind를 고정한다.
3. local unique count와 DB count 차이를 확인한다.
4. 소량 upload를 먼저 적용한다.
5. 캐시 갱신과 public smoke를 통과하면 다음 batch로 넘어간다.

한 번에 12개월 이상을 실행하지 않는다. 현재 `local-data-pipeline`의 `MAX_MONTH_COUNT=6`도 이 원칙과 맞다. 12개월 이상은 6개월 이하 chunk를 여러 번 실행한다.

### 3.2 API 호출량 기준

현재 전국 수집 기준은 70개 region, 매매/전월세 2종이다.

```text
1개월 전체 수집 요청 수 = 70 regions * 2 kinds = 140 requests
```

단계별 총 요청 수:

| 단계 | 목표 기간 | 총 요청 수 | 현재 2026-05~06 보유 기준 추가 요청 |
| --- | ---: | ---: | ---: |
| Batch A | 최근 3개월 | 420 | 약 140 |
| Batch B | 최근 6개월 | 840 | 약 560 |
| Batch C | 최근 12개월 | 1,680 | 약 1,400 |
| Batch D | 24개월 | 3,360 | 약 3,080 |
| Batch D+ | 36개월 | 5,040 | 약 4,760 |

위 수치는 retry를 제외한 최소 요청 수다. 429/502 재시도 여유를 10~20% 잡아야 한다.

### 3.3 저장 row 증가 예상

현재 2026-05 한 달의 full month에 가까운 row count는 다음과 같다.

| 기준월 | 매매 | 전월세 | 합계 |
| --- | ---: | ---: | ---: |
| 2026-05 | 22,552 | 38,064 | 60,616 |

보수적 추정:

| 단계 | 예상 unique transaction rows | 현재 대비 증가 | 운영 판단 |
| --- | ---: | ---: | --- |
| Batch A 3개월 | 150K~190K | +45K~85K | 안전 |
| Batch B 6개월 | 330K~430K | +220K~320K | 가능, 캐시/인덱스 확인 필요 |
| Batch C 12개월 | 700K~950K | +590K~840K | 가능하지만 시장/지도 쿼리 개선 선행 권장 |
| Batch D 24개월 | 1.4M~2.0M | +1.3M~1.9M | summary/cache 없이는 위험 |
| Batch D 36개월 | 2.1M~3.0M | +2.0M~2.9M | 별도 장기 저장/요약 전략 필요 |

CockroachDB Basic 10GiB 안에는 들어갈 가능성이 있지만, 무료/저비용 운영에서는 저장량보다 read/write RU와 hot query가 더 먼저 문제가 될 수 있다.

### 3.4 단계별 중단/재개 기준

공통 중단 기준:

| 조건 | 조치 |
| --- | --- |
| 공공 API 429 반복 | 현재 month-region-kind를 failed로 기록하고 30~60분 backoff |
| 공공 API 502 반복 | 3회 재시도 후 checkpoint 저장, 다음 region으로 이동 |
| DB upload batch 실패 | 해당 chunk 중단, upload review 파일 저장 |
| `db:status:ops` warning 발생 | public smoke와 direct DB count 확인 후 다음 단계 보류 |
| Vercel 500/error 로그 발생 | 캐시 갱신 중단, public traffic route 우선 복구 |
| DB/local delta가 임계값 초과 | 누락/중복 원인 분석 전 다음 기간 확대 금지 |

재개 기준:

1. `manifest.extendedPeriod.items[month-region-kind].status`가 `fetched`, `empty`, `uploaded`, `verified`인 item은 재호출하지 않는다.
2. failed item은 `retryAfter`가 지난 뒤만 재시도한다.
3. upload는 transaction ID 기준 idempotent upsert이므로 같은 local file을 다시 적용해도 row가 중복되면 안 된다.
4. signal recalculation과 cache refresh는 upload 성공 후 별도 단계로 실행한다.

## 4. 수집/저장 설계

### 4.1 month-region-kind 작업 단위

조회기간 확대의 최소 단위는 다음 키다.

```text
kind + dealYearMonth + regionCode
```

예:

```text
sale:202604:11680
rent:202604:11680
```

각 item은 아래 상태를 가진다.

| 상태 | 의미 |
| --- | --- |
| `pending` | 아직 호출하지 않음 |
| `fetching` | 현재 호출 중 |
| `fetched` | API 응답을 로컬 JSONL에 저장 완료 |
| `empty` | 정상 응답이지만 row 0건 |
| `failed_retryable` | 429/502 등 재시도 가능 |
| `failed_final` | 반복 실패 또는 파싱 실패 |
| `uploaded` | DB 반영 완료 |
| `verified` | DB count/date bounds 검증 완료 |

### 4.2 manifest/checkpoint 구조

기존 `manifest.json`을 바로 덮어쓰기보다 `extendedPeriod` 하위에 별도 상태를 둔다.

```json
{
  "extendedPeriod": {
    "version": 1,
    "targetMonths": ["202604", "202603", "202602"],
    "items": {
      "sale:202604:11680": {
        "status": "fetched",
        "attempts": 1,
        "rowCount": 312,
        "fetchedAt": "2026-06-22T00:00:00.000Z",
        "file": "sale-transactions.jsonl"
      }
    },
    "lastRun": {
      "runId": "extended-period-20260622T000000Z",
      "mode": "collect",
      "status": "paused"
    }
  }
}
```

별도 review 파일:

```text
.donjup-local-data/runs/extended-period-*/plan.json
.donjup-local-data/runs/extended-period-*/collect-summary.json
.donjup-local-data/runs/extended-period-*/failed-items.json
.donjup-local-data/runs/extended-period-*/upload-review.json
.donjup-local-data/runs/extended-period-*/verify-summary.json
```

### 4.3 재호출 방지

수집 전 반드시 다음을 확인한다.

1. DB에 해당 `kind + month + regionCode` row가 이미 충분히 있는지 확인한다.
2. local manifest에 `fetched`, `empty`, `uploaded`, `verified`가 있는지 확인한다.
3. local JSONL에 같은 transaction ID가 이미 있는지 확인한다.

권장 판정:

```text
DB row exists and local item verified -> skip
manifest fetched but not uploaded -> skip API, go upload/review
manifest failed_retryable and retryAfter passed -> retry
manifest failed_final -> skip until manual reset
```

### 4.4 로컬 우선 저장

긴 기간 수집은 무조건 로컬에 먼저 저장한다.

```bash
node scripts/local-data-pipeline.mjs collect --kind=both --ym=202604 --batch=0
node scripts/local-data-pipeline.mjs status
node scripts/local-data-pipeline.mjs upload
# scoped upload 구현 전에는 아래 apply를 실행하지 않는다.
# node scripts/local-data-pipeline.mjs upload --apply=true
```

주의: 현재 `local-data-pipeline.mjs upload`는 특정 월이나 특정 run만 골라 올리는 명령이 아니다. `sale-transactions.jsonl`, `rent-transactions.jsonl` 전체를 읽고 DB에 없는 row를 모두 반영한다. 따라서 이미 여러 달을 로컬에 모아둔 상태에서 `upload --apply=true`를 실행하면 Batch A 범위를 넘어선 데이터까지 들어갈 수 있다.

Batch A 구현 전까지 현재 명령만 사용할 때의 안전 조건:

1. 수집 직전 local status와 manifest를 저장한다.
2. Batch A 대상 월 외에 `fetched but not uploaded` 상태의 item이 없는지 확인한다.
3. `upload --apply=false` 결과와 direct DB month count로 예상 insert가 202604 범위인지 확인한다.
4. out-of-scope row가 있으면 기존 `upload --apply=true`를 실행하지 않고 scoped upload 구현을 먼저 한다.

구현 시에는 기존 `collect`를 그대로 반복 호출하는 wrapper를 만들거나, `local-data-pipeline`에 `backfill-period` command를 추가한다.

권장 wrapper:

```bash
node scripts/extended-period-backfill.mjs plan --months=3 --kind=both
node scripts/extended-period-backfill.mjs collect --run-id=extended-period-YYYYMMDD --months=202604 --kind=both --max-requests=140
node scripts/extended-period-backfill.mjs upload --run-id=extended-period-YYYYMMDD --months=202604 --apply=false
node scripts/extended-period-backfill.mjs upload --run-id=extended-period-YYYYMMDD --months=202604 --apply=true --max-upserts=50000
node scripts/extended-period-backfill.mjs verify --run-id=extended-period-YYYYMMDD
```

### 4.5 scoped upload 설계

조회기간 확대용 upload는 반드시 run/month scope를 가져야 한다.

필수 규칙:

1. `--run-id`와 `--months` 또는 `--from-month/--to-month` 없이 apply upload를 허용하지 않는다.
2. upload 대상 row는 local JSONL 전체에서 읽더라도 `tradeDate`가 target month 안에 있는 row만 후보로 삼는다.
3. 후보 row의 `kind + yearMonth + regionCode`가 manifest의 target item에 포함되어야 한다.
4. `maxUpserts`를 초과하면 실제 DB 쓰기 전에 중단하고 `upload-review.json`만 남긴다.
5. apply 전 review에는 `candidateRows`, `existingRows`, `insertableRows`, `outOfScopeRows`를 kind별로 기록한다.
6. `outOfScopeRows > 0`이면 apply를 거부한다.

필수 review 파일:

```text
upload-review.json
insert-candidates-sale.jsonl
insert-candidates-rent.jsonl
out-of-scope-sale.jsonl
out-of-scope-rent.jsonl
```

apply 후 필수 rollback 파일:

```text
inserted-sale-ids.jsonl
inserted-rent-ids.jsonl
inserted-complex-ids.jsonl
inserted-identity-ids.jsonl
inserted-identity-source-ids.jsonl
inserted-alias-ids.jsonl
```

이 파일들이 없으면 "부분 rollback 가능"이라고 판단하지 않는다.

### 4.6 idempotent upsert/dedupe 기준

기존 ID 기준을 유지한다.

매매:

```text
regionCode + aptName + sizeSqm + tradeDate + tradePrice + floor
```

전월세:

```text
regionCode + dongName + aptName + sizeSqm + floor + deposit + monthlyRent + rentType + contractType + tradeDate + preDeposit + preMonthlyRent
```

단지 identity:

```text
govt_complex_id가 있으면 molit identity
없으면 regionCode + dongName + normalized aptName + builtYear + propertyType natural identity
```

`govt_complex_id`에는 계속 국토부 매매 `aptSeq` 계열만 넣는다. Kakao/Naver/K-apt/KAB ID는 `apt_complex_identity_sources`에만 넣는다.

## 5. 트래픽 최소화 설계

### 5.1 공공 API 호출 최소화

원칙:

1. `missing month-region-kind`만 호출한다.
2. 성공 item은 manifest로 영구 skip한다.
3. row 0건도 정상 결과로 저장해 재호출하지 않는다.
4. 429/502는 짧게 반복하지 않고 backoff를 길게 둔다.
5. batch별 `maxRequests`를 둔다.

보수적 기본값:

| 옵션 | 기본값 |
| --- | ---: |
| `maxRequestsPerRun` | 140 |
| `requestDelayMs` | 500~1000 |
| `maxRetriesPerItem` | 2 |
| `retryBackoffSeconds` | 60, 300, 1800 |
| `maxFailedItemsPerRun` | 10 |

현재 1개월 전체가 140 requests이므로 하루 한 달치씩만 확장하면 공공 API에도 무리가 적다.

### 5.2 DB 쓰기 최소화

쓰기 절감 원칙:

1. local JSONL에서 unique ID를 먼저 만든다.
2. DB에는 existing IDs를 500~1000개 단위로 조회한다.
3. 없는 ID만 insert한다.
4. identity/source/alias/complex도 dedupe 후 upsert한다.
5. upload 후 signal recalculation은 변경 region만 수행한다.
6. cache refresh는 모든 chunk마다 하지 않고 단계 종료 후 1회만 수행한다.

보수적 기본값:

| 항목 | 값 |
| --- | ---: |
| insert batch size | 500 |
| max upserts per upload run | 50,000 |
| signal recalculation batch | 250 |
| cache refresh | upload 완료 후 1회 |
| dry-run review 필수 row 기준 | 10,000 이상 |

### 5.3 DB 읽기 최소화

조회기간 확대 후 위험한 패턴:

1. `/market/seoul`에서 거래 raw table 전체를 매번 count/aggregate한다.
2. `/map`에서 좌표 있는 전체 거래를 최신순으로 크게 가져온다.
3. 상세 페이지가 과거 전체 거래를 한 번에 가져온다.
4. 검색 결과에서 latest sale/rent를 모든 후보마다 subquery로 계산한다.

대응:

| 화면/API | 전략 |
| --- | --- |
| 검색 | 단지 후보는 `apt_complexes`/identity 기준, latest 거래는 제한된 subquery 또는 summary |
| 상세 | 기본 최근 50건 매매, 200건 전월세 유지. 과거는 `cursor`/`yearMonth` 더보기 |
| 지도 | 기본 최신 N건 + bounds/zoom/region 필터. 장기 데이터는 지도에 싣지 않음 |
| 시장 | raw scan 대신 월/지역 summary table 또는 cache |
| 홈 | `homepage_cache`를 우선 사용 |
| sitemap | 1일 cache, identity URL만 포함, 거래기간과 무관 |

### 5.4 Vercel 트래픽 최소화

1. public API는 기본 cache header를 유지한다.
2. 데이터 확대 직후에는 `revalidateTag`를 모든 route마다 반복하지 않고 필요한 tag만 1회 수행한다.
3. `/map` payload는 `MAP_TRANSACTION_LIMIT`와 viewport/bounds 기반으로 제한한다.
4. 상세 페이지는 SSR/API payload에 전체 과거 이력을 싣지 않는다.
5. 12개월 이상 확대 시 과거 거래는 별도 API `/api/apt/[id]/history?cursor=...` 형태로 분리한다.
6. `/market/seoul`은 서버에서 사전 집계된 결과만 렌더링한다.

### 5.5 page_views 정책

`page_views` 쓰기는 `DONJUP_PAGEVIEW_WRITE_SAMPLE_RATE` 기반 샘플링/가중치 방식을 지원하지만, 코드 기본값(`DEFAULT_PAGEVIEW_WRITE_SAMPLE_RATE`)은 `1`(샘플링 없음, 100%)이다. 실제로 비용이 줄어드는지는 운영 환경변수에 낮은 값이 설정돼 있는지에 달려 있으므로, 조회기간 확대 착수 전 `vercel env ls`로 production 값을 먼저 확인한다.

권장값:

| 트래픽 상태 | `DONJUP_PAGEVIEW_WRITE_SAMPLE_RATE` |
| --- | ---: |
| 낮음 | 0.1 |
| 보통 | 0.05 |
| DB 쓰기 경고 | 0.01 |
| 장애/한도 임박 | 0 |

`page_views`는 서비스 핵심 데이터가 아니므로, DB 한도 보호가 필요하면 가장 먼저 write sampling을 낮춘다.

## 6. DB/인덱스/쿼리 개선안

### 6.1 현재 확인된 주요 인덱스

2026-06-23 direct DB 기준 현재 운영 DB에는 다음 인덱스가 있다. 코드의 `maintenance-migration.ts`에 후보 인덱스가 있어도 운영 DB에 실제 적용되지 않은 것은 아래 "현재 인덱스"로 보지 않는다.

| 테이블 | 인덱스 |
| --- | --- |
| `apt_transactions` | `idx_txn_region_date`, `idx_txn_trade_date`, `idx_txn_complex`, `idx_transactions_identity_id`, `idx_txn_unique`, `idx_txn_change_rate`, `idx_txn_significant`, `idx_txn_property_type` |
| `apt_rent_transactions` | `idx_rent_region_date`, `idx_rent_complex_id`, `idx_rent_identity_id` |
| `apt_complexes` | `idx_complexes_region`, `idx_complexes_name`, `idx_complexes_identity_id`, `idx_complexes_coords`, `idx_complexes_govt_complex_id`, `apt_complexes_govt_complex_id_key`, `apt_complexes_slug_key` |
| `apt_complex_identities` | `idx_complex_identities_region_name`, `canonical_id` |
| `page_views` | `idx_views_path_date`, `idx_views_type_date`, `idx_views_region_date`, `idx_views_complex` |

현재 운영 DB에 없는 것으로 확인된 후보:

```text
idx_txn_complex_id
idx_txn_region_apt
idx_complex_region_slug
```

위 3개는 Batch A/B에서 "이미 있다"고 가정하지 않는다. 필요하면 적용 전 direct index query와 `EXPLAIN`으로 실제 이득을 확인한다.

### 6.2 추가 후보 인덱스

12개월 이상 확대 전 검토할 인덱스:

```sql
CREATE INDEX IF NOT EXISTS idx_txn_identity_date
  ON apt_transactions(identity_id, trade_date DESC);

CREATE INDEX IF NOT EXISTS idx_rent_identity_date
  ON apt_rent_transactions(identity_id, trade_date DESC);

CREATE INDEX IF NOT EXISTS idx_txn_region_property_date
  ON apt_transactions(region_code, property_type, trade_date DESC);

CREATE INDEX IF NOT EXISTS idx_rent_region_name_date
  ON apt_rent_transactions(region_code, apt_name, trade_date DESC);
```

주의:

1. 인덱스는 read를 줄이지만 write와 storage를 늘린다.
2. Batch A/B에서는 기존 인덱스만으로 먼저 검증한다.
3. Batch C 진입 전에 slow route와 query plan을 보고 필요한 것만 추가한다.

### 6.3 summary/cache table 후보

12개월 이상에서 검토할 summary table:

```sql
CREATE TABLE IF NOT EXISTS apt_region_monthly_stats (
  id TEXT PRIMARY KEY,
  region_code TEXT NOT NULL,
  year_month TEXT NOT NULL,
  property_type INT NOT NULL DEFAULT 1,
  sale_count INT NOT NULL DEFAULT 0,
  sale_median_price INT,
  sale_avg_price INT,
  rent_count INT NOT NULL DEFAULT 0,
  rent_median_deposit INT,
  rent_avg_deposit INT,
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(region_code, year_month, property_type)
);
```

우선순위:

1. `/market/seoul` raw aggregate 제거
2. 홈/시장 핵심 지표 cache
3. 지도 최신 거래 cache
4. 단지별 latest sale/rent summary

Batch C 이전에는 migration 없이도 가능하지만, Batch D는 summary/cache 없이는 운영 위험이 크다.

### 6.4 상세 페이지 조회 방식

기본 상세 API:

```text
최근 매매 50건
최근 전월세 200건
```

과거 조회:

```text
/api/apt/{id}/history?kind=sale&cursor=2025-12-01&limit=50
/api/apt/{id}/history?kind=rent&yearMonth=202506&limit=100
```

사용자가 과거를 열어볼 때만 호출한다. 초기 상세 페이지 payload에는 과거 전체를 넣지 않는다.

### 6.5 지도 조회 방식

지도는 장기 데이터 전체 조회를 금지한다.

권장:

```text
기본: 최신 2,000~5,000건 이하
필터: bounds + zoom + regionCode + tradeDate window
과거: 지도에서는 월 선택 시 해당 월 summary 또는 제한된 샘플만 표시
```

지도 API 후보:

```text
/api/map/transactions?bounds=...&from=2026-06-01&to=2026-06-30&limit=2000
```

### 6.6 `/market/seoul` 개선 방향

현재는 cache가 있어 즉시 장애는 아니지만, 장기 데이터가 늘어나면 전체 raw scan 위험이 커진다.

개선 원칙:

1. 지역별 summary를 precompute한다.
2. 시장 화면은 최근 30/90/180일 window만 기본으로 읽는다.
3. 장기 추세는 월별 summary만 읽는다.
4. raw transaction list는 최신 20건 또는 cursor API만 제공한다.

## 7. 운영 자동화

### 7.1 권장 스케줄

| 작업 | 주기 | 방식 |
| --- | --- | --- |
| daily current month 수집 | 매일 새벽 | 기존 `db:maintenance`/`db:backup` 유지 |
| Batch A backfill | 수동 또는 하루 1개월 | 로컬 extended-period wrapper |
| Batch B backfill | Batch A 안정화 후 | 1일 1~2개월 이하 |
| Batch C backfill | query 개선 후 | 6개월 chunk 2회 |
| Batch D backfill | summary/cache 도입 후 | 월별 저속 실행 |

### 7.2 kill switch/config

환경 또는 config 후보:

```env
DONJUP_EXTENDED_BACKFILL_ENABLED=false
DONJUP_EXTENDED_MAX_REQUESTS_PER_RUN=140
DONJUP_EXTENDED_MAX_UPSERTS_PER_RUN=50000
DONJUP_EXTENDED_REQUEST_DELAY_MS=1000
DONJUP_EXTENDED_MAX_RETRIES=2
DONJUP_EXTENDED_REFRESH_CACHE=false
DONJUP_PAGEVIEW_WRITE_SAMPLE_RATE=0.1
```

운영 원칙:

1. 기본값은 disabled다.
2. 수동 명령에서만 enable한다.
3. DB 경고가 있으면 collect는 가능하되 upload는 막는다.
4. cache refresh는 명시 옵션 없이는 실행하지 않는다.

### 7.3 백업-backfill 동시성 가드

로컬 컴퓨터 백업(`db:backup` → `run-local-backup.py`)과 extended-period backfill의 collect/upload는 둘 다 CockroachDB에 직접 connection을 만들고 `.donjup-local-data/sale-transactions.jsonl`, `rent-transactions.jsonl`에 동시에 쓴다. 실제 코드 확인 결과 다음이 동시 실행 시 충돌점이다.

| 충돌 지점 | 내용 |
| --- | --- |
| DB connection pool | `local-data-pipeline.mjs` max=1, `src/lib/db/index.ts` 기본 max=2. backup과 backfill upload가 겹치면 풀이 바로 소진되어 한쪽이 대기/timeout |
| 로컬 JSONL 파일 | 두 프로세스가 같은 `sale-transactions.jsonl`/`rent-transactions.jsonl`에 `appendFile`하면 레이스 컨디션 발생 |
| maintenance lock | `run-db-maintenance.py`는 `maintenance.lock`(fcntl)으로 자기 자신과의 중복 실행만 막는다. `db:backup` 단독 실행이나 extended-period backfill과는 공유되지 않는다 |

현재 systemd timer는 `donjup-db-maintenance.timer`(03:10 +10분 랜덤), `donjup-db-maintenance-audit.timer`(03:35 +5분 랜덤)로 새벽에만 자동 backup이 돈다. 수동 backfill 실행 시각이 이 새벽 구간과 겹치지 않으면 사고는 안 나지만, 보장 장치가 없으므로 다음을 추가한다.

가드 설계:

1. `run-db-maintenance.py`의 `maintenance.lock`과 동일한 `fcntl.flock(LOCK_EX | LOCK_NB)` 방식으로 `.donjup-local-data/extended-period.lock`을 도입한다.
2. extended-period backfill의 collect/upload 시작 시 `extended-period.lock`을 실제 acquire한다.
3. `run-local-backup.py`/`run-db-maintenance.py` 쪽에서도 backup 실행 전에 같은 `extended-period.lock`을 실제 acquire하거나, acquire 실패 시 backup을 skip한다.
4. 단순히 lock 파일 존재 여부만 확인하는 방식은 금지한다. check 직후 다른 프로세스가 lock을 잡는 race condition이 남기 때문이다.
5. lock이 이미 잡혀 있으면:
   - backup 측: 이번 회차 backup을 skip하고 다음 스케줄로 미룬다(데이터 손실 없음, append-only이므로).
   - backfill 측: 새벽 백업 시간대(03:00~04:00)에 신규 collect/upload를 시작하지 않고 대기한다.
6. lock에는 PID와 시작 시각을 기록해 진단 가능하게 하되, stale 판단도 acquire 실패 후 PID 생존 여부와 시작 시각을 함께 본다.
7. 2시간 초과 stale lock이라도 실행 중 PID가 살아 있으면 해제하지 않는다.
8. 수동 backfill은 가능하면 03:00~04:00 새벽 구간을 피해 실행하는 것을 운영 규칙으로 둔다(가드는 안전장치, 회피는 기본 운영).

이 가드는 Batch A부터 적용한다. 코드 변경이 없는 dry-run 단계에서도 수동 backfill 실행 전 `pnpm db:status:ops`로 최근 backup run 시각을 확인해 겹치지 않는지 먼저 점검한다.

### 7.4 실행 시간 제한

Vercel cron route는 `maxDuration=300`이라 긴 backfill에 맞지 않는다. 긴 기간 수집은 로컬에서 실행한다.

권장 제한:

| 항목 | 값 |
| --- | ---: |
| collect run 최대 요청 | 140 |
| collect run 최대 시간 | 20분 |
| upload run 최대 insert/upsert 후보 | 50,000 |
| upload run 최대 시간 | 20분 |
| verify run 최대 시간 | 5분 |
| public smoke | 2분 |

### 7.5 로그 저장 위치

모든 장기 backfill은 아래 위치에 남긴다.

```text
.donjup-local-data/runs/extended-period-YYYYMMDDTHHMMSSZ/
```

필수 파일:

```text
plan.json
collect.log
collect-summary.json
upload-review.json
upload.log
verify-db.json
public-smoke.json
vercel-error-logs.jsonl
final-summary.json
```

콘솔에는 요약만 출력한다.

## 8. 검증 계획

### 8.1 직접 DB count/date bounds

```sql
SELECT
  (SELECT count(*) FROM apt_transactions) AS sale_count,
  (SELECT count(*) FROM apt_rent_transactions) AS rent_count,
  (SELECT min(trade_date) FROM apt_transactions) AS sale_min_date,
  (SELECT max(trade_date) FROM apt_transactions) AS sale_max_date,
  (SELECT min(trade_date) FROM apt_rent_transactions) AS rent_min_date,
  (SELECT max(trade_date) FROM apt_rent_transactions) AS rent_max_date;
```

월별 count:

```sql
SELECT 'sale' AS kind, substring(trade_date, 1, 7) AS month, count(*) AS rows
FROM apt_transactions
GROUP BY 1, 2
UNION ALL
SELECT 'rent' AS kind, substring(trade_date, 1, 7) AS month, count(*) AS rows
FROM apt_rent_transactions
GROUP BY 1, 2
ORDER BY month DESC, kind;
```

identity coverage:

```sql
SELECT
  (SELECT count(*) FROM apt_complexes WHERE identity_id IS NULL) AS complexes_missing_identity,
  (SELECT count(*) FROM apt_transactions WHERE identity_id IS NULL) AS sale_missing_identity,
  (SELECT count(*) FROM apt_rent_transactions WHERE identity_id IS NULL) AS rent_missing_identity,
  (SELECT count(*) FROM apt_rent_transactions WHERE complex_id IS NULL) AS rent_missing_complex;
```

### 8.2 local manifest와 DB 정합성

```bash
node scripts/local-data-pipeline.mjs status
pnpm db:health
pnpm --silent db:status:ops
```

검증 기준:

| 항목 | 통과 기준 |
| --- | --- |
| `db:health` | DB verified |
| `db:status:ops` | warnings 0 또는 원인 해명 완료 |
| local unique sale vs DB sale | 확대 대상 기간 반영 후 delta 허용 범위 |
| local unique rent vs DB rent | 확대 대상 기간 반영 후 delta 허용 범위 |
| identity missing | 기존 14건 외 신규 증가 없음 |

### 8.3 공개 API/화면 스모크

필수:

```bash
curl -I https://donjup.com/
curl -sS 'https://donjup.com/api/health/db'
curl -sS 'https://donjup.com/api/search?q=답십리%20두산'
curl -I 'https://donjup.com/search?q=답십리%20두산'
curl -I 'https://donjup.com/market/seoul'
curl -I 'https://donjup.com/map'
curl -I 'https://donjup.com/apt/sitemap/0.xml'
```

샘플 단지:

1. `답십리동 두산` 전월세 2건 이상 유지
2. 매매 있는 단지 최신 거래일이 확장 기간과 맞는지 확인
3. 전월세-only 단지 URL이 identity URL로 유지되는지 확인

### 8.4 Vercel 로그

전역 `vercel`이 없어도 다음 명령을 사용한다.

```bash
pnpm dlx vercel@latest logs https://donjup.com \
  --environment production \
  --since 24h \
  --level error \
  --json \
  --limit 100 \
  --no-color

pnpm dlx vercel@latest logs https://donjup.com \
  --environment production \
  --since 24h \
  --status-code 500 \
  --json \
  --limit 100 \
  --no-color
```

통과 기준:

1. 500 로그 0건
2. DB timeout/error 로그 0건
3. pageview 실패 로그가 반복되지 않음

## 9. 배포/롤백 계획

### 9.1 배포 전 순서

1. 코드 변경 없이 현재 명령으로 Batch A dry-run을 설계한다.
2. manifest/checkpoint 구현이 필요하면 별도 branch에서 최소 파일만 수정한다.
3. 로컬 수집만 먼저 실행한다.
4. `upload --apply=false`로 review를 만든다.
5. review에서 `outOfScopeRows=0`인지 확인한다.
6. `--run-id`와 target month가 지정된 scoped upload로 1개 월 또는 1개 batch만 `upload --apply=true` 한다.
7. apply 후 inserted ID 파일이 생성됐는지 확인한다.
8. signal recalc는 변경 region만 실행한다.
9. cache refresh는 마지막에 1회만 실행한다.
10. public smoke와 Vercel logs를 확인한다.

### 9.2 롤백 원칙

거래 row는 append-only에 가깝기 때문에 무조건 전체 rollback하지 않는다.

권장 rollback:

1. run ID와 month-region-kind를 기록한다.
2. apply 전에 insert 후보 IDs를 `insert-candidates-*.jsonl`에 저장한다.
3. apply 후 실제 insert된 IDs를 `inserted-*.jsonl`에 저장한다.
4. 문제가 생기면 해당 run의 `inserted-sale-ids.jsonl`, `inserted-rent-ids.jsonl`에 있는 거래 row만 우선 delete한다.
5. identity/source/alias/complex는 다른 거래가 참조할 수 있으므로 바로 delete하지 않고 orphan review 후 정리한다.
6. cache는 rollback 후 revalidate한다.

rollback 금지 조건:

1. inserted ID 파일이 없으면 자동 delete를 실행하지 않는다.
2. month 조건만으로 delete하지 않는다.
3. apt name/region 조건만으로 delete하지 않는다.
4. identity/source/alias/complex는 참조 관계 확인 없이 delete하지 않는다.

필수 backup:

```bash
pnpm db:health
node scripts/local-data-pipeline.mjs status
```

필요하면 targeted export:

```sql
SELECT id FROM apt_transactions WHERE trade_date BETWEEN 'YYYY-MM-01' AND 'YYYY-MM-31';
SELECT id FROM apt_rent_transactions WHERE trade_date BETWEEN 'YYYY-MM-01' AND 'YYYY-MM-31';
```

### 9.3 캐시 롤백

1. DB rollback 후 `refresh-cache` 실행
2. `apt-transactions`, `apt-rent-transactions`, `homepage` tag revalidate
3. `/market/seoul`, `/map`, 샘플 상세 API smoke

## 10. 단계별 실행 체크리스트

### Batch A: 최근 3개월

목표:

```text
현재 2026-05~06 보유 상태에서 2026-04를 추가해 최근 3개월 확보
```

체크리스트:

1. `pnpm --silent db:status:ops`
2. `node scripts/local-data-pipeline.mjs status`
3. 202604 전체 70 region, sale+rent 수집
4. local unique count 증가 확인
5. scoped `upload --apply=false`
6. review에서 예상 insert row와 `outOfScopeRows=0` 확인
7. scoped `upload --apply=true`
8. inserted ID 파일 생성 확인
9. `pnpm db:health`
10. public smoke
11. Vercel 500/error 로그 확인

성공 기준:

| 항목 | 기준 |
| --- | --- |
| API 요청 | 140 + retry 20% 이하 |
| 추가 row | 45K~85K 범위 |
| DB warning | 없음 |
| public smoke | 모두 200 |

### Batch B: 최근 6개월

목표:

```text
2026-01~2026-03 추가
```

실행 방식:

1. 한 번에 3개월을 모두 upload하지 않는다.
2. 월별로 collect/upload/verify를 반복한다.
3. 2개월 연속 성공하면 나머지 1개월 진행한다.

중단 기준:

1. `/market/seoul` 응답 지연이 체감될 정도로 증가
2. 지도 API payload 또는 latency 증가
3. `db:status:ops` warning 발생

### Batch C: 최근 12개월

목표:

```text
2025-07~2025-12 추가
```

선행 조건:

1. Batch B 완료 후 3일 이상 운영 안정
2. 시장/지도 쿼리 확인
3. 필요 시 `identity_id + trade_date` 인덱스 추가
4. 필요 시 summary/cache table 설계 확정

운영 방식:

1. 6개월 chunk 1개를 다시 월별로 쪼갠다.
2. 주 2~3개월 이하 속도로 진행한다.
3. cache refresh는 월별 upload 후가 아니라 일괄로 묶는다.

### Batch D: 24~36개월

목표:

```text
실사용/SEO/비교 기능에 장기 이력이 필요할 때만 진행
```

선행 조건:

1. summary/cache table 도입
2. 상세 history pagination 도입
3. map bounds API 또는 payload 제한 도입
4. rollback 대상 ID 기록 구현
5. 무료 한도 추적 기준 확정

권장:

1. 24개월 먼저 판단
2. 36개월은 CockroachDB storage/RU와 Vercel latency를 보고 결정
3. 장기 과거 데이터는 raw table에 두되 화면 기본 조회에서는 제외

## 11. 예상 명령어

현재 명령으로 가능한 보수적 방식은 수집과 검증까지다. 기존 `local-data-pipeline.mjs upload --apply=true`는 local JSONL 전체를 읽으므로, scoped upload 구현 전에는 아래 3가지가 모두 확인될 때만 사용한다.

1. local JSONL에 Batch A 외 미업로드 데이터가 없다.
2. `upload --apply=false` review에서 out-of-scope 후보가 0건이다.
3. apply 후 rollback할 inserted ID 목록을 별도 파일로 남길 수 있다.

```bash
# 현재 상태 확인
pnpm --silent db:status:ops
node scripts/local-data-pipeline.mjs status

# 예: 2026년 4월 batch 0만 수집
node scripts/local-data-pipeline.mjs collect --kind=both --ym=202604 --batch=0

# 나머지 batch 순차 수집
node scripts/local-data-pipeline.mjs collect --kind=both --ym=202604 --batch=1
node scripts/local-data-pipeline.mjs collect --kind=both --ym=202604 --batch=2
node scripts/local-data-pipeline.mjs collect --kind=both --ym=202604 --batch=3
node scripts/local-data-pipeline.mjs collect --kind=both --ym=202604 --batch=4

# 업로드 전 review 성격 실행
node scripts/local-data-pipeline.mjs upload

# 실제 반영: scoped upload 구현 전에는 원칙적으로 보류
# node scripts/local-data-pipeline.mjs upload --apply=true --refresh-cache=false
```

scoped upload 구현 후:

```bash
node scripts/extended-period-backfill.mjs upload \
  --run-id=extended-period-YYYYMMDD \
  --months=202604 \
  --apply=false

node scripts/extended-period-backfill.mjs upload \
  --run-id=extended-period-YYYYMMDD \
  --months=202604 \
  --apply=true \
  --max-upserts=50000 \
  --refresh-cache=false
```

후속 작업:

```bash
# 신호 재계산 및 캐시 갱신
pnpm db:recalculate-signals
node scripts/local-data-pipeline.mjs refresh-cache --app-origin=https://donjup.com

# 검증
pnpm db:health
pnpm --silent db:status:ops
```

구현 후 권장 명령:

```bash
node scripts/extended-period-backfill.mjs plan --months=3 --kind=both
node scripts/extended-period-backfill.mjs collect --run-id=extended-period-YYYYMMDD --max-requests=140
node scripts/extended-period-backfill.mjs upload --run-id=extended-period-YYYYMMDD --months=202604 --apply=false
node scripts/extended-period-backfill.mjs upload --run-id=extended-period-YYYYMMDD --months=202604 --apply=true --max-upserts=50000
node scripts/extended-period-backfill.mjs verify --run-id=extended-period-YYYYMMDD
node scripts/extended-period-backfill.mjs smoke --run-id=extended-period-YYYYMMDD
```

## 12. 필요한 코드 변경 후보 파일

기획서 이후 구현 시 후보:

| 파일 | 변경 후보 |
| --- | --- |
| `scripts/extended-period-backfill.mjs` | Batch A 전용 wrapper, scoped collect/upload/verify/smoke |
| `scripts/local-data-pipeline.mjs` | extended manifest/checkpoint, missing-only collect, upload cap, run log |
| `scripts/run-local-backup.py` | `extended-period.lock` acquire 실패 시 backup skip |
| `scripts/run-db-maintenance.py` | backup 실행 전 `extended-period.lock` 가드 |
| `scripts/check-db-health.py` | 기간 확대 후 local/DB delta guardrail 조정 |
| `src/lib/fetch-transactions-cron-query.ts` | cron은 current month 중심 유지, backfill과 분리 |
| `src/lib/fetch-rents-cron-query.ts` | cron은 current month 중심 유지, backfill과 분리 |
| `src/lib/apt-detail-query.ts` | 과거 history pagination 준비 |
| `src/lib/market-dashboard-query.ts` | summary/cache 우선 조회 |
| `src/lib/map-dashboard-query.ts` | bounds/limit/window 조회 |
| `src/lib/api/cache-headers.ts` | route별 cache header 조정 |
| `src/lib/cache-tags.ts` | summary/cache tag 필요 시 추가 |
| `scripts/migrations/*` | Batch C/D 전 summary/index migration |
| `tests/unit/*` | manifest skip, retry, pagination, query limit 테스트 |

Batch A/B는 migration 없이도 가능해야 한다. Batch C/D부터는 성능 측정 후 인덱스 또는 summary migration을 추가한다.

## 13. migration 필요 여부

| 단계 | migration 필요성 | 판단 |
| --- | --- | --- |
| Batch A 3개월 | 낮음 | 기존 인덱스/캐시로 진행 |
| Batch B 6개월 | 낮음~중간 | latency 보고 인덱스만 검토 |
| Batch C 12개월 | 중간 | `identity_id, trade_date` 인덱스 후보 |
| Batch D 24~36개월 | 높음 | summary/cache table 권장 |

마이그레이션 원칙:

1. CockroachDB 호환 SQL만 사용한다.
2. `CREATE INDEX IF NOT EXISTS`로 idempotent하게 작성한다.
3. 운영 적용 전 direct query로 현재 index 존재 여부를 확인한다.
4. 인덱스 추가 후 write 비용 증가를 `db:health`로 확인한다.

## 14. 운영 리스크와 보수적 기본값

### 14.1 리스크

| 리스크 | 영향 | 대응 |
| --- | --- | --- |
| 공공 API 제한 | 수집 중단 | manifest 재개, backoff |
| 502 반복 | 일부 지역 누락 | failed item review |
| DB write 증가 | Cockroach RU 증가 | upload cap, batch size 유지 |
| query latency 증가 | 공개 화면 지연 | cache/summary/pagination |
| 지도 payload 증가 | Vercel bandwidth 증가 | bounds/limit/window |
| 상세 payload 증가 | 사용자 체감 지연 | 최근 N건 기본, 과거 더보기 |
| local/DB delta 증가 | 운영 점검 실패 | 직접 count와 manifest 대조 |
| page_views write 증가 | 비핵심 DB 비용 증가 | sample rate 하향 |
| 새벽 백업과 backfill 동시 실행 | DB connection pool 소진, JSONL 파일 레이스 컨디션 | `extended-period.lock`(7.3절) 가드, 03:00~04:00 회피 |

### 14.2 기본값

```text
Batch size: 1개월 단위
Max requests per run: 140
Request delay: 500~1000ms
Max retries: 2
Upload batch size: 500
Max upserts per run: 50,000
Cache refresh: 단계 종료 후 1회
Pageview sample rate: 착수 전 production env 값 확인(코드 기본값은 1), 0.1 목표, 경고 시 0.05 또는 0.01
Default detail sale rows: 50
Default detail rent rows: 200
Map default window: latest only
Market default window: recent 30/90/180 days
```

## 15. 최종 산출물

구현 단계에서 만들어야 할 산출물:

1. `docs/15-extended-query-period-traffic-plan.md`
2. extended backfill run logs
3. manifest/checkpoint
4. upload review
5. inserted ID rollback files
6. verify summary
7. public smoke result
8. Vercel log snapshot
9. 필요 시 idempotent migration
10. 테스트

완료 보고에 포함할 숫자:

1. 확대 전/후 DB count
2. 확대 전/후 date bounds
3. month별 row count
4. local unique vs DB delta
5. API 요청 수
6. retry/failed item 수
7. DB inserted row 수
8. inserted ID 파일 경로
9. cache refresh 결과
10. public smoke 결과
11. 남은 risk

## 16. 바로 구현 착수용 프롬프트

아래 프롬프트를 그대로 사용하면 된다.

```text
docs/15-extended-query-period-traffic-plan.md 기획서를 기준으로 돈줍 조회기간 확대 Batch A를 구현하고 검증해줘.

목표는 현재 운영 DB/로컬에 있는 2026-05~2026-06 데이터에 2026-04 매매/전월세 데이터를 추가해 최근 3개월 조회가 가능하게 만드는 거야. 단, 공공 API 호출량, CockroachDB 쓰기, Vercel 트래픽을 최소화해야 해.

진행 조건:
1. 작업 전 `pnpm --silent db:status:ops`, direct DB count/date bounds, `node scripts/local-data-pipeline.mjs status`, 최신 `.donjup-local-data/runs/`를 확인해줘.
2. `.env.local`, DATABASE_URL, API 키, 토큰 등 비밀값은 절대 출력하지 마.
3. 현재 작업트리가 더러우니 `git add .` 금지. 필요한 파일만 선별해.
4. 상세 로그는 채팅에 길게 쓰지 말고 `.donjup-local-data/runs/extended-period-*`에 저장해.
5. 먼저 코드 변경 없이 현재 `local-data-pipeline` 명령으로 202604 batch 0~4를 로컬에 수집할 수 있는지 확인해.
6. 이미 수집/검증된 month-region-kind는 재호출하지 않도록 manifest/checkpoint 설계를 먼저 적용해.
7. 수집은 로컬 `.donjup-local-data`에 먼저 누적하고, `upload --apply=false` review 후에만 DB에 반영해.
8. 기존 `local-data-pipeline.mjs upload --apply=true`는 local JSONL 전체를 읽으므로, 202604만 반영하는 scoped upload가 구현되기 전에는 apply를 실행하지 마.
9. DB upload는 idempotent upsert/dedupe 기준을 유지하고 `identity_id`, `complex_id` 연결을 깨지 않게 해.
10. 캐시 갱신은 upload 완료 후 한 번만 실행해.
11. Batch A에서 migration은 하지 말고, 성능 문제가 실제로 확인될 때만 후보를 보고해.
12. backfill 시작 전 새벽 백업 타이머(03:10/03:35)와 겹치지 않는지 확인하고, `.donjup-local-data/extended-period.lock`을 `fcntl.flock` 방식으로 잡아 `db:backup`/`db:maintenance`와의 동시 실행을 막아줘(7.3절 가드 설계 참고).

구현 범위:
1. extended-period run directory와 summary/review 파일을 남기는 wrapper 또는 `local-data-pipeline` 확장을 추가해.
2. manifest에 `extendedPeriod` checkpoint를 추가해 성공/실패/empty item을 기록해.
3. `maxRequests`, `maxUpserts`, `requestDelayMs`, `maxRetries`, `refreshCache` 옵션을 지원해.
4. 429/502/backoff와 재개 가능한 실패 처리를 구현해.
5. upload는 `--run-id`와 `--months=202604` 같은 scope가 없으면 apply를 거부하게 해.
6. upload review에 `candidateRows`, `existingRows`, `insertableRows`, `outOfScopeRows`를 저장하고, `outOfScopeRows > 0`이면 apply를 막아줘.
7. apply 후 `inserted-sale-ids.jsonl`, `inserted-rent-ids.jsonl`, `inserted-complex-ids.jsonl`, `inserted-identity-ids.jsonl`, `inserted-identity-source-ids.jsonl`, `inserted-alias-ids.jsonl`을 저장해. 이 파일이 없으면 rollback 가능하다고 보고하지 마.
8. upload 전후 DB count/date bounds/month count를 저장해.
9. page_views 샘플링 정책은 건드리지 마.
10. `extended-period.lock`(PID/시작시각 기록, stale lock 2시간 초과 시 PID 생존 여부 확인)을 도입하고, `run-local-backup.py`/`run-db-maintenance.py`가 같은 `fcntl` lock을 acquire하지 못하면 backup을 skip하도록 연결해.

검증:
- `pnpm --silent test` 또는 관련 단위 테스트
- `pnpm build`
- direct DB count/date bounds
- `node scripts/local-data-pipeline.mjs status`
- `pnpm --silent db:status:ops`
- 공개 스모크:
  - `https://donjup.com/api/health/db`
  - `https://donjup.com/api/search?q=답십리%20두산`
  - `https://donjup.com/market/seoul`
  - `https://donjup.com/map`
  - 샘플 상세 API
  - sitemap
- Vercel production error/warning/500 로그

최종 보고는 짧게:
- 변경 파일
- 실행한 batch/month
- API 요청 수와 실패 수
- DB inserted row 수
- inserted ID 파일 경로
- 확대 전/후 date bounds
- 최종 DB 숫자
- public smoke 결과
- 남은 리스크
```
