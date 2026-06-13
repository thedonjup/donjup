# 돈줍 무료 DB 운영안

기준일: 2026-05-25

## 결론

현재 코드베이스는 Drizzle ORM의 `pg-core`, `pg`, PostgreSQL SQL 문법, `jsonb`, `numeric`, `ON CONFLICT`에 맞춰져 있다. 그래서 당장 구동 안정성이 가장 높은 선택지는 PostgreSQL 호환 DB를 유지하는 것이다.

추천 순서는 다음과 같다.

1. 메인 DB: CockroachDB Basic
2. 대체 메인 DB: Supabase Free, 단 데이터가 500 MB 이하일 때만
3. 읽기 미러/장기 개선: Turso 또는 Cloudflare D1
4. 캐시/락: Upstash Redis는 소량 용도로만 사용

## 무료 티어 비교

| 후보 | 무료 기준 | 돈줍 적합도 | 판단 |
| --- | --- | --- | --- |
| CockroachDB Basic | 월 50M RU, 10 GiB 스토리지 | 높음 | 현재 구조와 가장 가깝고 저장 공간이 넉넉하다. RU 기반이라 캐시와 쓰기 절제가 필수다. |
| Supabase Free | DB 500 MB, 프로젝트 2개, egress 5 GB | 중간 | 순정 Postgres라 호환성은 좋지만 전국 실거래 데이터에는 용량이 작다. |
| Neon Free | 프로젝트당 0.5 GB, 100 CU-hour/월 | 낮음 | 개발/스테이징에는 좋지만 잦은 호출이 있는 상시 서비스에는 CU-hour가 빠르게 소진된다. |
| Turso Free | 5 GB, 월 500M rows read, 월 10M rows written | 높음, 단 마이그레이션 필요 | 읽기량 기준은 좋지만 SQLite/libSQL로 옮겨야 한다. |
| Cloudflare D1 Free | 5 GB, 일 5M rows read, 일 100K rows written | 중간, 단 마이그레이션 필요 | 읽기 미러로는 좋지만 Workers/D1 기반으로 API를 다시 붙여야 한다. |
| Firestore Free | 1 GiB, 일 50K reads, 일 20K writes | 낮음 | 관계형 검색/랭킹/집계에 맞지 않는다. 댓글 같은 보조 기능에만 적합하다. |
| Upstash Redis Free | 월 500K commands | 보조 | 전체 캐시로 쓰기에는 명령 수가 작다. 락, rate-limit, 소형 핫키에만 쓴다. |

## 권장 아키텍처

### 1단계: 즉시 정상화

CockroachDB Basic 클러스터를 새로 만들고 `DATABASE_URL`을 갱신한다. 기존 코드 변경이 가장 적고 10 GiB 무료 스토리지가 있어 돈줍의 거래 데이터에 현실적이다.

운영값:

```env
DATABASE_URL=postgresql://...
DB_POOL_MAX=1
DONJUP_PAGEVIEW_WRITE_SAMPLE_RATE=0.1
```

`DONJUP_PAGEVIEW_WRITE_SAMPLE_RATE=0.1`은 페이지뷰 DB 쓰기를 10%만 실행하고 기록되는 카운트는 10배로 보정한다. 무료 DB 한도에 닿으면 `0`으로 두어 분석 쓰기만 멈추고 서비스 조회는 살린다.

새 클러스터에 스키마를 넣을 때는 `DATABASE_URL`을 새 connection string으로 지정한 뒤 아래 명령을 실행한다.

```bash
DATABASE_URL="postgresql://..." node scripts/apply-cockroach-bootstrap.mjs
```

스키마 원본은 `scripts/cockroach-bootstrap.sql`이다.

데이터는 먼저 로컬 파일에 누적한 뒤 DB 구성이 맞을 때만 업로드한다.

```bash
# 로컬 누적 상태 확인
node scripts/local-data-pipeline.mjs status

# DB 연결과 필수 테이블 확인
node scripts/local-data-pipeline.mjs verify-db

# 예: 강남구 2026년 5월 매매 데이터를 로컬에 저장
node scripts/local-data-pipeline.mjs collect --kind=sale --ym=202605 --region=11680

# 예: cron batch 0의 최근 1개월 매매/전월세 데이터를 로컬에 저장
node scripts/local-data-pipeline.mjs collect --kind=both --months=1 --batch=0

# 업로드 전 dry-run
node scripts/local-data-pipeline.mjs upload

# DB 구성이 올바를 때만 실제 업로드
node scripts/local-data-pipeline.mjs upload --apply=true
```

로컬 데이터는 기본적으로 `.donjup-local-data/`에 JSONL로 저장되며 git에 커밋하지 않는다.

긴 백업은 Python 실행기로 묶어서 수행한다. 콘솔에는 batch 요약만 출력하고, 상세 내역은 `.donjup-local-data/runs/backup-*.log`와 `backup-*.json`에 남긴다.

```bash
# 기본값: 남은 batch 2,3,4 / 최근 1개월 / 매매+전월세 / 검증 후 업로드
python3 scripts/run-local-backup.py

# 수집만 하고 업로드는 나중에
python3 scripts/run-local-backup.py --batches=2,3,4 --months=1 --no-upload

# 특정 batch만 실행
python3 scripts/run-local-backup.py --batches=2
```

