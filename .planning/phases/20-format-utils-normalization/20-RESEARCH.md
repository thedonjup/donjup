# Phase 20: 포맷 유틸 중앙화 + 데이터 표현 정규화 - Research

**Researched:** 2026-03-31
**Domain:** TypeScript utility consolidation / pure refactor (no external libraries)
**Confidence:** HIGH

## Summary

Phase 20 is a pure refactor with zero runtime risk. The codebase already has `src/lib/format.ts` with `formatPrice`, `sqmToPyeong`, `formatSizeWithPyeong`, and `formatKrw`. The problem is that 8+ files define their own local copies of these exact functions instead of importing from the central module.

The audit found: 4 independent `makeSlug` copies (today, new-highs, themes/[slug], RankingTabs), 3 local `formatPrice` copies (PriceHistoryChart, opengraph-image, rank-item.tsx), 1 local `formatPrice` with a **different unit** (generate-seeding uses 원 not 만원 — critical), 3+ local `sqmToPyeong` copies (AptDetailClient, TransactionTabs, rent/page), 1 local `formatPriceShort` (AptDetailClient inner function), 2 local `formatDate` copies (dam/users and AptNews, with different logic), and 1 local `makeAptSlug` (rent/page).

No new npm packages are needed. The deliverable is: expand `src/lib/format.ts` with missing exports (`formatPriceShort`, `formatArea`, `formatNullable`, `formatDateShort`, `formatPriceAxis`), then replace all local definitions with imports.

**Primary recommendation:** Expand `src/lib/format.ts` first, then do a file-by-file sweep replacing every local definition. The generate-seeding `formatPrice` uses 원-unit input — it must use the existing `formatKrw` (already in format.ts), not `formatPrice`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DATA-01 | formatPrice 단일 함수 통일, 축약형은 formatPriceShort 명확히 분리 | `formatPriceShort` is locally defined in AptDetailClient — must be extracted to format.ts |
| DATA-02 | null/빈값 표시 전체 페이지에서 "-" 통일 | Many call sites already use `{value \|\| "-"}` or ternary; need `formatNullable` helper + consistent adoption |
| DATA-03 | 면적 표시 모든 페이지에서 "㎡ (평)" 병기 형식 통일 | `formatSizeWithPyeong` exists but is not used consistently; format also inconsistent (parentheses vs no parentheses) |
| DATA-04 | 포맷 유틸 함수 중복 없이 단일 모듈 관리 | 8+ files with local duplicates identified below |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | (already installed) | Type-safe format functions | Project standard |
| Vitest | (already installed) | Unit tests for format functions | Established in Phase 16 |

No new packages required. This is a pure internal refactor.

**Installation:** None needed.

---

## Architecture Patterns

### Recommended Project Structure
```
src/lib/
├── format.ts        # ALL formatting — expand this file
├── apt-url.ts       # makeSlug lives here (Phase 22 dependency, but stub in Phase 20)
└── ...
```

> Note: `makeSlug` is technically DATA-04 scope (duplicate util consolidation) but Phase 22 (URL-03) requires `src/lib/apt-url.ts` as the canonical location. In Phase 20, extract `makeSlug` to `src/lib/format.ts` (or directly to `src/lib/apt-url.ts` — either works, but `apt-url.ts` is the Phase 22 target). Planner should decide: extract directly to `apt-url.ts` now to avoid a second move in Phase 22.

### Pattern 1: Central format module — add new exports
**What:** `src/lib/format.ts` gets new exports that cover all missing cases.
**When to use:** Before touching any call site — expand first, then replace.

