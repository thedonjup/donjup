# Phase 21: 디자인 시스템 통합 - Research

**Researched:** 2026-03-31
**Domain:** Tailwind CSS v4, CSS custom properties, dark mode, dynamic color tokens
**Confidence:** HIGH

## Summary

Phase 21의 목표는 `[data-theme="dark"]` 기반 다크모드가 전체 서비스에서 완전히 작동하도록 하는 것이다. 현재 상태 진단: (1) `globals.css`에 `[data-theme="dark"]` CSS 변수 셋은 이미 완비되어 있다. (2) ThemeProvider + inline script를 통해 테마 전환 메커니즘도 정상 동작한다. (3) 그러나 **Tailwind v4의 `dark:` 유틸리티가 `[data-theme="dark"]`에 반응하지 않는다** — `@custom-variant dark` 선언이 누락되었기 때문이다. (4) 127개의 인라인 `style={{}}` 중 70개가 하드코딩 hex색상을 사용하며, `DROP_LEVEL_CONFIG`는 3개 파일에 중복 정의된 채 다크모드 미대응 색상값을 가지고 있다. (5) Recharts 차트 내부 `stroke`/`fill` 속성은 SVG 속성으로 CSS 변수를 직접 적용 가능하다.

핵심 one-line fix는 STATE.md에 이미 기록되어 있다: `globals.css`에 `@custom-variant dark { &:where([data-theme="dark"], [data-theme="dark"] *) {} }` 추가.

**Primary recommendation:** DESIGN-02(one-line CSS fix) → DESIGN-01/03(인라인 style 제거, CSS var 전환) → DESIGN-04(DROP_LEVEL_CONFIG 중앙화 + CSS var 맵) 순서로 진행하되, 차트 SVG 색상은 CSS 변수 참조로 전환한다.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DESIGN-01 | 하드코딩된 색상(82개)이 CSS 변수 또는 Tailwind 유틸클래스로 전환되어 다크모드에서 정상 표시된다 | 실제 조사 결과 70개 hardcoded hex colors (opengraph/cardnews 제외). globals.css에 이미 완전한 CSS 변수 체계 존재. Tailwind `@theme inline` 섹션에 정적 색상 토큰 존재. |
| DESIGN-02 | `@custom-variant dark` 추가로 Tailwind dark: 유틸리티가 [data-theme="dark"]에서 활성화된다 | Tailwind v4.2.2 확인. `@custom-variant` 문법 지원 확인. 현재 globals.css에 선언 없음 — 1줄 추가로 해결. |
| DESIGN-03 | 컴포넌트의 인라인 style이 className 또는 CSS 변수 기반으로 전환된다 (동적 색상 포함) | 201개의 `style={{ color: "var(--color-..." }}` 패턴 발견 — 이미 CSS var 기반이지만 className 전환이 가능한 것이 많음. 완전 하드코딩 70개는 전환 필요. |
| DESIGN-04 | 동적 색상(드롭레벨, 전세가율 등)이 CSS 변수 맵 또는 유틸클래스로 관리되어 다크모드 대응된다 | DROP_LEVEL_CONFIG 3개 파일 중복, 하드코딩 색상값. src/lib/constants/ 에 중앙화 후 CSS 변수 참조로 전환. 전세가율은 PriceHistoryChart의 #F97316(orange)이 CSS var 전환 필요. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- 서버 컴포넌트: 자기 API fetch 금지 → db 직접 쿼리
- CockroachDB Serverless + Drizzle ORM
- 배포: `npx vercel --prod --yes`
- 캐시/서비스 워커: HTML Cache-Control no-cache 유지
- 코딩 원칙: DRY / KISS, 미사용 import·변수·하드코딩 금지
- 새 기능엔 테스트 동반 (동작 검증)

---

## Current State Audit

### 이미 올바른 부분 (건드리지 말 것)