DB와 로컬 백업 상태는 Python 점검기로 기록한다. 콘솔에는 핵심 수치만 출력하고, 상세 결과는 `.donjup-local-data/runs/db-health-*.log`와 `db-health-*.json`에 남긴다.

```bash
python3 scripts/check-db-health.py
# 또는
pnpm db:health
```

점검 결과에는 필수 테이블 검증, 주요 테이블 row count, 로컬 백업 파일 크기, 최근 백업 업로드 결과, 로컬 고유 row와 DB row의 차이, 무료 한도 경고가 포함된다.

기록된 최신 상태만 빠르게 확인할 때는 조회 전용 리포터를 사용한다. 이 명령은 DB나 외부 API를 호출하지 않고 `.donjup-local-data/runs/`의 최신 JSON과 systemd user timer 상태만 읽는다.

```bash
python3 scripts/show-db-status.py
# 또는
pnpm db:status
```

리포터의 timer 줄은 다음 예약과 마지막 timer trigger를 함께 보여준다. 첫 자동 실행 전이면 `lastTrigger=n/a`로 표시되고, service 줄은 최근 유지보수 실행 시작/종료 시각을 표시한다. `audit timer`와 `audit service` 줄은 사후 감사 자동화 상태를 표시한다.

`timer audit` 줄은 required 자동 감사 기록을 우선 보여준다. 첫 자동 실행 전에는 최신 수동 감사가 `waiting`으로 표시되고, 예약 이후 required 감사는 `ok` 또는 `failed`로 표시된다.

systemd 조회를 건너뛰고 파일 기록만 확인하려면 다음처럼 실행한다.

```bash
python3 scripts/show-db-status.py --no-automation
# 또는
pnpm db:status:files
```

자동화나 비교용으로는 JSON 출력도 가능하다.

```bash
python3 scripts/show-db-status.py --json
# 또는
pnpm --silent db:status:json
```

자동화에서 최신 점검 경고나 DB 검증 실패를 실패로 처리하려면 다음처럼 실행한다.

```bash
python3 scripts/show-db-status.py --fail-on-warning
# 또는
pnpm --silent db:status:check
```

로컬 운영 자동화까지 엄격하게 확인하려면 systemd timer/service 상태와 최신 기록 신선도도 실패 조건에 포함한다. 유지보수 또는 사후 감사 타이머가 비활성화되었거나, 다음 예약이 없거나, 최근 service 결과가 실패했거나, health/maintenance/timer-audit 기록이 30시간보다 오래되면 exit code `2`로 종료하고 `next:` 복구 힌트를 출력한다. required `timer-audit` 기록이 없거나 `ok`가 아니어도 실패로 처리된다.

```bash
python3 scripts/show-db-status.py --fail-on-warning --fail-on-automation --max-health-age-hours=30 --max-maintenance-age-hours=30 --max-timer-audit-age-hours=30
# 또는
pnpm --silent db:status:ops
```

무료 한도 경고 기준은 환경변수로 조정한다. 값을 `0`으로 두면 해당 경고를 끈다.

```env
DONJUP_LOCAL_DATA_WARN_MB=8192
DONJUP_CORE_TRANSACTION_ROWS_WARN=8000000
DONJUP_PAGEVIEW_ROWS_WARN=100000
DONJUP_LOCAL_DB_DELTA_WARN=1000
```

매일 운영 점검은 유지보수 래퍼 하나로 실행한다. 기본값은 DB 상태를 기록한 뒤, 마지막 백업이 24시간 이상 오래되었을 때만 현재 월 전국 batch `0~4`를 백업하고 업로드한다.

```bash
python3 scripts/run-db-maintenance.py
# 또는
pnpm db:maintenance
```

유지보수 래퍼는 `.donjup-local-data/maintenance.lock`으로 단일 실행을 보장한다. 이미 실행 중이면 새 실행은 `maintenance locked` 메시지를 출력하고 종료한다.

강제로 현재 월 전국 데이터를 다시 수집하려면 다음처럼 실행한다.

```bash
python3 scripts/run-db-maintenance.py --force-backup
```

백업/업로드만 바로 실행하려면 다음처럼 실행한다.

```bash
pnpm db:backup
```

DB 점검 기록만 남기고 수집은 건너뛰려면 다음처럼 실행한다.

```bash
python3 scripts/run-db-maintenance.py --no-backup
# 또는
pnpm db:maintenance:check
```

유지보수 래퍼는 기본적으로 최신 백업/점검/유지보수/타이머 감사 기록은 보호하고, 30일이 지난 run 로그와 요약 파일을 정리한다. 삭제 후보만 확인하려면 dry-run으로 실행한다.

```bash
python3 scripts/run-db-maintenance.py --no-backup --prune-dry-run
```

보존 기간은 필요에 따라 조정한다.

```bash
python3 scripts/run-db-maintenance.py --prune-run-days=60
```

Linux Mint에서 매일 자동 실행하려면 systemd user timer를 설치한다. 먼저 dry-run으로 생성될 unit을 확인한다.

