# Phase 12: 금리 표현 개선 - Research

**Researched:** 2026-03-28
**Domain:** React Server/Client Component split, CSS accordion, Next.js 16 App Router
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**1. 대표 금리 히어로 카드 (RATE-01)**
- D-01: 초기 화면 최상단에 "시중 주담대 평균금리" 히어로 카드 1개만 표시
- D-02: 평균금리 산출: 은행별 주담대 최저금리(BANK_* 데이터)의 산술평균, 소수점 2자리
- D-03: 히어로 카드에 평균금리 수치 + 전일 대비 변동(bp) + 기준일 표시
- D-04: 히어로 카드 아래에 "은행 최저 N.NN% ~ 최고 N.NN%" 범위 텍스트 표시

**2. 세부 지표 접기 (RATE-02)**
- D-05: 기존 5개 지표 카드(기준금리, COFIX 신규/잔액, CD, 국고채)를 accordion 섹션으로 변경
- D-06: accordion 헤더: 지표명 + 현재값 + 변동bp — 펼치면 기존 RateDetailCard 내용(설명 + MiniAreaChart)
- D-07: 기본 상태는 모두 접힘 — 초기 화면에는 히어로 카드만 보임
- D-08: "주요 금리 지표" 섹션 제목 아래 accordion 배치

**3. 은행별 금리 확장 (RATE-03)**
- D-09: 은행별 주담대 금리 테이블의 각 행을 클릭 시 인라인 확장
- D-10: 확장 시 추가 정보: 이전 금리, 변동일, 금리 유형(고정/변동) — 현재 DB에 있는 데이터 범위 내에서
- D-11: 모바일: 카드 형태 유지, 터치 시 확장 (현재 카드 레이아웃 활용)
- D-12: 기본 상태: 모두 접힘 — 은행명 + 금리만 표시

**4. 레이아웃 변경**
- D-13: 페이지 순서: 히어로 카드 → 주요 금리 지표(accordion) → 은행별 주담대 → 대출 도구 → 퀵링크
- D-14: "최근 금리 변동 이력" 섹션 제거 — accordion 내부 MiniAreaChart로 대체 (중복 제거)
- D-15: 클라이언트 컴포넌트 분리: accordion/확장 상호작용은 별도 Client Component로 추출

### Claude's Discretion
- accordion 애니메이션 방식 (CSS transition vs framer-motion — 기존 의존성 내에서)
- 히어로 카드의 구체적 스타일/크기
- 은행별 확장 영역의 세부 레이아웃
- "최근 금리 변동 이력" 테이블 데이터의 accordion 내 배치 방식

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RATE-01 | 금리 초기 화면에 시중금리 평균값 1개만 대표로 표시한다 (은행별 주담대 평균) | 히어로 카드 서버 컴포넌트에서 sortedBankRates 기반 산술평균 계산 |
| RATE-02 | 기준금리·COFIX 등 세부 지표는 펼침(accordion) 또는 상세 페이지로 이동한다 | CSS transition accordion, Client Component 분리 패턴 |
| RATE-03 | 은행별 상세 금리는 터치/클릭 시 확장되는 형태로 변경한다 | expandedBank state 관리, 모바일/데스크탑 공통 인라인 확장 |
</phase_requirements>

---

## Summary

Phase 12는 순수 UI 리팩토링 단계다. DB 쿼리나 데이터 모델 변경 없이 `src/app/rate/page.tsx` 하나를 서버/클라이언트 컴포넌트로 분리하고, 표시 방식만 계층화한다.

핵심 기술 과제는 두 가지다. 첫째, `page.tsx`가 현재 전체 Server Component이므로 accordion/확장 상호작용을 담당할 Client Component를 추출하고 서버에서 계산된 데이터를 props로 전달해야 한다. 둘째, 기존 의존성(Tailwind CSS + React useState)만으로 accordion 애니메이션을 구현해야 한다 — framer-motion은 미설치 상태다.

평균금리 계산은 서버에서 `sortedBankRates` 배열을 기반으로 산술평균을 내고, 최소/최대 범위를 함께 계산한다. 이 값들을 Client Component에 props로 전달한다. "최근 금리 변동 이력" 테이블은 삭제하고 각 accordion 패널 내 MiniAreaChart로 대체된다.

