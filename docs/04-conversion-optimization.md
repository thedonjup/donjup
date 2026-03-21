# 돈줍(DonJup) 전환 최적화 및 수익 설계

---

## 1. 페이지별 GAP 분석

### 1.1 메인 대시보드 (`/`) — `src/app/page.tsx`

| 기획 항목 | 구현 상태 | GAP |
|-----------|----------|-----|
| 히어로 섹션 (1위 폭락 아파트 강조) | ⚠️ 부분 | 히어로에 "오늘 가장 많이 떨어진 아파트는?" 텍스트만 존재. 실제 1위 단지명/하락률을 동적으로 표시하지 않음 |
| 폭락 TOP 5 카드 | ✅ 구현됨 | — |
| 신고가 TOP 5 카드 | ✅ 구현됨 | — |
| 금리 현황 사이드바 | ✅ 구현됨 | — |
| 거래량 급증 지역 핫스팟 | ❌ 미구현 | 기획서 §4.1에 명시된 "거래량 급증 지역 3곳 하이라이트" 없음 |
| 인기 검색 TOP 5 | ❌ 미구현 | page_views 기반 인기 단지 랭킹 없음 |
| 상단 배너 광고 (728×90) | ❌ 미구현 | 광고 슬롯 자체가 없음 |
| 네이티브 인피드 광고 | ❌ 미구현 | 리스트 3번째 항목 아래 광고 없음 |
| 사이드바 광고 (300×250) | ❌ 미구현 | 사이드바에 광고 슬롯 없음 |
| "내 아파트는 얼마나 떨어졌을까?" CTA | ❌ 미구현 | 단지 상세 유도 CTA 없음 |
| TransactionCard → 단지 상세 링크 | ❌ 미구현 | 카드 클릭 시 `/apt/[region]/[slug]`로 이동하는 링크 없음 |

### 1.2 금리 대시보드 (`/rate`) — `src/app/rate/page.tsx`

| 기획 항목 | 구현 상태 | GAP |
|-----------|----------|-----|
| 현재 금리 카드 (5종) | ✅ 구현됨 | — |
| 변동 뱃지 (▲▼) | ✅ 구현됨 | — |
| 금리 추이 라인차트 | ⚠️ 부분 | CSS 미니 바 차트만 존재. 실제 라인차트(Chart.js/Recharts) 미구현 |
| 금통위 일정 카운트다운 | ❌ 미구현 | 기획서 §4.4에 명시 |
| 계산기 CTA | ✅ 구현됨 | — |
| 광고 슬롯 | ❌ 미구현 | 전체 없음 |

### 1.3 대출 이자 계산기 (`/rate/calculator`) — `src/app/rate/calculator/page.tsx`

| 기획 항목 | 구현 상태 | GAP |
|-----------|----------|-----|
| 입력 폼 (원금/금리/기간) | ✅ 구현됨 | — |
| 상환 방식 3종 비교 | ✅ 구현됨 | — |
| 월별 상환 스케줄 | ✅ 구현됨 | 12개월 미리보기만. 접이식 전체 스케줄 미구현 |
| 금리 변동 시나리오 슬라이더 | ❌ 미구현 | 기획서 §4.3 핵심 기능. 0.25%p 단위 금리 변동 시뮬레이션 없음 |
| 현재 금리 자동 반영 | ❌ 미구현 | 기본값 3.5% 하드코딩. finance_rates에서 최신 금리를 가져오지 않음 |
| CPA 배너 (결과 직후) | ⚠️ 부분 | "대출 금리 비교 (준비 중)" 플레이스홀더만 존재. 실제 CPA 링크 없음 |
| 사이드바 대출 상품 비교 배너 | ❌ 미구현 | — |
| "내 신용점수 무료 조회" CPA 링크 | ❌ 미구현 | — |

### 1.4 아파트 단지 상세 (`/apt/[region]/[slug]`) — `src/app/apt/[region]/[slug]/page.tsx`