```bash
python3 scripts/install-db-maintenance-timer.py --dry-run
# 또는
pnpm db:timer:dry-run
```

설치만 하려면 다음처럼 실행한다.

```bash
python3 scripts/install-db-maintenance-timer.py
# 또는
pnpm db:timer:install
```

설치와 동시에 매일 새벽 유지보수 타이머와 사후 감사 타이머를 켜려면 다음처럼 실행한다.

```bash
python3 scripts/install-db-maintenance-timer.py --enable
# 또는
pnpm db:timer:enable
```

상태 확인과 해제는 다음 명령을 사용한다.

```bash
systemctl --user list-timers donjup-db-maintenance.timer donjup-db-maintenance-audit.timer
python3 scripts/install-db-maintenance-timer.py --uninstall
# 또는
pnpm db:timer:uninstall
```

첫 자동 실행 전후 감사는 별도 명령으로 기록한다. 자동 실행 전에는 `waiting`으로 끝나며, 감사 요약은 `.donjup-local-data/runs/timer-audit-*.json`에 남는다.

```bash
python3 scripts/audit-db-maintenance-timer.py
# 또는
pnpm db:timer:audit
```

예약 시각 이후 timer trigger가 반드시 있어야 하는 검증에서는 required 명령을 사용한다.

```bash
python3 scripts/audit-db-maintenance-timer.py --require-trigger
# 또는
pnpm db:timer:audit:required
```

systemd user timer를 설치하면 사후 감사도 매일 03:35 KST 기준으로 자동 실행된다. 유지보수 타이머가 03:10~03:20 사이에 실행된 뒤, 감사 타이머가 required 검증을 수행하고 결과를 `timer-audit-*.json`으로 남긴다.

운영 적용 기록:

- 2026-06-07 KST에 `donjup-db-maintenance.timer`를 systemd user timer로 설치하고 활성화했다.
- 자동 실행은 매일 03:10 KST 기준이며, `RandomizedDelaySec=10m` 때문에 실제 실행 시각은 03:10~03:20 사이로 잡힌다.
- 사후 감사는 매일 03:35 KST 기준이며, `RandomizedDelaySec=5m` 때문에 실제 실행 시각은 03:35~03:40 사이로 잡힌다.
- 설치 직후 `systemctl --user start donjup-db-maintenance.service`로 수동 검증했고, 최신 백업이 fresh라 백업은 건너뛰고 DB health와 run 로그 정리만 성공했다.
- 검증 run: `.donjup-local-data/runs/maintenance-20260607-145044.json`, `.donjup-local-data/runs/db-health-20260607-145044.json`

### 2단계: 무료 한도 방어

트래픽이 늘면 가장 먼저 쓰기 부하를 분리한다.

| 데이터 | 위치 | 이유 |
| --- | --- | --- |
| `apt_transactions`, `apt_rent_transactions`, `apt_complexes` | CockroachDB Basic | 핵심 데이터. SQL 호환성과 저장 공간 우선. |
| `page_views`, `analytics_daily` | 샘플링 유지 또는 D1/Turso 분리 | 비핵심 분석 데이터라 장애 시 버려도 서비스가 살아야 한다. |
| `homepage_cache`, `daily_reports`, `finance_rates` | CockroachDB Basic | 작고 중요도가 높다. 메인 DB에 둔다. |

### 3단계: 읽기 미러

RU 또는 DB CPU가 모자라면 Turso를 읽기 미러로 추가한다. 크론이 CockroachDB에서 홈 랭킹, 검색 후보, 단지 상세 요약을 만들어 Turso에 넣고, 공개 API는 Turso를 먼저 읽는다. 원본은 CockroachDB에 남긴다.

이 단계는 Drizzle SQLite 스키마와 별도 query layer가 필요하므로 즉시 복구용으로는 선택하지 않는다.

## 운영 체크리스트

- 새 DB 생성 후 `/api/health/db`가 `200 OK`인지 확인한다.
- `pnpm test`를 통과시킨 뒤 배포한다.
- 무료 운영 중에는 `DB_POOL_MAX=1` 또는 `2`를 유지한다.
- 페이지뷰가 한도를 태우면 `DONJUP_PAGEVIEW_WRITE_SAMPLE_RATE=0`으로 낮춘다.
- 검색/상세/홈 API는 CDN 캐시가 먹도록 `Cache-Control` 헤더를 제거하지 않는다.
- 월 1회는 테이블별 row count와 DB size를 확인한다.

## 공식 기준 링크

- CockroachDB Pricing: https://www.cockroachlabs.com/pricing/
- Supabase Billing: https://supabase.com/docs/guides/platform/billing-on-supabase
- Supabase Database Size: https://supabase.com/docs/guides/platform/database-size
- Neon Pricing: https://neon.com/pricing
- Turso Pricing: https://turso.tech/pricing
- Cloudflare D1 Pricing: https://developers.cloudflare.com/d1/platform/pricing/
- Upstash Redis Free Tier: https://upstash.com/blog/redis-new-pricing
- Firestore Quotas: https://firebase.google.com/docs/firestore/quotas
