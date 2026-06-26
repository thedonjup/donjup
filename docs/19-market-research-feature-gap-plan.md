# 돈줍 시장조사 기반 기능 갭 기획서

작성일: 2026-06-27
P1 반영 업데이트: 2026-06-27
범위: 시장조사/마케팅/SEO 문서와 현재 repo 코드 대조
목표: 운영 정상화 이후 실제 구현 가능한 제품/성장 기능을 우선순위화한다.

## 1. 전제

이 문서는 구현 문서가 아니라 기능 갭 확정 문서다. `docs/08`, `docs/11-market-research-2026`, `docs/11-renewal-v3-master-plan`, `docs/marketing/comprehensive-marketing-plan`, `docs/marketing/seo-strategy`의 제안을 현재 코드와 대조했다.

현재 가장 먼저 해결할 일은 여전히 `docs/17`, `docs/18`의 운영 health 정상화다. 시장조사 기반 기능은 공개 서비스와 DB 정합성이 green으로 돌아온 뒤 적용한다.

비밀값, API 키, DATABASE_URL은 확인 대상이 아니며 문서에도 남기지 않는다.

## 2. 확인한 코드 상태 요약

이미 구현 또는 부분 구현된 기반:

| 영역 | 현재 코드 상태 | 판단 |
| --- | --- | --- |
| 상세 가격 차트 | `PriceHistoryChart`, `PriceHistoryChartWrapper`, 월별 평균가/전세가율 라인 | 부분 구현 |
| 전세가율/갭 계산 | `AptDetailClient`와 `/search` signal preset에서 동일 면적 최신 매매/전세 기준 계산 | P1 구현, 성능 검증 필요 |
| 주변 단지 | `getAptDetailNearbyComplexes`, 상세 주변 단지 비교 표, `/compare` CTA | P1 구현, 성능 검증 필요 |
| 단지 비교 | `/compare`, `compare-selection`, 검색 후 2~3개 단지 비교 | 부분 구현 |
| 관심 단지 | `FavoriteButton`, `/profile`, localStorage 기반 | 부분 구현 |
| 가격 알림 | `NotifyButton`, `apt-alerts`, browser push subscribe | 부분 구현 |
| 데일리 리포트 푸시 | `cron-send-push`, `generate-report` 이후 push trigger | 부분 구현 |
| 뉴스 | `/api/news`, `news-query`, `cron/news`, `AptNews` | 부분 구현 |
| 카드뉴스/시딩/인스타 | `cron-generate-cardnews`, `cron-generate-seeding`, `cron-post-instagram`, DAM UI | 부분 구현 |
| 광고 | `AdSlot`, `InfeedAd`, AdSense script, 여러 페이지 슬롯 | 구현, 운영 검증 필요 |
| CPA/쿠팡 | `CpaBanner`, `CoupangBanner`, `/api/coupang/products` | 부분 구현 |
| GA4/UTM/pageview | `analytics/events`, `UTMTracker`, pageview API, sampling | 부분 구현 |
| SEO JSON-LD | `BreadcrumbJsonLd`, `FaqJsonLd`, `ItemListJsonLd`, `FinancialProductJsonLd`, `DatasetJsonLd`, Organization | P1 구현, smoke 필요 |
| canonical | 주요 페이지 metadata에 `alternates.canonical` 다수 존재 | 부분 구현, 전 페이지 재검증 필요 |
| 테마 페이지 | `/themes`, `/themes/[slug]` | 구현 |
| sitemap | `sitemap.ts`, `apt-sitemap.xml`, `daily-sitemap.xml` | 구현, SEO smoke 필요 |
| 건축물대장 필드 | `parking_count`, `floor_area_ratio`, `building_coverage`, `total_units` 등 schema 존재 | 부분 구현 |

현재 미구현 또는 제품화 전 단계:

| 영역 | 현재 빈 곳 | 판단 |
| --- | --- | --- |
| AI 시세 예측 | 예측 저장/계산/표시/면책 UI 없음 | 미구현 |
| AI 자연어 검색 | 자연어 조건 parser/API/UI 없음 | 미구현 |
| 돈줍 PRO | billing, entitlement, premium lock, plan 없음 | 미구현 |
| 고급 필터 | 전세가율/갭 signal은 P1 구현, 월세수익률/주차/용적률 필터는 미구현 | 부분 구현 |
| RSS/feed | `/feed.xml` route와 RSS helper/test 추가 | P1 구현, public smoke 필요 |
| FinancialProduct JSON-LD | `/rate` 구조화 데이터 추가 | P1 구현, public smoke 필요 |
| Dataset JSON-LD | `/trend`, `/market`, `/rent` 구조화 데이터 추가 | P1 구현, public smoke 필요 |
| SearchResultsPage JSON-LD | 검색 결과 구조화 데이터 없음 | 미구현 |
| `news_cache` | 계획과 달리 `news` 테이블 즉석 생성 경로 | 부분/정리 필요 |
| 관심 단지 서버 저장 | localStorage 중심, user-topic DB 없음 | 미구현 |
| 가격 변동 개인화 푸시 | 전체 daily push는 있으나 단지별 alert 발송 없음 | 미구현 |
| 네이버 블로그/뉴스레터/Stibee | 운영 자동화 없음 | 미구현 |
| 레퍼럴 | 초대코드/보상/추적 없음 | 미구현 |
| Turso/D1 read mirror | 장기안만 존재 | 미구현 |
| B2B 데이터 API | 상품/인증/요금/엔드포인트 없음 | 미구현 |
| 숏폼 자동화 | Remotion 등 영상 생성 없음 | 미구현 |

