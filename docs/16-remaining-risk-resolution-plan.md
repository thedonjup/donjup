# 돈줍 잔여 리스크 종합 해소 계획

기준일: 2026-06-24 KST
보강일: 2026-06-25 KST

## 1. 목적

이 문서는 `docs/13-public-normalization-plan.md`, `docs/14-complex-identity-db-plan.md`, `docs/15-extended-query-period-traffic-plan.md` 이후 남아 있는 운영 리스크를 한 곳에 모아 우선순위, 해소 방법, 검증 기준을 정리한다.

현재 목표는 새 기능을 늘리는 것이 아니라 다음 상태를 안정적으로 유지하는 것이다.

1. 공개 `donjup.com`에서 검색, 상세, 지도, 시장 화면이 정상 동작한다.
2. 로컬 `.donjup-local-data`와 CockroachDB가 같은 거래 데이터를 바라본다.
3. 조회기간 확대 Batch B/C/D를 진행해도 공공 API, CockroachDB, Vercel 비용과 트래픽이 통제된다.
4. 문제가 생겼을 때 최근 batch만 안전하게 되돌릴 수 있다.
5. 운영자가 `db:status:ops`와 direct DB count 차이를 혼동하지 않는다.

## 2. 현재 상태 요약

### 2.1 공개 서비스 상태

최근 배포 후 공개 스모크 기준으로 주요 route는 정상 응답했다.

| 항목 | 최근 확인 결과 |
| --- | --- |
| `/api/search?q=답십리 두산` | 200 |
| `/market/seoul` | 200, 화면 거래 수 표시 |
| `/map` | 200 |
| `/api/apt?region=11230&limit=5` | 200 |
| `/apt-sitemap.xml` | 200 |

따라서 현재 잔여 리스크는 즉시 서비스 전체를 멈추는 장애라기보다, 다음 데이터 확장과 장기 운영 전에 닫아야 할 안정성 리스크다.

### 2.2 DB와 로컬 데이터 상태

최근 `pnpm --silent db:status:ops` 기준:

| 항목 | 값 |
| --- | ---: |
| health run | `20260623-181837` |
| verified | true |
| warnings | 0 |
| health age | 20.1h |
| DB complexes | 35,281 |
| DB sale | 84,071 |
| DB rent | 141,977 |
| DB pageViews | 60 |
| local size | 535.7MB |
| local saleUnique | 84,071 |
| local rentUnique | 141,977 |
| saleDelta | 0 |
| rentDelta | 0 |

같은 시점의 direct DB count는 health snapshot보다 더 최신일 수 있다.

| 항목 | direct DB 확인값 |
| --- | ---: |
| `apt_transactions` | 85,209 |
| `apt_rent_transactions` | 144,425 |
| `page_views` | 60 |
| `apt_complexes.identity_id` 누락 | 0 |
| 매매 `identity_id` 누락 | 0 |
| 전월세 `identity_id` 누락 | 14 |
| 전월세 `complex_id` 누락 | 23 |

해석 원칙:

1. `db:status:ops`는 최신 health run 파일과 automation 상태를 보는 운영 스냅샷이다.
2. direct DB count는 그 순간 CockroachDB를 직접 본 값이다.
3. 두 숫자가 다를 때는 먼저 health run 시간을 확인하고, 오래된 health snapshot이면 `pnpm db:health`로 새 health를 만든 뒤 비교한다.

### 2.3 최근 완료된 보호장치

조회기간 확대 구현에서 다음 보호장치가 들어갔다.

| 보호장치 | 상태 |
| --- | --- |
| extended-period manifest/checkpoint | 구현됨 |
| atomic lock | 구현됨 |
| scoped upload | 구현됨 |
| `--run-id`/기간 없는 raw `upload --apply=true` 차단 | 구현됨 |
| inserted ID rollback 파일 | 구현됨 |
| Batch A 2026-04 수집/업로드 | 적용됨 |
| 로컬/DB 거래 정합성 | `saleDelta=0`, `rentDelta=0` 스냅샷 확인 |
| 공개 배포 | 완료 |

### 2.4 실행 도구 대조 결과

이 문서는 운영 계획이므로 "문서에 적힌 절차"와 "repo에 실제 존재하는 실행 도구"를 분리해 본다. 실행 전에는 이 표를 먼저 확인한다.

