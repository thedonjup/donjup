# 돈줍(DonJup) 기술 설계서

---

## 1. 시스템 아키텍처

```
┌──────────────────────────────────────────────────────────┐
│                    Vercel (호스팅/배포)                     │
│                                                          │
│  ┌─────────────────┐    ┌──────────────────────────────┐ │
│  │   Next.js App   │    │      API Routes              │ │
│  │   (App Router)  │    │                              │ │
│  │                 │    │  /api/cron/                   │ │
│  │  SSR: /         │    │    fetch-transactions         │ │
│  │  ISR: /apt/     │    │    fetch-rates                │ │
│  │  CSR: /rate/    │    │    generate-report            │ │
│  │       calculator│    │                              │ │
│  │  SSG: /daily/   │    │  /api/apt/                   │ │
│  │                 │    │  /api/rate/                   │ │
│  │                 │    │  /api/market/                 │ │
│  │                 │    │  /api/analytics/              │ │
│  └────────┬────────┘    └──────────────┬───────────────┘ │
│           │                            │                 │
│  ┌────────┴────────────────────────────┴───────────────┐ │
│  │            Vercel Cron Jobs (vercel.json)            │ │
│  │  06:00 KST ─ 실거래가 수집                            │ │
│  │  07:00 KST ─ 금리 데이터 수집                          │ │
│  │  08:00 KST ─ 데일리 리포트 생성                        │ │
│  └─────────────────────────┬───────────────────────────┘ │
└────────────────────────────┼─────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │    Supabase (Backend-as-a-   │
              │    Service)                  │
              │                              │
              │  ┌────────────────────────┐  │
              │  │   PostgreSQL Database  │  │
              │  │   + RLS (Row Level     │  │
              │  │     Security)          │  │
              │  └────────────────────────┘  │
              │  ┌────────────────────────┐  │
              │  │   Supabase Auth        │  │
              │  │   (향후 프리미엄 확장용)  │  │
              │  └────────────────────────┘  │
              └──────────────┬──────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
  ┌───────┴───────┐  ┌──────┴──────┐  ┌───────┴───────┐
  │  국토교통부     │  │  한국은행    │  │  은행연합회    │
  │  실거래가 API  │  │  ECOS API   │  │  COFIX 공시   │
  └───────────────┘  └─────────────┘  └───────────────┘
```

### 1.1 기술 스택 요약

| 레이어 | 기술 | 선정 이유 |
|--------|------|----------|
| 프론트엔드 | Next.js 14+ (App Router) | SSR/SSG/ISR 지원으로 SEO 극대화, React 생태계 |
| 스타일링 | Tailwind CSS | 빠른 UI 개발, 반응형 기본 지원 |
| 차트 | Recharts | React 네이티브 차트 라이브러리, 가볍고 커스텀 용이 |
| 데이터베이스 | Supabase (PostgreSQL) | 무료 티어 충분, 실시간 구독, RLS 보안 |
| 호스팅 | Vercel | Next.js 최적화, 자동 배포, Cron Jobs 내장 |
| 형상관리 | GitHub | Vercel 자동 배포 연동 |
| 패키지 매니저 | pnpm | 빠른 설치, 디스크 효율 |

### 1.2 렌더링 전략

| 페이지 | 렌더링 방식 | revalidate | 이유 |
|--------|------------|-----------|------|
| `/` (메인) | SSR | - | 항상 최신 데이터 표시 |
| `/apt/[region]` | ISR | 3600 (1시간) | SEO + 적당한 실시간성 |
| `/apt/[region]/[apt-id]` | ISR | 3600 (1시간) | SEO 핵심, 검색 엔진 크롤링 |
| `/rate/calculator` | CSR | - | 클라이언트 사이드 계산, 인터랙티브 |
| `/rate/dashboard` | ISR | 86400 (하루) | 금리는 하루 1회 갱신 |
| `/daily/[date]` | SSG | - | 한번 생성되면 변하지 않는 아카이브 |
| `/market/[region]` | ISR | 86400 (하루) | 거래 동향은 하루 단위 |

---

## 2. 데이터베이스 스키마

### 2.1 ERD 개요

```
apt_complexes (단지 마스터)
    │ 1:N
    ▼
apt_transactions (실거래 내역)

finance_rates (금리 지표) ── 독립 테이블

daily_reports (데일리 리포트) ── 독립 테이블

page_views (조회수 로그)
    │ N:1 (optional)
    ▼
apt_complexes
```