| 기획 항목 | 구현 상태 | GAP |
|-----------|----------|-----|
| 단지 요약 카드 | ✅ 구현됨 | — |
| 핵심 지표 카드 (4종) | ✅ 구현됨 | — |
| 가격 추이 라인차트 | ❌ 미구현 | 1년/3년/5년 라인차트 없음 |
| 최고가 대비 게이지 차트 | ❌ 미구현 | 숫자만 표시, 시각적 게이지 없음 |
| 최근 거래 내역 테이블 | ✅ 구현됨 | — |
| 면적별 시세 비교 | ✅ 구현됨 | — |
| 주변 단지 비교 테이블 | ❌ 미구현 | 같은 동 내 다른 단지 비교 없음 |
| 콘텐츠 중간 인피드 광고 | ❌ 미구현 | — |
| 하단 CPA 배너 | ⚠️ 부분 | 계산기 링크만 존재. "이 아파트, 대출 받으면 월 얼마?" 문구가 동적이지만 CPA 연결 없음 |
| 사이드바 대출/보험 배너 | ❌ 미구현 | — |
| OG 이미지 자동 생성 | ❌ 미구현 | — |

### 1.5 데일리 리포트 (`/daily/[date]`) — `src/app/daily/[date]/page.tsx`

| 기획 항목 | 구현 상태 | GAP |
|-----------|----------|-----|
| 리포트 제목/요약 | ✅ 구현됨 | — |
| 폭락 TOP / 신고가 | ✅ 구현됨 | — |
| 금리 변동 사이드바 | ✅ 구현됨 | — |
| 거래량 핫스팟 | ✅ 구현됨 | — |
| 이전/다음 리포트 네비게이션 | ❌ 미구현 | 리포트 목록 링크만 있고, 이전/다음 날 리포트 링크 없음 |
| "이 지역 더 보기" 내부 링크 | ❌ 미구현 | 지역별 상세로 유도하는 링크 없음 |
| 콘텐츠 중간 인피드 광고 (2개) | ❌ 미구현 | — |
| 하단 배너 광고 | ❌ 미구현 | — |
| 관련 리포트 영역 네이티브 광고 | ❌ 미구현 | — |

### 1.6 레이아웃 (`src/app/layout.tsx`)

| 기획 항목 | 구현 상태 | GAP |
|-----------|----------|-----|
| 헤더 네비게이션 | ✅ 구현됨 | — |
| 푸터 (출처 고지) | ✅ 구현됨 | — |
| 애드센스 글로벌 스크립트 | ❌ 미구현 | `<head>`에 애드센스 코드 없음 |
| Google Analytics / GA4 | ❌ 미구현 | 트래픽 추적 코드 없음 |

---

## 2. 광고 슬롯 배치 전략

### 2.1 애드센스 글로벌 설정

**파일**: `src/app/layout.tsx`

`<head>` 안에 애드센스 스크립트를 추가해야 한다. 환경변수 `NEXT_PUBLIC_ADSENSE_CLIENT_ID`로 관리.

```tsx
// layout.tsx <html> 태그 내 <head> 또는 next/script 사용
<Script
  async
  src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
  crossOrigin="anonymous"
  strategy="afterInteractive"
/>
```

### 2.2 공통 광고 슬롯 컴포넌트

**신규 파일**: `src/components/ads/AdSlot.tsx`

```tsx
// 재사용 가능한 광고 슬롯 컴포넌트
interface AdSlotProps {
  slotId: string;
  format: "banner" | "rectangle" | "infeed" | "responsive";
  className?: string;
}

// format별 크기:
// - banner: 728×90 (데스크톱) → 모바일에서는 320×100으로 반응형
// - rectangle: 300×250
// - infeed: 네이티브 인피드 (자동 크기)
// - responsive: 반응형 (구글이 자동 결정)
```

### 2.3 페이지별 광고 배치 명세

#### 메인 대시보드 (`/`)