| 항목 | 현재 repo 상태 | 운영 판단 |
| --- | --- | --- |
| 조회기간 확대 wrapper | `scripts/run-extended-period.py`, `pnpm db:extended-period` 존재 | 실제 실행 명령은 `pnpm db:extended-period --batch=...`처럼 script 인자를 바로 붙인다 |
| scoped upload/rollback | `scripts/local-data-pipeline.mjs`에 `--run-id` scope, rollback command, inserted ID 파일 6종 존재 | raw `upload --apply=true`는 계속 금지 |
| 공식 단지코드 importer | `scripts/import-complex-code-reference.ts` 존재 | `.donjup-local-data/reference/complex-codes/`에 파일을 넣은 뒤 dry-run부터 실행 |
| 공식 단지코드 데이터 | `.donjup-local-data/reference/complex-codes/` 디렉토리는 있으나 파일 없음 | 수동 파일 투입이 필요하며, 파일 없이는 source import 불가 |
| 전월세 잔여 연결 | `scripts/backfill-complex-identities.ts`가 strict unique 연결을 지원 | importer는 source 기록용이므로 잔여 rent update는 별도 review 후 수행 |
| pageview smoke 정리 | 전용 cleanup script 없음 | Phase 1에서 dry-run/export/apply 가능한 스크립트 또는 SQL review 파일을 먼저 만든다 |
| local-data prune | `scripts/prune-local-data.mjs` 없음 | Phase 6에서 dry-run 기본 스크립트를 먼저 만든다 |
| 문서 명령 표준화 | `docs/15`의 과거 실행 예시는 이번 보강에서 정리함 | 이후 runbook도 `pnpm db:extended-period` 기준으로 유지 |

## 3. 잔여 리스크 요약

| 우선순위 | 리스크 | 현재 영향 | 다음 확장 전 필요도 | 상태 |
| ---: | --- | --- | --- | --- |
| 1 | CockroachDB 인덱스 migration 미적용 | 현재 즉시 장애는 아님 | Batch B/C 전 높음 | 대기 |
| 2 | 전월세 일부 `identity_id`/`complex_id` 미연결 | 일부 단지 상세/URL 정확도 영향 | 높음 | 수동 해소 필요 |
| 3 | Batch B/C/D 비용, API, DB 부하 | 현재 Batch A까진 안정 | 높음 | gate 필요 |
| 4 | `db:status:ops`와 direct DB count freshness 차이 | 운영 판단 혼동 가능 | 중간 | runbook 필요 |
| 5 | production pageview smoke row 잔존 | analytics noise | 낮음 | 정리 가능 |
| 6 | Vercel deployment URL 302 | production domain 정상, 배포 URL만 혼동 | 낮음 | 문서화 |
| 7 | 더러운 작업트리와 untracked 파일 | 선별 커밋 실수 위험 | 중간 | release hygiene 필요 |
| 8 | `.donjup-local-data` 저장량 증가 | 현재 535.7MB로 문제 없음 | Batch C/D 전 중간 | 보관 정책 필요 |
| 9 | 백업/복구 범위 혼동 | 로컬 JSONL과 DB snapshot 의미 다름 | 중간 | 백업 기준 명확화 |
| 10 | 문서와 실제 실행 명령 drift | 잘못된 스크립트 실행 위험 | 중간 | drift 방지 규칙 필요 |

## 4. 리스크별 해소 계획

### 4.1 CockroachDB 인덱스 migration 미적용

#### 현재 증거

`scripts/migrations/20260623-extended-period-query-indexes.sql`에는 다음 후보 인덱스가 있다.

| 인덱스 | 대상 |
| --- | --- |
| `idx_txn_region_property_date` | 시장 화면 지역/유형/기간 |
| `idx_txn_region_property_change_date` | 급락/변동률 정렬 |
| `idx_txn_region_property_new_high_date` | 신고가 필터 |
| `idx_rent_region_name_date` | 전월세 지역/단지명 검색 |
| `idx_rent_complex_date` | 상세 전월세 최근 거래 |
| `idx_rent_identity_date` | identity 기반 상세 전월세 |

하지만 최근 운영 DB 조회에서는 위 인덱스가 아직 적용되지 않은 상태였다. 이전 적용 시도는 CockroachDB에서 긴 `CREATE INDEX` 작업이 2분 이상 걸려 중단된 이력이 있다.

#### 왜 중요한가

Batch A 이후 데이터는 이미 크게 늘었다. Batch B/C로 넘어가면 `/market/seoul`, 상세 페이지, 지도, 검색이 더 넓은 기간을 보게 되고, 인덱스가 없으면 raw scan이 증가할 수 있다.

#### 해소 방법

1. 먼저 현재 query plan을 확인한다.
2. 한 번에 전체 인덱스를 만들지 않는다.
3. 서비스 영향이 낮은 시간대에 1개씩 생성한다.
4. 각 인덱스 생성 후 `SHOW JOBS`와 주요 API smoke를 확인한다.
5. 10분 이상 진척이 없거나 RU/latency가 튀면 중단하고 다음 창으로 넘긴다.

권장 적용 순서:

1. `idx_txn_region_property_date`
2. `idx_rent_identity_date`
3. `idx_rent_complex_date`
4. `idx_rent_region_name_date`
5. `idx_txn_region_property_change_date`
6. `idx_txn_region_property_new_high_date`

#### 확인 SQL

```sql
SHOW INDEXES FROM apt_transactions;
SHOW INDEXES FROM apt_rent_transactions;

SHOW JOBS
  WHERE job_type = 'SCHEMA CHANGE'
  ORDER BY created DESC
  LIMIT 20;
```