### 2.2 테이블 상세

#### 테이블 1: `apt_complexes` (아파트 단지 마스터)

```sql
CREATE TABLE apt_complexes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_code     VARCHAR(10) NOT NULL,       -- 법정동 코드 (예: 11680)
    region_name     VARCHAR(100) NOT NULL,       -- 시군구명 (예: 서울특별시 강남구)
    dong_name       VARCHAR(50),                 -- 법정동명 (예: 대치동)
    apt_name        VARCHAR(200) NOT NULL,       -- 단지명
    address         VARCHAR(300),                -- 도로명 주소
    total_units     INTEGER,                     -- 세대수
    built_year      INTEGER,                     -- 준공연도
    slug            VARCHAR(200) NOT NULL UNIQUE, -- URL 슬러그 (예: gangnam-raemian)
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_complexes_region ON apt_complexes(region_code);
CREATE INDEX idx_complexes_name ON apt_complexes(apt_name);
CREATE UNIQUE INDEX idx_complexes_slug ON apt_complexes(slug);
```

#### 테이블 2: `apt_transactions` (아파트 실거래가)

```sql
CREATE TABLE apt_transactions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complex_id            UUID REFERENCES apt_complexes(id),
    region_code           VARCHAR(10) NOT NULL,    -- 법정동 코드
    region_name           VARCHAR(100) NOT NULL,   -- 시군구 + 법정동
    apt_name              VARCHAR(200) NOT NULL,   -- 단지명
    size_sqm              DECIMAL(6,2) NOT NULL,   -- 전용면적 (㎡)
    floor                 INTEGER,                 -- 거래 층
    trade_price           BIGINT NOT NULL,          -- 거래가격 (만원)
    trade_date            DATE NOT NULL,            -- 거래일
    highest_price         BIGINT,                   -- 해당 단지+면적 역대 최고가 (만원)
    change_rate           DECIMAL(5,2),             -- 최고가 대비 변동률 (%)
    is_new_high           BOOLEAN DEFAULT FALSE,    -- 신고가 여부
    is_significant_drop   BOOLEAN DEFAULT FALSE,    -- 유의미한 폭락 여부 (20%+ 하락)
    raw_data              JSONB,                    -- 원본 API 응답 (디버깅용)
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_txn_region_date ON apt_transactions(region_code, trade_date DESC);
CREATE INDEX idx_txn_complex ON apt_transactions(complex_id);
CREATE INDEX idx_txn_trade_date ON apt_transactions(trade_date DESC);
CREATE INDEX idx_txn_significant ON apt_transactions(is_significant_drop, is_new_high)
    WHERE is_significant_drop = TRUE OR is_new_high = TRUE;
CREATE INDEX idx_txn_change_rate ON apt_transactions(change_rate ASC)
    WHERE change_rate IS NOT NULL;
```

#### 테이블 3: `finance_rates` (금리 지표)

```sql
CREATE TABLE finance_rates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rate_type       VARCHAR(50) NOT NULL,        -- 금리 종류
    rate_value      DECIMAL(5,3) NOT NULL,       -- 금리값 (%)
    prev_value      DECIMAL(5,3),                -- 이전 값 (%)
    change_bp       INTEGER,                     -- 변동폭 (basis point)
    base_date       DATE NOT NULL,               -- 기준일
    source          VARCHAR(50) NOT NULL,        -- 데이터 출처
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- rate_type 가능 값:
--   BASE_RATE    : 한국은행 기준금리
--   COFIX_NEW    : 신규취급액 COFIX
--   COFIX_BAL    : 잔액기준 COFIX
--   CD_91        : CD 91일물
--   TREASURY_3Y  : 국고채 3년

-- source 가능 값:
--   BOK  : 한국은행 ECOS
--   KFB  : 전국은행연합회

-- 인덱스
CREATE INDEX idx_rates_type_date ON finance_rates(rate_type, base_date DESC);
CREATE UNIQUE INDEX idx_rates_unique ON finance_rates(rate_type, base_date);
```

#### 테이블 4: `daily_reports` (데일리 리포트)