| 위치 | 포맷 | 데스크톱 | 모바일 | 슬롯 ID |
|------|------|---------|--------|---------|
| 히어로 아래, 폭락 리스트 위 | banner (728×90) | ✅ 표시 | 320×100으로 대체 | `home-top-banner` |
| 폭락 리스트 3번째 항목 아래 | infeed | ✅ 표시 | ✅ 표시 | `home-drop-infeed` |
| 신고가 리스트 3번째 항목 아래 | infeed | ✅ 표시 | ✅ 표시 | `home-high-infeed` |
| 사이드바 금리 현황 아래 | rectangle (300×250) | ✅ 표시 | ❌ 숨김 | `home-sidebar-rect` |

**구현 위치**: `src/app/page.tsx`
- 히어로 `</section>` 닫힌 직후에 `<AdSlot slotId="home-top-banner" format="banner" />` 삽입
- `drops.map()` 내부에서 `i === 2` 조건으로 인피드 광고 삽입
- 사이드바 `<aside>` 내 CTA 링크 아래에 rectangle 광고 삽입

#### 아파트 단지 상세 (`/apt/[region]/[slug]`)

| 위치 | 포맷 | 설명 |
|------|------|------|
| 핵심 지표 카드 아래, 거래 이력 위 | infeed | 차트와 테이블 사이 (향후 차트 추가 시 차트 아래로 이동) |
| 거래 이력 테이블 아래 | banner | 콘텐츠 하단 자연스러운 위치 |
| 사이드바 면적별 시세 아래 | rectangle | 데스크톱 전용 |

**구현 위치**: `src/app/apt/[region]/[slug]/page.tsx`
- `grid gap-4 sm:grid-cols-4 mb-8` div 닫힌 직후
- `lg:col-span-2` div 내 거래 이력 테이블 아래
- `<aside>` 내 CTA 아래

#### 대출 이자 계산기 (`/rate/calculator`)

| 위치 | 포맷 | 설명 |
|------|------|------|
| 계산 결과 직후 (CPA 영역 바로 위) | rectangle | **최고 수익 위치** — 사용자가 이자 금액을 확인한 직후 |
| 상환 스케줄 아래 | banner | 페이지 하단 |

**주의**: 계산기 페이지는 CPA 전환이 핵심이므로 애드센스 광고는 최소화하고, CPA 배너에 집중해야 한다. 광고가 CPA 클릭을 방해하면 안 된다.

#### 금리 대시보드 (`/rate`)

| 위치 | 포맷 | 설명 |
|------|------|------|
| 금리 카드 그리드 아래, 변동 이력 테이블 위 | banner | 자연스러운 섹션 전환점 |
| CTA 영역 위 | infeed | 하단 콘텐츠 영역 |

#### 데일리 리포트 (`/daily/[date]`)

| 위치 | 포맷 | 설명 |
|------|------|------|
| 폭락 TOP과 신고가 TOP 사이 | infeed | 콘텐츠 중간 자연 전환점 |
| 사이드바 거래량 핫스팟 아래 | rectangle | 데스크톱 전용 |
| 페이지 최하단 (관련 리포트 영역) | banner | 향후 관련 리포트 추가 시 네이티브 광고로 전환 |

### 2.4 광고 밀도 가이드라인

- **모바일**: 화면당 최대 1개 광고. 스크롤 없이 보이는 영역(above the fold)에 광고 배치 금지
- **데스크톱**: 콘텐츠 대비 광고 비율 30% 이하 유지
- **애드센스 정책**: 콘텐츠보다 광고가 많으면 승인 거부. MVP 단계에서는 페이지당 2~3개 슬롯으로 시작
- **계산기 페이지 예외**: CPA가 주 수익이므로 애드센스는 1개만 (하단 배너)

---

## 3. CTA 최적화

### 3.1 메인 대시보드 CTA

#### CTA 1: 단지 상세 유도 (현재 완전 누락)

**위치**: 폭락/신고가 리스트의 각 TransactionCard
**변경 내용**: `src/app/page.tsx`의 `TransactionCard`를 `<Link>`로 감싸기

```
현재: <div className="flex items-start gap-4 ...">
변경: <Link href={`/apt/${regionCode}/${slug}`} className="flex items-start gap-4 ...">
```

TransactionCard에 `regionCode`와 `slug` props를 추가해야 한다. Supabase 쿼리에서 `apt_complexes` 테이블과 JOIN하거나, `apt_transactions`에 `slug` 컬럼이 필요하다.

