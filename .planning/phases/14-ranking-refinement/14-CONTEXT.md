# Phase 14: 랭킹 정교화 - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

폭락·신고가 랭킹의 변동률을 고층 환산 기준으로 재산출하고, 이상거래(직거래 저가, 친족 추정)를 랭킹에서 제외하고, 저층 거래에 "저층" 라벨을 표시한다. DB 스키마 변경 없이 조회/렌더링 단계에서 보정.

</domain>

<decisions>
## Implementation Decisions

### 1. 변동률 고층 환산 (RANK-01)
- **D-01:** 홈 페이지 서버 컴포넌트(page.tsx)에서 랭킹 데이터 조회 후 저층(floor <= 3) 거래의 change_rate를 고층 환산으로 재계산
- **D-02:** Phase 10의 `adjustFloorPrice` 함수 재사용 — trade_price를 고층 환산 후 highest_price 대비 변동률 재산출
- **D-03:** 환산 후 변동률: `(adjustFloorPrice(trade_price, floor) - highest_price) / highest_price * 100`
- **D-04:** highest_price는 보정하지 않음 — 이미 해당 면적의 과거 최고가이므로 고층 기준
- **D-05:** DB의 change_rate 컬럼은 건드리지 않음 — 조회 시 오버라이드

### 2. 이상거래 자동 제외 (RANK-02)
- **D-06:** 홈 페이지 서버 컴포넌트에서 랭킹 데이터 조회 후 이상거래 필터링
- **D-07:** Phase 10의 `isDirectDeal`(deal_type === '직거래') + `isDealSuspicious`(시세 70% 미만) 재사용
- **D-08:** 직거래 중 시세 대비 30% 이상 저가인 거래만 제외 (일반 직거래는 유지)
- **D-09:** 필터링 후 랭킹 순서 재정렬 — 제외된 거래로 인한 순위 갭 없이

### 3. 저층 라벨 표시 (RANK-03)
- **D-10:** RankingTabs에서 floor <= 3인 거래에 "저층" 뱃지 표시
- **D-11:** 뱃지 스타일: 기존 drop_level 뱃지와 유사한 소형 둥근 뱃지, 회색 배경
- **D-12:** 변동률은 고층 환산값으로 표시 (D-01~D-03 적용 결과)
- **D-13:** Transaction 인터페이스에 floor 필드 추가 (현재 없음)

### 4. 데이터 흐름
- **D-14:** page.tsx에서 DB 조회 시 floor, deal_type 컬럼 추가 select
- **D-15:** price-normalization.ts에서 adjustFloorPrice, isDirectDeal, isDealSuspicious import
- **D-16:** 보정된 데이터를 RankingTabs/HeroSection에 전달 (기존 props 인터페이스 확장)

### Claude's Discretion
- 저층 뱃지의 정확한 색상/크기
- 신고가 랭킹에서 저층 보정 적용 여부 (폭락과 동일하게 적용 권장)
- 이상거래 필터링 후 빈 랭킹 시 fallback 표시
- new-highs 페이지도 동일 보정 적용할지 여부

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 랭킹 표시 (핵심 수정 대상)
- `src/app/page.tsx` — 홈 페이지 서버 컴포넌트, 랭킹 데이터 DB 조회
- `src/components/home/RankingTabs.tsx` — 폭락/신고가 랭킹 클라이언트 컴포넌트 (Transaction 인터페이스)
- `src/components/home/HeroSection.tsx` — 히어로 섹션 (랭킹 데이터 사용)

### 가격 정규화 (재사용)
- `src/lib/price-normalization.ts` — adjustFloorPrice, isDirectDeal, isDealSuspicious, FLOOR_ADJUSTMENT_FACTORS

### 데이터 수집
- `src/app/api/cron/fetch-transactions/route.ts` — 거래 데이터 수집 (change_rate 계산 로직 참고)

### 관련 페이지
- `src/app/new-highs/page.tsx` — 신고가 전용 페이지 (동일 보정 필요 여부 확인)

### 폭락 기준
- `docs/10-crash-criteria-v2.md` — 3단계 분류 체계 (decline/crash/severe)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `adjustFloorPrice(trade_price, floor)` — 저층 보정 (1층 +14.9%, 2층 +11.1%, 3층 +4.2%)
- `isDirectDeal(deal_type)` — 직거래 판별
- `isDealSuspicious(trade_price, recentMedian)` — 시세 70% 미만 판별
- `FLOOR_ADJUSTMENT_FACTORS` — {1: 1.1494, 2: 1.1111, 3: 1.0417}
- `DROP_LEVEL_CONFIG` — RankingTabs 내 뱃지 스타일 참고

### Established Patterns
- 홈 페이지: 서버 컴포넌트에서 DB 직접 조회 → RankingTabs/HeroSection에 props 전달
- Transaction 인터페이스: RankingTabs.tsx에 정의 (id, region_code, apt_name, size_sqm, trade_price, change_rate 등)
- 현재 Transaction에 floor 없음 — 추가 필요

### Integration Points
- page.tsx: select 쿼리에 floor, deal_type 추가
- page.tsx: 조회 후 보정 함수 적용 (adjustFloorPrice, filter)
- RankingTabs: Transaction 인터페이스에 floor 추가, 저층 뱃지 렌더링
- new-highs/page.tsx: 동일 보정 적용 여부 확인 필요

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-ranking-refinement*
*Context gathered: 2026-03-28*