## 3. 시장조사 문서별 핵심 제안

### 3.1 `docs/08-competitive-research.md`

경쟁사 핵심 기능은 지도 기반 검색, 시세 비교, 관심지역/급매 알림, AI 가격 예측, 프리미엄 데이터, B2B 데이터 판매다. 돈줍 차별화 포인트는 일일 폭락/신고가 랭킹, 금리 계산기, 카드뉴스 자동 생성이다.

반영 판단:

1. 일일 랭킹, 금리, 카드뉴스는 이미 강점으로 구현되어 있으므로 운영 검증과 노출 강화가 우선이다.
2. 관심 단지 알림은 partial이므로 서버 저장/단지별 push로 확장할 가치가 있다.
3. AI 가격 예측과 B2B는 장기 P3로 분리한다.

### 3.2 `docs/11-market-research-2026.md`

2026 시장조사는 AI 자연어 검색, AI 시세 예측, 갭투자 분석, 전세가율, 원클릭 리포트, 돈줍 PRO를 제안한다.

반영 판단:

1. 전세가율/갭은 이미 상세에 계산 로직이 있으므로 검색/시장/테마로 확장하면 낮은 비용의 P1이다.
2. AI 시세 예측은 단순 이동평균 기반 MVP부터 가능하지만, 오해 리스크가 크므로 P3로 두고 scaffold만 검토한다.
3. 돈줍 PRO는 무료 서비스 안정화와 수익 추적 전까지 구현하지 않는다.

### 3.3 `docs/11-renewal-v3-master-plan.md`

리뉴얼 v3는 단지 정보 강화, SNS 로그인/댓글/관심단지, 뉴스 취합, 전월세 전용 페이지, 건축물대장 필드 확장을 제안했다.

반영 판단:

1. 많은 기반 기능이 이미 들어왔지만 채움률/운영 검증이 부족하다.
2. 뉴스는 `news_cache`가 아니라 `news` 즉석 생성 경로라 schema 정리가 필요하다.
3. 관심단지는 localStorage 중심이어서 서버 저장/알림 통합은 미구현이다.

### 3.4 `docs/marketing/comprehensive-marketing-plan.md`

마케팅 문서는 SEO, RSS, 네이버 서치어드바이저, AdSense, CPA, 쿠팡, 뉴스레터, 프리미엄, 레퍼럴을 제안한다.

반영 판단:

1. AdSense/GA4/UTM/쿠팡/CPA UI는 들어왔으나 실제 승인, 클릭/전환 추적, 수익 대시보드는 검증 필요다.
2. RSS/feed, FinancialProduct/Dataset JSON-LD, 이메일 구독 폼은 아직 낮은 비용 P1로 남아 있다.
3. 프리미엄/레퍼럴/결제는 장기 P3다.

### 3.5 `docs/marketing/seo-strategy.md`

SEO 문서는 canonical, BreadcrumbList, Organization, ItemList, FAQPage, FinancialProduct, Dataset, RSS, 네이버 서치어드바이저를 제안한다.

반영 판단:

1. Organization, BreadcrumbList, FAQPage, ItemList 일부는 이미 있다.
2. canonical도 주요 페이지에 존재하지만 전 페이지 SEO smoke가 필요하다.
3. RSS/feed, FinancialProduct, Dataset, SearchResultsPage JSON-LD는 미구현이다.

## 4. 기능 갭 총괄