#### CTA 2: "내 아파트도 확인해보기" 버튼 (누락)

**위치**: 폭락 TOP 5 섹션 아래
**파일**: `src/app/page.tsx`, 폭락 리스트 `</section>` 바로 아래

```tsx
<div className="mt-4 rounded-xl bg-gray-100 p-4 text-center">
  <p className="text-sm text-gray-600">내가 보는 아파트는 얼마나 떨어졌을까?</p>
  <Link href="/apt" className="mt-2 inline-block rounded-lg bg-gray-900 px-6 py-2 text-sm font-bold text-white">
    내 아파트 검색하기
  </Link>
</div>
```

#### CTA 3: 금리 계산기 유도 (기존 개선)

**현재**: 사이드바에 정적 텍스트 "3억 대출 시 월 이자는 얼마?"
**개선**: 동적 문구 — 폭락 1위 아파트 가격 기반

```tsx
// drops[0]가 있을 때:
<p className="mt-1 text-sm text-blue-600">
  {drops[0].apt_name} {formatPrice(drops[0].trade_price)} 대출 시 월 이자는?
</p>
```

### 3.2 아파트 단지 상세 CTA

#### CTA 1: 계산기 유도 (기존 개선)

**현재**: `src/app/apt/[region]/[slug]/page.tsx` 사이드바 하단에 정적 CTA
**개선**: 더 공격적인 문구 + 금액 자동 주입

```tsx
<Link href={`/rate/calculator?principal=${latestPrice}`} ...>
  <p className="text-lg font-bold text-blue-900">
    {formatPrice(latestPrice)} 대출받으면?
  </p>
  <p className="mt-1 text-sm text-blue-600">
    월 {estimateMonthly(latestPrice)}만원 이자 (연 3.5% 기준)
  </p>
  <p className="mt-2 text-xs font-bold text-blue-700 underline">
    정확한 이자 계산하기 →
  </p>
</Link>
```

`estimateMonthly` 함수: 간단한 원리금균등 월 이자 추정치를 인라인으로 계산.

**계산기 페이지 연동**: `/rate/calculator`에서 `searchParams.principal`을 읽어 입력 폼에 자동 세팅.

```tsx
// calculator/page.tsx 수정
// URL: /rate/calculator?principal=30000
// searchParams에서 principal 읽어서 useState 초기값 설정
```

#### CTA 2: 주변 단지 내부 순환 (누락 — §3.4에서 상세)

### 3.3 금리 계산기 → CPA 전환 퍼널

현재 계산기의 CPA 영역은 "준비 중" 플레이스홀더다. 이것이 **수익의 핵심**이므로 즉시 개선해야 한다.

**파일**: `src/app/rate/calculator/page.tsx` (line 150~162)

**현재 코드**:
```tsx
<div className="mt-6 rounded-xl border-2 border-blue-100 bg-blue-50 p-6 text-center">
  <span className="rounded-full bg-white px-4 py-2 text-sm font-medium text-blue-700 shadow-sm">
    대출 금리 비교 (준비 중)
  </span>
</div>
```

**개선안**: 3단계 CPA 퍼널