#### 완료 기준

1. 필요한 인덱스가 운영 DB에 실제 존재한다.
2. `/market/seoul`, `/map`, 상세 API 응답이 200이다.
3. `pnpm --silent db:status:ops`가 warnings 0이다.
4. Batch B dry-run 전 query latency가 악화되지 않는다.

#### 중단 기준

1. schema change job이 장시간 pending/running 상태로 stuck 된다.
2. public API 500이 발생한다.
3. CockroachDB usage가 무료/저비용 운용 한계를 넘는다.

### 4.2 전월세 일부 identity/complex 미연결

#### 현재 증거

direct DB 기준 잔여 미연결은 다음 수준이다.

| 항목 | 건수 |
| --- | ---: |
| 전월세 `identity_id` 누락 | 14 |
| 전월세 `complex_id` 누락 | 23 |

잔여 사례는 같은 동/단지명에 후보 단지가 여러 개 있어 fuzzy 자동 연결이 위험한 형태다. 예를 들어 같은 지역과 같은 이름으로 strict 후보가 2개 이상 잡히는 케이스가 남아 있다.

#### 왜 중요한가

이 리스크는 전체 거래 수에는 작지만, 특정 단지 상세 페이지, canonical URL, sitemap, 검색 결과의 정확도에 영향을 준다. 특히 전월세-only 단지와 매매 단지가 뒤섞이면 사용자가 다른 단지의 거래를 보는 문제가 생길 수 있다.

#### 해소 방법

1. 잔여 미연결 목록을 파일로 다시 생성한다.
2. 자동 fuzzy update는 금지한다.
3. 후보가 2개 이상이면 공식 단지코드, 주소, 사용승인일, 세대수, 외부 코드 중 2개 이상 근거가 맞을 때만 연결한다.
4. 공식 파일은 `.donjup-local-data/reference/complex-codes/`에 수동 투입한 뒤 importer를 dry-run으로 실행한다.
5. importer는 `apt_complex_identity_sources` source 기록용이다. 전월세 row의 `identity_id`/`complex_id` 연결은 source import 후 별도 review와 targeted update 또는 `scripts/backfill-complex-identities.ts` 재실행으로 확인한다.
6. 여전히 모호하면 별도 natural identity로 유지하고 `review_required` 상태로 남긴다.

공식 단지코드 importer dry-run 예시:

```bash
pnpm tsx scripts/import-complex-code-reference.ts --source=kab_complex_code --limit=0
```

source apply는 review 파일의 `conflicts=0` 또는 사람이 승인한 conflict 처리 계획이 있을 때만 실행한다.

```bash
pnpm tsx scripts/import-complex-code-reference.ts --source=kab_complex_code --apply=true
```

#### 완료 기준

1. 전월세 `identity_id` 누락이 0이거나, 남은 항목이 모두 `review_required`로 분류된다.
2. 전월세 `complex_id` 누락이 0이거나, complex 연결을 일부러 보류한 사유가 기록된다.
3. 기존 `govt_complex_id`에는 Kakao/Naver/K-apt/KAB ID가 섞이지 않는다.
4. `답십리동 두산` 같은 전월세-only 단지의 검색, 상세, URL이 안정적으로 동작한다.

#### 중단 기준

1. 같은 이름 후보가 2개 이상인데 공식 근거가 부족하다.
2. 연결 후 상세 페이지에서 다른 단지 거래가 섞인다.
3. rollback inserted ID 또는 update review 파일 없이 대량 update가 필요하다.

### 4.3 Batch B/C/D 비용과 부하

#### 현재 증거

Batch A는 적용됐고 로컬/DB 정합성은 맞았다. 그러나 Batch B/C/D는 데이터 양이 선형 이상으로 증가하며, 조회 route는 일부 summary/cache가 있어도 기간 확장에 따라 raw scan 압력이 커질 수 있다.

#### 왜 중요한가

돈줍은 거래 데이터 호출이 잦은 서비스다. 공공 API 호출량보다 실제 운영에서는 DB read, cache miss, Vercel function execution이 더 먼저 병목이 될 수 있다.

#### 해소 방법

Batch B부터는 반드시 gate를 둔다.

| gate | 기준 |
| --- | --- |
| 수집 | 성공 manifest가 없는 month-region-kind만 호출 |
| dry-run | `--apply` 없이 candidate/insertable/out-of-scope 확인 |
| upload | `--run-id`와 `--ym` 명시 필수 |
| upsert | `maxUpserts` 기본 제한 유지 |
| cache | 적용 후 refresh-cache는 한 번만 실행 |
| public smoke | 검색, 시장, 지도, 상세, sitemap 확인 |
| rollback | inserted ID 파일이 있을 때만 최근 batch rollback 허용 |

권장 Batch B 시작 명령:

```bash
pnpm db:extended-period --batch=B --kind=both --max-requests=140 --max-runtime-seconds=1800 --max-upserts=0 --no-refresh-cache
```

소량 apply 예시:

```bash
pnpm db:extended-period --run-id=<run-id> --ym=202603 --kind=both --max-upserts=20000 --apply --no-refresh-cache
node scripts/local-data-pipeline.mjs refresh-cache --app-origin=https://donjup.com
pnpm --silent db:status:ops
```

#### 완료 기준

1. Batch B dry-run review 파일이 생성된다.
2. `outOfScopeRows=0`이다.
3. candidate, insertable, skipped count가 manifest 범위와 일치한다.
4. 소량 apply 후 DB/local delta가 0 또는 설명 가능한 수준이다.
5. public smoke가 모두 200이다.

#### 중단 기준

1. `outOfScopeRows > 0`
2. `maxUpserts` 초과
3. public API 500 또는 market/map latency 급증
4. rollback 파일 미생성

### 4.4 운영 스냅샷 freshness 혼동

#### 현재 증거

`db:status:ops`의 DB count와 direct DB count가 다르게 보일 수 있다. 이는 `db:status:ops`가 최신 health JSON을 기준으로 출력하고, direct DB count는 현재 DB를 직접 조회하기 때문이다.

#### 왜 중요한가

운영자가 숫자 차이를 데이터 누락으로 오해하면 불필요한 재수집 또는 재업로드를 실행할 수 있다.

#### 해소 방법

1. `db:status:ops` 출력에 health age를 먼저 본다.
2. 24시간 안쪽이면 운영 정상성 판단에는 사용한다.
3. 거래 수 정합성 판단은 direct DB count와 local manifest를 같이 본다.
4. 큰 upload 직후에는 `pnpm db:health`를 한 번 실행해 snapshot을 새로 만든다.

#### 완료 기준

1. runbook에 health snapshot과 direct DB count의 차이가 명시된다.
2. Batch apply 후 health를 새로 생성하는 절차가 체크리스트에 포함된다.

### 4.5 production pageview smoke row 잔존

#### 현재 증거

테스트용 pageview path가 production DB에 남아 있었다. 실제 삭제 전에는 반드시 현재 DB에서 다시 조회한다.

| 조건 | 확인값 |
| --- | ---: |
| `page_path LIKE '/codex-pageview-smoke-%'` row | 3 |
| 해당 view count 합계 | 30 |

#### 왜 중요한가

서비스 기능 장애는 아니지만 analytics 지표가 아주 조금 오염된다.

#### 해소 방법

1. `scripts/cleanup-pageview-smoke.mjs` 또는 동등한 SQL review 파일을 먼저 만든다.
2. 기본 동작은 dry-run이며, 삭제 후보와 합산 `view_count`만 출력한다.
3. 정확한 smoke path prefix만 대상으로 한다.
4. month/name/region 같은 넓은 조건으로 삭제하지 않는다.
5. 삭제 전 대상 row를 `.donjup-local-data/runs/remaining-risk-*/pageview-smoke-export.json`에 저장한다.
6. `--apply` 플래그가 있을 때만 삭제한다.
7. 삭제 후 page_views count와 공개 route를 다시 확인한다.

#### 완료 기준

1. `/codex-pageview-smoke-%` row가 0이다.
2. 일반 pageview 기록은 유지된다.
3. pageview write smoke는 새 test path로 다시 성공한다.

#### 중단 기준

1. 삭제 대상이 smoke prefix 밖으로 확장된다.
2. pageview aggregation 정책을 확인하지 못했다.

### 4.6 Vercel deployment URL 302

#### 현재 증거

일부 Vercel deployment URL은 302를 반환할 수 있지만 production `https://donjup.com` smoke는 정상이다.

#### 왜 중요한가

배포 검증 때 preview/deployment URL의 redirect를 장애로 오해할 수 있다.

#### 해소 방법

1. 최종 공개 검증 기준은 production domain `https://donjup.com`으로 둔다.
2. Vercel deployment URL은 배포 완료와 redirect 설정 확인 용도로만 본다.
3. 실제 사용자 영향 판단은 production route smoke로 한다.

#### 완료 기준

1. 배포 runbook에 production domain 기준 smoke가 명시된다.
2. deployment URL 302는 별도 장애로 분류하지 않는다.

### 4.7 더러운 작업트리와 release hygiene

#### 현재 증거

repo에는 이전 작업 또는 사용자 작업으로 보이는 modified/untracked 파일이 섞여 있다. 운영 정상화 작업은 선별 커밋으로 진행했지만, 이후에도 `git add .`를 사용하면 무관한 변경이 섞일 위험이 있다.

#### 왜 중요한가

배포에 무관한 파일이 production commit에 들어가면 원인 추적이 어려워지고 rollback 범위도 커진다.

#### 해소 방법

1. 작업 시작 전 `git status -sb`를 저장한다.
2. `git add .`는 계속 금지한다.
3. 커밋 전 `git diff --cached --name-only`를 확인한다.
4. 운영 변경은 docs, scripts, src, migrations 중 필요한 파일만 선별한다.
5. 정리되지 않은 오래된 untracked script는 별도 cleanup issue로 분리한다.