| 기능군 | 현재 상태 | 미구현/부분구현 내용 | 우선순위 | 운영 정상화 전 처리 |
| --- | --- | --- | --- | --- |
| 전세가율/갭 검색 필터 | P1 구현 | `/search` signal preset과 read-only 결과 표시. 전역 scan 방지를 위해 검색어 없는 signal 단독 조회는 빈 결과 처리 | P1 | 검증/성능 관찰 |
| 월세수익률 필터 | 미구현 | 월세/보증금 기반 수익률 계산/정렬 없음 | P2 | 구현 대기 |
| 주차/용적률/건폐율/세대수 필터 | schema 일부 있음 | 검색 UI/API 조건 미연결, 채움률 미확인 | P2 | 채움률 조사만 |
| 주변 단지 비교 UX | P1 구현 | 상세 비교 표 추가, lazy/API 분리는 성능 이슈 시 후속 | P1 | 검증/성능 관찰 |
| RSS/feed | P1 구현 | `/feed.xml` route, RSS helper, XML escape test 추가 | P1 | public smoke |
| FinancialProduct JSON-LD | P1 구현 | `/rate` 구조화 데이터 추가 | P1 | public smoke |
| Dataset JSON-LD | P1 구현 | `/trend`, `/market`, `/rent` 구조화 데이터 추가 | P1 | public smoke |
| SearchResultsPage JSON-LD | 미구현 | 검색 결과 구조화 데이터 없음 | P2 | 기획 가능 |
| canonical 전 페이지 검증 | P1 구현 | `scripts/seo-smoke.mjs`, `pnpm seo:smoke` 추가 | P1 | 운영 smoke 반복 |
| 네이버 서치어드바이저 | 부분 | env meta는 있으나 등록/제출 상태 검증 불가 | P1 | 체크리스트만 |
| 뉴스 캐시 | 부분 | `news_cache`가 아닌 `news` 즉석 DDL | P2 | migration 설계만 |
| 데일리/카드뉴스/인스타 운영 | 부분 | token/storage/publish success 검증 부족 | P2 | 운영 검증만 |
| 관심 단지 서버 저장 | 미구현 | 로그인 사용자별 favorites table 없음 | P2 | 구현 대기 |
| 단지별 가격 알림 | 부분 | local alert와 push subscribe 연결만, 서버 발송 없음 | P2 | 구현 대기 |
| 이메일 구독 폼 | 미구현 | 구독 저장/옵트인/발송 연동 없음 | P2 | 구현 대기 |
| CPA 전환 추적 | 부분 | 실제 제휴 승인, click id, conversion dashboard 없음 | P2 | 검증 대기 |
| AI 시세 예측 | 미구현 | 예측 계산, 저장, 표시, 면책 문구 없음 | P3 | 금지 |
| AI 자연어 검색 | 미구현 | rule parser/LLM route 없음 | P3 | 금지 |
| 돈줍 PRO | 미구현 | entitlement, billing, lock UI 없음 | P3 | 금지 |
| Turso/D1 read mirror | 미구현 | ETL/mirror schema/API fallback 없음 | P3 | 금지 |
| B2B 데이터 API | 미구현 | 상품 정의, auth, rate limit, 계약 전무 | P3 | 금지 |
| 레퍼럴 | 미구현 | invite code/reward/abuse guard 없음 | P3 | 금지 |
| 숏폼 자동화 | 미구현 | Remotion/template/render pipeline 없음 | P3 | 금지 |

## 5. 우선순위

### P0

시장조사 문서에서 새로 발견된 P0 구현 항목은 없다. P0는 `docs/18`의 운영 health green 복구, 로컬 dry-run 격리, DB/local 정합성, public smoke 자동화다.

시장조사 기능을 P0보다 먼저 구현하면 안 된다.

### P1

운영 정상화 직후 바로 구현할 수 있는 낮은 비용 기능:

1. RSS/feed 생성.
2. FinancialProduct JSON-LD.
3. Dataset JSON-LD.
4. canonical/metadata SEO smoke runner.
5. 전세가율/갭 필터의 read-only 확장.
6. 주변 단지 비교 표 개선.
7. 네이버 서치어드바이저 등록/제출 체크리스트와 sitemap 제출 문서화.

P1 선정 이유:

1. 외부 유료 API 없이 가능하다.
2. 현재 DB에 이미 있는 거래/전월세/단지 필드를 활용한다.
3. DB 쓰기보다 읽기/표시 중심이라 롤백이 쉽다.
4. SEO와 체류시간에 직접 도움이 된다.

### P2

운영 여유가 생긴 뒤 단계적으로 적용:

1. 주차/세대수/용적률/건폐율 필터.
2. 관심 단지 서버 저장.
3. 단지별 가격 변동 push.
4. 이메일 구독 폼.
5. news schema/cache 정리.
6. CPA 클릭/전환 tracking.
7. DAM 수익/발행 dashboard.
8. 월세수익률 계산/정렬.

### P3

장기 기능:

1. AI 시세 예측.
2. AI 자연어 검색.
3. 돈줍 PRO/결제.
4. Turso/D1 read mirror.
5. B2B 데이터 API.
6. 레퍼럴.
7. 뉴스레터/Stibee 자동 발송.
8. 네이버 블로그 자동 포스팅.
9. 숏폼 자동 생성.

## 6. 운영 정상화 전에 하면 안 되는 기능

1. AI 시세 예측 공개 노출.
2. AI 자연어 검색 공개 노출.
3. 결제/프리미엄 구독 연동.
4. 서버 저장 기반 관심 단지/알림 migration.
5. 대량 뉴스/블로그/뉴스레터 자동 발행.
6. Batch B/C apply와 동시에 고급 필터 출시.
7. DB summary/cache 없이 24~36개월 데이터 전체 raw scan을 유발하는 화면.
8. 외부 API key가 필요한 기능을 env 검증 없이 배포.

## 7. 운영 정상화 직후 바로 가능한 구현안