```typescript
// src/lib/format.ts additions needed:

/** 축약형: 3.2억, 8,500만 */
export function formatPriceShort(v: number): string {
  if (v >= 10000) {
    const eok = Math.floor(v / 10000);
    const rest = Math.round((v % 10000) / 1000) * 1000;
    return rest > 0 ? `${eok}.${(rest / 1000).toFixed(0)}억` : `${eok}억`;
  }
  return `${v.toLocaleString()}만`;
}

/** Y축 레이블용 축약형: "3.2억", "8,500만" */
export function formatPriceAxis(v: number): string {
  if (v >= 10000) {
    return `${(v / 10000).toFixed(v % 10000 === 0 ? 0 : 1)}억`;
  }
  return `${v.toLocaleString()}만`;
}

/** null/undefined/0/빈문자열 → "-" */
export function formatNullable(v: string | number | null | undefined, fallback = "-"): string {
  if (v === null || v === undefined || v === "" || v === 0) return fallback;
  return String(v);
}

/** 면적 병기: "84.93㎡ (25.7평)" */
export function formatArea(sqm: number): string {
  const pyeong = Math.round(sqm / 3.3058 * 10) / 10;
  return `${sqm}㎡ (${pyeong}평)`;
}

/** ISO 날짜 문자열 → "YYYY-MM-DD" */
export function formatDateKo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return dateStr;
  }
}
```

### Pattern 2: makeSlug extraction
**What:** Extract to `src/lib/apt-url.ts` (creates the file Phase 22 needs).
**When to use:** During Phase 20 DATA-04 sweep.