#### 완료 기준

1. release commit에 목적 외 파일이 없다.
2. 작업 로그에 staged file 목록이 남는다.
3. rollback 시 관련 파일만 되돌릴 수 있다.

### 4.8 `.donjup-local-data` 저장량 증가

#### 현재 증거

로컬 데이터 크기는 최근 535.7MB 수준이다. Batch B/C/D로 확장하면 JSONL, run logs, review files, inserted ID files가 계속 증가한다.

#### 왜 중요한가

로컬 데이터는 재개와 rollback의 근거이므로 함부로 지우면 안 된다. 반대로 무제한 증가하면 백업, 검색, 검증 시간이 길어진다.

#### 해소 방법

1. 최근 90일 run log는 유지한다.
2. inserted ID rollback 파일은 영구 보관한다.
3. raw API response가 있다면 압축 또는 월별 archive로 이동한다.
4. JSONL 원본은 월별 shard 또는 gzip archive 기준을 검토한다.
5. prune은 dry-run 결과를 먼저 남긴다.

#### 완료 기준

1. `.donjup-local-data` 보관 정책이 문서화된다.
2. prune dry-run 명령이 만들어진다.
3. rollback 파일은 prune 대상에서 제외된다.

### 4.9 백업/복구 범위 혼동

#### 현재 증거

현재 로컬 JSONL 누적, backup run, DB health snapshot은 존재하지만 각각 의미가 다르다.

| 항목 | 의미 |
| --- | --- |
| local JSONL | 수집된 거래 원본과 dedupe 근거 |
| inserted ID files | 최근 upload rollback 근거 |
| db health JSON | 특정 시점 count/date bounds 스냅샷 |
| DB export/snapshot | DB 전체 복구 근거 |

#### 왜 중요한가

local JSONL이 있다고 해서 DB schema, identity/source/alias 전체를 완전히 복구할 수 있다는 뜻은 아니다. Batch B/C 전에 backup 기준을 명확히 해야 한다.

#### 해소 방법

1. 큰 apply 전 `pnpm db:health`와 local backup을 실행한다.
2. 가능하면 CockroachDB console 또는 CLI에서 logical backup/export 가능성을 확인한다.
3. 최소한 upload run별 inserted ID files를 반드시 보존한다.
4. rollback은 inserted ID 파일 기준으로만 허용한다.

#### 완료 기준

1. Batch B apply 전 backup artifact 위치가 기록된다.
2. rollback 가능 범위가 run-id 기준으로 명확하다.
3. DB 전체 복구가 필요한 경우와 최근 batch rollback이 필요한 경우가 구분된다.

### 4.10 문서와 실제 실행 명령 drift

#### 현재 증거

조회기간 확대 계획 문서에는 초기 설계 단계의 `node scripts/extended-period-backfill.mjs ...` 예시가 남아 있었다. 현재 repo의 실제 구현은 `scripts/run-extended-period.py`이며 package script는 `pnpm db:extended-period`다. 이번 보강에서는 주요 실행 예시를 실제 구현 명령으로 정리했고, 앞으로 package script가 바뀔 때 문서도 같이 갱신해야 한다.

#### 왜 중요한가

운영자가 존재하지 않는 스크립트를 기준으로 작업하면 backfill이 시작되지 않거나, 우회 명령을 찾다가 scoped upload 안전장치를 놓칠 수 있다.

#### 해소 방법

1. 새 운영 문서와 착수용 프롬프트의 실행 명령은 `pnpm db:extended-period --batch=...`처럼 script 인자를 바로 붙이는 형태로 통일한다.
2. `node scripts/local-data-pipeline.mjs upload --apply=true`는 scope 없이 쓰지 않는다는 경고를 유지한다.
3. `docs/15`의 오래된 예시는 실제 구현 명령으로 정리한다.
4. package script가 바뀌면 `docs/15`, `docs/16`, runbook을 같이 갱신한다.

#### 완료 기준

1. 운영 문서에 존재하지 않는 `extended-period-backfill.mjs` 실행 예시가 없다.
2. Batch B 착수 명령이 `pnpm db:extended-period --batch=B ...` 기준으로 통일된다.
3. dry-run, apply, rollback 명령이 각각 별도로 적혀 있다.

## 5. 우선순위별 실행 계획

### Phase 0. 현재 상태 재확인

목표: 지금 바로 장애가 있는지 확인하고, 숫자 기준선을 새로 잡는다.

```bash
git status -sb
pnpm --silent db:status:ops
pnpm db:health
pnpm --silent db:status:ops
```

추가로 공개 smoke를 확인한다.

```bash
curl -I "https://donjup.com/api/search?q=%EB%8B%B5%EC%8B%AD%EB%A6%AC%20%EB%91%90%EC%82%B0"
curl -I "https://donjup.com/market/seoul"
curl -I "https://donjup.com/map"
curl -I "https://donjup.com/apt-sitemap.xml"
```

완료 기준:

1. `db:status:ops` warnings 0
2. public route 200
3. health snapshot age 1시간 이하

### Phase 1. pageview smoke noise 정리

목표: production analytics에 남은 테스트 row를 정확한 prefix 기준으로만 정리한다. 현재 전용 cleanup script는 없으므로 실행 도구부터 만든다.

절차:

1. `scripts/cleanup-pageview-smoke.mjs`를 추가하거나 동일한 기능의 SQL review 파일을 만든다.
2. 기본 dry-run에서 `page_path LIKE '/codex-pageview-smoke-%'` 대상 row, `view_count` 합계, export 경로를 출력한다.
3. 삭제 대상 row를 `.donjup-local-data/runs/remaining-risk-*/pageview-smoke-export.json`에 저장한다.
4. `--apply`가 있을 때만 exact prefix 대상만 삭제한다.
5. 삭제 후 pageview count와 일반 기록을 확인한다.
6. pageview smoke는 새 test path로 1회만 검증한다.

완료 기준:

1. smoke row 0
2. 일반 pageview 유지
3. 공개 route 이상 없음
4. cleanup script 또는 SQL review 파일이 run artifact와 함께 남음

### Phase 2. 전월세 잔여 미연결 해소

목표: 자동 fuzzy 연결이 위험한 잔여 14~23건을 공식 근거 기반으로 해소한다.

절차:

1. 미연결 row와 후보 complex를 review JSON으로 생성한다.
2. 공식 단지코드 파일을 `.donjup-local-data/reference/complex-codes/`에 넣는다.
3. `pnpm tsx scripts/import-complex-code-reference.ts --source=kab_complex_code --limit=0` dry-run으로 source match review를 만든다.
4. 공식 근거가 없는 ambiguous pair는 연결하지 않는다.
5. source import가 필요한 경우 review 승인 후 `--apply=true`로 source만 반영한다.
6. 전월세 row 연결은 source import 후 targeted update review 또는 `pnpm tsx scripts/backfill-complex-identities.ts --migrate=false --run-dir=<run-dir>` dry-run/apply 절차로 별도 확인한다.
7. 적용한 update는 run-id와 review 파일을 남긴다.

완료 기준:

1. 누락 0 또는 review_required 명시
2. 잘못 섞인 상세 거래 없음
3. `govt_complex_id`에 외부 ID 혼입 없음
4. importer review, source apply summary, rent-link review가 각각 저장됨

### Phase 3. 인덱스 적용 rehearsal

목표: Batch B 전에 가장 효과가 큰 인덱스부터 안전하게 적용한다.

절차:

1. 현재 인덱스 목록 저장
2. query plan 확인
3. `idx_txn_region_property_date` 1개만 먼저 적용
4. schema job 상태 확인
5. public smoke 확인
6. 다음 인덱스는 별도 window에서 반복

완료 기준:

1. 적용 인덱스가 `SHOW INDEXES`에 보임
2. schema job 실패 없음
3. market/map/detail smoke 정상

### Phase 4. Batch B dry-run gate

목표: 최근 6개월 확대 전에 실제 API 호출량, candidate row, insertable row를 확인한다.

권장 시작:

```bash
pnpm db:extended-period --batch=B --kind=both --max-requests=140 --max-runtime-seconds=1800 --max-upserts=0 --no-refresh-cache
```

완료 기준:

1. manifest/checkpoint 생성
2. 실패 month-region-kind 기록
3. `outOfScopeRows=0`
4. apply 전 review JSON 확인

### Phase 5. Batch B 소량 apply

목표: 한 달 또는 일부 region만 먼저 DB에 반영해 비용과 route 영향을 본다.

예시:

```bash
pnpm db:extended-period --run-id=<run-id> --ym=202603 --kind=both --max-upserts=20000 --apply --no-refresh-cache
node scripts/local-data-pipeline.mjs refresh-cache --app-origin=https://donjup.com
pnpm db:health
pnpm --silent db:status:ops
```

완료 기준:

1. inserted ID files 생성
2. DB/local delta 정상
3. public smoke 정상
4. rollback dry-run 가능

### Phase 6. `.donjup-local-data` prune dry-run 도구

목표: Batch C/D 전에 로컬 데이터 무제한 증가를 막을 prune 도구를 실제로 만든다(리스크 4.8).

절차:

1. `scripts/prune-local-data.mjs` 또는 동등한 스크립트를 추가한다.
2. 기본 동작은 dry-run이며, 삭제 후보(90일 초과 run log, 압축 가능한 raw JSONL)만 나열한다.
3. inserted ID rollback 파일은 prune 대상에서 항상 제외한다.
4. `--apply` 플래그가 명시될 때만 실제 삭제/압축을 수행한다.

완료 기준:

1. `node scripts/prune-local-data.mjs` dry-run이 후보 목록과 예상 절감 용량을 출력한다.
2. inserted ID 파일이 후보에 포함되지 않는다.
3. `.donjup-local-data` 보관 정책이 8장 운영 기본값 또는 별도 runbook에 기록된다.

