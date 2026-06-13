# 돈줍 공개 서비스 정상화 기획서

기준일: 2026-06-14 01:06 KST

## 1. 배경

돈줍 로컬 운영 환경은 CockroachDB 기준으로 복구가 완료된 상태다. 로컬 점검 결과 `db:status:ops`는 통과했고, 핵심 데이터도 `complexes=12021`, `sale=29897`, `rent=52558`, `pageViews=12`로 확인된다.

반면 공개 서비스 `https://donjup.com`은 아직 로컬 복구 상태가 반영되지 않았다. 공개 API 확인 결과 `/api/health/db`는 `404`, `/api/apt/extremes`, `/api/search`, `/api/rate/history`, `/api/bank-rates`, `/api/analytics/popular`는 `500`을 반환했다. `/market/seoul` 화면은 200으로 열리지만 거래 건수가 0건으로 보이는 상태가 남아 있다.

따라서 현재 문제의 핵심은 데이터가 로컬/DB에 없는 것이 아니라, 공개 Vercel 배포본과 운영 환경변수, 캐시, 검증 체계가 로컬 복구 상태와 맞지 않는 것이다.

## 2. 목표

공개 돈줍 서비스에서 거래 데이터, 지도 데이터, 금리 데이터, 검색, 인기 페이지 집계가 정상 표시되도록 만든다.

완료 기준은 다음과 같다.

1. `https://donjup.com/api/health/db`가 200을 반환하고 DB 연결 및 주요 row count를 확인할 수 있다.
2. `https://donjup.com/market/seoul`에서 수집 거래가 0건이 아닌 실제 DB 기반 숫자로 표시된다.
3. `https://donjup.com/map`에서 지오코딩 완료 단지 데이터가 공개 화면에 반영된다.
4. 주요 공개 API가 200을 반환한다.
5. 배포 이후 `pnpm --silent db:status:ops`, 빌드, 로컬/공개 스모크 결과를 파일로 남긴다.

## 3. 정상화 대상 5가지

### 3.1 배포 범위 정리

현재 작업트리에는 변경 파일이 2,817개 있다. 이 상태에서 전체 커밋이나 전체 배포를 진행하면 `.claude`, 임시 파일, 로컬 산출물, 불필요한 generated 파일이 같이 올라갈 위험이 있다.

실행 계획:

1. `git status --short`와 `git diff --name-only`로 변경 파일을 분류한다.
2. 공개 정상화에 필요한 파일만 배포 후보로 묶는다.
3. 제외 대상은 `.donjup-local-data/`, `.claude/`, 임시 worktree, node_modules, pycache, 로그, 스냅샷, 비밀값 파일이다.
4. 선별된 파일만 별도 패치 또는 별도 브랜치에 적용한다.
5. 깨끗한 상태에서 `pnpm build`를 다시 실행한다.

산출물:

- 배포 대상 파일 목록
- 제외 파일 목록
- 빌드 로그

완료 기준:

- 배포 후보에 비밀값과 로컬 산출물이 포함되지 않는다.
- 선별 파일만으로 빌드가 통과한다.

### 3.2 Vercel 공개 배포 반영

공개 도메인은 Vercel에서 서비스 중이다. 로컬에서 정상화한 코드가 공개 배포본에 반영되지 않았거나, Vercel 배포가 이전 커밋을 보고 있을 가능성이 높다.

실행 계획:

1. 현재 Vercel 프로젝트 연결 정보를 확인한다.
2. 배포 대상 브랜치와 Vercel Production Branch가 일치하는지 확인한다.
3. 선별 커밋을 만든 뒤 원격 저장소에 push한다.
4. Vercel 자동 배포가 시작되는지 확인한다.
5. 배포 완료 후 배포 URL과 `donjup.com` 양쪽에서 같은 결과가 나오는지 비교한다.

산출물:

- 커밋 해시
- 배포 URL
- 배포 완료 시각
- 공개 도메인 스모크 결과

완료 기준:

- `donjup.com`이 신규 커밋 기반 배포를 바라본다.
- 공개 `/api/health/db`가 더 이상 404가 아니다.

### 3.3 운영 환경변수와 CockroachDB 연결 검증

로컬 `.env.local`은 정상 DB를 바라보지만, Vercel Production 환경변수가 같은 DB를 바라보는지는 별도 확인이 필요하다. 공개 API 500은 `DATABASE_URL`, API 키, Cron Secret, 외부 API 키 누락 또는 잘못된 런타임 설정에서 발생할 수 있다.