```tsx
{/* CPA 영역 — 계산 결과 직후 배치 (가장 높은 전환 포인트) */}
<div className="mt-6 space-y-4">
  {/* 1단계: 감정 자극 헤드라인 */}
  <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 text-center">
    <p className="text-xl font-bold text-blue-900">
      월 {result.comparison.equal_payment.monthlyPayment.toLocaleString()}원, 더 줄일 수 있어요
    </p>
    <p className="mt-1 text-sm text-blue-600">
      금리 0.5%p만 낮춰도 월 {savingsAmount.toLocaleString()}원 절약
    </p>
  </div>

  {/* 2단계: CPA 링크 버튼들 */}
  <div className="grid gap-3 sm:grid-cols-2">
    <a href="https://[뱅크샐러드-CPA-링크]" target="_blank" rel="noopener noreferrer"
       className="rounded-xl border border-gray-200 bg-white p-4 text-center transition hover:shadow-md">
      <p className="font-bold">뱅크샐러드</p>
      <p className="text-sm text-gray-500">주담대 금리 비교</p>
    </a>
    <a href="https://[핀다-CPA-링크]" target="_blank" rel="noopener noreferrer"
       className="rounded-xl border border-gray-200 bg-white p-4 text-center transition hover:shadow-md">
      <p className="font-bold">핀다</p>
      <p className="text-sm text-gray-500">최저 금리 찾기</p>
    </a>
  </div>

  {/* 3단계: 신용점수 CPA */}
  <a href="https://[신용점수-CPA-링크]" target="_blank" rel="noopener noreferrer"
     className="block rounded-xl bg-gray-900 p-4 text-center text-white transition hover:bg-gray-800">
    <p className="font-bold">내 신용점수 무료 조회</p>
    <p className="text-xs text-gray-300">신용점수에 영향 없이 조회 가능</p>
  </a>
</div>
```

**절약 금액 계산 로직** (result 기반):
```tsx
// 0.5%p 낮은 금리로 재계산
const lowerRate = parseFloat(rate) - 0.5;
const lowerMonthly = calculateMonthly(principalNum * 10000, lowerRate, parseInt(years));
const savingsAmount = result.comparison.equal_payment.monthlyPayment - lowerMonthly;
```

### 3.4 아파트 상세 → 계산기 유도 시나리오

사용자 동선: 단지 상세 조회 → 가격 확인 → "이 가격에 대출 받으면?" → 계산기 → CPA

**단지 상세 페이지에 추가할 인라인 CTA** (거래 이력 테이블 상단):

```tsx
// src/app/apt/[region]/[slug]/page.tsx
// 거래 이력 <h2> 위에 삽입
{latestPrice > 0 && (
  <div className="mb-6 flex items-center justify-between rounded-xl bg-blue-50 p-4">
    <div>
      <p className="text-sm font-medium text-blue-900">
        {complex.apt_name} {latestTxn?.size_sqm ?? ""}㎡ 매수 시
      </p>
      <p className="text-xs text-blue-600">
        현재 금리 기준 월 상환액을 확인하세요
      </p>
    </div>
    <Link
      href={`/rate/calculator?principal=${latestPrice}`}
      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white"
    >
      이자 계산하기
    </Link>
  </div>
)}
```

---

## 4. 내부 순환 (페이지뷰 극대화)

### 4.1 사용자 동선 설계

```
[메인 대시보드]
    │
    ├──(폭락 카드 클릭)──▶ [아파트 단지 상세] ──(CTA)──▶ [금리 계산기] ──(CPA)──▶ 수익
    │                          │
    │                          ├──(주변 단지)──▶ [다른 단지 상세] (순환)
    │                          └──(지역 링크)──▶ [지역 거래 동향] (향후)
    │
    ├──(금리 현황 클릭)──▶ [금리 대시보드] ──(CTA)──▶ [금리 계산기]
    │
    └──(데일리 리포트)──▶ [리포트 상세]
                            │
                            ├──(이전/다음)──▶ [다른 날짜 리포트] (순환)
                            └──(단지 클릭)──▶ [아파트 단지 상세]
```

### 4.2 핵심 순환 요소 구현 명세

#### 4.2.1 TransactionCard 링크화 (메인 + 데일리)

**파일**: `src/app/page.tsx` (line 186), `src/app/daily/[date]/page.tsx` (line 205)

현재 TransactionCard/TxnCard가 `<div>`로 되어 있어 클릭 불가. `<Link>`로 변경 필요.

- `apt_transactions` 쿼리에 JOIN으로 `apt_complexes.slug`와 `apt_complexes.region_code`를 가져와야 함
- 또는 `apt_transactions` 테이블에 `slug` 컬럼 추가 (denormalization)

#### 4.2.2 주변 단지 비교 (아파트 상세)

**파일**: `src/app/apt/[region]/[slug]/page.tsx` — 사이드바 `<aside>` 내 추가