```sql
CREATE TABLE daily_reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_date     DATE NOT NULL UNIQUE,        -- 리포트 날짜
    title           VARCHAR(300) NOT NULL,       -- 리포트 제목
    summary         TEXT,                        -- 요약 (메타 디스크립션용)
    top_drops       JSONB,                       -- 오늘의 폭락 TOP 리스트
    top_highs       JSONB,                       -- 오늘의 신고가 TOP 리스트
    rate_summary    JSONB,                       -- 금리 변동 요약
    volume_summary  JSONB,                       -- 거래량 이상 징후
    og_image_url    VARCHAR(500),                -- 카드뉴스 이미지 URL
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- top_drops JSONB 구조 예시:
-- [
--   {
--     "rank": 1,
--     "apt_name": "래미안퍼스티지",
--     "region": "강남구 대치동",
--     "size": 84.97,
--     "highest_price": 150000,
--     "trade_price": 97000,
--     "change_rate": -35.33
--   }
-- ]

CREATE UNIQUE INDEX idx_reports_date ON daily_reports(report_date DESC);
```

#### 테이블 5: `page_views` (조회수 로그)

```sql
CREATE TABLE page_views (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    page_path       VARCHAR(500) NOT NULL,       -- 페이지 경로
    page_type       VARCHAR(50),                 -- 페이지 유형 (apt_detail, rate, daily 등)
    region_code     VARCHAR(10),                 -- 관련 지역 코드 (nullable)
    complex_id      UUID REFERENCES apt_complexes(id), -- 관련 단지 ID (nullable)
    view_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    view_count      INTEGER DEFAULT 1,           -- 일별 집계 카운트
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 동일 페이지+날짜 조합으로 UPSERT하여 일별 집계
CREATE UNIQUE INDEX idx_views_path_date ON page_views(page_path, view_date);
CREATE INDEX idx_views_region_date ON page_views(region_code, view_date DESC)
    WHERE region_code IS NOT NULL;
CREATE INDEX idx_views_complex ON page_views(complex_id, view_date DESC)
    WHERE complex_id IS NOT NULL;
```

### 2.3 RLS (Row Level Security) 정책

```sql
-- 모든 테이블: 읽기는 공개, 쓰기는 서비스 키만 허용
ALTER TABLE apt_complexes ENABLE ROW LEVEL SECURITY;
ALTER TABLE apt_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 정책 (anon 키로 접근 가능)
CREATE POLICY "Public read" ON apt_complexes FOR SELECT USING (true);
CREATE POLICY "Public read" ON apt_transactions FOR SELECT USING (true);
CREATE POLICY "Public read" ON finance_rates FOR SELECT USING (true);
CREATE POLICY "Public read" ON daily_reports FOR SELECT USING (true);

-- page_views는 쓰기도 anon 허용 (조회수 기록)
CREATE POLICY "Public read" ON page_views FOR SELECT USING (true);
CREATE POLICY "Public insert" ON page_views FOR INSERT WITH CHECK (true);
```

---

## 3. API 명세

### 3.1 외부 API 연동

#### A. 국토교통부 아파트매매 실거래가 API

| 항목 | 값 |
|------|---|
| 엔드포인트 | `http://openapi.molit.go.kr/OpenAPI_ToolInstall498/service/rest/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev` |
| 인증 | ServiceKey (공공데이터포털에서 발급) |
| 호출 제한 | 기본 1,000건/일 (트래픽 제한 확대 신청 가능) |
| 주요 파라미터 | `LAWD_CD` (법정동코드 5자리), `DEAL_YMD` (계약년월 YYYYMM) |

**요청 예시**:
```
GET /getRTMSDataSvcAptTradeDev
  ?serviceKey={API_KEY}
  &LAWD_CD=11680          // 강남구
  &DEAL_YMD=202603        // 2026년 3월
  &pageNo=1
  &numOfRows=1000
```

**응답 주요 필드**:
```xml
<item>
    <거래금액> 90,000</거래금액>    <!-- 만원 단위 -->
    <건축년도>2008</건축년도>
    <년>2026</년>
    <법정동>대치동</법정동>
    <아파트>래미안퍼스티지</아파트>
    <월>3</월>
    <일>15</일>
    <전용면적>84.97</전용면적>
    <층>12</층>
    <지역코드>11680</지역코드>
</item>
```

#### B. 한국은행 ECOS API

| 항목 | 값 |
|------|---|
| 엔드포인트 | `https://ecos.bok.or.kr/api/StatisticSearch/{인증키}/json/kr/1/10/{통계표코드}/{주기}/{시작일}/{종료일}/{항목코드}` |
| 인증 | 인증키 (ECOS 회원가입 시 자동 발급) |
| 호출 제한 | 일 100,000건 |