**Primary recommendation:** page.tsx에서 두 Client Component를 추출한다 — `RateIndicatorAccordion` (RATE-02)과 `BankRateExpandable` (RATE-03). 서버 컴포넌트는 데이터 준비만 담당하고, 히어로 카드는 서버에서 직접 렌더링한다.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React (useState) | 19.2.4 | accordion/expand 상태 관리 | 이미 사용 중, 외부 의존성 불필요 |
| Tailwind CSS | 4.x | 애니메이션 (`transition`, `max-h`) | 프로젝트 표준 스타일링 |
| Next.js App Router | 16.2.1 | Server/Client 컴포넌트 분리 | 프로젝트 기반 프레임워크 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| MiniAreaChartWrapper | (internal) | 소형 차트 렌더링 | accordion 내부 패널에서 유지 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS max-height transition | framer-motion AnimatePresence | framer-motion 미설치, CSS로 충분 |
| CSS max-height transition | details/summary HTML 요소 | 커스텀 스타일링 어려움, React state와 충돌 가능 |

**Installation:** 추가 패키지 설치 없음 — 기존 의존성으로 구현 가능.

---

## Architecture Patterns

### Recommended Component Structure
```
src/app/rate/
├── page.tsx                        # Server Component (데이터 fetch, 히어로 카드 렌더)
└── (없음 — 같은 파일 내 추출 또는)
src/components/rate/
├── RateIndicatorAccordion.tsx      # Client Component (RATE-02)
└── BankRateExpandable.tsx          # Client Component (RATE-03)
```

또는 D-15 결정에 따라 page.tsx 파일 내에서 `"use client"` 컴포넌트를 같은 파일에 두지 않고 별도 파일로 추출하는 것이 Next.js 표준 패턴이다. Server Component (page.tsx)는 "use client" 지시어를 포함할 수 없으므로 반드시 별도 파일이어야 한다.

### Pattern 1: 서버 → 클라이언트 데이터 전달

**What:** page.tsx(Server)에서 계산한 데이터를 Client Component에 props로 전달
**When to use:** 서버에서만 접근 가능한 DB 데이터를 클라이언트 인터랙션과 결합할 때

```typescript
// page.tsx (Server Component)
import RateIndicatorAccordion from "@/components/rate/RateIndicatorAccordion";

// 서버에서 계산
const avgRate = sortedBankRates.length > 0
  ? parseFloat(
      (sortedBankRates.reduce((s, r) => s + r.rate_value, 0) / sortedBankRates.length).toFixed(2)
    )
  : null;
const minRate = sortedBankRates[0]?.rate_value ?? null;
const maxRate = sortedBankRates[sortedBankRates.length - 1]?.rate_value ?? null;

// Client Component에 직렬화 가능한 props만 전달
<RateIndicatorAccordion
  indicators={RATE_ORDER.map((type) => ({
    type,
    label: RATE_LABELS[type] ?? type,
    description: RATE_DESCRIPTIONS[type] ?? "",
    rate: latestByType.get(type) ?? null,
    history: historyByType.get(type)?.slice().reverse() ?? [],
  }))}
/>
```

### Pattern 2: CSS max-height accordion

**What:** max-height 0 → max-height 값으로 transition하는 순수 CSS 방식
**When to use:** framer-motion 없이 간단한 펼침/접힘 효과가 필요할 때

