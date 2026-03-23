# 돈줍(DonJup) 종합 리뉴얼 마스터플랜 v3

> 작성일: 2026-03-23
> 문서 번호: 11
> 기반 자료: 08-competitive-research.md, 09-site-redesign-v2.md, 10-crash-criteria-v2.md
> 목적: CEO 방향성에 기반한 전사 리뉴얼 실행 계획서
> 대상: PM/PO, 개발팀, 디자인팀, QA

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [서비스 기능 설계](#2-서비스-기능-설계)
3. [보안 설계](#3-보안-설계)
4. [성능 최적화 설계](#4-성능-최적화-설계)
5. [개발 스프린트 계획](#5-개발-스프린트-계획)
6. [팀 역할 배분](#6-팀-역할-배분)
7. [KPI 및 성공 지표](#7-kpi-및-성공-지표)

---

## 1. 프로젝트 개요

### 1-1. 리뉴얼 목적

돈줍은 현재 **아파트 매매 실거래가 폭락/신고가 랭킹** 서비스로 운영 중이다. 이번 리뉴얼의 핵심 목적은 다음 세 가지이다:

1. **자극적 데이터(폭등/폭락)로 유입 → 유저가 원하는 실질 정보 제공** — 클릭베이트가 아닌, 실질적 투자 판단 도구로의 전환
2. **멀티 부동산 유형 확장** — 아파트 중심에서 빌라/오피스텔/토지/상업용까지 카테고리 확장
3. **사용자 참여 기능 도입** — SNS 로그인, 댓글, 관심단지 등 커뮤니티 기반 기능 추가로 재방문율 극대화

경쟁사 분석(08-competitive-research.md) 결과, **극단값 중심 정보**, **금리 체감형 정보**, **감정 자극형 콘텐츠**, **일일 자동 업데이트**는 기존 6대 경쟁사(호갱노노, 직방, 네이버 부동산, 아실, KB부동산, R114) 어디에도 없는 돈줍만의 차별화 포인트이다. 이 포지셔닝을 유지하면서 서비스 깊이를 확장한다.

### 1-2. AS-IS vs TO-BE 비교표

| 항목 | AS-IS (현재) | TO-BE (리뉴얼 후) |
|------|-------------|-------------------|
| **부동산 유형** | 아파트만 (MOLIT Apt API) | 아파트 + 빌라 + 오피스텔 + 토지 + 상업용 |
| **UI 구조** | 단일 리스트, 탭 2개 (폭락/신고가) | 상단 카테고리 탭 + 하위 4탭 (폭락/신고가/전세급등/거래량) |
| **단지 정보** | 기본 정보만 (단지명, 주소) | 세대수, 주차대수, 허가층수, 건축년도, 재건축연한, 난방방식 |
| **지도** | 없음 | 카카오맵 연동 (마커 색상, 클러스터링) |
| **사용자 시스템** | 없음 (비로그인) | SNS 로그인 (카카오/네이버/구글) + 댓글 + 관심단지 |
| **DB** | Supabase 단독 (무료) | 하이브리드: Supabase(거래 데이터) + Firebase(사용자 데이터) |
| **뉴스** | 없음 | 네이버 뉴스 검색 API 연동 (단지별 관련 뉴스) |
| **폭락 기준** | 역대 최고가 대비 -20% 이진 분류 | 최근 3년 최고가 기준, 3단계 분류 (하락/폭락/대폭락) |
| **데이터 저장** | 원문 그대로 저장 | 코드화 축약 저장 (region_code, property_type 숫자 코드) |
| **캐싱** | 미적용 | ISR + Edge Cache + Rate Limiting |
| **보안** | 기본 수준 | 환경변수 감사 + API 인증 + Rate Limiting + CORS |
| **검색** | 없음 | 통합 검색 + 자동완성 (300ms 이내) |
| **전월세** | 단지 상세 내 전월세 탭 | 전월세 전용 페이지 (/rent) + 전세가율 TOP |

### 1-3. 타임라인

```
2026.03.23 ─── 마스터플랜 확정
         │
Sprint 1 ─── 04.01 ~ 04.14 (2주)
         │   데이터 축약 + 성능 최적화 + Rate Limiting
         │
Sprint 2 ─── 04.15 ~ 04.28 (2주)
         │   멀티 부동산 유형 (빌라/오피스텔 추가)
         │
Sprint 3 ─── 04.29 ~ 05.12 (2주)
         │   지도 서비스 (카카오맵 연동)
         │
Sprint 4 ─── 05.13 ~ 05.26 (2주)
         │   Firebase 로그인 + 댓글
         │
Sprint 5 ─── 05.27 ~ 06.09 (2주)
         │   뉴스 취합 + 최종 QA + 릴리즈
         │
2026.06.09 ─── v3 릴리즈
```

---

## 2. 서비스 기능 설계

### 2.1 멀티 부동산 유형 지원

#### 2.1.1 현황 분석

현재 돈줍은 국토교통부 아파트 매매 실거래 API만 사용하고 있다. 그러나 이미 아래 API 키를 보유하고 승인받은 상태이다:

| API | 승인 상태 | 엔드포인트 |
|-----|----------|-----------|
| 아파트 매매 | 승인됨 (사용 중) | `getRTMSDataSvcAptTradeDev` |
| 연립다세대 매매 | 승인됨 (미사용) | `getRTMSDataSvcRHTradeDev` |
| 오피스텔 매매 | 승인됨 (미사용) | `getRTMSDataSvcOffiTradeDev` |
| 토지 매매 | 승인됨 (미사용) | `getRTMSDataSvcLandTradeDev` |
| 상업/업무용 매매 | 승인됨 (미사용) | `getRTMSDataSvcNrgTradeDev` |

#### 2.1.2 UI 설계

**상단 카테고리 탭 구조:**

```
┌────────────────────────────────────────────────────┐
│ [아파트]  [빌라]  [오피스텔]  [토지]                  │
│  (기본)   (NEW)    (NEW)     (NEW)                  │
└────────────────────────────────────────────────────┘
```

- 아파트 탭이 기본 활성 상태 (현재 사용자 경험 유지)
- 각 탭 클릭 시 해당 유형의 폭락/신고가 데이터로 전환
- 모바일에서는 스와이프 가능한 탭 UI

**탭 전환 동작:**
- 탭 클릭 → URL 쿼리 파라미터 변경: `/?type=apt`, `/?type=villa`, `/?type=officetel`, `/?type=land`
- 서버 사이드에서 property_type 기반 필터링
- 각 탭별 독립적인 폭락/신고가 TOP 리스트

#### 2.1.3 DB 설계

**property_type 코드 체계:**

| 코드 | 유형 | 한국어 | API 소스 |
|------|------|--------|---------|
| 1 | apt | 아파트 | getRTMSDataSvcAptTradeDev |
| 2 | villa | 연립다세대 (빌라) | getRTMSDataSvcRHTradeDev |
| 3 | officetel | 오피스텔 | getRTMSDataSvcOffiTradeDev |
| 4 | land | 토지 | getRTMSDataSvcLandTradeDev |
| 5 | commercial | 상업/업무용 | getRTMSDataSvcNrgTradeDev |

**테이블 변경:**

```sql
-- 기존 apt_transactions 테이블에 property_type 컬럼 추가
ALTER TABLE apt_transactions ADD COLUMN IF NOT EXISTS property_type SMALLINT DEFAULT 1;
-- 1=아파트, 2=빌라, 3=오피스텔, 4=토지, 5=상업용

-- 기존 apt_complexes 테이블에 property_type 컬럼 추가
ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS property_type SMALLINT DEFAULT 1;

-- 인덱스 추가
CREATE INDEX idx_transactions_property_type ON apt_transactions(property_type);
CREATE INDEX idx_complexes_property_type ON apt_complexes(property_type);

-- 복합 인덱스 (조회 성능)
CREATE INDEX idx_transactions_type_date ON apt_transactions(property_type, trade_date DESC);
```

**클라이언트 매핑 코드:**

```typescript
// src/lib/constants.ts
export const PROPERTY_TYPES = {
  1: { key: 'apt', label: '아파트', icon: '🏢' },
  2: { key: 'villa', label: '빌라', icon: '🏘️' },
  3: { key: 'officetel', label: '오피스텔', icon: '🏬' },
  4: { key: 'land', label: '토지', icon: '🗺️' },
  5: { key: 'commercial', label: '상업용', icon: '🏪' },
} as const;
```

#### 2.1.4 데이터 수집 크론 확장

현재 아파트 데이터 수집 크론잡을 확장하여 모든 유형을 수집한다:

```
현재: 매일 06:00 아파트 매매 데이터 수집
변경: 매일 06:00~06:30 순차 수집
  06:00 아파트 매매
  06:05 연립다세대 매매
  06:10 오피스텔 매매
  06:15 토지 매매
  06:20 상업/업무용 매매
```

각 API의 응답 스키마가 약간 다르므로 파서를 유형별로 작성해야 한다:

| 필드 | 아파트 | 빌라 | 오피스텔 | 토지 |
|------|--------|------|---------|------|
| 건물명 | aptNm | mhouseNm | offiNm | - |
| 면적 | excluUseAr | excluUseAr | excluUseAr | pltAr (대지면적) |
| 층 | floor | floor | floor | - |
| 가격 | dealAmount | dealAmount | dealAmount | dealAmount |
| 건축년도 | buildYear | buildYear | buildYear | - |

#### 2.1.5 구현 파일 목록

```
src/lib/constants.ts            — PROPERTY_TYPES 상수 추가
src/lib/api/molit-villa.ts      — 빌라 API 파서 (NEW)
src/lib/api/molit-officetel.ts  — 오피스텔 API 파서 (NEW)
src/lib/api/molit-land.ts       — 토지 API 파서 (NEW)
src/app/api/fetch-transactions/route.ts — property_type 필터링 추가
src/app/page.tsx                — 카테고리 탭 UI 추가
src/components/CategoryTabs.tsx — 카테고리 탭 컴포넌트 (NEW)
scripts/fetch-villa.ts         — 빌라 수집 스크립트 (NEW)
scripts/fetch-officetel.ts     — 오피스텔 수집 스크립트 (NEW)
scripts/fetch-land.ts          — 토지 수집 스크립트 (NEW)
```

---

### 2.2 단지 상세 정보 강화

#### 2.2.1 현재 보유 정보 vs 추가 정보

| 정보 | 현재 보유 여부 | 데이터 소스 | 추가 작업 |
|------|:------------:|-----------|----------|
| 단지명 | O | MOLIT API | 없음 |
| 주소 (시군구/동) | O | MOLIT API | 없음 |
| 건축년도 (built_year) | O | MOLIT API + 건축물대장 | 없음 |
| 총세대수 (total_units) | O | apt_complexes 테이블 | 없음 |
| **주차대수** | **X** | 건축물대장 API (pkngCnt) | **추가 필요** |
| **허가 층수** | **X** | 건축물대장 API (grndFlrCnt) | **추가 필요** |
| **난방 방식** | **X** | 건축물대장 API (heatMthd) | **추가 필요** |
| **재건축 연한** | **X** | 계산 (준공년도 기반) | **추가 필요** |
| **용적률** | **X** | 건축물대장 API (vlRat) | **추가 필요** |
| **건폐율** | **X** | 건축물대장 API (bcRat) | **추가 필요** |

#### 2.2.2 건축물대장 API 연동 상세

건축물대장 API는 이미 구현되어 있으므로, 응답에서 추가 필드를 파싱하여 저장한다.

**apt_complexes 테이블 확장:**

```sql
ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS parking_count INTEGER;
ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS max_floor INTEGER;
ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS heat_method VARCHAR(20);
ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS rebuild_year INTEGER;  -- 재건축 가능 연도
ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS floor_area_ratio DECIMAL(5,2);  -- 용적률
ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS building_coverage DECIMAL(5,2);  -- 건폐율
```

#### 2.2.3 재건축 연한 계산 로직

```typescript
// src/lib/rebuild.ts
export function calculateRebuildYear(
  builtYear: number,
  propertyType: number
): number {
  // 아파트: 준공 후 30년
  // 빌라(연립다세대): 준공 후 20년
  const REBUILD_YEARS = {
    1: 30,  // 아파트
    2: 20,  // 빌라
    3: 30,  // 오피스텔
  };

  const addYears = REBUILD_YEARS[propertyType] || 30;
  return builtYear + addYears;
}

export function getRebuildStatus(rebuildYear: number): {
  label: string;
  color: string;
  yearsLeft: number;
} {
  const currentYear = new Date().getFullYear();
  const yearsLeft = rebuildYear - currentYear;

  if (yearsLeft <= 0) {
    return { label: '재건축 가능', color: '#22c55e', yearsLeft: 0 };
  } else if (yearsLeft <= 5) {
    return { label: `재건축 ${yearsLeft}년 후`, color: '#f59e0b', yearsLeft };
  } else {
    return { label: `재건축 ${yearsLeft}년 후`, color: '#6b7280', yearsLeft };
  }
}
```

#### 2.2.4 단지 상세 UI 강화

단지 상세 페이지(`/apt/[region]/[slug]`)의 "단지 정보" 탭에 아래 정보를 추가 표시한다:

```
┌──────────────────────────────────────────────────────┐
│ [단지 정보]                                           │
│                                                      │
│ 기본 정보                                             │
│ ┌──────────┬──────────┬──────────┬──────────┐        │
│ │ 준공년도  │ 총세대수  │ 최고층수  │ 주차대수  │        │
│ │ 2009년   │ 2,444세대 │ 35층     │ 3,200대  │        │
│ └──────────┴──────────┴──────────┴──────────┘        │
│                                                      │
│ 건물 정보                                             │
│ ┌──────────┬──────────┬──────────┬──────────┐        │
│ │ 난방방식  │ 용적률    │ 건폐율    │ 주차비율  │        │
│ │ 개별난방  │ 249%     │ 18%      │ 1.31대/세대│       │
│ └──────────┴──────────┴──────────┴──────────┘        │
│                                                      │
│ 재건축 정보                                           │
│ ┌────────────────────────────────────────────┐        │
│ │ 재건축 가능 연도: 2039년 (13년 후)            │        │
│ │ ████████████████░░░░░░ 57% 경과              │        │
│ │ (아파트 기준 준공 후 30년)                     │        │
│ └────────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────┘
```

---

### 2.3 지도 서비스

#### 2.3.1 기술 검토

| 항목 | 카카오맵 | 네이버 지도 | 구글 맵 |
|------|---------|-----------|---------|
| 무료 한도 | 30만 건/일 | 20만 건/일 | 2.8만 건/월 |
| 한국 데이터 정확도 | 최상 | 최상 | 보통 |
| 지오코딩 정확도 | 매우 높음 | 높음 | 높음 |
| 클러스터링 지원 | 공식 라이브러리 | 공식 라이브러리 | 공식 라이브러리 |
| 비용 | 무료 (30만/일) | 무료 (20만/일) | 유료 (초과 시) |
| **결정** | **채택** | - | - |

**선정 사유:** 카카오맵은 일 30만 건 무료 한도로 초기 트래픽에 충분하며, 한국 주소 기반 지오코딩 정확도가 가장 높다.

#### 2.3.2 기능 설계

**지도 페이지 URL:** `/map`

**핵심 기능:**

1. **주소 → 좌표 지오코딩**
   - 카카오 로컬 API (`/v2/local/search/address`)
   - apt_complexes에 `latitude`, `longitude` 컬럼 추가
   - 최초 1회 일괄 지오코딩 + 신규 단지 수집 시 자동 지오코딩

2. **마커 색상 분류**
   - 상승 (초록, #22c55e): change_rate > 0
   - 하락 (주황, #f59e0b): -10% < change_rate <= 0
   - 폭락 (빨강, #ef4444): -15% < change_rate <= -10%
   - 대폭락 (진빨강, #dc2626): change_rate <= -15%

3. **클러스터링 (줌 레벨별)**
   - 줌 1~6: 시도 단위 클러스터 (서울: 폭락 23건, 신고가 15건)
   - 줌 7~10: 시군구 단위 클러스터
   - 줌 11+: 개별 단지 마커 표시

4. **마커 클릭 → 인포윈도우**
   ```
   ┌──────────────────────┐
   │ 래미안 퍼스티지        │
   │ 84㎡(25평) · 17.6억   │
   │ 최고가 대비 ▼45.0%    │
   │ [상세보기 →]           │
   └──────────────────────┘
   ```

#### 2.3.3 DB 변경

```sql
ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7);
ALTER TABLE apt_complexes ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7);

-- 공간 인덱스 (줌 레벨별 조회 최적화)
CREATE INDEX idx_complexes_location ON apt_complexes(latitude, longitude);
```

#### 2.3.4 지오코딩 배치 스크립트

```
scripts/geocode-complexes.ts
  - apt_complexes에서 latitude IS NULL인 단지 조회
  - 카카오 로컬 API로 주소 → 좌표 변환
  - 배치 처리: 100건/분 (API 제한 고려)
  - 실패 시 재시도 (최대 3회)
  - 결과를 apt_complexes에 UPDATE
```

#### 2.3.5 구현 파일 목록

```
src/app/map/page.tsx              — 지도 페이지 (NEW)
src/components/KakaoMap.tsx       — 카카오맵 래퍼 컴포넌트 (NEW, 'use client')
src/components/MapMarker.tsx      — 마커 컴포넌트 (NEW)
src/components/MapCluster.tsx     — 클러스터 컴포넌트 (NEW)
src/components/MapInfoWindow.tsx  — 인포윈도우 컴포넌트 (NEW)
src/app/api/map/markers/route.ts  — 지도 마커 데이터 API (NEW)
scripts/geocode-complexes.ts      — 지오코딩 배치 (NEW)
```

#### 2.3.6 카카오맵 API 키 관리

```
.env.local에 추가:
  NEXT_PUBLIC_KAKAO_MAP_KEY=<JavaScript 키>
  KAKAO_REST_API_KEY=<REST API 키 — 지오코딩용>
```

- `NEXT_PUBLIC_KAKAO_MAP_KEY`: 클라이언트에서 지도 렌더링용 (공개 가능)
- `KAKAO_REST_API_KEY`: 서버에서 지오코딩용 (비공개)

---

### 2.4 SNS 로그인 + 댓글

#### 2.4.1 아키텍처: 하이브리드 (Supabase + Firebase)

```
┌─────────────────────────────────────────────┐
│                  클라이언트                    │
│                                             │
│   Firebase Auth  ←──→  Firebase SDK         │
│   (로그인)              (댓글, 관심단지)      │
│                                             │
│   Supabase Client ←──→  Supabase SDK        │
│   (거래 데이터 조회)     (읽기 전용)           │
└─────────────────────────────────────────────┘
         │                      │
         ▼                      ▼
┌─────────────────┐   ┌─────────────────┐
│   Firebase       │   │   Supabase       │
│   ─────────      │   │   ─────────      │
│   Auth           │   │   apt_transactions│
│   Firestore      │   │   apt_complexes   │
│   ├── users      │   │   apt_rent_trans  │
│   ├── comments   │   │   finance_rates   │
│   ├── favorites  │   │   daily_reports   │
│   └── settings   │   │   reb_price_indices│
└─────────────────┘   └─────────────────┘
  쓰기 중심              읽기 중심
  (사용자 데이터)         (거래 데이터)
```

**하이브리드 선택 이유:**
- Supabase 무료 플랜 한계: 500MB 스토리지, 2GB 전송/월 → 거래 데이터만으로도 빠듯
- Firebase 무료 플랜: Firestore 1GB 저장, 일 5만 읽기/2만 쓰기 → 사용자 데이터에 충분
- 기존 거래 데이터 마이그레이션 비용 회피 (Supabase 유지)
- Firebase Auth의 카카오/네이버 로그인 지원이 Supabase Auth보다 성숙

#### 2.4.2 Firebase Authentication 설정

**지원 로그인 방법:**

| 제공자 | 우선순위 | 한국 사용자 커버리지 | 설정 방법 |
|--------|---------|-------------------|----------|
| 카카오 로그인 | P0 | ~90% (필수) | Firebase Custom Auth + 카카오 SDK |
| 네이버 로그인 | P0 | ~70% | Firebase Custom Auth + 네이버 SDK |
| 구글 로그인 | P1 | ~40% | Firebase 기본 제공 |

**카카오/네이버는 Firebase 기본 제공이 아니므로 Custom Auth Token 방식 사용:**

```
사용자 → 카카오 SDK 로그인 → 카카오 액세스 토큰 획득
  → API Route (/api/auth/kakao) → 카카오 토큰 검증
  → Firebase Admin SDK로 Custom Token 생성
  → 클라이언트에서 signInWithCustomToken()
```

**구현 파일:**

```
src/lib/firebase.ts                    — Firebase 초기화 (client)
src/lib/firebase-admin.ts             — Firebase Admin 초기화 (server)
src/app/api/auth/kakao/route.ts       — 카카오 Custom Auth (NEW)
src/app/api/auth/naver/route.ts       — 네이버 Custom Auth (NEW)
src/components/LoginButton.tsx        — 로그인 버튼 UI (NEW)
src/components/UserMenu.tsx           — 로그인 후 사용자 메뉴 (NEW)
src/contexts/AuthContext.tsx          — 인증 상태 관리 (NEW)
```

#### 2.4.3 Firestore 데이터 모델

**컬렉션 구조:**

```
firestore/
├── users/{uid}
│   ├── displayName: string
│   ├── email: string
│   ├── photoURL: string
│   ├── provider: 'kakao' | 'naver' | 'google'
│   ├── createdAt: timestamp
│   └── lastLoginAt: timestamp
│
├── comments/{commentId}
│   ├── userId: string (uid 참조)
│   ├── userName: string (비정규화)
│   ├── userPhoto: string (비정규화)
│   ├── complexSlug: string (apt_complexes.slug 참조)
│   ├── regionCode: string
│   ├── content: string (최대 500자)
│   ├── createdAt: timestamp
│   ├── updatedAt: timestamp
│   ├── isDeleted: boolean (소프트 삭제)
│   └── reportCount: number (신고 횟수)
│
├── favorites/{favoriteId}
│   ├── userId: string
│   ├── complexSlug: string
│   ├── regionCode: string
│   ├── aptName: string (비정규화)
│   ├── addedAt: timestamp
│   └── lastPrice: number (추가 시점 가격)
│
└── user_settings/{uid}
    ├── pushEnabled: boolean
    ├── emailAlertEnabled: boolean
    ├── favoriteAlertEnabled: boolean
    └── theme: 'light' | 'dark' | 'system'
```

**Firestore 보안 규칙:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 댓글: 로그인 사용자만 작성, 본인 댓글만 수정/삭제
    match /comments/{commentId} {
      allow read: if true;
      allow create: if request.auth != null
        && request.resource.data.userId == request.auth.uid
        && request.resource.data.content.size() <= 500;
      allow update, delete: if request.auth != null
        && resource.data.userId == request.auth.uid;
    }

    // 관심단지: 본인 것만 CRUD
    match /favorites/{favoriteId} {
      allow read, write: if request.auth != null
        && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null
        && request.resource.data.userId == request.auth.uid;
    }

    // 사용자 설정: 본인 것만
    match /user_settings/{uid} {
      allow read, write: if request.auth != null
        && request.auth.uid == uid;
    }

    // 사용자 프로필: 읽기 공개, 쓰기 본인만
    match /users/{uid} {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.uid == uid;
    }
  }
}
```

#### 2.4.4 댓글 UI 설계

단지 상세 페이지 하단에 댓글 섹션을 추가한다:

```
┌──────────────────────────────────────────────────────┐
│ 💬 댓글 (12)                                         │
│                                                      │
│ ┌────────────────────────────────────────────────┐   │
│ │ [로그인하고 의견을 남겨보세요]                      │   │
│ │ [카카오 로그인] [네이버 로그인] [구글 로그인]        │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
│ (로그인 후)                                          │
│ ┌────────────────────────────────────────────────┐   │
│ │ [프로필] 김투자님                                │   │
│ │ [________________________________] [등록]       │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
│ ┌────────────────────────────────────────────────┐   │
│ │ [프로필] 박부동산 · 2시간 전                      │   │
│ │ 이 가격이면 매수 고려해볼만 합니다. 전세가율도     │   │
│ │ 적정 수준이네요.                                  │   │
│ │                              [신고] [답글]       │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
│ ┌────────────────────────────────────────────────┐   │
│ │ [프로필] 이임차인 · 5시간 전                      │   │
│ │ 전세가율이 걱정됩니다. 보증보험 꼭 가입하세요.      │   │
│ │                              [신고] [답글]       │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
│ [더보기 ▼]                                           │
└──────────────────────────────────────────────────────┘
```

**구현 파일:**

```
src/components/CommentSection.tsx   — 댓글 섹션 컨테이너 (NEW, 'use client')
src/components/CommentItem.tsx      — 댓글 개별 아이템 (NEW)
src/components/CommentInput.tsx     — 댓글 입력 폼 (NEW)
```

**댓글 운영 정책:**
- 최대 500자
- 신고 3회 이상 시 자동 숨김 → 관리자 검토
- 욕설/비방 필터: 서버 사이드 키워드 필터링 (기본)
- 비로그인 사용자는 댓글 읽기만 가능

---

### 2.5 뉴스 취합

#### 2.5.1 데이터 소스: 네이버 뉴스 검색 API

| 항목 | 내용 |
|------|------|
| API | 네이버 검색 API (뉴스) |
| 엔드포인트 | `https://openapi.naver.com/v1/search/news.json` |
| 일 한도 | 25,000건/일 |
| 비용 | 무료 |
| 응답 | title, link, description, pubDate |

#### 2.5.2 정확도 이슈 및 해결 방안

**문제:** "래미안"으로 검색하면 다른 지역의 래미안 뉴스도 포함됨

**해결 전략:**

```
검색 쿼리 = "단지명 + 지역명(구)"
예시: "래미안 퍼스티지 서초구" (O)
      "래미안 퍼스티지" (X — 정확도 낮음)
```

**추가 필터링:**
1. 검색 결과에서 title + description에 단지명이 포함된 것만 표시
2. 최근 30일 이내 뉴스만 표시
3. 부동산/경제 카테고리 뉴스 우선 정렬

**정확도 한계 고지:**
- UI에 "AI가 수집한 관련 뉴스입니다. 실제 해당 단지와 무관한 기사가 포함될 수 있습니다." 문구 표시

#### 2.5.3 캐싱 전략

뉴스 데이터는 실시간이 아닌 캐싱 기반으로 제공한다:

- **캐시 TTL:** 6시간 (하루 4회 갱신)
- **저장소:** Supabase `news_cache` 테이블 또는 Vercel KV
- **트리거:** 단지 상세 페이지 접속 시, 캐시가 없거나 만료된 경우에만 네이버 API 호출

```sql
CREATE TABLE IF NOT EXISTS news_cache (
  complex_slug VARCHAR(200) PRIMARY KEY,
  region_code VARCHAR(10),
  news_data JSONB,  -- [{title, link, description, pubDate}, ...]
  fetched_at TIMESTAMP DEFAULT now(),
  expires_at TIMESTAMP DEFAULT now() + INTERVAL '6 hours'
);
```

#### 2.5.4 UI: 단지 상세 페이지 하단

```
┌──────────────────────────────────────────────────────┐
│ 📰 관련 뉴스                                         │
│ AI가 수집한 관련 뉴스입니다                            │
│                                                      │
│ ┌────────────────────────────────────────────────┐   │
│ │ "래미안 퍼스티지 서초구 가격 하락세 지속"           │   │
│ │ 조선일보 · 2026.03.20                           │   │
│ │ 서초구 반포동 래미안 퍼스티지 아파트의 매매가가...   │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
│ ┌────────────────────────────────────────────────┐   │
│ │ "강남 3구 아파트 거래량 회복 조짐"                 │   │
│ │ 한국경제 · 2026.03.18                           │   │
│ │ 강남구, 서초구, 송파구 일대 아파트 거래량이...      │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
│ ┌────────────────────────────────────────────────┐   │
│ │ "서초구 전세가율 상승... 갭투자 주의보"            │   │
│ │ 매일경제 · 2026.03.15                           │   │
│ │ 서초구 일대 전세가율이 상승하면서...               │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
│ [뉴스 더보기 →] (네이버 뉴스 검색 결과 링크)           │
└──────────────────────────────────────────────────────┘
```

#### 2.5.5 구현 파일 목록

```
src/app/api/news/route.ts         — 뉴스 API (캐시 확인 → 네이버 API 호출)
src/components/NewsSection.tsx     — 뉴스 섹션 컴포넌트 (NEW, 'use client')
src/components/NewsItem.tsx        — 뉴스 개별 아이템 (NEW)
```

---

## 3. 보안 설계

### 3.1 환경변수 감사

#### 3.1.1 현재 .env.local 키 목록 및 위험도 평가

| 환경변수 | 용도 | 위험도 | 조치 |
|---------|------|:-----:|------|
| `SUPABASE_URL` | DB 접속 URL | 중 | 서버 전용으로 유지 (NEXT_PUBLIC 사용 최소화) |
| `SUPABASE_ANON_KEY` | 클라이언트 DB 접속 | 중 | RLS(Row Level Security) 필수 활성화 |
| `SUPABASE_SERVICE_ROLE_KEY` | DB 관리자 키 | **최상** | 절대 클라이언트 노출 금지, API Route에서만 사용 |
| `MOLIT_API_KEY` | 국토부 API | 하 | 유출 시 재발급 가능, 무료 API |
| `GOOGLE_ADSENSE_ID` | 광고 | 하 | 공개 가능 |
| `COUPANG_ACCESS_KEY` | 쿠팡 파트너스 | 중 | 서버 전용 |
| `COUPANG_SECRET_KEY` | 쿠팡 파트너스 | **높음** | 서버 전용, 유출 시 즉시 재발급 |
| (추가) `KAKAO_REST_API_KEY` | 카카오맵 지오코딩 | 중 | 서버 전용 |
| (추가) `FIREBASE_ADMIN_KEY` | Firebase 관리자 | **최상** | 서버 전용, JSON 형태 |
| (추가) `NAVER_CLIENT_ID` | 네이버 API | 중 | 서버 전용 |
| (추가) `NAVER_CLIENT_SECRET` | 네이버 API | 높음 | 서버 전용 |

#### 3.1.2 보안 원칙

1. **NEXT_PUBLIC_ 접두사 최소화**: 클라이언트에 노출되는 키는 `NEXT_PUBLIC_KAKAO_MAP_KEY`, `NEXT_PUBLIC_FIREBASE_CONFIG`만 허용
2. **서비스 롤 키 분리**: `SUPABASE_SERVICE_ROLE_KEY`는 API Route + 크론잡에서만 사용
3. **Vercel 환경변수 관리**: 로컬 `.env.local` 대신 Vercel Dashboard에서 관리, Preview/Production 분리
4. **.gitignore 확인**: `.env.local`, `.env`, `firebase-admin-key.json` 등이 반드시 .gitignore에 포함

#### 3.1.3 즉시 실행 체크리스트

- [ ] `.env.local`에 있는 모든 키를 Vercel Dashboard 환경변수로 이전
- [ ] `NEXT_PUBLIC_` 접두사가 붙은 키 중 서버 전용이어야 하는 것 점검
- [ ] Supabase RLS 정책 활성화 (현재 비활성화 상태일 경우)
- [ ] git history에서 키 노출 여부 점검 (`git log --all -p | grep -i "key\|secret\|password"`)
- [ ] Firebase Admin JSON 키를 환경변수로 관리 (파일 커밋 금지)

### 3.2 API 라우트 인증 체크

#### 3.2.1 현재 API 라우트 보안 상태

| API Route | 인증 필요 여부 | 현재 상태 | 조치 |
|-----------|:------------:|:--------:|------|
| `/api/fetch-transactions` | 크론 전용 | 미보호 | Vercel Cron Secret 추가 |
| `/api/validate-data` | 크론 전용 | 미보호 | Vercel Cron Secret 추가 |
| `/api/search` | 공개 | 공개 (정상) | Rate Limiting 추가 |
| `/api/search/autocomplete` | 공개 | 공개 (정상) | Rate Limiting 추가 |
| `/api/news` | 공개 | 신규 | Rate Limiting 추가 |
| `/api/auth/kakao` | 공개 | 신규 | CSRF 토큰 검증 |
| `/api/auth/naver` | 공개 | 신규 | CSRF 토큰 검증 |
| `/api/map/markers` | 공개 | 신규 | Rate Limiting 추가 |

#### 3.2.2 크론잡 보호

```typescript
// src/app/api/fetch-transactions/route.ts
export async function GET(request: Request) {
  // Vercel Cron Secret 검증
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  // ... 기존 로직
}
```

### 3.3 Rate Limiting

#### 3.3.1 Vercel Edge Middleware 기반

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 메모리 기반 간이 Rate Limiter (프로덕션에서는 Vercel KV 사용)
const rateLimit = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMITS = {
  '/api/search': { max: 60, window: 60000 },         // 60회/분
  '/api/search/autocomplete': { max: 120, window: 60000 }, // 120회/분
  '/api/news': { max: 30, window: 60000 },            // 30회/분
  '/api/map/markers': { max: 30, window: 60000 },     // 30회/분
  'default': { max: 60, window: 60000 },               // 기본 60회/분
};

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const key = `${ip}:${request.nextUrl.pathname}`;
  const now = Date.now();

  const limit = RATE_LIMITS[request.nextUrl.pathname] || RATE_LIMITS.default;
  const entry = rateLimit.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimit.set(key, { count: 1, resetTime: now + limit.window });
    return NextResponse.next();
  }

  if (entry.count >= limit.max) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((entry.resetTime - now) / 1000)),
      },
    });
  }

  entry.count++;
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

#### 3.3.2 반복 새로고침 대응

| 시나리오 | 문제 | 대응 |
|---------|------|------|
| 사용자 반복 F5 | 서버 과부하 | ISR 캐시로 서버 연산 없이 응답 |
| API 반복 호출 | DB 과부하 | Rate Limiting (IP당 60회/분) |
| 봇/크롤러 | 대량 요청 | User-Agent 필터 + Vercel Bot Protection |
| DDoS | 서비스 다운 | Vercel Edge Network 기본 방어 + 429 응답 |

### 3.4 XSS/CSRF 방어

| 공격 유형 | Next.js 기본 방어 | 추가 조치 |
|---------|:---------------:|----------|
| XSS (Cross-Site Scripting) | React의 자동 이스케이프 | 댓글 입력 시 `DOMPurify`로 HTML 샌드타이징 |
| CSRF (Cross-Site Request Forgery) | SameSite 쿠키 | 인증 API에 CSRF 토큰 추가 |
| SQL Injection | Supabase SDK 파라미터 바인딩 | Raw SQL 사용 금지 |
| 데이터 유효성 | - | Zod 스키마로 입력 검증 (댓글, 로그인 등) |

### 3.5 CORS 설정

```typescript
// next.config.js (또는 next.config.ts)
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://donjup.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
};
```

---

## 4. 성능 최적화 설계

### 4.1 데이터 축약 저장

#### 4.1.1 지역 코드 축약

```
AS-IS: region_name = "서울특별시 강남구" (18 bytes, VARCHAR)
TO-BE: region_code = "11680" (5 bytes, VARCHAR(5)) → 클라이언트에서 해석

절약: 항목당 13 bytes × 100만 건 = ~13MB 절약
```

**지역 코드 매핑 테이블:**

```typescript
// src/lib/region-codes.ts
export const REGION_CODES: Record<string, string> = {
  '11110': '서울특별시 종로구',
  '11140': '서울특별시 중구',
  '11170': '서울특별시 용산구',
  '11200': '서울특별시 성동구',
  '11215': '서울특별시 광진구',
  // ... (전국 시군구 코드 — 법정동코드 5자리)
  '11680': '서울특별시 강남구',
  '11650': '서울특별시 서초구',
  // ...
};

export function getRegionName(code: string): string {
  return REGION_CODES[code] || code;
}

export function getSido(code: string): string {
  // 코드 앞 2자리 = 시도
  const sidoCode = code.substring(0, 2);
  const SIDO = {
    '11': '서울', '26': '부산', '27': '대구', '28': '인천',
    '29': '광주', '30': '대전', '31': '울산', '36': '세종',
    '41': '경기', '42': '강원', '43': '충북', '44': '충남',
    '45': '전북', '46': '전남', '47': '경북', '48': '경남', '50': '제주',
  };
  return SIDO[sidoCode] || '';
}
```

#### 4.1.2 부동산 유형 코드 축약

```
AS-IS: property_type = "아파트" (9 bytes, VARCHAR)
TO-BE: property_type = 1 (1 byte, SMALLINT) → 클라이언트에서 매핑

절약: 항목당 8 bytes
```

#### 4.1.3 주소 파싱 축약 저장

```
AS-IS: dong_name = "반포동", jibun = "1-1", road_name = "반포대로 210"
TO-BE:
  - dong_code = "1165010100" (법정동코드 10자리)
  - jibun은 유지 (짧음)
  - road_name 삭제 (도로명 주소는 지오코딩으로 대체)

절약: 항목당 ~20 bytes
```

#### 4.1.4 마이그레이션 스크립트

```
scripts/migrate-region-codes.ts
  1. apt_transactions에서 DISTINCT region_name 조회
  2. 국토부 법정동코드 매핑 테이블과 대조
  3. region_code 컬럼에 코드 입력
  4. region_name 컬럼을 향후 삭제 대상으로 표시 (당장 삭제하지 않음 — 호환성)

scripts/migrate-property-types.ts
  1. 기존 apt_transactions 전체에 property_type = 1 일괄 설정
  2. 인덱스 생성
```

### 4.2 캐싱 전략

#### 4.2.1 Next.js ISR (Incremental Static Regeneration)

| 페이지 | revalidate | 설명 |
|--------|-----------|------|
| `/` (홈) | 3600 (1시간) | 폭락/신고가 TOP은 1시간마다 갱신 |
| `/apt/[region]/[slug]` | 3600 (1시간) | 단지 상세는 거래 발생 시 갱신 (일 1회 수준) |
| `/market/[sido]` | 3600 (1시간) | 지역별 데이터 |
| `/daily/[date]` | 86400 (24시간) | 데일리 리포트는 생성 후 변경 없음 |
| `/rate` | 1800 (30분) | 금리 데이터는 빈번히 변경될 수 있음 |
| `/trend` | 3600 (1시간) | 트렌드 데이터 |
| `/rent` | 3600 (1시간) | 전월세 데이터 |
| `/map` | - (CSR) | 지도는 클라이언트 렌더링 |

#### 4.2.2 Vercel Edge Cache

- 정적 자산 (JS, CSS, 이미지): `Cache-Control: public, max-age=31536000, immutable`
- ISR 페이지: Vercel이 자동 관리 (stale-while-revalidate)
- API 응답: `Cache-Control: public, s-maxage=300, stale-while-revalidate=600` (5분 캐시)

#### 4.2.3 반복 새로고침 대응 종합

```
사용자 요청 → Vercel Edge (CDN 캐시 확인)
  ↓ 캐시 HIT → 즉시 응답 (서버 부하 0)
  ↓ 캐시 MISS → Next.js 서버
       ↓ ISR 캐시 확인
       ↓ ISR HIT → 캐시 응답 + 백그라운드 재생성
       ↓ ISR MISS → Supabase 쿼리 → 페이지 생성 → 캐시 저장
```

**효과:** 동일 페이지에 대한 반복 새로고침은 CDN 캐시에서 처리되므로 서버/DB 부하가 거의 없다.

### 4.3 쿼리 최적화

#### 4.3.1 SELECT 최적화

```typescript
// AS-IS (비효율)
const { data } = await supabase.from('apt_transactions').select('*');

// TO-BE (필요한 컬럼만)
const { data } = await supabase
  .from('apt_transactions')
  .select('apt_name, region_code, trade_price, size_sqm, floor, trade_date, change_rate, drop_level')
  .eq('property_type', 1)
  .order('trade_date', { ascending: false })
  .limit(20);
```

**페이지별 필요 컬럼:**

| 페이지 | 필요 컬럼 |
|--------|----------|
| 홈 (폭락 TOP) | apt_name, region_code, trade_price, size_sqm, change_rate, drop_level, trade_date |
| 홈 (신고가 TOP) | apt_name, region_code, trade_price, size_sqm, change_rate, is_new_high, trade_date |
| 단지 상세 | 전체 컬럼 (상세 페이지이므로) |
| 검색 결과 | apt_name, region_code, trade_price, change_rate, size_sqm, trade_date |
| 지도 마커 | latitude, longitude, apt_name, trade_price, change_rate |

#### 4.3.2 인덱스 최적화

```sql
-- 핵심 인덱스 (이미 존재 가능 — 확인 필요)
CREATE INDEX IF NOT EXISTS idx_transactions_date ON apt_transactions(trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_change_rate ON apt_transactions(change_rate ASC);
CREATE INDEX IF NOT EXISTS idx_transactions_drop ON apt_transactions(is_significant_drop, trade_date DESC);

-- 신규 인덱스
CREATE INDEX IF NOT EXISTS idx_transactions_type_date ON apt_transactions(property_type, trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_region_date ON apt_transactions(region_code, trade_date DESC);
CREATE INDEX IF NOT EXISTS idx_complexes_slug ON apt_complexes(slug);
CREATE INDEX IF NOT EXISTS idx_complexes_name_trgm ON apt_complexes USING gin (apt_name gin_trgm_ops);
```

#### 4.3.3 페이지네이션

현재 offset 기반 → **cursor 기반**으로 전환:

```typescript
// AS-IS (offset 기반 — 대량 데이터에서 느림)
.range(offset, offset + limit - 1)

// TO-BE (cursor 기반 — 대량 데이터에서도 일정 속도)
.lt('trade_date', cursor)  // cursor = 마지막 항목의 trade_date
.order('trade_date', { ascending: false })
.limit(20)
```

#### 4.3.4 조회 시 전달 데이터 최소화

API 응답 크기를 줄이기 위한 전략:

| 항목 | AS-IS | TO-BE | 절약 |
|------|-------|-------|------|
| 지역명 | "서울특별시 강남구" (18자) | "11680" (5자) | 72% |
| 부동산 유형 | "아파트" (3자) | 1 (숫자) | 89% |
| 날짜 형식 | "2026-03-23T00:00:00.000Z" (24자) | "2026-03-23" (10자) | 58% |
| 금액 | 176000 (숫자 유지) | 17.6 (억 단위) | 표시만 변환 |
| 불필요 필드 | id, created_at, updated_at 포함 | 제외 | ~30% |

**예상 총 절약률:** API 응답 크기 약 40~50% 감소

### 4.4 DB 전략

#### 4.4.1 하이브리드 아키텍처 상세

```
┌─────────────────────────────────────────────────────────┐
│                     데이터 분류                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Supabase (PostgreSQL) — 읽기 중심                       │
│  ┌─────────────────────────────────────────────────┐    │
│  │ apt_transactions     — 매매 실거래 (100만+ 행)     │    │
│  │ apt_rent_transactions — 전월세 실거래 (50만+ 행)    │    │
│  │ apt_complexes        — 단지 마스터 (5만+ 행)       │    │
│  │ finance_rates        — 금리 지표 (1천+ 행)         │    │
│  │ daily_reports        — 데일리 리포트 (365+ 행)      │    │
│  │ reb_price_indices    — 가격지수 (1만+ 행)          │    │
│  │ page_views           — 조회수 (10만+ 행)           │    │
│  │ news_cache           — 뉴스 캐시 (5천+ 행)         │    │
│  │ unsold_housing       — 미분양 (1천+ 행)            │    │
│  └─────────────────────────────────────────────────┘    │
│  특성: 대용량, 읽기 위주, SQL 쿼리/집계 필수               │
│  무료 한계: 500MB / 2GB 전송                             │
│                                                         │
│  Firebase (Firestore) — 쓰기 중심                        │
│  ┌─────────────────────────────────────────────────┐    │
│  │ users/{uid}         — 사용자 프로필               │    │
│  │ comments/{id}       — 댓글                       │    │
│  │ favorites/{id}      — 관심단지                    │    │
│  │ user_settings/{uid} — 사용자 설정                 │    │
│  └─────────────────────────────────────────────────┘    │
│  특성: 소용량, 쓰기 빈번, 실시간 동기화 필요               │
│  무료 한계: 1GB 저장 / 일 5만 읽기                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 4.4.2 Supabase 무료 한계 대응

| 지표 | 무료 한계 | 현재 사용량 (추정) | 리뉴얼 후 예상 | 대응 |
|------|----------|------------------|---------------|------|
| 스토리지 | 500MB | ~200MB | ~400MB | 데이터 축약으로 절약 |
| 대역폭 | 2GB/월 | ~500MB | ~1.5GB | ISR/CDN 캐시로 절약 |
| API 요청 | 무제한 | - | - | 문제 없음 |
| 동시 연결 | 제한적 | - | - | Connection Pooling |

**한계 초과 시 대응 로드맵:**
1. **단기** (3개월): 데이터 축약 + 캐싱으로 무료 한도 내 유지
2. **중기** (6개월): MAU 1만 돌파 시 Supabase Pro ($25/월) 업그레이드
3. **장기** (1년+): MAU 10만 돌파 시 PlanetScale 또는 자체 PostgreSQL 검토

#### 4.4.3 코드 레벨 최적화

| 최적화 항목 | 현재 | 개선 | 영향 |
|-----------|------|------|------|
| 번들 크기 | 미측정 | `@next/bundle-analyzer` 적용, 불필요 패키지 제거 | 초기 로딩 속도 개선 |
| 이미지 최적화 | Next.js Image 사용 | WebP 포맷 강제, lazy loading 확인 | 대역폭 절약 |
| 폰트 로딩 | 미확인 | `next/font` 사용, font-display: swap | CLS(누적 레이아웃 이동) 개선 |
| 컴포넌트 분리 | 서버/클라이언트 혼재 가능 | 서버 컴포넌트 우선, 'use client' 최소화 | JS 번들 크기 감소 |
| Dynamic Import | 미적용 | 지도, 차트 등 무거운 컴포넌트 dynamic import | 초기 로딩 속도 개선 |

```typescript
// 예시: 카카오맵 dynamic import
import dynamic from 'next/dynamic';

const KakaoMap = dynamic(() => import('@/components/KakaoMap'), {
  loading: () => <div className="h-[500px] bg-gray-100 animate-pulse" />,
  ssr: false,  // 지도는 클라이언트에서만 렌더링
});
```

---

## 5. 개발 스프린트 계획

### Sprint 1: 데이터 축약 + 성능 최적화 + Rate Limiting (04.01 ~ 04.14)

**목표:** 기존 서비스의 성능과 보안을 먼저 강화한다. 사용자에게 보이는 변화는 최소화하되, 내부 구조를 최적화한다.

**작업 목록:**

| # | 작업 | 담당 | 예상 시간 | 우선순위 |
|---|------|------|----------|---------|
| 1-1 | region_code 매핑 테이블 생성 + 클라이언트 매핑 코드 | 백엔드 | 4h | P0 |
| 1-2 | property_type 컬럼 추가 (기존 데이터 = 1) | 백엔드 | 2h | P0 |
| 1-3 | SELECT 쿼리 최적화 (모든 API Route) | 백엔드 | 8h | P0 |
| 1-4 | DB 인덱스 추가 (6개) | 백엔드 | 2h | P0 |
| 1-5 | cursor 기반 페이지네이션 전환 | 백엔드 | 6h | P1 |
| 1-6 | ISR revalidate 설정 (모든 페이지) | 프론트엔드 | 4h | P0 |
| 1-7 | Rate Limiting Middleware 구현 | 백엔드 | 6h | P0 |
| 1-8 | 환경변수 감사 + CORS 설정 | 백엔드 | 4h | P0 |
| 1-9 | 크론잡 인증 (CRON_SECRET) | 백엔드 | 2h | P0 |
| 1-10 | 폭락 기준 v2 적용 (3단계 분류) | 백엔드 | 8h | P0 |
| 1-11 | drop_level UI 반영 (배지 색상) | 프론트엔드 | 4h | P0 |
| 1-12 | 번들 크기 분석 + 최적화 | 프론트엔드 | 4h | P1 |

**Sprint 1 완료 기준:**
- [ ] 모든 API Route에서 불필요한 컬럼 조회 제거
- [ ] Rate Limiting이 429 응답을 정상 반환
- [ ] ISR 캐시 동작 확인 (Vercel 배포 후)
- [ ] 폭락 3단계 분류 (하락/폭락/대폭락) UI 표시
- [ ] 페이지 로딩 속도 < 2초 (Lighthouse 측정)

---

### Sprint 2: 멀티 부동산 유형 (04.15 ~ 04.28)

**목표:** 빌라, 오피스텔 데이터를 수집하고 UI에 카테고리 탭을 추가한다. 토지/상업용은 이번 스프린트에서 데이터 수집만 진행하고, UI는 Sprint 5에서 추가한다.

**작업 목록:**

| # | 작업 | 담당 | 예상 시간 | 우선순위 |
|---|------|------|----------|---------|
| 2-1 | 빌라 API 파서 구현 (molit-villa.ts) | 백엔드 | 6h | P0 |
| 2-2 | 오피스텔 API 파서 구현 (molit-officetel.ts) | 백엔드 | 6h | P0 |
| 2-3 | 토지 API 파서 구현 (molit-land.ts) | 백엔드 | 4h | P1 |
| 2-4 | 수집 크론잡 확장 (빌라/오피스텔/토지) | 백엔드 | 4h | P0 |
| 2-5 | 초기 데이터 일괄 수집 (최근 3개월) | 백엔드 | 8h | P0 |
| 2-6 | CategoryTabs 컴포넌트 구현 | 프론트엔드 | 6h | P0 |
| 2-7 | 홈페이지 카테고리 탭 연동 | 프론트엔드 | 6h | P0 |
| 2-8 | 검색에 property_type 필터 추가 | 프론트엔드 | 4h | P1 |
| 2-9 | 단지 상세 정보 강화 (주차, 층수, 재건축) | 백엔드 + 프론트엔드 | 8h | P1 |
| 2-10 | 빌라/오피스텔 단지 상세 페이지 대응 | 프론트엔드 | 6h | P0 |

**Sprint 2 완료 기준:**
- [ ] 빌라/오피스텔 데이터 수집 크론 정상 동작
- [ ] 홈페이지에서 아파트/빌라/오피스텔 탭 전환 동작
- [ ] 각 유형별 폭락/신고가 TOP 정상 표시
- [ ] 단지 상세에 주차대수, 층수, 재건축연한 표시

---

### Sprint 3: 지도 서비스 (04.29 ~ 05.12)

**목표:** 카카오맵 기반 지도 서비스를 구현한다. 지도에서 폭락/신고가 단지를 시각적으로 탐색할 수 있게 한다.

**작업 목록:**

| # | 작업 | 담당 | 예상 시간 | 우선순위 |
|---|------|------|----------|---------|
| 3-1 | 카카오맵 SDK 설정 + 기본 렌더링 | 프론트엔드 | 4h | P0 |
| 3-2 | 지오코딩 배치 스크립트 구현 | 백엔드 | 8h | P0 |
| 3-3 | apt_complexes 전체 지오코딩 실행 | 백엔드 | 4h (실행 시간) | P0 |
| 3-4 | 지도 마커 API 구현 (/api/map/markers) | 백엔드 | 6h | P0 |
| 3-5 | 마커 색상 분류 (상승/하락/폭락/대폭락) | 프론트엔드 | 4h | P0 |
| 3-6 | 클러스터링 구현 (줌 레벨별) | 프론트엔드 | 8h | P0 |
| 3-7 | 인포윈도우 구현 (마커 클릭) | 프론트엔드 | 4h | P1 |
| 3-8 | 지도 필터 UI (유형, 하락률 범위) | 프론트엔드 | 6h | P1 |
| 3-9 | 지도 페이지 SEO 메타데이터 | 프론트엔드 | 2h | P2 |
| 3-10 | 지도 페이지 모바일 반응형 | 프론트엔드 | 4h | P1 |

**Sprint 3 완료 기준:**
- [ ] /map 페이지에서 카카오맵 정상 렌더링
- [ ] 단지 마커가 하락률에 따라 색상 분류
- [ ] 줌 인/아웃 시 클러스터링 동작
- [ ] 마커 클릭 시 인포윈도우 표시 + 상세 링크
- [ ] 모바일에서 정상 동작

---

### Sprint 4: Firebase 로그인 + 댓글 (05.13 ~ 05.26)

**목표:** Firebase Authentication을 연동하고, Firestore 기반 댓글 + 관심단지 기능을 구현한다.

**작업 목록:**

| # | 작업 | 담당 | 예상 시간 | 우선순위 |
|---|------|------|----------|---------|
| 4-1 | Firebase 프로젝트 생성 + 초기 설정 | 백엔드 | 2h | P0 |
| 4-2 | Firebase Auth 클라이언트 SDK 설정 | 프론트엔드 | 2h | P0 |
| 4-3 | 카카오 로그인 Custom Auth 구현 | 백엔드 | 8h | P0 |
| 4-4 | 네이버 로그인 Custom Auth 구현 | 백엔드 | 8h | P0 |
| 4-5 | 구글 로그인 (Firebase 기본) 설정 | 백엔드 | 2h | P1 |
| 4-6 | AuthContext + LoginButton 컴포넌트 | 프론트엔드 | 6h | P0 |
| 4-7 | UserMenu 컴포넌트 (로그인 후 UI) | 프론트엔드 | 4h | P0 |
| 4-8 | Firestore 보안 규칙 설정 | 백엔드 | 2h | P0 |
| 4-9 | 댓글 CRUD 기능 구현 | 프론트엔드 + 백엔드 | 8h | P0 |
| 4-10 | 댓글 UI (CommentSection, CommentItem, CommentInput) | 프론트엔드 | 6h | P0 |
| 4-11 | 관심단지 기능 (추가/삭제/목록) | 프론트엔드 | 6h | P1 |
| 4-12 | 댓글 신고 기능 + 자동 숨김 | 백엔드 | 4h | P1 |
| 4-13 | 욕설 필터 (키워드 기반) | 백엔드 | 4h | P2 |

**Sprint 4 완료 기준:**
- [ ] 카카오/네이버/구글 로그인 정상 동작
- [ ] 단지 상세 페이지에 댓글 작성/수정/삭제
- [ ] 관심단지 추가/삭제 + 목록 페이지
- [ ] Firestore 보안 규칙 검증
- [ ] 비로그인 시 댓글 작성 차단 + 로그인 유도 UI

---

### Sprint 5: 뉴스 취합 + 최종 QA + 릴리즈 (05.27 ~ 06.09)

**목표:** 뉴스 기능을 추가하고, 전체 서비스에 대한 QA를 수행하여 릴리즈한다.

**작업 목록:**

| # | 작업 | 담당 | 예상 시간 | 우선순위 |
|---|------|------|----------|---------|
| 5-1 | 네이버 뉴스 API 연동 + 캐싱 | 백엔드 | 6h | P0 |
| 5-2 | NewsSection 컴포넌트 구현 | 프론트엔드 | 4h | P0 |
| 5-3 | 뉴스 정확도 필터링 로직 | 백엔드 | 4h | P0 |
| 5-4 | 토지/상업용 UI 탭 추가 | 프론트엔드 | 4h | P2 |
| 5-5 | 크로스 브라우저 테스트 (Chrome, Safari, Firefox) | QA | 8h | P0 |
| 5-6 | 모바일 반응형 전체 점검 | QA | 8h | P0 |
| 5-7 | 성능 테스트 (Lighthouse, WebPageTest) | QA | 4h | P0 |
| 5-8 | 보안 점검 (환경변수, API 인증, RLS) | QA + 백엔드 | 4h | P0 |
| 5-9 | SEO 메타데이터 전체 점검 | 프론트엔드 | 4h | P1 |
| 5-10 | 에러 핸들링 전체 점검 | QA | 4h | P1 |
| 5-11 | 배포 + 모니터링 설정 | 백엔드 | 4h | P0 |
| 5-12 | 릴리즈 노트 작성 | PM | 2h | P0 |

**Sprint 5 완료 기준 (릴리즈 조건):**
- [ ] 전 기능 크로스 브라우저 동작 확인
- [ ] Lighthouse Performance 점수 80 이상
- [ ] 모든 API Route에 Rate Limiting 적용
- [ ] 에러 페이지 (404, 500, 로딩) 정상 동작
- [ ] 뉴스 기능 정확도 80% 이상 (수동 샘플링)
- [ ] 환경변수 유출 점검 완료

---

## 6. 팀 역할 배분

### 6.1 역할 정의

| 역할 | 담당 업무 | 주요 산출물 |
|------|---------|-----------|
| **PM/PO** | 전체 리딩, 스토리보드, 일정 관리, 스프린트 리뷰 | 마스터플랜, 스프린트 백로그, 릴리즈 노트 |
| **사업 기획** | BM 검증, 수익 모델 설계, 제휴 파트너 발굴 | 수익 모델 문서, CPA/CPS 제휴 계약 |
| **UX 리서처** | 사용자 여정 설계, 페르소나 검증, 사용성 테스트 | 페르소나 문서, 사용자 플로우, 테스트 리포트 |
| **UI/UX 디자이너** | 화면 프로토타입, 디자인 시스템, 지도 UX 설계 | Figma 프로토타입, 컴포넌트 라이브러리 |
| **프론트엔드 개발** | React/Next.js 구현, 클라이언트 최적화 | 페이지 컴포넌트, 클라이언트 로직 |
| **백엔드 개발** | API, DB, 크론잡, 보안, Firebase 연동 | API Route, DB 스키마, 크론 스크립트 |
| **QA** | 테스트 케이스 작성, 성능 검증, 보안 점검 | 테스트 리포트, 버그 리스트 |

### 6.2 스프린트별 역할 집중도

| 스프린트 | PM | 사업 기획 | UX | UI/UX | 프론트엔드 | 백엔드 | QA |
|---------|:--:|:-------:|:--:|:----:|:---------:|:-----:|:--:|
| Sprint 1 | ●● | ● | ○ | ○ | ●● | ●●● | ● |
| Sprint 2 | ●● | ● | ○ | ●● | ●●● | ●●● | ● |
| Sprint 3 | ●● | ○ | ●● | ●●● | ●●● | ●● | ● |
| Sprint 4 | ●● | ● | ●● | ●● | ●●● | ●●● | ● |
| Sprint 5 | ●●● | ●● | ● | ● | ●● | ●● | ●●● |

(●●● = 핵심, ●● = 높음, ● = 보통, ○ = 낮음)

### 6.3 커뮤니케이션 체계

| 회의 | 주기 | 참석자 | 목적 |
|------|------|--------|------|
| 데일리 스탠드업 | 매일 09:30 (15분) | 전원 | 진행 상황, 블로커 공유 |
| 스프린트 플래닝 | 격주 월요일 (1시간) | 전원 | 다음 스프린트 백로그 확정 |
| 스프린트 리뷰 | 격주 금요일 (1시간) | 전원 | 결과물 데모, 피드백 |
| 스프린트 회고 | 격주 금요일 (30분) | 전원 | 프로세스 개선 |
| 기술 리뷰 | 필요 시 | 개발팀 | 설계 리뷰, 코드 리뷰 |

---

## 7. KPI 및 성공 지표

### 7.1 핵심 지표 (OKR)

#### Objective 1: 서비스 품질 향상

| Key Result | 목표 | 측정 방법 | 기한 |
|-----------|------|---------|------|
| 페이지 로딩 속도 | < 2초 (LCP) | Lighthouse / WebPageTest | Sprint 1 완료 시 |
| 시간 기준 상호 작용 (INP) | < 200ms | Chrome DevTools | Sprint 1 완료 시 |
| 누적 레이아웃 이동 (CLS) | < 0.1 | Lighthouse | Sprint 1 완료 시 |
| API 응답 시간 (p95) | < 500ms | Vercel Analytics | 릴리즈 시 |
| 에러율 | < 1% | Vercel Analytics | 릴리즈 시 |

#### Objective 2: 사용자 확보

| Key Result | 목표 | 측정 방법 | 기한 |
|-----------|------|---------|------|
| 일일 활성 사용자 (DAU) | 1,000+ | Google Analytics | 릴리즈 후 3개월 |
| 월간 활성 사용자 (MAU) | 10,000+ | Google Analytics | 릴리즈 후 3개월 |
| 이탈률 | < 60% | Google Analytics | 릴리즈 후 3개월 |
| 평균 세션 시간 | > 3분 | Google Analytics | 릴리즈 후 3개월 |
| 회원 가입 수 | 500+ | Firebase Auth | 릴리즈 후 3개월 |
| 댓글 작성 수 | 100+/월 | Firestore | 릴리즈 후 3개월 |

#### Objective 3: 수익 창출

| Key Result | 목표 | 측정 방법 | 기한 |
|-----------|------|---------|------|
| 구글 애드센스 월 수익 | 10만원+ | AdSense Dashboard | 릴리즈 후 6개월 |
| 쿠팡 파트너스 월 수익 | 5만원+ | 쿠팡 파트너스 대시보드 | 릴리즈 후 6개월 |
| CPA 전환 (대출 비교) | 월 10건+ | UTM 추적 | 릴리즈 후 6개월 |
| 총 월 수익 | 30만원+ | 합산 | 릴리즈 후 6개월 |

### 7.2 기능별 성공 지표

| 기능 | 지표 | 목표 | 측정 방법 |
|------|------|------|---------|
| 카테고리 탭 (멀티 유형) | 빌라/오피스텔 탭 클릭률 | 전체 대비 15%+ | GA 이벤트 |
| 지도 서비스 | /map 페이지 일 방문수 | 200+/일 | GA |
| 지도 서비스 | 마커 클릭 → 상세 이동률 | 30%+ | GA 이벤트 |
| SNS 로그인 | 로그인 전환율 | 방문자 대비 5%+ | Firebase Auth |
| 댓글 | 월 댓글 수 | 100+/월 | Firestore |
| 뉴스 | 뉴스 섹션 클릭률 | 10%+ | GA 이벤트 |
| 검색 | 검색 사용률 | 전체 세션 대비 20%+ | GA 이벤트 |
| 폭락 3단계 | "대폭락" 항목 클릭률 | 일반 항목 대비 2배+ | GA 이벤트 |

### 7.3 모니터링 대시보드

릴리즈 후 아래 항목을 실시간 모니터링한다:

```
┌─────────────────────────────────────────────────────┐
│ 돈줍 모니터링 대시보드                                 │
│                                                     │
│ [실시간]                                             │
│ 현재 동시 접속자: 42명                                │
│ 오늘 페이지뷰: 3,240                                 │
│ 오늘 신규 회원: 8명                                   │
│ 오늘 댓글: 15건                                      │
│                                                     │
│ [성능]                                               │
│ LCP (p75): 1.8초 ✅                                  │
│ API 응답 (p95): 380ms ✅                              │
│ 에러율: 0.3% ✅                                      │
│                                                     │
│ [인프라]                                             │
│ Supabase 스토리지: 380MB / 500MB ⚠️                  │
│ Supabase 대역폭: 1.2GB / 2GB ⚠️                     │
│ Firebase 일 읽기: 12,000 / 50,000 ✅                  │
│ 카카오맵 API 호출: 8,500 / 300,000 ✅                 │
│                                                     │
│ [비즈니스]                                           │
│ 이번 달 AdSense: ₩82,000                            │
│ 이번 달 쿠팡: ₩35,000                                │
│ 이번 달 CPA: ₩50,000 (5건)                           │
└─────────────────────────────────────────────────────┘
```

**모니터링 도구:**
- Vercel Analytics: 성능, 에러, 배포 상태
- Google Analytics 4: 사용자 행동, 이벤트, 전환
- Supabase Dashboard: DB 사용량
- Firebase Console: Auth, Firestore 사용량
- Google Search Console: SEO 성과

---

## 부록

### A. 기술 스택 요약

| 계층 | 기술 | 용도 |
|------|------|------|
| 프레임워크 | Next.js (App Router) | 풀스택 웹 앱 |
| 호스팅 | Vercel | 배포, CDN, Edge Functions |
| DB (거래) | Supabase (PostgreSQL) | 거래 데이터, 금리, 지수 |
| DB (사용자) | Firebase Firestore | 댓글, 관심단지, 사용자 |
| 인증 | Firebase Authentication | SNS 로그인 |
| 지도 | 카카오맵 JavaScript API | 지도 렌더링, 지오코딩 |
| 뉴스 | 네이버 검색 API | 관련 뉴스 수집 |
| 광고 | Google AdSense | 디스플레이 광고 |
| 제휴 | 쿠팡 파트너스 | CPS 커머스 |
| 차트 | Recharts | 가격 추이 차트 |
| CSS | Tailwind CSS | 스타일링 |
| 유효성 검증 | Zod | 입력 데이터 검증 |

### B. 신규 API Route 목록

| Route | 메서드 | 용도 | 인증 |
|-------|--------|------|:----:|
| `/api/auth/kakao` | POST | 카카오 Custom Auth | - |
| `/api/auth/naver` | POST | 네이버 Custom Auth | - |
| `/api/map/markers` | GET | 지도 마커 데이터 | - |
| `/api/news` | GET | 단지별 뉴스 | - |

### C. 신규 페이지 목록

| 페이지 | URL | 설명 |
|--------|-----|------|
| 지도 | `/map` | 카카오맵 기반 부동산 지도 |
| 관심단지 | `/favorites` | 로그인 사용자의 관심단지 목록 |

### D. DB 마이그레이션 체크리스트

```
[ ] ALTER TABLE apt_transactions ADD COLUMN property_type SMALLINT DEFAULT 1
[ ] ALTER TABLE apt_transactions ADD COLUMN drop_level VARCHAR(10) DEFAULT 'normal'
[ ] ALTER TABLE apt_complexes ADD COLUMN property_type SMALLINT DEFAULT 1
[ ] ALTER TABLE apt_complexes ADD COLUMN parking_count INTEGER
[ ] ALTER TABLE apt_complexes ADD COLUMN max_floor INTEGER
[ ] ALTER TABLE apt_complexes ADD COLUMN heat_method VARCHAR(20)
[ ] ALTER TABLE apt_complexes ADD COLUMN rebuild_year INTEGER
[ ] ALTER TABLE apt_complexes ADD COLUMN floor_area_ratio DECIMAL(5,2)
[ ] ALTER TABLE apt_complexes ADD COLUMN building_coverage DECIMAL(5,2)
[ ] ALTER TABLE apt_complexes ADD COLUMN latitude DECIMAL(10,7)
[ ] ALTER TABLE apt_complexes ADD COLUMN longitude DECIMAL(10,7)
[ ] CREATE TABLE news_cache (...)
[ ] CREATE INDEX idx_transactions_property_type ON apt_transactions(property_type)
[ ] CREATE INDEX idx_transactions_type_date ON apt_transactions(property_type, trade_date DESC)
[ ] CREATE INDEX idx_transactions_region_date ON apt_transactions(region_code, trade_date DESC)
[ ] CREATE INDEX idx_complexes_property_type ON apt_complexes(property_type)
[ ] CREATE INDEX idx_complexes_location ON apt_complexes(latitude, longitude)
[ ] CREATE INDEX idx_complexes_name_trgm ON apt_complexes USING gin (apt_name gin_trgm_ops)
[ ] CREATE EXTENSION IF NOT EXISTS pg_trgm
[ ] is_significant_drop 기준 변경: -20% → -15%
```

### E. 리스크 및 완화 전략

| 리스크 | 영향도 | 발생 가능성 | 완화 전략 |
|--------|:-----:|:----------:|----------|
| Supabase 무료 한계 초과 | 높음 | 중 | 데이터 축약 + 캐싱으로 사용량 절감, Pro 업그레이드 예산 확보 |
| 카카오맵 API 일 한도 초과 | 중 | 낮음 | 30만/일로 충분, 초과 시 마커 데이터 캐싱 |
| Firebase 무료 한계 초과 | 중 | 낮음 | 일 5만 읽기면 MAU 1만 수준 커버 가능 |
| 뉴스 정확도 이슈 | 중 | 높음 | 단지명+지역명 조합 검색 + 한계 고지 문구 |
| 카카오/네이버 로그인 연동 복잡성 | 중 | 중 | Custom Auth Token 방식 검증 완료, 폴백으로 구글 로그인만 제공 |
| 스프린트 일정 지연 | 높음 | 중 | 각 스프린트에 P0/P1/P2 우선순위 설정, P2는 연기 가능 |
| SEO 순위 하락 (URL 구조 변경 시) | 높음 | 낮음 | 기존 URL 구조 유지, 신규 페이지만 추가 |

---

> **이 문서는 살아있는 문서입니다.** 스프린트 진행에 따라 업데이트됩니다.
> 마지막 업데이트: 2026-03-23