```tsx
// 같은 지역의 다른 단지 조회
const { data: nearbyComplexes } = await supabase
  .from("apt_complexes")
  .select("apt_name, slug, region_code")
  .eq("region_code", complex.region_code)
  .neq("slug", slug)
  .limit(5);

// 각 단지의 최근 거래가 조회 (별도 쿼리 또는 서브쿼리)
```

UI:
```tsx
<section className="rounded-xl border border-gray-200 bg-white p-5">
  <h2 className="mb-3 text-lg font-bold">주변 단지</h2>
  <div className="space-y-3">
    {nearbyComplexes?.map((nc) => (
      <Link key={nc.slug} href={`/apt/${nc.region_code}/${nc.slug}`}
            className="flex items-center justify-between hover:bg-gray-50 rounded-lg p-2 -mx-2">
        <p className="text-sm font-medium">{nc.apt_name}</p>
        <span className="text-xs text-blue-600">보기 →</span>
      </Link>
    ))}
  </div>
</section>
```

이 요소는 **내부 순환의 핵심**이다. 사용자가 한 단지를 본 뒤 주변 단지를 연쇄적으로 탐색하면 PV가 2~5배 증가한다.

#### 4.2.3 데일리 리포트 이전/다음 네비게이션

**파일**: `src/app/daily/[date]/page.tsx`

리포트 헤더 영역 아래, 또는 페이지 최하단에 추가:

```tsx
// 이전/다음 날짜 계산
const reportDate = new Date(date);
const prevDate = new Date(reportDate);
prevDate.setDate(prevDate.getDate() - 1);
const nextDate = new Date(reportDate);
nextDate.setDate(nextDate.getDate() + 1);

const prevStr = prevDate.toISOString().split("T")[0];
const nextStr = nextDate.toISOString().split("T")[0];

// 하단 네비게이션
<div className="mt-8 flex justify-between">
  <Link href={`/daily/${prevStr}`} className="text-sm text-blue-600 hover:underline">
    ← {prevStr} 리포트
  </Link>
  <Link href={`/daily/${nextStr}`} className="text-sm text-blue-600 hover:underline">
    {nextStr} 리포트 →
  </Link>
</div>
```

#### 4.2.4 데일리 리포트 → 단지 상세 링크

**파일**: `src/app/daily/[date]/page.tsx`

TxnCard 컴포넌트도 메인과 동일하게 `<Link>`로 감싸야 한다. `daily_reports.top_drops`/`top_highs` JSON에 `slug`와 `region_code` 필드가 포함되어야 함.

#### 4.2.5 "관련 콘텐츠" 섹션 (메인 하단)

**파일**: `src/app/page.tsx` — 페이지 최하단, `</div>` 닫기 전

```tsx
<section className="mt-10">
  <h2 className="mb-4 text-lg font-bold">오늘의 데일리 리포트</h2>
  <Link href={`/daily/${todayStr}`}
        className="block rounded-xl border border-gray-200 bg-white p-6 transition hover:shadow-md">
    <p className="font-bold">
      {new Date().toLocaleDateString("ko-KR")} 부동산 데일리 리포트
    </p>
    <p className="mt-1 text-sm text-gray-500">
      오늘의 폭락/신고가/금리 변동 전체 분석 보기 →
    </p>
  </Link>
</section>
```

---

## 5. 미구현 핵심 컴포넌트 목록

### 5.1 차트 컴포넌트

| 컴포넌트 | 용도 | 사용 페이지 | 라이브러리 추천 |
|----------|------|-----------|---------------|
| `PriceLineChart` | 아파트 실거래가 추이 (1년/3년/5년) | `/apt/[region]/[slug]` | Recharts (`LineChart`) |
| `RateLineChart` | 금리 추이 라인차트 (다중 지표 오버레이) | `/rate` | Recharts (`LineChart`) |
| `VolumeBarChart` | 월별 거래건수 막대 차트 | `/market/[region]` (향후) | Recharts (`BarChart`) |

**파일 위치**: `src/components/charts/PriceLineChart.tsx` 등