1. **`globals.css` CSS 변수 체계** — `:root`와 `[data-theme="dark"]` 양쪽에 완전한 시맨틱 토큰 셋 존재
2. **ThemeProvider** — `data-theme` attribute를 `<html>`에 설정, localStorage 기반 영속화, 이미 동작 중
3. **Inline script** (`layout.tsx:96`) — FOUC 방지용 테마 초기화 스크립트, 정상 작동
4. **`style={{ color: "var(--color-text-..." }}`** 패턴 (201개) — CSS 변수 기반이므로 다크모드 대응됨
5. **t-card, t-text, t-text-secondary 등 utility 클래스** — globals.css에 CSS var 기반으로 정의됨

### 반드시 수정해야 하는 부분

| 카테고리 | 항목 | 파일 수 | 인스턴스 수 |
|----------|------|---------|------------|
| DESIGN-02 핵심 | `@custom-variant dark` 선언 누락 | 1 (globals.css) | 1 |
| Hardcoded hex in style | `color: "#xxx"`, `background: "#xxx"` | 16 | 70 |
| DROP_LEVEL_CONFIG 중복 | 3개 파일에 동일 상수 정의, 하드코딩 색상 | 3 | 3 |
| Recharts SVG attributes | `stroke="#..."`, `fill="#..."` | 1 (PriceHistoryChart) | 9 |
| global-error.tsx | ThemeProvider 없는 환경, 하드코딩 불가피 | 1 | 9 |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tailwindcss | 4.2.2 (installed) | Utility-first CSS | 프로젝트 표준 |
| @tailwindcss/postcss | ^4 (installed) | PostCSS integration | Tailwind v4 필수 |

### No Additional Libraries Needed
이 phase는 CSS + 기존 코드 리팩터링이다. 새 라이브러리 설치 불필요.

---

## Architecture Patterns

### Pattern 1: Tailwind v4 @custom-variant (DESIGN-02 핵심)

**What:** Tailwind v4에서 `dark:` 유틸리티를 `[data-theme="dark"]` attribute 기반으로 동작시키는 방법
**Source:** Tailwind v4 공식 — `@custom-variant` 지시어로 커스텀 variant 정의

```css
/* globals.css에 추가 — @import "tailwindcss"; 바로 다음 */
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
```

이 한 줄로 `dark:text-slate-100` 같은 Tailwind 유틸리티가 `[data-theme="dark"]` 하위 요소에 반응한다.

**Confidence:** HIGH — Tailwind v4.2.2 설치 확인, `@custom-variant` 문법 공식 지원

**기존 동작:** Tailwind v4의 기본 `dark:` variant는 `@media (prefers-color-scheme: dark)` 기반이다. `[data-theme="dark"]`로 수동 전환 시 dark: 유틸리티가 활성화되지 않는 것은 이 때문이다.

### Pattern 2: CSS 변수 기반 동적 색상 (DESIGN-04)

**What:** `DROP_LEVEL_CONFIG`의 하드코딩 hex → CSS 변수 참조 전환

현재 3개 파일에 중복 정의:
```typescript
// src/app/today/page.tsx, src/components/apt/TransactionTabs.tsx,
// src/components/home/RankingTabs.tsx 모두 동일 내용
const DROP_LEVEL_CONFIG = {
  decline: { label: "하락", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  crash:   { label: "폭락", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  severe:  { label: "대폭락", color: "#dc2626", bg: "rgba(220,38,38,0.12)" },
};
```

**전환 전략 — CSS 변수 맵으로 전환:**

```css
/* globals.css에 추가 */
:root {
  --color-drop-level-decline: #f59e0b;
  --color-drop-level-decline-bg: rgba(245,158,11,0.12);
  --color-drop-level-crash: #ef4444;
  --color-drop-level-crash-bg: rgba(239,68,68,0.12);
  --color-drop-level-severe: #dc2626;
  --color-drop-level-severe-bg: rgba(220,38,38,0.12);
}
[data-theme="dark"] {
  --color-drop-level-decline: #fbbf24;
  --color-drop-level-decline-bg: rgba(251,191,36,0.15);
  --color-drop-level-crash: #f87171;
  --color-drop-level-crash-bg: rgba(248,113,113,0.15);
  --color-drop-level-severe: #fca5a5;
  --color-drop-level-severe-bg: rgba(252,165,165,0.12);
}
```