### 7.1 RSS/feed

목표: 데일리 리포트와 주요 랭킹을 검색엔진/네이버 제출용 feed로 제공한다.

후보 경로:

```text
src/app/feed.xml/route.ts
src/lib/rss-feed.ts
scripts/seo-smoke.mjs
package.json
tests/unit/rss-feed.test.ts
```

주의:

1. DB query는 최근 N개 daily report만 제한한다.
2. `publicApiCacheHeaders` 또는 Next cache를 사용한다.
3. feed 본문에 대량 거래 row를 넣지 않는다.

### 7.2 FinancialProduct JSON-LD

목표: `/rate`, `/rate/calculator`에 금리/대출 관련 구조화 데이터를 추가한다.

후보 파일:

```text
src/components/seo/JsonLd.tsx
src/app/rate/page.tsx
src/app/rate/calculator/layout.tsx
tests/unit/jsonld.test.ts
```

주의:

1. 실제 은행 상품 조건은 금융감독원/은행 데이터 기준 문구를 과장하지 않는다.
2. 광고/CPA 링크와 구조화 데이터를 섞지 않는다.

### 7.3 Dataset JSON-LD

목표: `/trend`, `/market`, `/rent`에 통계 데이터셋 구조화 데이터를 추가한다.

후보 파일:

```text
src/components/seo/JsonLd.tsx
src/app/trend/page.tsx
src/app/market/page.tsx
src/app/rent/page.tsx
```

주의:

1. 데이터 출처는 국토교통부 실거래가/공공 데이터로 명시한다.
2. 업데이트 주기와 기간을 실제 DB 상태와 맞춘다.

### 7.4 전세가율/갭 필터 read-only 확장

목표: 이미 상세에서 계산하는 전세가율/갭을 검색/시장 화면에서도 제한적으로 활용한다.

1차 범위:

1. `/search` 필터 preset: "전세가율 높은 단지", "갭 작은 단지".
2. `/rent` 또는 `/market`에 설명형 리스트 추가.
3. raw full scan 금지, 최신 거래/전세 join은 limit/window 사용.
4. 검색어 없이 signal만 선택한 전역 탐색은 금지한다.

후보 파일:

```text
src/lib/search-filters.ts
src/lib/search-query.ts
src/components/search/FilterPresets.tsx
src/lib/rent-dashboard-query.ts
src/lib/market-dashboard-query.ts
tests/unit/search-filters.test.ts
tests/unit/search-query.test.ts
```

주의:

1. 전세가율은 동일 면적의 최근 매매와 최근 전세가 모두 있는 경우만 계산한다.
2. 계산 불가 단지는 결과에서 제외하거나 `lowConfidence`로 표시한다.
3. `ORDER BY`가 큰 테이블 전체 scan을 유발하면 summary/cache 도입 전 보류한다.

### 7.5 주변 단지 비교 표 개선

목표: 상세 페이지에서 주변 단지를 단순 링크가 아니라 가격/전세가율/거래량 비교 카드로 보여준다.

후보 파일:

```text
src/lib/apt-detail-query.ts
src/app/apt/[govtComplexId]/page.tsx
src/app/apt/[govtComplexId]/[slug]/page.tsx
src/components/apt/NearbyComplexComparison.tsx
tests/unit/apt-detail-query-cache-coverage.test.ts
```

주의:

1. 주변 단지는 같은 `region_code`와 `dong_name`으로 제한한다.
2. 최신 N건 summary만 사용한다.
3. 상세 페이지 초기 렌더가 느려지면 접힘 섹션 또는 lazy client fetch로 분리한다.

## 8. DB schema/migration 필요 여부

| 기능 | migration 필요 | 설명 |
| --- | --- | --- |
| RSS/feed | 아니오 | 기존 daily report/거래 데이터 read-only |
| FinancialProduct JSON-LD | 아니오 | 기존 finance rate query 사용 |
| Dataset JSON-LD | 아니오 | metadata 추가 |
| canonical SEO smoke | 아니오 | script/test 중심 |
| 전세가율/갭 필터 | 처음엔 아니오 | 성능 이슈 시 summary table 필요 |
| 주변 단지 비교 표 | 처음엔 아니오 | 성능 이슈 시 latest summary 필요 |
| news schema 정리 | 예 | `news` 즉석 DDL을 migration/schema로 이동 |
| 관심 단지 서버 저장 | 예 | `user_favorites` 또는 Firebase/DB 매핑 필요 |
| 단지별 가격 알림 | 예 | alert topics, last_sent, user subscriptions 필요 |
| 이메일 구독 | 예 | `email_subscriptions`, opt-in audit 필요 |
| CPA tracking | 예 | `affiliate_clicks`, campaign/conversion fields 필요 |
| AI 시세 예측 | 예 | prediction result/cache table 필요 |
| 프리미엄 | 예 | users, entitlements, billing events 필요 |
| B2B API | 예 | api clients, keys, usage logs 필요 |