**공통 설정**:
- `"use client"` (Recharts는 클라이언트 컴포넌트)
- 반응형: 부모 div 100% 너비, 높이 300px
- 터치 친화적 툴팁

### 5.2 게이지 차트

| 컴포넌트 | 용도 | 사용 페이지 |
|----------|------|-----------|
| `PriceGauge` | 최고가 100% 기준 현재 가격 위치 시각화 | `/apt/[region]/[slug]` |

CSS-only 또는 SVG로 구현 가능. 외부 라이브러리 불필요.

```tsx
// 예시 구조
<div className="relative h-4 w-full rounded-full bg-gray-200">
  <div className="absolute h-4 rounded-full bg-gradient-to-r from-red-500 to-green-500"
       style={{ width: `${percentage}%` }} />
  <div className="absolute top-0 h-4 w-1 bg-gray-900"
       style={{ left: `${percentage}%` }} />
</div>
<div className="flex justify-between text-xs text-gray-400">
  <span>최저가 {formatPrice(minPrice)}</span>
  <span>최고가 {formatPrice(maxPrice)}</span>
</div>
```

### 5.3 금리 시나리오 슬라이더

| 컴포넌트 | 용도 | 사용 페이지 |
|----------|------|-----------|
| `RateScenarioSlider` | 금리 ±2%p 변동 시 월 이자 변화 시각화 | `/rate/calculator` |

**파일**: `src/components/calculator/RateScenarioSlider.tsx`

```tsx
"use client";

// 현재 금리를 중심으로 -2%p ~ +2%p 범위의 슬라이더
// 0.25%p 단위 스텝
// 바 차트 또는 라인으로 각 금리별 월 상환액 표시
// 현재 금리 위치를 강조 표시

interface Props {
  principal: number; // 원
  baseRate: number;  // 현재 금리 %
  years: number;
}

// 슬라이더 변경 시 실시간으로 월 상환액 계산 (클라이언트 사이드)
// 서버 API 호출 불필요 — 원리금균등 공식으로 즉시 계산
```

이 컴포넌트는 계산기 결과 영역과 CPA 배너 사이에 배치. "금리가 0.5%p만 올라도 월 XX만원 더 내야 합니다" → CPA 클릭 유도.

### 5.4 광고 슬롯 컴포넌트

| 컴포넌트 | 용도 |
|----------|------|
| `AdSlot` | 범용 애드센스 광고 슬롯 |
| `CpaCard` | CPA 제휴 링크 카드 (뱅크샐러드/핀다/토스) |

**파일**: `src/components/ads/AdSlot.tsx`, `src/components/ads/CpaCard.tsx`

AdSlot은 `process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID`가 없으면 아무것도 렌더링하지 않아야 한다 (개발환경 대응).

### 5.5 주변 단지 비교 테이블

| 컴포넌트 | 용도 | 사용 페이지 |
|----------|------|-----------|
| `NearbyComplexes` | 같은 동 내 다른 단지 가격 비교 | `/apt/[region]/[slug]` |

§4.2.2에서 상세 명세 기술함.

---

## 6. 우선순위 구현 로드맵

수익 임팩트 기준으로 정렬. "이것만 하면 수익이 나는" 최소 필수 기능 순서.

### Tier 1: 즉시 수익 (1~3일)

이것만 완료하면 애드센스 승인 신청 + CPA 수익 발생이 가능하다.

| # | 작업 | 파일 | 수익 임팩트 | 이유 |
|---|------|------|-----------|------|
| 1 | **CPA 배너 실제 링크 연결** | `src/app/rate/calculator/page.tsx` (L150~162) | ★★★★★ | "준비 중" 플레이스홀더를 실제 CPA 링크로 교체. 이것 하나만으로 건당 3,000~15,000원 수익 발생 |
| 2 | **애드센스 글로벌 스크립트 추가** | `src/app/layout.tsx` | ★★★★★ | 광고 노출의 전제 조건 |
| 3 | **AdSlot 컴포넌트 생성 + 주요 페이지 삽입** | `src/components/ads/AdSlot.tsx` + 각 페이지 | ★★★★☆ | 페이지당 2~3개 슬롯으로 CPM 수익 시작 |
| 4 | **TransactionCard 링크화** | `src/app/page.tsx`, `src/app/daily/[date]/page.tsx` | ★★★★☆ | 현재 메인→상세 동선이 끊겨 있음. 이거 없으면 PV가 1로 끝남 |