**주요 통계표코드**:
| 코드 | 항목 | 주기 |
|------|------|------|
| 722Y001 | 한국은행 기준금리 | 일별 |
| 817Y002 | 시장금리 (CD, 국고채 등) | 일별 |

#### C. 은행연합회 COFIX

| 항목 | 값 |
|------|---|
| URL | `https://portal.kfb.or.kr/fingoods/cofix.php` |
| 인증 | 없음 (웹 크롤링) |
| 갱신 주기 | 매월 15일 전후 공시 |
| 크롤링 방식 | HTML 파싱 (cheerio) |

### 3.2 내부 API Routes

#### Cron 작업용 (CRON_SECRET 인증)

| 메서드 | 경로 | 설명 | 스케줄 |
|--------|------|------|--------|
| GET | `/api/cron/fetch-transactions` | 실거래가 데이터 수집 | 매일 06:00 KST |
| GET | `/api/cron/fetch-rates` | 금리 데이터 수집 | 매일 07:00 KST |
| GET | `/api/cron/generate-report` | 데일리 리포트 생성 | 매일 08:00 KST |

**인증 방식**:
```typescript
// 모든 Cron API Route에 적용
if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
}
```

#### 클라이언트용 API

**아파트 관련**:

| 메서드 | 경로 | 설명 | 응답 |
|--------|------|------|------|
| GET | `/api/apt?region={code}&page={n}&limit={n}` | 지역별 아파트 목록 | 페이지네이션된 단지 리스트 |
| GET | `/api/apt/[id]` | 단지 상세 정보 | 단지 기본정보 + 최근 거래 요약 |
| GET | `/api/apt/[id]/transactions?period={1y\|3y\|5y}` | 단지 거래 내역 | 기간별 거래 리스트 |
| GET | `/api/apt/extremes?type={drop\|high}&limit=10` | 극단적 변동 목록 | 폭락/신고가 랭킹 |

**금리 관련**:

| 메서드 | 경로 | 설명 | 응답 |
|--------|------|------|------|
| GET | `/api/rate/current` | 현재 금리 현황 | 전체 금리 타입별 최신값 |
| GET | `/api/rate/history?type={rate_type}&months=12` | 금리 히스토리 | 기간별 금리 추이 |
| POST | `/api/rate/calculate` | 대출 이자 계산 | 상환 방식별 결과 |

**대출 계산 요청/응답 예시**:
```typescript
// 요청
POST /api/rate/calculate
{
    "principal": 300000000,   // 대출 원금 (원)
    "rate": 3.5,              // 금리 (%)
    "years": 30,              // 상환 기간 (년)
    "type": "equal_payment"   // equal_payment | equal_principal | bullet
}

// 응답
{
    "monthly_payment": 1,347,131,      // 월 상환액
    "total_interest": 184,966,960,     // 총 이자
    "total_payment": 484,966,960,      // 총 상환액
    "schedule": [                      // 월별 스케줄 (처음 3개월)
        { "month": 1, "principal": 472,131, "interest": 875,000, "balance": 299,527,869 },
        { "month": 2, "principal": 473,509, "interest": 873,622, "balance": 299,054,360 },
        ...
    ]
}
```

**거래 동향 관련**:

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/market/[region]` | 지역별 거래 동향 (월별 거래량, 평균가) |
| GET | `/api/market/heatmap` | 전체 지역 거래량 히트맵 데이터 |

**데일리 리포트**:

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/daily/[date]` | 특정 날짜 리포트 |
| GET | `/api/daily/latest` | 최신 리포트 |

**분석/로그**:

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/analytics/pageview` | 조회수 기록 (UPSERT) |
| GET | `/api/analytics/popular?period=7d` | 인기 페이지 TOP 리스트 |

---

## 4. 자동화 파이프라인

### 4.1 Vercel Cron 설정

```json
// vercel.json
{
    "crons": [
        {
            "path": "/api/cron/fetch-transactions",
            "schedule": "0 21 * * *"
        },
        {
            "path": "/api/cron/fetch-rates",
            "schedule": "0 22 * * *"
        },
        {
            "path": "/api/cron/generate-report",
            "schedule": "0 23 * * *"
        }
    ]
}
```

> 참고: Vercel Cron은 UTC 기준. `0 21 * * *` = KST 06:00

### 4.2 실거래가 수집 파이프라인

```
[Cron 트리거: 06:00 KST]
        │
        ▼
[1. 대상 지역코드 목록 로드]
   → 주요 시군구 법정동코드 약 250개
        │
        ▼