실행 계획:

1. Vercel Production 환경변수에 `DATABASE_URL`이 등록되어 있는지 확인한다.
2. 비밀값은 화면이나 로그에 출력하지 않고, 존재 여부와 대상 종류만 확인한다.
3. `DB_POOL_MAX=1` 등 CockroachDB 무료 티어에 맞는 운영값을 반영한다.
4. `DONJUP_PAGEVIEW_WRITE_SAMPLE_RATE=0.1` 같은 쓰기 절감 설정을 반영한다.
5. 배포 런타임에서 DB 연결이 되는지 `/api/health/db`로 확인한다.

필수 확인 항목:

- `DATABASE_URL`
- `DB_POOL_MAX`
- `CRON_SECRET`
- `NEXT_PUBLIC_SITE_URL`
- Kakao/공공데이터/금융 API 관련 키
- page view sampling 설정

산출물:

- 환경변수 점검 체크리스트
- 공개 DB health 응답 요약
- 누락 또는 불일치 항목 목록

완료 기준:

- 공개 API에서 DB 연결 오류가 사라진다.
- health 응답에서 로컬 기준 핵심 row count와 같은 방향의 숫자가 확인된다.

### 3.4 데이터, 캐시, 크론 상태 동기화

로컬 DB에는 거래, 전세, 지도 좌표, page views가 들어 있다. 그러나 공개 화면은 캐시나 배포 시점 데이터가 오래됐을 수 있다. 배포 이후 캐시 갱신과 운영 cron 상태를 함께 맞춰야 한다.

실행 계획:

1. 배포 직후 공개 origin 기준으로 homepage cache refresh를 실행한다.
2. `/market/seoul`, `/today`, `/map`, `/rent`, `/trend`를 공개 도메인에서 스모크한다.
3. `homepage_cache`가 최신 DB 숫자를 반영하는지 확인한다.
4. page view 테스트 조회를 발생시켜 `page_views` row와 weighted count가 증가하는지 확인한다.
5. 운영 cron이 외부 API와 DB를 정상 호출할 수 있는지 최소 범위로 확인한다.

검증 기준 숫자:

- complexes: 12,021건 수준
- geocoded complexes: 12,021건 수준
- sale: 29,897건 수준
- rent: 52,558건 수준
- map mapped sale transactions: 29,897건 수준
- page views: 테스트 후 증가

산출물:

- 캐시 갱신 로그
- 공개 화면 스모크 로그
- 공개 API 스모크 로그
- page view 증가 확인 로그

완료 기준:

- `/market/seoul` 거래 건수 0건 문제가 해소된다.
- `/map`이 500건 고정 또는 구버전 데이터가 아니라 최신 지오코딩 데이터를 반영한다.
- page view 저장/집계가 공개 환경에서도 증가한다.

### 3.5 운영 모니터링과 롤백 체계

한 번 정상화해도 무료 DB 한도, 외부 API 제한, Vercel 환경변수 변경, 캐시 노후화로 다시 0건 상태가 될 수 있다. 정상화 이후에는 자동 점검과 빠른 롤백 기준이 필요하다.

실행 계획:

1. 배포 후 24시간 동안 핵심 API를 주기적으로 확인한다.
2. `db:status:ops` 결과를 운영 점검 기준으로 유지한다.
3. API 500, 거래 0건, health 404/500, DB row delta 발생 시 장애로 분류한다.
4. 배포 직전 커밋과 배포 직후 커밋을 기록해 즉시 되돌릴 수 있게 한다.
5. 장애 재발 시 데이터 문제인지 배포/환경변수 문제인지 먼저 분리하는 체크리스트를 둔다.

장애 판정 기준:

- `/api/health/db`가 200이 아니다.
- `/api/apt/extremes`가 200이 아니다.
- `/api/search?q=강남`이 200이 아니거나 결과가 0건이다.
- `/market/seoul`이 200이어도 수집 거래가 0건이다.
- `saleDelta` 또는 `rentDelta`가 0이 아니다.

산출물:

- 운영 스모크 스크립트 또는 명령 목록
- 롤백 커밋 기준
- 재발 시 1차 대응 체크리스트

완료 기준:

- 배포 후 24시간 내 자동/수동 점검에서 같은 장애가 재발하지 않는다.
- 재발 시 10분 안에 원인 범주를 배포, 환경변수, DB, 외부 API, 캐시 중 하나로 분리할 수 있다.

