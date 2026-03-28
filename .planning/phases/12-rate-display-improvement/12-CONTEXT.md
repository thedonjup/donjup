# Phase 12: 금리 표현 개선 - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

금리 페이지가 핵심 정보를 즉시 보여주고 상세는 요청 시에만 펼쳐진다. 현재 모든 정보가 펼쳐져 있는 페이지를 정보 계층화하여 초기 화면의 인지 부하를 줄인다.

</domain>

<decisions>
## Implementation Decisions

### 1. 대표 금리 히어로 카드 (RATE-01)
- **D-01:** 초기 화면 최상단에 "시중 주담대 평균금리" 히어로 카드 1개만 표시
- **D-02:** 평균금리 산출: 은행별 주담대 최저금리(BANK_* 데이터)의 산술평균, 소수점 2자리
- **D-03:** 히어로 카드에 평균금리 수치 + 전일 대비 변동(bp) + 기준일 표시
- **D-04:** 히어로 카드 아래에 "은행 최저 N.NN% ~ 최고 N.NN%" 범위 텍스트 표시

### 2. 세부 지표 접기 (RATE-02)
- **D-05:** 기존 5개 지표 카드(기준금리, COFIX 신규/잔액, CD, 국고채)를 accordion 섹션으로 변경
- **D-06:** accordion 헤더: 지표명 + 현재값 + 변동bp — 펼치면 기존 RateDetailCard 내용(설명 + MiniAreaChart)
- **D-07:** 기본 상태는 모두 접힘 — 초기 화면에는 히어로 카드만 보임
- **D-08:** "주요 금리 지표" 섹션 제목 아래 accordion 배치

### 3. 은행별 금리 확장 (RATE-03)
- **D-09:** 은행별 주담대 금리 테이블의 각 행을 클릭 시 인라인 확장
- **D-10:** 확장 시 추가 정보: 이전 금리, 변동일, 금리 유형(고정/변동) — 현재 DB에 있는 데이터 범위 내에서
- **D-11:** 모바일: 카드 형태 유지, 터치 시 확장 (현재 카드 레이아웃 활용)
- **D-12:** 기본 상태: 모두 접힘 — 은행명 + 금리만 표시

### 4. 레이아웃 변경
- **D-13:** 페이지 순서: 히어로 카드 → 주요 금리 지표(accordion) → 은행별 주담대 → 대출 도구 → 퀵링크
- **D-14:** "최근 금리 변동 이력" 섹션 제거 — accordion 내부 MiniAreaChart로 대체 (중복 제거)
- **D-15:** 클라이언트 컴포넌트 분리: accordion/확장 상호작용은 별도 Client Component로 추출

### Claude's Discretion
- accordion 애니메이션 방식 (CSS transition vs framer-motion — 기존 의존성 내에서)
- 히어로 카드의 구체적 스타일/크기
- 은행별 확장 영역의 세부 레이아웃
- "최근 금리 변동 이력" 테이블 데이터의 accordion 내 배치 방식

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 금리 페이지 (핵심 수정 대상)
- `src/app/rate/page.tsx` — 현재 금리 페이지 전체 (RateDetailCard, 은행별 테이블, 변동 이력 테이블)
- `src/lib/format.ts` — RATE_LABELS, RATE_DESCRIPTIONS, RATE_ORDER 상수
- `src/components/charts/MiniAreaChartWrapper.tsx` — 소형 차트 컴포넌트

### 데이터 모델
- `src/types/db.ts` — FinanceRate 타입 (rate_type, rate_value, prev_value, change_bp, base_date)

### 관련 페이지
- `src/app/rate/calculator/page.tsx` — 대출 계산기 (금리 페이지에서 링크)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `RateDetailCard` — page.tsx 내부 함수 컴포넌트, accordion 내용으로 재사용 가능
- `MiniAreaChart` / `MiniAreaChartWrapper` — 소형 차트, accordion 내부에서 유지
- `BANK_LABELS` — 은행 코드→한글명 매핑 (page.tsx 내부)
- `RATE_ORDER`, `RATE_LABELS`, `RATE_DESCRIPTIONS` — format.ts에서 import

### Established Patterns
- 서버 컴포넌트에서 직접 DB 쿼리 (createClient → supabase)
- 모바일/데스크탑 분기: `sm:hidden` / `hidden sm:block`
- 카드 스타일: `rounded-2xl border t-border t-card p-5`

### Integration Points
- page.tsx의 allRates/bankRatesRaw 쿼리는 유지 — UI 렌더링만 변경
- 클라이언트 컴포넌트 분리 시 서버→클라이언트 데이터 전달 필요 (props)
- 히어로 카드의 평균 금리 계산은 서버에서 수행 (sortedBankRates 기반)

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

*Phase: 12-rate-display-improvement*
*Context gathered: 2026-03-28*