## 9. 외부 API/유료 서비스/승인 필요 기능

| 기능 | 필요 조건 | 기본 방침 |
| --- | --- | --- |
| 네이버 서치어드바이저 | 소유권 확인, sitemap/RSS 제출 | 코드에는 meta env만, 등록은 운영자가 수행 |
| 네이버 뉴스 API | client id/secret | 없으면 Google News RSS fallback 유지 |
| AdSense | 승인 계정, slot ID | 이미 코드 있음. 정책/수익 검증 필요 |
| CPA | 제휴 승인, tracking URL | 승인 전 CTA는 일반 링크/준비중 유지 |
| Coupang | access/secret, 파트너스 정책 | 이미 API 경로 있음. env/수익 검증 필요 |
| Web Push | VAPID key | 이미 일부 구현. 토픽화는 별도 |
| Instagram | access token, media storage | 이미 일부 구현. 운영 성공률 검증 필요 |
| Stibee | API key, 수신 동의 | 즉시 구현 금지, P3 |
| 결제 | PG 계약, 정산/환불/약관 | 즉시 구현 금지, P3 |
| LLM | API key, 비용 제한 | rule-based 먼저, P3 |

## 10. 예상 비용/트래픽/DB 부하

| 기능 | 비용 | DB 부하 | Vercel 트래픽 | 판단 |
| --- | --- | --- | --- | --- |
| RSS/feed | 낮음 | 낮음 | 낮음 | P1 가능 |
| JSON-LD 확장 | 없음 | 없음 | 거의 없음 | P1 가능 |
| SEO smoke | 없음 | 낮음 | 낮음 | P1 가능 |
| 전세가율/갭 필터 | 낮음~중간 | 중간 | 낮음 | window/limit 필요 |
| 주변 단지 비교 | 낮음~중간 | 중간 | 낮음 | cached query 필요 |
| news schema 정리 | 낮음 | 낮음 | 낮음 | P2 |
| 관심단지 서버 저장 | 낮음~중간 | 중간 | 낮음 | auth 정책 필요 |
| 단지별 push | 중간 | 중간 | 낮음 | fan-out 제한 필요 |
| 이메일 구독 | 중간 | 낮음 | 낮음 | opt-in/스팸 리스크 |
| AI 예측 | 낮음~높음 | 중간 | 낮음 | 단순 모델만 가능 |
| AI 자연어 검색 | 중간~높음 | 중간 | 중간 | 캐시/쿼터 필수 |
| 프리미엄 결제 | 중간 | 중간 | 낮음 | 운영 리스크 큼 |
| Turso/D1 mirror | 중간 | 낮음 | 낮음 | ETL 관리 필요 |

## 11. 구현 후보 파일

### P1 후보

```text
src/app/feed.xml/route.ts
src/lib/rss-feed.ts
src/components/seo/JsonLd.tsx
src/app/rate/page.tsx
src/app/rate/calculator/layout.tsx
src/app/trend/page.tsx
src/app/market/page.tsx
src/app/rent/page.tsx
src/lib/search-filters.ts
src/lib/search-query.ts
src/components/search/FilterPresets.tsx
src/lib/apt-detail-query.ts
src/components/apt/NearbyComplexComparison.tsx
tests/unit/rss-feed.test.ts
tests/unit/jsonld.test.ts
tests/unit/search-filters.test.ts
tests/unit/search-query.test.ts
scripts/seo-smoke.mjs
```

### P2 후보

```text
src/lib/db/schema/news-cache.ts
scripts/migrations/YYYYMMDD-news-cache.sql
src/lib/news-query.ts
src/app/api/news/route.ts
src/app/api/cron/news/route.ts
src/lib/db/schema/user-favorites.ts
src/app/api/favorites/route.ts
src/lib/db/schema/apt-alert-topics.ts
src/lib/cron-send-push.ts
src/lib/db/schema/affiliate-clicks.ts
src/app/api/affiliate/click/route.ts
src/app/dam/page.tsx
```

### P3 후보

```text
src/lib/prediction/simple-price-forecast.ts
src/lib/db/schema/apt-price-predictions.ts
src/components/apt/PriceForecastPanel.tsx
src/lib/search/natural-language-parser.ts
src/app/api/search/natural/route.ts
src/lib/db/schema/entitlements.ts
src/components/premium/PremiumGate.tsx
src/app/api/b2b/v1/route.ts
```

## 12. 테스트/검증 계획

### P1 구현 검증

```text
pnpm --silent test -- tests/unit/rss-feed.test.ts
pnpm --silent test -- tests/unit/jsonld.test.ts
pnpm --silent test -- tests/unit/search-filters.test.ts
pnpm --silent test -- tests/unit/search-query.test.ts
pnpm build
```

수동 smoke:

```text
/feed.xml
/rate
/trend
/market
/rent
/search?q=전세가율
/apt/{id}
```

확인 기준:

1. RSS XML이 유효하다.
2. JSON-LD가 중복/깨진 JSON 없이 렌더된다.
3. 검색 필터가 빈 결과/대량 scan을 만들지 않는다.
4. 상세 페이지 주변 비교가 렌더링 실패 시 fail-soft 처리된다.
5. public smoke와 `db:status:ops`가 악화되지 않는다.

### P2 검증

1. migration idempotent 확인.
2. DB count/date bounds 확인.
3. 외부 API env 미설정 시 graceful fallback.
4. 알림/이메일은 opt-in 없이는 발송하지 않음.
5. affiliate click은 비밀값 없는 campaign id만 저장.

### P3 검증

1. 별도 feature flag 기본 off.
2. 비용 kill switch.
3. 예측/AI 결과에는 면책 문구 필수.
4. 결제/프리미엄은 약관/환불/권한 회수 검증 전 공개 금지.

## 13. 배포/롤백 계획

### P1

1. 기능별로 작은 PR/커밋.
2. DB migration 없는 순서부터 배포.
3. public smoke 실행.
4. SEO 기능은 HTML/JSON-LD 제거로 즉시 롤백 가능하게 작성.
5. 전세가율/갭 필터는 query param과 UI를 분리해 문제가 생기면 UI만 숨긴다.

### P2

1. migration 전 backup artifact 생성.
2. idempotent migration.
3. feature flag off 상태로 배포.
4. 소수 route에서만 enable.
5. 문제가 생기면 feature flag off, 필요 시 migration rollback은 데이터 export 후 수행.

### P3

1. public route 공개 전 내부 scaffold만.
2. 비용/약관/법무/운영 동의 후 별도 계획서 작성.
3. 베타 플래그와 사용량 제한 필수.

## 14. 운영 정상화 이후 추천 실행 순서

1. `docs/18` P0 운영 health green 복구.
2. public smoke runner와 SEO smoke를 먼저 만든다.
3. RSS/feed와 JSON-LD 확장을 적용한다.
4. 전세가율/갭 필터를 read-only로 소량 노출한다.
5. 주변 단지 비교 표를 상세 페이지에 보강한다.
6. news schema/cache를 정리한다.
7. 관심 단지 서버 저장과 단지별 알림을 설계한다.
8. 수익/CPA tracking dashboard를 만든다.
9. AI/프리미엄/B2B는 별도 장기 제품 기획으로 분리한다.

## 15. 기획서 완전 반영용 프롬프트