```typescript
// src/lib/constants/drop-level.ts (신규 생성)
export const DROP_LEVEL_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  decline: { label: "하락", color: "var(--color-drop-level-decline)", bg: "var(--color-drop-level-decline-bg)" },
  crash:   { label: "폭락", color: "var(--color-drop-level-crash)",   bg: "var(--color-drop-level-crash-bg)" },
  severe:  { label: "대폭락", color: "var(--color-drop-level-severe)", bg: "var(--color-drop-level-severe-bg)" },
};
```

### Pattern 3: Recharts SVG 색상 CSS 변수화 (DESIGN-01/03)

**What:** Recharts의 `stroke`, `fill` JSX 속성에 `var(--color-...)` 참조 사용

SVG 속성은 CSS 변수를 직접 지원한다:
```tsx
// PriceHistoryChart.tsx — 전환 예시
// Before:
<Scatter fill="#059669" />
// After:
<Scatter fill="var(--color-semantic-rise)" />

// Before:
<Line stroke="#3B82F6" />
// After:
<Line stroke="var(--color-chart-jeonse)" />  // 새 CSS 변수 추가 필요

// Before:
<Line stroke="#F97316" strokeDasharray="5 5" />
// After:
<Line stroke="var(--color-chart-ratio)" strokeDasharray="5 5" />
```

**globals.css에 추가할 차트 전용 CSS 변수:**
```css
:root {
  --color-chart-sale: #059669;       /* 매매 추이선 */
  --color-chart-jeonse: #3B82F6;     /* 전세 추이선 */
  --color-chart-ratio: #F97316;      /* 전세가율선 */
  --color-chart-neutral: #9CA3AF;    /* 직거래 이전가, 점선 */
  --color-chart-index: #2B579A;      /* 클러스터 인덱스 */
}
[data-theme="dark"] {
  --color-chart-sale: #34d399;
  --color-chart-jeonse: #60a5fa;
  --color-chart-ratio: #fb923c;
  --color-chart-neutral: #6b7280;
  --color-chart-index: #5b8dd9;
}
```

### Pattern 4: global-error.tsx 처리

**What:** `global-error.tsx`는 ThemeProvider 바깥에서 렌더링되는 특수 파일이다. `<html>`, `<body>` 태그를 직접 포함하며 전체 CSS 로드가 보장되지 않는다.

**전략:** 이 파일의 하드코딩 색상은 **의도적 예외**로 처리한다. 에러 상황에서는 일관된 라이트 테마 표시가 안전하다. `// design-system-exception: global-error renders outside ThemeProvider` 주석을 추가해 의도를 명시한다.

### Pattern 5: 인라인 style → className 전환 기준

모든 `style={{ color: "var(--color-text-secondary)" }}` 패턴은 이미 CSS 변수 기반이므로 다크모드 동작은 하지만 Tailwind 유틸리티 클래스로 전환하면 더 일관성 있다.

**전환 우선순위:**
1. **필수 전환:** 하드코딩 hex color — `style={{ color: "#f59e0b" }}` → `className="text-amber-500"` 또는 CSS var
2. **권장 전환 (선택):** `style={{ color: "var(--color-text-secondary)" }}` → `className="t-text-secondary"`
3. **유지:** 동적 계산값(width %, maxWidth px 등) — className으로 표현 불가

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| dark: 유틸리티 커스텀 | JavaScript로 class 토글 | `@custom-variant dark` CSS 선언 | 1줄로 해결, 빌드타임 처리 |
| 다크모드 색상 감지 | window.matchMedia 추가 코드 | 기존 ThemeProvider + CSS 변수 | 이미 완전 구현됨 |
| 색상 토큰 관리 | 별도 design token 라이브러리 | globals.css CSS 변수 | 이미 완전한 체계 존재 |