```typescript
// RateIndicatorAccordion.tsx
"use client";
import { useState } from "react";

export default function RateIndicatorAccordion({ indicators }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="divide-y t-border rounded-2xl border t-border t-card overflow-hidden">
      {indicators.map((item, i) => (
        <div key={item.type}>
          {/* 헤더: 항상 표시 */}
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <span className="font-medium t-text text-sm">{item.label}</span>
            <div className="flex items-center gap-2">
              <span className="font-bold tabular-nums t-text">{item.rate?.rate_value}%</span>
              {item.rate?.change_bp !== null && item.rate?.change_bp !== 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  (item.rate?.change_bp ?? 0) > 0 ? "t-drop-bg t-drop" : "t-rise-bg t-rise"
                }`}>
                  {(item.rate?.change_bp ?? 0) > 0 ? "+" : ""}{item.rate?.change_bp}bp
                </span>
              )}
              <span className={`text-xs t-text-tertiary transition-transform duration-200 ${
                openIndex === i ? "rotate-180" : ""
              }`}>▼</span>
            </div>
          </button>
          {/* 패널: max-height transition */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              openIndex === i ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="px-4 pb-4">
              {/* RateDetailCard 내용 */}
              <p className="text-xs t-text-tertiary mb-2">{item.description}</p>
              <p className="text-[11px] t-text-tertiary">기준일: {item.rate?.base_date}</p>
              {item.history.length > 1 && (
                <MiniAreaChartWrapper
                  data={item.history.slice(-12).map((h) => ({ value: h.value }))}
                  color={(item.rate?.change_bp ?? 0) > 0 ? "#ef4444" : "#059669"}
                  height={48}
                />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Pattern 3: 은행별 인라인 확장 (RATE-03)

**What:** 클릭한 은행 행/카드만 확장, 나머지는 접힘
**When to use:** 리스트 아이템별 개별 확장이 필요할 때

```typescript
// BankRateExpandable.tsx
"use client";
import { useState } from "react";

export default function BankRateExpandable({ banks }: { banks: BankRateItem[] }) {
  const [expandedBank, setExpandedBank] = useState<string | null>(null);

  return (
    <>
      {/* Mobile */}
      <div className="space-y-2 sm:hidden">
        {banks.map((bank) => (
          <div
            key={bank.rate_type}
            className="rounded-xl border t-border t-card px-4 py-3 cursor-pointer"
            onClick={() => setExpandedBank(expandedBank === bank.rate_type ? null : bank.rate_type)}
          >
            {/* 기본 행 */}
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium t-text text-sm">{bank.label}</p>
              <p className="text-sm font-bold tabular-nums t-text shrink-0">{bank.rate_value}%</p>
            </div>
            {/* 확장 영역 */}
            <div className={`overflow-hidden transition-all duration-200 ${
              expandedBank === bank.rate_type ? "max-h-32 mt-2" : "max-h-0"
            }`}>
              <div className="border-t t-border pt-2 text-xs t-text-secondary space-y-1">
                {bank.prev_value !== null && (
                  <div className="flex justify-between">
                    <span>이전 금리</span><span>{bank.prev_value}%</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>변동일</span><span>{bank.base_date}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
```

### Anti-Patterns to Avoid
- **Server Component에 "use client" 삽입:** page.tsx는 Server Component여야 하므로 "use client" 지시어를 page.tsx에 추가하지 않는다. 인터랙션이 필요한 부분은 별도 파일로 추출한다.
- **Client Component에서 DB 직접 쿼리:** CLAUDE.md 규칙 — 서버 컴포넌트에서만 직접 DB 쿼리. Client Component는 props로 데이터를 받는다.
- **Props에 직렬화 불가 객체 전달:** Map, Date 객체 등을 직접 props로 전달하지 않는다. 배열이나 plain object로 변환 후 전달한다.
- **max-height: auto로 transition:** CSS transition은 `auto`에서 작동하지 않는다. 숫자값(예: `max-h-64`)을 명시적으로 지정해야 한다.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| accordion 상태 관리 | 복잡한 상태 머신 | useState + 단순 index | 5개 지표, 간단한 open/close |
| 애니메이션 | canvas/requestAnimationFrame | Tailwind transition + max-height | CSS GPU 가속, 코드 최소 |
| 은행별 평균금리 | 외부 API 재호출 | sortedBankRates 배열 직접 계산 | 이미 서버에서 fetch된 데이터 |

**Key insight:** 이 페이지의 인터랙션은 매우 단순하다 — open/close 토글 뿐이므로 라이브러리 없이 useState + CSS transition 조합이 최적이다.

---

## Common Pitfalls

### Pitfall 1: max-height 값을 너무 작게 설정
**What goes wrong:** accordion 내부 content가 잘린다 (MiniAreaChart 48px + 텍스트 포함 시 max-h-24가 부족할 수 있음)
**Why it happens:** 각 지표 카드 내 MiniAreaChart(48px) + description + date = ~100-120px
**How to avoid:** `max-h-48` (192px) 이상으로 설정하거나, `max-h-[500px]` 명시
**Warning signs:** 빌드 후 accordion 펼쳤을 때 내용이 일부만 보임

### Pitfall 2: Client Component props 직렬화 오류
**What goes wrong:** `Error: Only plain objects can be passed to Client Components from Server Components`
**Why it happens:** Map 또는 non-serializable 객체를 props로 전달
**How to avoid:** `latestByType.get(type)` → plain object spread, `historyByType.get(type)` → Array literal로 변환 후 전달
**Warning signs:** 런타임 에러, Next.js 빌드 경고

### Pitfall 3: 히어로 카드 평균금리 계산 시 BANK_UNKNOWN 포함
**What goes wrong:** "기타" 은행 데이터가 평균을 왜곡
**Why it happens:** `bankRatesRaw` 쿼리가 `BANK_%`를 전부 포함하되 `BANK_PRODUCTS_ALL`만 제외
**How to avoid:** 평균 계산 전 `BANK_UNKNOWN` rate_type도 필터에서 제외
**Warning signs:** 평균 금리가 실제보다 낮거나 높게 표시됨

### Pitfall 4: change_bp 방향 표기 혼동
**What goes wrong:** 금리 상승(양수 bp)을 빨간색(t-drop-bg)으로 표시
**Why it happens:** 부동산 가격 맥락에서 t-drop-bg는 "하락(나쁨)"이지만, 금리 맥락에서는 상승이 부정적
**How to avoid:** 기존 page.tsx 로직 그대로 유지 — `change_bp > 0`이면 `t-drop-bg t-drop` (금리 상승 = 나쁨). 기존 코드가 이미 정확하게 구현됨.
**Warning signs:** 색상 방향이 다른 페이지와 다르게 보임

### Pitfall 5: "최근 금리 변동 이력" 섹션 삭제 후 historyByType 미사용
**What goes wrong:** historyByType 데이터를 accordion에 전달하지 않으면 MiniAreaChart가 빈 상태로 렌더링
**Why it happens:** D-14 결정 — 이력 테이블 제거하고 accordion 내 MiniAreaChart로 대체하는데, props 전달을 누락할 수 있음
**How to avoid:** indicator props에 `history` 배열 포함 (reversed 순서 그대로)
**Warning signs:** accordion 내부 차트가 보이지 않거나 데이터 없음 표시

---

## Code Examples

Verified patterns from existing codebase:

### 히어로 카드 평균금리 계산 (Server, page.tsx 내)
```typescript
// sortedBankRates는 이미 rate_value 오름차순 정렬됨
const validBanks = sortedBankRates.filter(r => r.rate_type !== "BANK_UNKNOWN");
const avgRate = validBanks.length > 0
  ? parseFloat(
      (validBanks.reduce((s, r) => s + r.rate_value, 0) / validBanks.length).toFixed(2)
    )
  : null;
const minRate = validBanks[0]?.rate_value ?? null;
const maxRate = validBanks[validBanks.length - 1]?.rate_value ?? null;
const baseDate = validBanks[0]?.base_date ?? "";

// 전일 대비 평균 change_bp (null 포함 항목 제외 후 평균)
const bpItems = validBanks.filter(r => r.change_bp !== null).map(r => r.change_bp!);
const avgChangeBp = bpItems.length > 0
  ? Math.round(bpItems.reduce((s, v) => s + v, 0) / bpItems.length)
  : null;
```

### 기존 카드 스타일 패턴 (유지)
```typescript
// 기존 코드에서 확인된 패턴
className="rounded-2xl border t-border t-card p-5"
className="card-hover rounded-2xl border t-border t-card p-5"
className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${
  changeBp > 0 ? "t-drop-bg t-drop" : "t-rise-bg t-rise"
}`}
```

### 히어로 카드 구조 (서버에서 직접 렌더)
```tsx
{/* 히어로 카드 — Server에서 직접 렌더 (인터랙션 없음) */}
{avgRate !== null && (
  <div className="rounded-2xl border-2 brand-tint-border brand-tint t-card p-6 mb-6">
    <p className="text-sm font-medium t-text-secondary">시중 주담대 평균금리</p>
    <div className="flex items-end gap-3 mt-2">
      <p className="text-5xl font-extrabold tabular-nums t-text">{avgRate}%</p>
      {avgChangeBp !== null && avgChangeBp !== 0 && (
        <span className={`mb-1 inline-flex items-center rounded-full px-2 py-1 text-sm font-bold ${
          avgChangeBp > 0 ? "t-drop-bg t-drop" : "t-rise-bg t-rise"
        }`}>
          {avgChangeBp > 0 ? "+" : ""}{avgChangeBp}bp
        </span>
      )}
    </div>
    {minRate !== null && maxRate !== null && (
      <p className="mt-2 text-sm t-text-secondary">
        은행 최저 {minRate}% ~ 최고 {maxRate}%
      </p>
    )}
    <p className="mt-1 text-xs t-text-tertiary">기준일: {baseDate}</p>
  </div>
)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 전체 섹션 펼침 | Accordion/확장 패턴 | Phase 12 | 초기 화면 인지 부하 감소 |
| 이력 테이블 별도 섹션 | Accordion 패널 내 MiniAreaChart | Phase 12 | 중복 제거, 레이아웃 단순화 |

**Deprecated/outdated (이 phase에서 제거):**
- "최근 금리 변동 이력" 테이블 섹션: D-14 결정으로 accordion 내 MiniAreaChart로 대체

---

## Open Questions

1. **금리 유형(고정/변동) 필드 존재 여부**
   - What we know: D-10에서 "금리 유형(고정/변동)"을 확장 영역에 표시하기로 결정됨
   - What's unclear: `FinanceRate` 타입에 `rate_type` 필드만 있고, 고정/변동 구분 컬럼이 없음. `raw_data` 상당 필드도 없음.
   - Recommendation: 실제 DB finance_rates 테이블에 해당 컬럼이 없다면, 확장 영역에서 이 항목을 생략하고 이전 금리(prev_value)와 변동일(base_date)만 표시한다. 플래너가 DB 스키마 확인 태스크를 Wave 0에 추가해야 함.

2. **BANK_UNKNOWN 데이터 실제 존재 여부**
   - What we know: BANK_LABELS에 BANK_UNKNOWN이 정의되어 있음
   - What's unclear: 실제로 finance_rates 테이블에 BANK_UNKNOWN 레코드가 있는지 확인 안 됨
   - Recommendation: 필터링 코드 추가는 방어적으로 적용. 실제 데이터가 없더라도 코드는 안전함.

---

## Environment Availability

Step 2.6: SKIPPED — 이 phase는 외부 도구/서비스 의존성 없음. 기존 Next.js + Tailwind + React 스택만 사용.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | 없음 — 프로젝트에 테스트 인프라 미설치 (REQUIREMENTS.md: 테스트 인프라는 별도 마일스톤) |
| Config file | 없음 |
| Quick run command | `npm run build` (TypeScript 컴파일 에러 검출) |
| Full suite command | `npm run build && npx vercel --prod --yes` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RATE-01 | 히어로 카드에 평균금리 표시 | smoke (빌드 후 시각 확인) | `npm run build` | N/A |
| RATE-02 | accordion 기본 접힘 상태 | smoke (시각 확인) | `npm run build` | N/A |
| RATE-03 | 은행별 클릭 시 확장 | smoke (시각 확인) | `npm run build` | N/A |

### Sampling Rate
- **Per task commit:** `npm run build` (TypeScript 에러 없음 확인)
- **Per wave merge:** `npm run build` — 빌드 성공 + Vercel preview 배포 확인
- **Phase gate:** 빌드 성공 + `/rate` 페이지 실제 동작 확인 (accordion/확장 수동 검증)

### Wave 0 Gaps
- 테스트 인프라 미설치는 프로젝트 범위 밖 (REQUIREMENTS.md Out of Scope). 이 phase는 빌드 성공을 주요 게이트로 사용.

---

## Sources

### Primary (HIGH confidence)
- `src/app/rate/page.tsx` — 현재 구현 전체 직접 분석
- `src/lib/format.ts` — RATE_LABELS, RATE_DESCRIPTIONS, RATE_ORDER 상수 확인
- `src/types/db.ts` — FinanceRate 타입 확인
- `src/components/charts/MiniAreaChartWrapper.tsx` — 동적 import 패턴 확인
- `src/components/apt/AptDetailClient.tsx` — 기존 Client Component 분리 패턴
- `src/components/apt/TransactionTabs.tsx` — useState 기반 탭 패턴
- `package.json` — 설치된 의존성 (framer-motion 없음 확인)

### Secondary (MEDIUM confidence)
- CONTEXT.md D-01~D-15 결정 사항 — 사용자 승인된 구현 방향

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 기존 의존성 코드베이스에서 직접 확인
- Architecture: HIGH — 기존 Client Component 패턴(AptDetailClient, TransactionTabs)에서 검증된 방식
- Pitfalls: HIGH — page.tsx 직접 분석 + Next.js App Router 알려진 제약사항

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (안정적 스택, 30일)