```typescript
// src/lib/apt-url.ts (new file)
export function makeSlug(regionCode: string, aptName: string): string {
  return `${regionCode}-${aptName
    .replace(/[^가-힣a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()}`;
}
```

All 4+ files with local `makeSlug` or `makeAptSlug` import from here.

### Anti-Patterns to Avoid
- **Don't rename `formatSizeWithPyeong` to `formatArea`**: The existing function outputs `${sqm}㎡ (${pyeong}평)` which matches the target format. Rename is fine, but must update all import sites.
- **Don't touch generate-seeding's formatPrice without reading the unit**: It takes 원 (not 만원). The correct replacement is `formatKrw` which is already in `format.ts`.
- **Don't use `formatNullable` for all zero values**: `monthly_rent === 0` semantically means "no monthly rent" → "-" is correct. But `trade_price === 0` is a data error, not a legitimate null. Scope: replace `{value || "-"}` patterns where data absence is the cause.
- **Don't change chart tooltip logic**: `formatDateLabel` in PriceHistoryChart returns "MM-DD" slice — this is chart-specific, NOT a general date formatter. Keep it local or add as a named export with a clear name (`formatChartDate`).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 평 변환 | Custom sqmToPyeong in each file | `sqmToPyeong` from `src/lib/format.ts` | Already exists, already tested |
| null 표시 | Ternary `{v ? v : "-"}` scattered everywhere | `formatNullable(v)` | Centralizes the fallback logic |
| 축약 가격 | Local formatPriceShort in AptDetailClient | `formatPriceShort` from `src/lib/format.ts` | Same logic, should be shared |

---

## Complete Duplicate Inventory

This is the definitive list of files that need changes. Planner should create one task per file or group logically.

### Local `formatPrice` duplicates (using 만원 unit — matches central)
| File | Line | Action |
|------|------|--------|
| `src/components/charts/PriceHistoryChart.tsx` | 50-57 | Remove local, import from `@/lib/format` |
| `src/app/apt/[region]/[slug]/opengraph-image.tsx` | 11-18 | Remove local, import from `@/lib/format` |
| `src/lib/cardnews/templates/rank-item.tsx` | 9-16 | Remove local, import from `@/lib/format` |
| `src/app/api/cron/generate-seeding/route.ts` | 39-45 | **DIFFERENT UNIT (원, not 만원)** — replace with `formatKrw` from `@/lib/format` |

### Local `sqmToPyeong` duplicates
| File | Line | Signature | Action |
|------|------|-----------|--------|
| `src/components/apt/AptDetailClient.tsx` | 21 | `(sqm) => number` | Remove, import from `@/lib/format` |
| `src/components/apt/TransactionTabs.tsx` | 17 | `(sqm) => string` (toFixed(0)) | Normalize to number version, use `sqmToPyeong` |
| `src/app/rent/page.tsx` | 41 | `(sqm) => string` (toFixed(0)) | Same — use `sqmToPyeong` from format.ts |
| `src/components/charts/PriceHistoryChart.tsx` | 59 | `(sqm) => number` (no decimal) | Remove, import from `@/lib/format` |

> Note: TransactionTabs and rent/page use `(sqm / 3.3058).toFixed(0)` — rounds differently than `Math.round(sqm / 3.3058 * 10) / 10`. The central function returns a number with 1 decimal. Callers that want integer string should do `Math.round(sqmToPyeong(sqm)).toString()`. The planner must handle this call site difference explicitly.

### Local `formatPriceShort`
| File | Line | Action |
|------|------|--------|
| `src/components/apt/AptDetailClient.tsx` | 189-196 | Remove inner function, import `formatPriceShort` from `@/lib/format` |

### Local `makeSlug` / `makeAptSlug`
| File | Line | Name | Action |
|------|------|------|--------|
| `src/app/today/page.tsx` | 41 | `makeSlug` | Remove, import from `@/lib/apt-url` |
| `src/app/new-highs/page.tsx` | 32 | `makeSlug` | Remove, import from `@/lib/apt-url` |
| `src/app/themes/[slug]/page.tsx` | 118 | `makeSlug` | Remove, import from `@/lib/apt-url` |
| `src/components/home/RankingTabs.tsx` | 73 | `makeSlug` | Remove, import from `@/lib/apt-url` |
| `src/app/rent/page.tsx` | 46 | `makeAptSlug` | Remove, import `makeSlug` from `@/lib/apt-url` |

> All 5 implementations are identical. The `makeAptSlug` in rent/page is the same logic with a different name.

### Local `formatDate` duplicates
| File | Line | Logic | Action |
|------|------|-------|--------|
| `src/app/dam/users/page.tsx` | 235 | ISO→YYYY-MM-DD | Replace with `formatDateKo` from `@/lib/format` |
| `src/components/apt/AptNews.tsx` | 117 | ISO→relative time (different!) | **KEEP LOCAL** — relative time logic is context-specific |

### Local `formatPriceAxis` (chart-specific)
| File | Line | Action |
|------|------|--------|
| `src/components/charts/PriceHistoryChart.tsx` | 63-68 | Extract to `formatPriceAxis` in `@/lib/format` OR keep local (chart-only) |

> The planner can choose: if DATA-04 requires zero duplicate definitions, extract. If only "format functions" applies, keep this chart helper local. Recommendation: extract to `format.ts` as `formatPriceAxis` since it uses the same 억/만 logic.

### `formatArea` adoption (DATA-03)
The existing `formatSizeWithPyeong` in `format.ts` outputs `${sqm}㎡ (${sqmToPyeong(sqm)}평)` but `sqmToPyeong` returns 1 decimal. The target format is `"84.93㎡ (25.7평)"`. This already matches — the issue is call sites don't use it.

Files that display area without the standard format:
- `src/app/rent/page.tsx` — `{sizeSqm}㎡({sqmToPyeong(sizeSqm)}평)` (no space before parenthesis)
- `src/components/apt/TransactionTabs.tsx` — `${sqmToPyeong(sqm)}평` (no ㎡)
- `src/app/new-highs/page.tsx` — `{sqmToPyeong(tx.size_sqm)}평` (no ㎡)
- `src/app/today/page.tsx` — `{sqmToPyeong(tx.size_sqm)}평` (no ㎡)

> Some display contexts only show 평 (e.g., compact mobile cards). DATA-03 says "면적이 있는 모든 페이지에서" — the planner must determine if chart size labels (compact) are excluded from the "㎡ (평)" requirement. Recommendation: apply full format to static labels, keep compact "N평" for chart dots/chips where space is limited.

---

## Common Pitfalls

### Pitfall 1: generate-seeding 원/만원 unit mismatch
**What goes wrong:** Replacing `formatPrice(won)` in generate-seeding with `import { formatPrice } from '@/lib/format'` will produce incorrect output. The central `formatPrice` expects 만원 input; generate-seeding passes 원 values.
**Why it happens:** The local function is named the same but operates on a different unit (원 vs 만원).
**How to avoid:** Use `formatKrw` (already in format.ts) for generate-seeding, not `formatPrice`.
**Warning signs:** If output shows "0억" or tiny numbers, the wrong function was used.

### Pitfall 2: sqmToPyeong precision mismatch breaking display
**What goes wrong:** TransactionTabs and rent/page use `(sqm / 3.3058).toFixed(0)` returning a string integer. The central `sqmToPyeong` returns a float with 1 decimal. If callers expect a string, TypeScript will catch it — if they coerce, decimal appears.
**Why it happens:** Three different implementations with different return types (number vs string, different rounding).
**How to avoid:** Update call sites to `Math.round(sqmToPyeong(sqm))` where integer display is needed, or add a `sqmToPyeongInt(sqm): number` export.

### Pitfall 3: AptNews formatDate has relative-time logic — do not replace
**What goes wrong:** AptNews `formatDate` returns "2시간 전" / "3일 전" etc. — relative time. dam/users uses YYYY-MM-DD absolute. They are both called `formatDate` locally but have completely different behavior.
**Why it happens:** Same function name, different logic.
**How to avoid:** Only replace dam/users version. Leave AptNews local or rename its export to `formatRelativeDate`.

### Pitfall 4: formatSizeWithPyeong vs formatArea naming
**What goes wrong:** `formatSizeWithPyeong` already exists in `format.ts`. If the planner adds `formatArea` as a new separate function, there will be two functions doing the same thing.
**How to avoid:** Either rename `formatSizeWithPyeong` → `formatArea` (update all existing import sites) or add `export const formatArea = formatSizeWithPyeong` alias. Recommendation: use alias to avoid cascading rename.

### Pitfall 5: `"use client"` files importing from `format.ts`
**What goes wrong:** `format.ts` has no `"use client"` directive. Client components importing from it is fine — pure functions have no server/client boundary issue.
**Why it matters:** AptDetailClient and PriceHistoryChart are client components. They can import from `format.ts` without issue. No action needed.

---

## Code Examples

### Verified: existing `format.ts` exports
```typescript
// Source: src/lib/format.ts (verified 2026-03-31)
export function formatPrice(priceInManWon: number): string  // 만원 input
export function formatKrw(won: number): string              // 원 input
export function sqmToPyeong(sqm: number): number            // returns float
export function formatSizeWithPyeong(sqm: number): string   // "84.93㎡ (25.7평)"
export const RATE_LABELS: Record<string, string>
export const RATE_DESCRIPTIONS: Record<string, string>
export const RATE_ORDER: string[]
```

### New exports to add
```typescript
// Add to src/lib/format.ts
export function formatPriceShort(v: number): string        // "3.2억", "8,500만"
export function formatPriceAxis(v: number): string         // "3.2억" (chart Y axis)
export function formatNullable(v: string | number | null | undefined, fallback?: string): string
export function formatArea(sqm: number): string            // alias or rename of formatSizeWithPyeong
export function formatDateKo(dateStr: string): string      // "YYYY-MM-DD"
```

### New file to create
```typescript
// src/lib/apt-url.ts
export function makeSlug(regionCode: string, aptName: string): string
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Local formatPrice in each file | Import from @/lib/format | Phase 2 (partial) | Phase 2 removed some duplicates but missed several |
| No central area format | formatSizeWithPyeong in format.ts | Phase 2 | Exists but underused |
| No formatPriceShort | Local inner function in AptDetailClient | Never centralized | Need to extract |

**Deprecated/outdated:**
- Local `makeSlug` in 5 files: replace with `@/lib/apt-url`
- Local `formatPrice` in 4 files: replace with `@/lib/format` (verify unit)
- `formatSizeWithPyeong`: keep but alias as `formatArea` for DATA-03 compliance

---

## Open Questions

1. **Should `makeSlug` go to `apt-url.ts` or stay in `format.ts`?**
   - What we know: Phase 22 (URL-03) explicitly targets `src/lib/apt-url.ts` as the canonical location
   - What's unclear: Does creating `apt-url.ts` in Phase 20 cause any Phase 22 conflict?
   - Recommendation: Create `apt-url.ts` now — it's the final destination, avoids double-move

2. **Compact area labels (chart dots, mobile chips) — require "㎡ (평)" format?**
   - What we know: DATA-03 says "면적이 있는 모든 페이지에서" but chart dot tooltips show "N평" for space reasons
   - Recommendation: Apply full format to static page labels; compact "N평" acceptable in chart tooltips and mobile chips with explicit comment

3. **`formatNullable` — should 0 be treated as null?**
   - What we know: `monthly_rent === 0` should display "-", but `trade_price === 0` is a data error
   - Recommendation: Default to treating 0 as nullable, but document the behavior. Call sites for monthly_rent already do `r.monthly_rent > 0 ? formatPrice(r.monthly_rent) : "-"` pattern.

---

## Environment Availability

Step 2.6: SKIPPED — pure code refactor, no external dependencies. Vitest already installed and verified (`npm test` runs `vitest run`).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (verified in vitest.config.ts) |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-01 | `formatPrice(32000)` → "3억 2,000만", `formatPriceShort(32000)` → "3.2억" | unit | `npm test -- tests/unit/format.test.ts` | ❌ Wave 0 |
| DATA-02 | `formatNullable(null)` → "-", `formatNullable(0)` → "-", `formatNullable("value")` → "value" | unit | `npm test -- tests/unit/format.test.ts` | ❌ Wave 0 |
| DATA-03 | `formatArea(84.93)` → "84.93㎡ (25.7평)" | unit | `npm test -- tests/unit/format.test.ts` | ❌ Wave 0 |
| DATA-04 | No local `formatPrice`/`sqmToPyeong` definitions outside `src/lib/format.ts` | grep assertion (manual) | `grep -r "function formatPrice" src/ --include="*.ts" --include="*.tsx"` outputs only `src/lib/format.ts:` | manual |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/format.test.ts` — covers DATA-01, DATA-02, DATA-03 (new format function unit tests)

---

## Project Constraints (from CLAUDE.md)

- `import { db } from '@/lib/db'` — not relevant for this phase (no DB calls in format utils)
- `ssl: { rejectUnauthorized: false }` — not relevant (no DB)
- Service worker cache rules — not relevant
- **Coding conventions:** camelCase for functions, no unused imports, no hardcoded values
- **No confirmation questions** for non-destructive operations — proceed directly
- **Testing:** new functions require unit tests (DATA-01, DATA-02, DATA-03 need `tests/unit/format.test.ts`)

---

## Sources

### Primary (HIGH confidence)
- Direct codebase audit (`src/lib/format.ts`, 31 files grep) — verified 2026-03-31
- `vitest.config.ts` — test infra confirmed
- `package.json` scripts — `npm test` runs `vitest run`

### Secondary (MEDIUM confidence)
- Project ROADMAP.md — Phase 20 goal and success criteria
- Project REQUIREMENTS.md — DATA-01 through DATA-04 definitions
- Project STATE.md — Phase 20 context and constraints

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, pure refactor
- Architecture: HIGH — all files directly audited, exact line numbers documented
- Pitfalls: HIGH — unit mismatch in generate-seeding verified by direct code read

**Research date:** 2026-03-31
**Valid until:** Until next code change to src/lib/format.ts or affected files (stable)