[2. 국토교통부 API 순차 호출]
   → 각 지역코드별 당월 데이터 요청
   → 요청 간 300ms 딜레이 (API 부하 방지)
   → 실패 시 3회 재시도 (exponential backoff)
        │
        ▼
[3. 데이터 정제 및 저장]
   → XML 응답 파싱 → JSON 변환
   → apt_complexes UPSERT (신규 단지 자동 등록)
   → apt_transactions INSERT (중복 체크: 단지+면적+층+거래일+가격)
        │
        ▼
[4. 파생 데이터 계산]
   → 각 거래에 대해:
     - 해당 단지+면적의 역대 최고가 조회 → highest_price 설정
     - change_rate = (trade_price - highest_price) / highest_price × 100
     - trade_price > highest_price → is_new_high = TRUE
     - change_rate <= -20 → is_significant_drop = TRUE
        │
        ▼
[5. 완료 로그]
   → 수집 건수, 신고가 건수, 폭락 건수 기록
```

### 4.3 금리 수집 파이프라인

```
[Cron 트리거: 07:00 KST]
        │
        ▼
[1. ECOS API 호출]
   → 기준금리 (722Y001)
   → CD 91일물, 국고채 3년 (817Y002)
        │
        ▼
[2. COFIX 체크]
   → 은행연합회 페이지 크롤링
   → 이번 달 15일 이후 새 공시가 있는지 확인
   → 새 공시 있으면 파싱하여 저장
        │
        ▼
[3. 변동폭 계산 및 저장]
   → 직전 데이터와 비교하여 change_bp 계산
   → finance_rates INSERT (UNIQUE 제약으로 중복 방지)
```

### 4.4 데일리 리포트 생성 파이프라인

```
[Cron 트리거: 08:00 KST]
        │
        ▼
[1. 오늘의 데이터 집계]
   → apt_transactions에서 오늘 수집된 데이터 중:
     - 하락률 TOP 5 추출 (is_significant_drop)
     - 신고가 단지 전체 추출 (is_new_high)
   → finance_rates에서 전일 대비 변동 사항 추출
        │
        ▼
[2. 리포트 콘텐츠 구성]
   → 제목 자동 생성: "2026년 3월 22일 부동산 데일리 리포트"
   → 요약문 자동 생성: "서울 폭락 거래 3건, 신고가 1건 발생"
   → top_drops, top_highs, rate_summary JSONB 구성
        │
        ▼
[3. daily_reports INSERT]
        │
        ▼
[4. (선택) 카드뉴스 이미지 생성]
   → Puppeteer/Playwright로 HTML 템플릿 렌더링 → 이미지 캡처
   → Supabase Storage에 업로드 → og_image_url 업데이트