**Key insight:** 이 프로젝트의 CSS 변수 체계와 ThemeProvider는 이미 완성도 높게 구현되어 있다. 코드 수정의 90%는 하드코딩 값을 기존 CSS 변수로 교체하는 단순 작업이다.

---

## Common Pitfalls

### Pitfall 1: Tailwind v4 dark: variant 동작 방식 오해
**What goes wrong:** `dark:text-white`가 `[data-theme="dark"]`에서 동작하지 않는다고 생각해 복잡한 JS 해결책을 만든다
**Why it happens:** Tailwind v4 기본 dark variant는 OS 설정(`prefers-color-scheme`) 기반이다
**How to avoid:** `@custom-variant dark` 선언으로 CSS attribute selector 기반으로 재정의
**Warning signs:** `dark:` 클래스를 추가해도 테마 전환 시 색상이 바뀌지 않음

### Pitfall 2: CSS 변수 fallback 값 의존
**What goes wrong:** `style={{ color: "var(--color-text-secondary, #475569)" }}` — fallback 값이 항상 라이트 모드 색상
**Why it happens:** 개발자가 안전망으로 fallback을 추가하지만 CSS 변수 실패 시 다크모드에서 틀린 색상이 나옴
**How to avoid:** CSS 변수 체계가 완전히 정의된 프로젝트에서는 fallback 제거. 기존 코드 중 `var(--color-x, #light-color)` 패턴 확인 및 정리

### Pitfall 3: Recharts SVG 색상 — CSS 변수 계산값 문제
**What goes wrong:** Recharts가 전달받은 색상값을 JavaScript 내부적으로 처리하는 경우 `var(--color-x)`가 파싱되지 않을 수 있다
**Why it happens:** Recharts 일부 내부 계산(activeDot hover 등)은 색상값을 직접 수정하는 경우가 있다
**How to avoid:** `stroke`, `fill`은 SVG 속성 → CSS 변수 직접 지원. `activeDot={{ fill: "var(...)" }}`도 동작 확인됨. 단, Recharts의 legend color swatch(내부 `<rect>`) 같은 경우는 CSS 변수 렌더링이 될 수도 안 될 수도 있다 — 확인 필요
**Warning signs:** 빌드는 성공하지만 차트에서 색상이 "var(--color-...)" 문자열로 표시됨 (MEDIUM confidence)

### Pitfall 4: `@theme inline` 블록과 CSS 변수 혼동
**What goes wrong:** `globals.css`의 `@theme inline` 블록 안에 선언한 변수를 Tailwind 유틸리티에서 사용하려 할 때 `[data-theme="dark"]` 오버라이드가 안 먹힘
**Why it happens:** `@theme inline` 블록은 Tailwind의 정적 테마 토큰 정의용이다. 런타임 테마 전환은 `:root` / `[data-theme="dark"]` CSS 변수로 해야 한다
**How to avoid:** 정적 브랜드 색상(brand-500 등) → `@theme inline`. 동적 시맨틱 색상(surface, text, semantic) → `:root` + `[data-theme="dark"]` 패턴 유지

---

## Code Examples

### @custom-variant dark 선언 (DESIGN-02)
```css
/* globals.css — @import "tailwindcss"; 다음 줄에 추가 */
@import "tailwindcss";
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));
```

### 인라인 style CSS var 패턴 전환 (DESIGN-01/03)
```tsx
// Before — 하드코딩
<p style={{ color: "#f59e0b" }}>하락</p>

// After — CSS 변수
<p style={{ color: "var(--color-drop-level-decline)" }}>하락</p>

// 또는 After — Tailwind utility (DESIGN-02 이후 dark: 동작)
<p className="text-amber-500 dark:text-amber-400">하락</p>
```