### Phase 7. Batch B apply 전후 backup artifact 기록

목표: Batch B 소량 apply 전후로 백업/복구 근거를 명시적으로 남긴다(리스크 4.9).

절차:

1. Phase 5 apply 직전 `pnpm db:health` 실행 결과와 local backup 상태를 `run-id` 디렉토리에 기록한다.
2. apply 직후 inserted ID files 경로를 같은 run-id 디렉토리에 모아 둔다.
3. run-id 디렉토리에 "DB 전체 복구 근거"와 "최근 batch rollback 근거"를 구분해 표기한다.

완료 기준:

1. Batch B apply 전 backup artifact 위치가 run-id 디렉토리에 기록된다.
2. rollback 가능 범위(최근 batch vs 전체 DB)가 문서로 구분된다.

### Phase 8. 운영 문서와 명령 표준화

목표: 오래된 실행 예시 때문에 scoped upload 보호장치를 우회하지 않게 한다(리스크 4.10).

절차:

1. `docs/15`, `docs/16`, runbook에서 조회기간 확대 명령을 `pnpm db:extended-period --batch=...` 기준으로 통일한다.
2. 존재하지 않는 `scripts/extended-period-backfill.mjs` 예시는 제거하거나 "초기 설계 예시"로 표시한다.
3. dry-run, apply, rollback, cache refresh 명령을 분리해 적는다.
4. `node scripts/local-data-pipeline.mjs upload --apply=true`는 `--run-id`와 `--ym`이 없으면 금지한다는 경고를 유지한다.

완료 기준:

1. 운영 문서에 존재하지 않는 backfill script를 실행하라는 문장이 없다.
2. Batch B 착수용 명령이 `pnpm db:extended-period --batch=B ...`로 통일된다.
3. cache refresh는 production origin이 필요한 경우 `--app-origin=https://donjup.com`을 명시한다.

## 6. 검증 체크리스트

### 6.1 DB 정합성

```sql
SELECT COUNT(*) FROM apt_transactions;
SELECT COUNT(*) FROM apt_rent_transactions;
SELECT MIN(trade_date), MAX(trade_date) FROM apt_transactions;
SELECT MIN(trade_date), MAX(trade_date) FROM apt_rent_transactions;

SELECT COUNT(*) FROM apt_complexes WHERE identity_id IS NULL;
SELECT COUNT(*) FROM apt_transactions WHERE identity_id IS NULL;
SELECT COUNT(*) FROM apt_rent_transactions WHERE identity_id IS NULL;
SELECT COUNT(*) FROM apt_rent_transactions WHERE complex_id IS NULL;
```

### 6.2 인덱스

```sql
SHOW INDEXES FROM apt_transactions;
SHOW INDEXES FROM apt_rent_transactions;
SHOW JOBS
  WHERE job_type = 'SCHEMA CHANGE'
  ORDER BY created DESC
  LIMIT 20;
```

### 6.3 로컬/DB alignment

```bash
pnpm --silent db:status:ops
node scripts/local-data-pipeline.mjs status
```

### 6.4 실행 도구 존재 여부

```bash
test -f scripts/run-extended-period.py
test -f scripts/import-complex-code-reference.ts
test -f scripts/local-data-pipeline.mjs
test -f scripts/prune-local-data.mjs
test -f scripts/cleanup-pageview-smoke.mjs
```

`scripts/prune-local-data.mjs`와 `scripts/cleanup-pageview-smoke.mjs`는 현재 없는 도구이므로 Phase 1/6 구현 후 통과해야 한다.

### 6.5 공식 단지코드 importer dry-run

```bash
pnpm tsx scripts/import-complex-code-reference.ts --source=kab_complex_code --limit=0
```

완료 기준은 review JSON이 생성되고, `conflicts`와 `skipped` 사유가 확인되는 것이다.

### 6.6 공개 smoke

```bash
curl -sS -o /dev/null -w "%{http_code}\n" "https://donjup.com/api/search?q=%EB%8B%B5%EC%8B%AD%EB%A6%AC%20%EB%91%90%EC%82%B0"
curl -sS -o /dev/null -w "%{http_code}\n" "https://donjup.com/market/seoul"
curl -sS -o /dev/null -w "%{http_code}\n" "https://donjup.com/map"
curl -sS -o /dev/null -w "%{http_code}\n" "https://donjup.com/apt-sitemap.xml"
```

### 6.7 빌드와 테스트

```bash
pnpm --silent test
pnpm build
```

## 7. 롤백 원칙

1. inserted ID 파일 없는 delete rollback은 금지한다.
2. month, name, region 조건만으로 delete하지 않는다.
3. identity/source/alias/complex delete 전 참조 거래 row를 확인한다.
4. cache refresh 문제는 데이터 rollback보다 cache 재생성을 먼저 시도한다.
5. public 500이 발생하면 최근 배포 commit과 최근 DB apply run-id를 분리해 본다.

Rollback artifact 필수 파일:

| 파일 | 역할 |
| --- | --- |
| `inserted-sale-ids.jsonl` | 최근 매매 insert rollback |
| `inserted-rent-ids.jsonl` | 최근 전월세 insert rollback |
| `inserted-complex-ids.jsonl` | 신규 complex rollback |
| `inserted-identity-ids.jsonl` | 신규 identity rollback |
| `inserted-identity-source-ids.jsonl` | 신규 source rollback |
| `inserted-alias-ids.jsonl` | 신규 alias rollback |

## 8. 운영 기본값

| 항목 | 보수적 기본값 |
| --- | --- |
| Batch 적용 순서 | A 완료 후 B dry-run, 이후 월별 apply |
| 한 번에 apply | 1개월 또는 20,000 upsert 이하 |
| index 적용 | 한 번에 1개 |
| API retry | 429/502 중심 제한 재시도 |
| cache refresh | apply 후 1회 |
| pageview sampling | 운영 env 확인 후 0.1 이하 권장 |
| health snapshot | 큰 apply 직후 새로 생성 |
| rollback | inserted ID 파일 기준만 허용 |
| official complex code import | manual file 투입 후 dry-run 먼저 실행 |
| pageview smoke cleanup | exact prefix export 후 `--apply`에서만 삭제 |
| local-data prune | dry-run 기본, inserted ID 파일 제외 |
| command standard | `pnpm db:extended-period --batch=...` |

## 9. 바로 구현 착수용 프롬프트

아래 프롬프트를 사용하면 이 문서 기준으로 잔여 리스크 해소 작업을 진행할 수 있다.

```text
docs/16-remaining-risk-resolution-plan.md 기획서를 기준으로 돈줍 잔여 리스크 해소 작업을 진행해줘.

목표는 현재 공개 서비스 정상 상태를 유지하면서, Batch B/C 조회기간 확대 전에 남은 리스크를 안전하게 줄이는 거야. 구현 전 현재 DB, 로컬 `.donjup-local-data`, 공개 `donjup.com`, 작업트리 상태를 다시 확인해줘.

진행 조건:
1. `.env.local`, DATABASE_URL, API 키, 토큰 등 비밀값은 절대 출력하지 마.
2. 작업트리가 더러울 수 있으니 `git add .` 금지하고 필요한 파일만 선별해.
3. 상세 로그는 `.donjup-local-data/runs/remaining-risk-*`에 저장해.
4. 데이터 삭제나 rollback은 inserted ID 파일 또는 정확한 smoke prefix처럼 좁은 근거가 있을 때만 실행해.
5. CockroachDB 인덱스는 한 번에 하나씩만 적용하고, `SHOW JOBS`와 공개 smoke를 확인해.
6. 전월세 잔여 미연결은 공식 근거 없이 fuzzy 자동 연결하지 마.
7. 조회기간 확대 명령은 `pnpm db:extended-period --batch=...` 기준으로 실행하고, 존재하지 않는 `extended-period-backfill.mjs`는 사용하지 마.
8. 공식 단지코드 importer는 이미 있지만 `.donjup-local-data/reference/complex-codes/` 데이터 파일이 없으면 source import는 dry-run까지만 해.

우선순위:
1. `db:status:ops`, direct DB count, 공개 smoke로 현재 기준선 생성
2. production pageview smoke row 정리를 위한 dry-run/export/apply 스크립트 또는 SQL review 파일 추가
3. 전월세 `identity_id`/`complex_id` 잔여 미연결 review, 공식 단지코드 importer dry-run, 안전한 targeted update
4. Batch B 전 필요한 인덱스 1개씩 적용
5. Batch B dry-run gate 실행
6. 소량 apply는 review와 rollback artifact가 완전할 때만 진행, apply 전후 backup artifact를 run-id 디렉토리에 기록
7. `.donjup-local-data` prune dry-run 스크립트를 추가해 보관 정책을 실행 가능하게 만든다(inserted ID 파일은 prune 대상에서 제외)
8. `docs/15`와 `docs/16`의 조회기간 확대 명령을 실제 구현 명령으로 표준화

검증:
- `pnpm --silent db:status:ops`
- direct DB count/date bounds
- 인덱스 존재 여부와 schema job 상태
- `pnpm tsx scripts/import-complex-code-reference.ts --source=kab_complex_code --limit=0`
- `/api/search?q=답십리 두산`
- `/market/seoul`
- `/map`
- 상세 API
- sitemap
- `pnpm --silent test`
- `pnpm build`
- `node scripts/prune-local-data.mjs` dry-run 출력 확인
- `node scripts/cleanup-pageview-smoke.mjs` dry-run 출력 확인

최종 보고는 짧게:
- 변경 파일
- 정리한 리스크
- DB 숫자
- 인덱스 적용 여부
- 전월세 미연결 잔여 숫자
- 공개 API 상태
- pageview smoke cleanup 결과
- prune dry-run 결과와 backup artifact 경로
- 문서/명령 표준화 결과
- 남은 리스크
```