```

---

## 5. Next.js 프로젝트 구조

```
donjup/
├── app/
│   ├── layout.tsx                          # 루트 레이아웃
│   ├── page.tsx                            # 메인 대시보드 (SSR)
│   ├── globals.css                         # 글로벌 스타일
│   │
│   ├── apt/
│   │   └── [region]/
│   │       ├── page.tsx                    # 지역별 목록 (ISR)
│   │       └── [aptId]/
│   │           └── page.tsx                # 단지 상세 (ISR)
│   │
│   ├── rate/
│   │   ├── page.tsx                        # 금리 대시보드 (ISR)
│   │   ├── calculator/
│   │   │   └── page.tsx                    # 대출 계산기 (CSR)
│   │   └── history/
│   │       └── page.tsx                    # 금리 히스토리 (ISR)
│   │
│   ├── market/
│   │   ├── [region]/
│   │   │   └── page.tsx                    # 지역별 동향 (ISR)
│   │   └── heatmap/
│   │       └── page.tsx                    # 히트맵 (ISR)
│   │
│   ├── daily/
│   │   ├── [date]/
│   │   │   └── page.tsx                    # 데일리 리포트 (SSG)
│   │   └── archive/
│   │       └── page.tsx                    # 아카이브 (ISR)
│   │
│   ├── about/
│   │   └── page.tsx                        # 서비스 소개
│   │
│   ├── api/
│   │   ├── cron/
│   │   │   ├── fetch-transactions/route.ts
│   │   │   ├── fetch-rates/route.ts
│   │   │   └── generate-report/route.ts
│   │   ├── apt/
│   │   │   ├── route.ts                    # GET /api/apt
│   │   │   ├── [id]/
│   │   │   │   ├── route.ts                # GET /api/apt/[id]
│   │   │   │   └── transactions/route.ts   # GET /api/apt/[id]/transactions
│   │   │   └── extremes/route.ts           # GET /api/apt/extremes
│   │   ├── rate/
│   │   │   ├── current/route.ts
│   │   │   ├── history/route.ts
│   │   │   └── calculate/route.ts
│   │   ├── market/
│   │   │   ├── [region]/route.ts
│   │   │   └── heatmap/route.ts
│   │   ├── daily/
│   │   │   ├── [date]/route.ts
│   │   │   └── latest/route.ts
│   │   └── analytics/
│   │       ├── pageview/route.ts
│   │       └── popular/route.ts
│   │
│   └── sitemap.ts                          # 동적 사이트맵 생성
│
├── components/
│   ├── charts/
│   │   ├── PriceLineChart.tsx              # 가격 추이 라인 차트
│   │   ├── VolumeBarChart.tsx              # 거래량 막대 차트
│   │   ├── RateMultiLineChart.tsx          # 금리 추이 다중 라인
│   │   └── ChangeGauge.tsx                 # 최고가 대비 게이지
│   ├── ads/
│   │   ├── AdBanner.tsx                    # 배너 광고 (728x90, 300x250)
│   │   ├── AdInFeed.tsx                    # 인피드 네이티브 광고
│   │   └── CpaAffiliate.tsx                # CPA 제휴 배너
│   ├── ui/
│   │   ├── RateBadge.tsx                   # 금리 변동 뱃지 (▲▼)
│   │   ├── RankCard.tsx                    # 폭락/신고가 랭킹 카드
│   │   ├── DataTable.tsx                   # 거래 내역 테이블
│   │   └── Pagination.tsx                  # 페이지네이션
│   └── seo/
│       ├── JsonLd.tsx                      # JSON-LD 구조화 데이터
│       └── MetaTags.tsx                    # Open Graph 메타태그
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                       # 브라우저용 Supabase 클라이언트
│   │   └── server.ts                       # 서버용 Supabase 클라이언트
│   ├── api/
│   │   ├── molit.ts                        # 국토교통부 API 래퍼
│   │   ├── ecos.ts                         # 한국은행 ECOS API 래퍼
│   │   └── kfb.ts                          # 은행연합회 COFIX 크롤러
│   ├── calculator.ts                       # 대출 이자 계산 로직
│   ├── analytics.ts                        # 조회수 추적 유틸
│   └── constants/
│       ├── region-codes.ts                 # 법정동 코드 목록
│       └── rate-types.ts                   # 금리 타입 상수
│
├── public/
│   ├── robots.txt
│   └── favicon.ico
│
├── .env.local                              # 환경변수
├── vercel.json                             # Cron 스케줄
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── pnpm-lock.yaml
```

### 5.1 환경변수 (.env.local)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# 외부 API
MOLIT_API_KEY=서비스키                    # 국토교통부 (공공데이터포털)
ECOS_API_KEY=인증키                       # 한국은행 ECOS

# Vercel Cron
CRON_SECRET=랜덤시크릿                    # Cron 작업 인증용

# Google
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX           # Google Analytics
NEXT_PUBLIC_ADSENSE_ID=ca-pub-XXXXXXX    # Google AdSense
```

---

## 6. 리스크 및 대응

| 리스크 | 영향도 | 대응 방안 |
|--------|--------|----------|
| 국토교통부 API 일일 호출 제한 (1,000건) | 높음 | 트래픽 제한 확대 신청 + 주요 시군구 우선 수집 (서울 25개구 → 수도권 → 전국 순차 확대) |
| Vercel Hobby 플랜 Cron 제한 (일 1회) | 중간 | Pro 플랜($20/월) 업그레이드 또는 Supabase pg_cron으로 대체 |
| 애드센스 승인 지연/거부 | 중간 | 최소 30개 이상 페이지 + 독자적 콘텐츠 확보 후 신청. 거부 시 카카오 애드핏 대안 |
| 실거래가 데이터 지연 (신고 후 1~2주) | 낮음 | "신고 기준일" 명확히 표시. 실시간이 아닌 '최근 신고' 데이터임을 안내 |
| COFIX 크롤링 차단 | 낮음 | ECOS API의 대체 금리 지표(CD금리, 금융채) 활용 |
| Supabase 무료 티어 한도 초과 | 낮음 | DB 500MB 한도 모니터링. 초과 시 오래된 raw_data 컬럼 정리 또는 Pro 플랜($25/월) |