### DROP_LEVEL_CONFIG 중앙화 (DESIGN-04)
```typescript
// src/lib/constants/drop-level.ts
export const DROP_LEVEL_CONFIG: Record<string, {
  label: string;
  color: string;
  bg: string;
}> = {
  decline: {
    label: "하락",
    color: "var(--color-drop-level-decline)",
    bg: "var(--color-drop-level-decline-bg)",
  },
  crash: {
    label: "폭락",
    color: "var(--color-drop-level-crash)",
    bg: "var(--color-drop-level-crash-bg)",
  },
  severe: {
    label: "대폭락",
    color: "var(--color-drop-level-severe)",
    bg: "var(--color-drop-level-severe-bg)",
  },
};
```

### UserMenu.tsx 패턴 (올바른 예시 — 변경 불필요)
```typescript
// 이미 올바른 패턴 — fallback 포함 CSS var
style={{ background: "var(--color-surface-elevated, #e2e8f0)" }}
// → 단, fallback이 라이트 색상이므로 CSS var 실패 시 다크모드에서 틀림
// 이 정도는 허용 가능 (CSS var 실패는 극히 드문 경우)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind v3 `darkMode: 'class'` config | Tailwind v4 `@custom-variant dark` | Tailwind v4.0 | tailwind.config.ts 없음, CSS에서 선언 |
| tailwind.config.ts `darkMode: ['attribute', '[data-theme="dark"]']` | `@custom-variant` CSS 지시어 | Tailwind v4.0 | 설정 파일 불필요 |

**Deprecated:**
- `tailwind.config.ts`의 `darkMode` 옵션: Tailwind v4에서는 설정 파일이 없고 CSS에서 직접 선언
- `@tailwind base/components/utilities` 지시어: v4에서 `@import "tailwindcss"`로 대체됨

---

## File-Level Change Map

우선순위별 수정 대상:

### Wave 1 — CSS 기반 (빌드 검증 가능)

| 파일 | 변경 내용 | DESIGN-# |
|------|----------|---------|
| `src/app/globals.css` | `@custom-variant dark` 추가 (1줄) | DESIGN-02 |
| `src/app/globals.css` | drop-level CSS 변수 추가 (6개), chart CSS 변수 추가 (5개) | DESIGN-04 |
| `src/lib/constants/drop-level.ts` | DROP_LEVEL_CONFIG 중앙 모듈 생성 | DESIGN-04 |

### Wave 2 — 컴포넌트 스윕

| 파일 | 하드코딩 수 | 전환 방법 |
|------|------------|---------|
| `components/charts/PriceHistoryChart.tsx` | 10 | SVG attr → CSS var |
| `components/auth/LoginModal.tsx` | 10 | CSS var 또는 Tailwind class |
| `components/apt/TransactionTabs.tsx` | 9 | DROP_LEVEL_CONFIG import |
| `app/global-error.tsx` | 9 | 의도적 예외 처리 주석 추가 |
| `app/dam/AdminLayout.tsx` | 5 | CSS var 전환 |
| `components/ShareButtons.tsx` | 4 | CSS var 전환 |
| `components/home/RankingTabs.tsx` | 4 | DROP_LEVEL_CONFIG import |
| `components/charts/ClusterIndexChart.tsx` | 3 | CSS var 전환 |
| `components/auth/UserMenu.tsx` | 3 | CSS var (fallback 유지) |
| `components/apt/AptDetailClient.tsx` | 3 | CSS var 전환 |
| `app/today/page.tsx` | 3 | DROP_LEVEL_CONFIG import |
| 기타 (dam/content, dam/users 등) | 6 | CSS var 전환 |

---

## Environment Availability

Step 2.6: SKIPPED — 이 phase는 순수 CSS/TypeScript 코드 변경이며 외부 서비스 의존성 없음.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm run test` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DESIGN-01 | 하드코딩 hex 색상 0개 (global-error 예외) | grep audit | `grep -rn "color: \"#" src/ --include="*.tsx" \| grep -v "global-error\|opengraph\|cardnews"` | ✅ (shell) |
| DESIGN-02 | @custom-variant dark 선언 존재 | grep audit | `grep -n "@custom-variant dark" src/app/globals.css` | ✅ (shell) |
| DESIGN-03 | DROP_LEVEL_CONFIG 로컬 정의 0개 | grep audit | `grep -rn "DROP_LEVEL_CONFIG\s*=" src/ --include="*.tsx" \| grep -v "constants"` | ✅ (shell) |
| DESIGN-04 | CSS 변수 drop-level 존재 | grep audit | `grep -n "drop-level" src/app/globals.css` | ✅ (shell) |