### Tier 2: 전환율 최적화 (1주)

수익의 질을 높이는 작업.

| # | 작업 | 파일 | 수익 임팩트 | 이유 |
|---|------|------|-----------|------|
| 5 | **계산기 금리 자동 반영** | `src/app/rate/calculator/page.tsx` | ★★★★☆ | finance_rates에서 최신 COFIX를 읽어 기본 금리로 세팅. 사용자 신뢰도 + 재방문율 향상 |
| 6 | **금리 시나리오 슬라이더** | `src/components/calculator/RateScenarioSlider.tsx` | ★★★★☆ | "금리 오르면 이자가 이만큼 늘어납니다" → CPA 클릭 동기 부여 |
| 7 | **아파트 상세 → 계산기 CTA 강화** | `src/app/apt/[region]/[slug]/page.tsx` | ★★★☆☆ | ?principal= 파라미터로 가격 자동 입력. 전환 퍼널의 마찰 제거 |
| 8 | **주변 단지 비교 (내부 순환)** | `src/app/apt/[region]/[slug]/page.tsx` | ★★★☆☆ | PV 증가의 핵심 루프 |
| 9 | **히어로 동적 텍스트** | `src/app/page.tsx` (L47~49) | ★★★☆☆ | "오늘 강남 XX아파트 -35% 폭락!" 실제 데이터 노출 → CTR 상승 |

### Tier 3: 체류시간 확보 (2주)

PV당 광고 노출 시간을 늘려 RPM을 높이는 작업.

| # | 작업 | 파일 | 수익 임팩트 | 이유 |
|---|------|------|-----------|------|
| 10 | **가격 추이 라인차트** | `src/components/charts/PriceLineChart.tsx` | ★★★☆☆ | 체류시간 대폭 증가. 차트를 스크롤하며 보는 행위 → 광고 노출 시간 증가 |
| 11 | **최고가 대비 게이지 차트** | `src/components/charts/PriceGauge.tsx` | ★★☆☆☆ | 시각적 임팩트로 공유/캡처 유도 |
| 12 | **금리 추이 라인차트** | `src/components/charts/RateLineChart.tsx` | ★★☆☆☆ | 금리 대시보드 체류시간 증가 |
| 13 | **데일리 리포트 이전/다음 네비게이션** | `src/app/daily/[date]/page.tsx` | ★★☆☆☆ | 리포트 간 순환으로 PV 증가 |
| 14 | **GA4 추적 코드 설치** | `src/app/layout.tsx` | ★★☆☆☆ | 수익 최적화의 전제 — 어디서 이탈하는지 데이터 없이는 개선 불가 |

### Tier 4: 성장 (지속)

| # | 작업 | 수익 임팩트 |
|---|------|-----------|
| 15 | 거래량 핫스팟 (메인 대시보드) | ★★☆☆☆ |
| 16 | 금통위 일정 카운트다운 | ★☆☆☆☆ |
| 17 | 인기 검색 TOP 5 | ★☆☆☆☆ |
| 18 | OG 이미지 자동 생성 | ★★☆☆☆ |

---

## 요약: "이것만 하면 수익이 나는" 최소 필수 기능

1. **CPA 링크 실제 연결** (계산기 페이지) — 뱅크샐러드/핀다 제휴 가입 후 링크 삽입
2. **애드센스 코드 삽입** — 승인 후 AdSlot 컴포넌트로 페이지별 광고 배치
3. **TransactionCard 클릭 → 단지 상세** — 메인에서 PV가 1로 끝나는 현상 해결
4. **계산기 금리 자동 반영 + 시나리오 슬라이더** — CPA 전환율을 2~5배 높이는 핵심 장치

이 4가지가 완료되면 인스타 → 메인 → 단지 상세 → 계산기 → CPA 퍼널이 온전히 작동한다.