## 4. 실행 순서

### 1단계: 배포 후보 정리

예상 소요: 30~60분

작업:

1. 변경 파일 전체를 분류한다.
2. 공개 정상화에 필요한 파일만 선별한다.
3. 선별 파일만으로 별도 검증 브랜치를 만든다.
4. 로컬 빌드와 핵심 테스트를 재실행한다.

완료 조건:

- 선별 변경만으로 `pnpm build`가 통과한다.

### 2단계: 운영 환경변수 점검

예상 소요: 20~40분

작업:

1. Vercel Production 환경변수 존재 여부를 확인한다.
2. 누락값을 채운다.
3. 비밀값은 문서와 로그에 남기지 않는다.

완료 조건:

- 공개 `/api/health/db`가 배포 후 200으로 응답할 준비가 된다.

### 3단계: 배포

예상 소요: 10~30분

작업:

1. 선별 커밋을 push한다.
2. Vercel 배포 상태를 확인한다.
3. 배포 URL과 커밋 해시를 기록한다.

완료 조건:

- `donjup.com`이 신규 커밋을 바라본다.

### 4단계: 공개 캐시 갱신과 스모크

예상 소요: 20~40분

작업:

1. 공개 origin 기준 캐시 갱신을 실행한다.
2. 주요 화면과 API를 확인한다.
3. page view 증가를 검증한다.

완료 조건:

- 거래 0건 문제가 공개 화면에서 사라진다.
- 주요 API가 200을 반환한다.

### 5단계: 운영 감시와 롤백 준비

예상 소요: 배포 후 24시간

작업:

1. 배포 직후, 1시간 후, 24시간 후 스모크를 반복한다.
2. 실패 시 롤백 또는 환경변수 복구를 실행한다.
3. 최종 결과를 운영 로그에 남긴다.

완료 조건:

- 24시간 동안 핵심 장애 기준에 걸리지 않는다.

## 5. 테스트 계획

로컬 검증:

```bash
pnpm --silent db:status:ops
pnpm build
```

공개 API 검증:

```bash
node - <<'NODE'
const targets = [
  'https://donjup.com/api/health/db',
  'https://donjup.com/api/apt/extremes',
  'https://donjup.com/api/search?q=%EA%B0%95%EB%82%A8',
  'https://donjup.com/api/rate/history',
  'https://donjup.com/api/bank-rates',
  'https://donjup.com/api/analytics/popular',
];
for (const url of targets) {
  const res = await fetch(url);
  console.log(res.status, url);
}
NODE
```

공개 화면 검증:

```bash
node - <<'NODE'
const pages = [
  'https://donjup.com/',
  'https://donjup.com/today',
  'https://donjup.com/map',
  'https://donjup.com/rent',
  'https://donjup.com/trend',
  'https://donjup.com/market/seoul',
];
for (const url of pages) {
  const res = await fetch(url);
  const text = await res.text();
  console.log(res.status, url, text.includes('총 0 건') ? 'ZERO_DATA' : 'OK_TEXT');
}
NODE
```

## 6. 리스크와 대응

| 리스크 | 영향 | 대응 |
| --- | --- | --- |
| 작업트리 변경 2,817개를 잘못 배포 | 불필요 파일, 임시 파일, 비밀값 노출 위험 | 선별 커밋만 생성 |
| Vercel 환경변수 누락 | 공개 API 500 지속 | 비밀값 출력 없이 존재 여부와 연결 결과만 확인 |
| CockroachDB 무료 한도 초과 | 조회 지연 또는 실패 | 캐시, page view sampling, pool 제한 유지 |
| 캐시가 구버전 데이터 유지 | 화면은 200인데 거래 0건 표시 | 배포 후 공개 origin 기준 캐시 refresh |
| 외부 API 키 누락 | 금리/검색/지도 일부 실패 | 기능별 API 스모크로 분리 |

## 7. 최종 보고 형식

작업 완료 후 보고는 짧게 정리한다.

포함 항목:

1. 배포 커밋
2. 변경 파일 목록
3. 공개 DB count
4. `/market/seoul` 거래 표시 결과
5. 주요 API status
6. page view 증가 여부
7. 남은 리스크

제외 항목:

- `.env.local` 내용
- DB 접속 문자열
- API key
- 장황한 실행 로그

상세 로그는 `.donjup-local-data/runs/` 또는 별도 배포 로그 파일에 저장한다.