**Note:** 이 phase의 검증은 단위 테스트보다 grep audit이 더 적합하다 — CSS 렌더링 올바름은 브라우저 시각 확인이 필요하다. Vitest 기존 테스트(format.test.ts 등)는 이 phase에서 변경되지 않으므로 통과 유지 확인만 필요.

### Wave 0 Gaps
- None — 기존 테스트 인프라가 이 phase를 커버하기에 충분. CSS/color 변경은 grep audit으로 검증.

---

## Open Questions

1. **Recharts activeDot CSS 변수 호환성**
   - What we know: SVG `stroke`, `fill` 속성은 CSS 변수 지원
   - What's unclear: Recharts 내부 JavaScript가 색상값을 수정/계산할 때 `var(--color-x)` 문자열이 파싱되는지
   - Recommendation: PriceHistoryChart에서 `stroke="var(...)"` 적용 후 브라우저에서 hover 동작 시각 확인. 문제 시 CSS 변수를 JS에서 `getComputedStyle(document.documentElement).getPropertyValue('--color-chart-sale')` 로 읽어 동적으로 전달

2. **LoginModal.tsx 처리 방식**
   - What we know: 10개의 하드코딩 hex, Google OAuth 버튼 스타일 포함 (Google 브랜드 컬러는 변경 금지)
   - What's unclear: Google 로그인 버튼의 `#333`, `#391B1B` 색상이 Google 브랜드 가이드라인 색상인지
   - Recommendation: Google 버튼 관련 색상 확인 후, 해당 색상은 의도적 예외 처리

---

## Sources

### Primary (HIGH confidence)
- 직접 코드 탐색: `src/app/globals.css` — CSS 변수 체계, `[data-theme="dark"]` 선언 완비 확인
- 직접 코드 탐색: `src/components/providers/ThemeProvider.tsx` — 테마 전환 메커니즘 확인
- 직접 코드 탐색: `package.json` — tailwindcss 4.2.2 설치 확인
- 직접 코드 탐색: DROP_LEVEL_CONFIG 3개 파일 중복 확인, 70개 hardcoded hex 계수

### Secondary (MEDIUM confidence)
- Tailwind v4 `@custom-variant` 문법: STATE.md에 "one-line fix" 로 기록됨, Tailwind v4 기능임을 알고 있음
- SVG CSS 변수 지원: W3C SVG spec + CSS Custom Properties Level 1 spec에서 SVG presentation attributes가 CSS 변수를 지원함을 확인

### Tertiary (LOW confidence)
- Recharts CSS 변수 호환성 엣지 케이스 — 단일 경험 기반

---

## Metadata

**Confidence breakdown:**
- DESIGN-02 (@custom-variant): HIGH — 코드 현황 직접 확인, Tailwind v4 기능
- DESIGN-01/03 (하드코딩 제거): HIGH — grep으로 정확한 파일/라인 확인
- DESIGN-04 (DROP_LEVEL_CONFIG): HIGH — 중복 위치 정확히 파악
- Recharts CSS var 호환: MEDIUM — 브라우저 확인 전까지

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (Tailwind v4 안정 버전, 빠른 변경 없음)