```md
docs/19-market-research-feature-gap-plan.md를 기준으로 돈줍 시장조사 기반 기능 갭 해소 작업을 끝까지 진행해줘.

목표는 운영 health를 악화시키지 않으면서, 시장조사 문서에서 도출된 미구현/부분구현 기능을 우선순위에 맞게 반영하는 거야. P1은 실제 구현하고, P2는 안전한 범위에서 설계/스캐폴드/검증 도구까지만 만들며, P3는 별도 승인 전 공개 구현하지 말고 장기 backlog와 후속 프롬프트로 분리해.

진행 조건:
1. 작업 전 `docs/18` 기준 운영 health, `pnpm --silent db:status:ops`, public smoke, 현재 작업트리, package scripts, 관련 route/page/query 파일을 확인해.
2. `.env.local`, DATABASE_URL, API 키, 토큰 등 비밀값은 절대 출력하지 마.
3. 작업트리가 더러우니 `git add .` 금지. 필요한 파일만 선별해.
4. Next.js route/page를 수정하기 전 AGENTS.md 지침대로 `node_modules/next/dist/docs/`의 현재 Next 문서를 확인해.
5. DB migration은 P1 구현에 꼭 필요한 경우가 아니면 금지하고, P2/P3 migration은 설계와 idempotent 초안까지만 작성해.
6. 검색/상세 쿼리는 raw full scan을 유발하지 않게 limit/window/cache를 사용해.
7. 이미 구현된 기능은 중복 생성하지 말고 테스트/검증/문서 보강만 해.
8. 상세 로그는 `.donjup-local-data/runs/market-gap-*`에 저장해.

Phase 0: 기준선 확인
- `docs/19`의 기능 갭 표를 현재 코드와 다시 대조해.
- 구현됨/부분구현/미구현/검증필요 분류가 틀리면 문서부터 수정해.
- public smoke와 `db:status:ops`가 red이면, 시장조사 기능 구현 전 영향 범위를 짧게 기록해.

Phase 1: P1 실제 구현
1. RSS/feed
   - `src/app/feed.xml/route.ts` 또는 동등한 App Router route 추가
   - 최근 daily report와 핵심 랜딩만 포함
   - XML escape, cache header, 테스트 추가

2. SEO JSON-LD 확장
   - `FinancialProductJsonLd` 후보를 `/rate` 또는 `/rate/calculator`에 추가
   - `DatasetJsonLd` 후보를 `/trend`, `/market`, `/rent` 중 안전한 곳에 추가
   - 기존 `JsonLd`, `BreadcrumbJsonLd`, `FaqJsonLd`, `ItemListJsonLd`와 중복되지 않게 구성

3. SEO/canonical smoke
   - 주요 route의 metadata/canonical/RSS/JSON-LD를 검증하는 테스트 또는 script 추가
   - 네이버 서치어드바이저 meta는 env 설정 여부만 확인하고 값은 출력하지 않음

4. 전세가율/갭 read-only 확장
   - 이미 상세에서 계산 중인 `jeonseRatio`, `gapAmount` 기준을 재사용
   - 검색 preset 또는 제한된 리스트로만 노출
   - 동일 면적 최신 매매/전세가 둘 다 있는 경우만 계산
   - low confidence 표시 또는 제외

5. 주변 단지 비교 표 보강
   - 상세 페이지에 같은 동 주변 단지의 최신 가격/전세가율/거래량 요약 표시
   - 느려지면 접힘 섹션 또는 fail-soft 처리
   - `/compare` 연결 유지

Phase 2: P2 안전 스캐폴드/설계
1. news schema/cache 정리
   - 현재 `news` 즉석 DDL과 계획한 `news_cache` 차이를 정리
   - idempotent migration 초안 또는 설계 문서 작성
   - 실제 migration apply는 하지 않음

2. 관심 단지 서버 저장/단지별 알림 설계
   - localStorage favorites와 로그인 사용자 저장 구조 차이 정리
   - user favorites, alert topics, last_sent 후보 schema 설계
   - push subscribe와 topic 연결은 공개 발송 없이 내부 설계/테스트까지만

3. CPA/수익 추적 설계
   - 실제 승인/비밀값 없이 click tracking schema/API 후보만 정리
   - 광고/CPA 링크가 SEO/UX를 해치지 않는 가드레일 작성

4. 고급 필터 확장 설계
   - 주차/세대수/용적률/건폐율/월세수익률 필터의 현재 DB 필드 존재 여부와 채움률 확인 방법 작성
   - 대량 scan 우려가 있으면 summary/cache 선행 조건으로 남김

Phase 3: P3 장기 backlog 분리
- AI 시세 예측, AI 자연어 검색, 돈줍 PRO/결제, Turso/D1 read mirror, B2B API, 레퍼럴, 뉴스레터/Stibee, 네이버 블로그 자동화, 숏폼 자동화는 공개 구현하지 마.
- 각 항목별로 비용, 외부 승인, DB schema, feature flag, kill switch, 법적/운영 리스크를 정리한 후속 backlog와 구현 프롬프트를 문서 하단에 추가해.

검증:
- 관련 unit test
- `pnpm --silent test`
- `pnpm build`
- `pnpm --silent db:status:ops`
- public smoke: `/`, `/feed.xml`, `/rate`, `/trend`, `/market`, `/rent`, `/search?q=답십리 두산`, 샘플 상세
- SEO smoke: canonical, RSS XML, JSON-LD parse
- DB query가 대량 scan을 유발하지 않는지 관련 query와 limit/window 확인

배포:
1. 필요한 파일만 선별 커밋.
2. push 후 Vercel production 확인.
3. 공개 smoke 재실행.
4. 문제가 있으면 UI/route 단위로 되돌릴 수 있게 변경을 작게 유지.

최종 보고:
- 변경 파일
- 구현한 P1 기능
- 설계/스캐폴드로만 남긴 P2 기능
- 별도 승인 backlog로 분리한 P3 기능
- 테스트/빌드 결과
- 공개 smoke 결과
- SEO smoke 결과
- 남은 리스크
```

## 16. 남은 리스크

1. 시장조사 문서 일부는 외부 시장/경쟁사 동향을 포함하므로 최신성은 별도 재조사가 필요하다.
2. 현재 대조는 repo 코드 기준이며, 실제 Vercel env/외부 API 승인 상태는 확인하지 않았다.
3. 전세가율/갭 필터는 데이터 결측과 동일 면적 매칭 문제가 있어 confidence 표기가 필수다.
4. AI/프리미엄 기능은 법적 오해, 비용, 결제 운영 리스크가 커서 별도 승인 전 공개하면 안 된다.
5. 네이버 블로그/뉴스레터/외부 발행 자동화는 스팸/중복콘텐츠 리스크가 있어 수동 운영 검증 후 자동화해야 한다.

## 17. P2/P3 비공개 스캐폴드와 후속 백로그

이 절은 공개 기능 구현이 아니라 운영 안정화 이후의 설계 기준이다. 아래 SQL은 적용 명령이 아니며, 실제 migration은 별도 승인과 backup artifact 이후 idempotent 파일로 분리한다.

### 17.1 `news`와 `news_cache` 정리 초안

현재 뉴스 경로는 `news` 테이블을 즉석 DDL로 보강하는 흐름이 남아 있다. P2에서는 cron route에서 DDL을 제거하고 migration/schema로 이동한다.

```sql
-- draft only: do not apply without a dedicated migration review.
CREATE TABLE IF NOT EXISTS news_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  summary TEXT,
  published_at DATE,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE (query, source, url)
);

CREATE INDEX IF NOT EXISTS idx_news_cache_query_expires
  ON news_cache (query, expires_at DESC);
```

검증 기준:

1. `/api/news`는 cache hit 먼저, miss일 때만 외부 API/RSS fallback.
2. 외부 API key가 없으면 기존 fallback을 유지.
3. cron에서 DDL 실행 금지.

### 17.2 관심 단지 서버 저장/알림 설계

localStorage 즐겨찾기는 유지하되, 로그인 사용자용 서버 저장은 별도 feature flag로 시작한다.

```sql
-- draft only.
CREATE TABLE IF NOT EXISTS user_favorite_complexes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  complex_id UUID NOT NULL,
  identity_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, complex_id)
);

CREATE TABLE IF NOT EXISTS apt_alert_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  complex_id UUID NOT NULL,
  alert_kind TEXT NOT NULL,
  threshold JSONB,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  disabled_at TIMESTAMPTZ,
  UNIQUE (user_id, complex_id, alert_kind)
);
```

가드레일:

1. 로그인/권한 체계가 확정되기 전 공개 API 금지.
2. push 발송은 dry-run과 rate limit 먼저.
3. 단지별 fan-out은 일별 최대 발송량 kill switch 필요.

### 17.3 CPA/수익 추적 설계

승인된 제휴 링크 없이 전환 추적을 공개하지 않는다. 우선 클릭 이벤트만 내부 집계 후보로 둔다.

```sql
-- draft only.
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id TEXT NOT NULL,
  placement TEXT NOT NULL,
  page_path TEXT NOT NULL,
  target_host TEXT NOT NULL,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  anonymous_session_id TEXT,
  user_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_campaign_date
  ON affiliate_clicks (campaign_id, clicked_at DESC);
```

가드레일:

1. 제휴 승인 전 CTA는 일반 안내 또는 준비중 상태.
2. 개인식별 정보 저장 최소화.
3. 광고 슬롯이 LCP/CLS를 악화시키면 즉시 비활성화.

### 17.4 고급 필터 채움률 확인 쿼리

월세수익률, 주차, 세대수, 용적률/건폐율 필터는 DB 채움률과 인덱스 확인 후만 공개한다.

```sql
SELECT
  COUNT(*) AS total_complexes,
  COUNT(parking_count) AS parking_filled,
  COUNT(total_units) AS total_units_filled,
  COUNT(floor_area_ratio) AS far_filled,
  COUNT(building_coverage) AS bcr_filled
FROM apt_complexes;

SELECT
  COUNT(*) AS monthly_rent_rows,
  COUNT(NULLIF(monthly_rent, 0)) AS nonzero_monthly_rent_rows
FROM apt_rent_transactions;
```

공개 조건:

1. 채움률이 낮은 필드는 검색 필터가 아니라 상세 보조 정보로만 표시.
2. 월세수익률은 동일 면적 최신 매매가와 월세 전환율 가정이 필요하므로 면책 문구 필수.
3. 대량 scan이 보이면 summary/cache 테이블 선행.

### 17.5 P3 별도 승인 백로그

| 항목 | 공개 구현 전 필수 조건 | 기본 상태 |
| --- | --- | --- |
| AI 시세 예측 | 단순 이동평균 MVP, 면책 문구, backtest, feature flag, 비용 0원 기본값 | backlog |
| AI 자연어 검색 | rule-based parser 우선, LLM 사용량 제한/캐시/kill switch | backlog |
| 돈줍 PRO/결제 | entitlement, 약관/환불, PG 승인, 무료 서비스 안정화 | backlog |
| Turso/D1 read mirror | ETL 검증, stale fallback 정책, 장애 전환 문서 | backlog |
| B2B 데이터 API | 계약/인증/rate limit/usage log/법적 검토 | backlog |
| 레퍼럴 | abuse guard, reward accounting, 개인정보 최소화 | backlog |
| 뉴스레터/Stibee | opt-in, unsubscribe, 발송 실패 처리, 스팸 리스크 검토 | backlog |
| 네이버 블로그 자동화 | 중복 콘텐츠 리스크, 수동 검수, API/운영 승인 | backlog |
| 숏폼 자동화 | 템플릿 품질, 저작권/초상권, 렌더 비용 제한 | backlog |

### 17.6 P3 구현 착수용 후속 프롬프트

```md
docs/19-market-research-feature-gap-plan.md의 17.5 P3 backlog 중 내가 지정한 항목만 별도 승인 범위에서 설계/구현해줘.

조건:
1. 공개 route는 feature flag 기본 off로 시작해.
2. DB migration은 idempotent 초안, backup artifact, rollback 계획을 먼저 제시해.
3. LLM/결제/외부 발행/외부 API 비용이 발생하면 실제 구현 전 멈추고 필요한 env와 비용 상한만 알려줘.
4. AI 예측/검색은 면책 문구와 kill switch 없이는 공개하지 마.
5. 테스트, build, public smoke, 비용/트래픽 리스크를 함께 보고해.
```
