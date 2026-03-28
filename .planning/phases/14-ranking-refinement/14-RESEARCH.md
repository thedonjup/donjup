# Phase 14: 랭킹 정교화 - Research

**Researched:** 2026-03-28
**Domain:** Next.js Server Component ranking pipeline — floor-price adjustment, anomalous-trade filtering, low-floor label rendering
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**RANK-01 — 변동률 고층 환산:**
- D-01: 홈 페이지 서버 컴포넌트(page.tsx)에서 랭킹 데이터 조회 후 저층(floor <= 3) 거래의 change_rate를 고층 환산으로 재계산
- D-02: Phase 10의 `adjustFloorPrice` 함수 재사용 — trade_price를 고층 환산 후 highest_price 대비 변동률 재산출
- D-03: 환산 후 변동률: `(adjustFloorPrice(trade_price, floor) - highest_price) / highest_price * 100`
- D-04: highest_price는 보정하지 않음 — 이미 해당 면적의 과거 최고가이므로 고층 기준
- D-05: DB의 change_rate 컬럼은 건드리지 않음 — 조회 시 오버라이드

**RANK-02 — 이상거래 자동 제외:**
- D-06: 홈 페이지 서버 컴포넌트에서 랭킹 데이터 조회 후 이상거래 필터링
- D-07: Phase 10의 `isDirectDeal` + `isDealSuspicious` 재사용
- D-08: 직거래 중 시세 대비 30% 이상 저가인 거래만 제외 (일반 직거래 유지)
- D-09: 필터링 후 랭킹 순서 재정렬 — 제외된 거래로 인한 순위 갭 없이

**RANK-03 — 저층 라벨 표시:**
- D-10: RankingTabs에서 floor <= 3인 거래에 "저층" 뱃지 표시
- D-11: 뱃지 스타일: 기존 drop_level 뱃지와 유사한 소형 둥근 뱃지, 회색 배경
- D-12: 변동률은 고층 환산값으로 표시 (D-01~D-03 적용 결과)
- D-13: Transaction 인터페이스에 floor 필드 추가 (현재 없음)

**데이터 흐름:**
- D-14: page.tsx에서 DB 조회 시 floor, deal_type 컬럼 추가 select
- D-15: price-normalization.ts에서 adjustFloorPrice, isDirectDeal, isDealSuspicious import
- D-16: 보정된 데이터를 RankingTabs/HeroSection에 전달 (기존 props 인터페이스 확장)

### Claude's Discretion
- 저층 뱃지의 정확한 색상/크기
- 신고가 랭킹에서 저층 보정 적용 여부 (폭락과 동일하게 적용 권장)
- 이상거래 필터링 후 빈 랭킹 시 fallback 표시
- new-highs 페이지도 동일 보정 적용할지 여부

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RANK-01 | 폭락/신고가 변동률을 층별 보정 후 가격 기준으로 산출한다 (저층 노이즈 제거) | `adjustFloorPrice` already exported from price-normalization.ts; recalculation formula confirmed via D-03 |
| RANK-02 | 이상거래(직거래 저가, 친족 거래 추정)를 랭킹 산정에서 자동 제외한다 | `isDirectDeal` + `isDealSuspicious` already exported; `isDealSuspicious` checks `tradePrice < medianPrice * 0.70` which maps to 30% below market |
| RANK-03 | 랭킹 리스트에서 저층 거래는 "저층" 라벨을 표시하되, 변동률은 고층 환산 기준으로 산출한다 | `Transaction` interface needs `floor` field added (currently absent); badge pattern from `DROP_LEVEL_CONFIG` is reusable |
</phase_requirements>

---

## Summary

Phase 14 is a pure query-layer + rendering enhancement. No DB schema changes, no new API routes. The work is entirely contained in three locations: `page.tsx` (server component — data enrichment post-query), `RankingTabs.tsx` (client component — interface extension + badge rendering), and optionally `new-highs/page.tsx`.

The key technical finding is that the homepage has **two code paths**: a fast path reading from `homepage_cache` (used most of the time) and a fallback direct-query path. The `homepage_cache` is populated by the `refresh-cache` cron job, which already selects `floor` and `deal_type` columns. Both paths land in the same post-processing location in `page.tsx`, so the enrichment functions need to run **after** the data is read from either path. The enrichment must handle `floor: null` defensively since `AptTransaction.floor` is `number | null`.

The `isDealSuspicious` function signature requires a `medianPrice` argument, but the ranking pipeline has no per-complex median available. The CONTEXT decision (D-08) says "시세 대비 30% 이상 저가" — which maps to the function's internal `tradePrice < medianPrice * 0.70` check. Without a precomputed median, the planner must decide on a proxy: either (a) use `highest_price * 0.70` as the floor-price proxy for suspicion detection, or (b) derive a simple median from the top-N list itself. Option (a) is simpler and has precedent in the existing change_rate computation.

**Primary recommendation:** Implement enrichment as a single pure helper function `applyRankingNormalization(txns)` in `page.tsx` (or a new `src/lib/ranking-normalization.ts`) that runs after cache/fallback read. Add `floor` to the `Transaction` interface. Render the "저층" badge in RankingTabs alongside the existing `drop_level` badge.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| price-normalization.ts | (internal) | adjustFloorPrice, isDirectDeal, isDealSuspicious | Phase 10 canonical module, all functions exported |
| React / Next.js App Router | (project version) | Server component data enrichment + client rendering | Existing architecture |
| TypeScript | (project version) | Interface extension (Transaction + floor) | Project standard |

### Supporting

No new external dependencies required for this phase.

**Installation:** None needed.

---

## Architecture Patterns

### Recommended Project Structure

No new files strictly required. One optional new file for separation of concerns:

```
src/lib/
└── ranking-normalization.ts   # optional extraction of enrichment logic
src/app/
└── page.tsx                   # enrichment applied post-cache-read
src/components/home/
└── RankingTabs.tsx            # Transaction interface + low-floor badge
src/app/new-highs/
└── page.tsx                   # optional: same filtering for new-highs list
```

### Pattern 1: Post-Cache Enrichment in Server Component

**What:** After reading `drops`/`highs` arrays from cache or direct query, run a synchronous transformation to (a) recompute `change_rate` for low-floor trades and (b) filter out suspicious deals.

**When to use:** Any time ranking data is assembled before passing to client components.

**Example:**

```typescript
// Applied after both cache and fallback paths in page.tsx
function applyRankingNormalization(txns: AptTransaction[]): AptTransaction[] {
  return txns
    .filter((t) => {
      // RANK-02: exclude suspicious direct deals
      // Proxy for median: use highest_price as reference (no per-complex median available here)
      if (t.deal_type === "직거래" && t.highest_price !== null) {
        const suspiciousThreshold = t.highest_price * 0.70;
        if (t.trade_price < suspiciousThreshold) return false;
      }
      return true;
    })
    .map((t) => {
      // RANK-01: recompute change_rate for low-floor trades
      if (t.floor !== null && t.floor <= 3 && t.highest_price !== null) {
        const adjustedPrice = adjustFloorPrice(t.trade_price, t.floor);
        const newRate = parseFloat(
          (((adjustedPrice - t.highest_price) / t.highest_price) * 100).toFixed(2)
        );
        return { ...t, change_rate: newRate };
      }
      return t;
    });
}
```

Note: the filtered array must be **re-sorted** by `change_rate` ascending (for drops) after filtering, since filtering removes items and leaves gaps that would misorder the rank list.

### Pattern 2: Transaction Interface Extension

**What:** Add `floor` field to the exported `Transaction` interface in `RankingTabs.tsx` so the client component can read it for badge rendering.

**When to use:** Required for RANK-03.

**Example:**

```typescript
// RankingTabs.tsx — extend existing interface
export interface Transaction {
  id: string;
  region_code: string;
  region_name: string;
  apt_name: string;
  size_sqm: number;
  floor?: number | null;        // ADD THIS
  trade_price: number;
  highest_price: number | null;
  change_rate: number | null;
  trade_date: string;
  is_new_high?: boolean;
  drop_level?: "normal" | "decline" | "crash" | "severe";
  property_type?: number;
}
```

### Pattern 3: Low-Floor Badge in RankingTabs

**What:** Render a small "저층" badge alongside the change_rate display when `t.floor` is defined and `<= 3`.

**When to use:** For drops and highs tabs (where change_rate is shown).

**Example:**

```typescript
{t.floor != null && t.floor <= 3 && (
  <span
    className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold"
    style={{
      backgroundColor: "rgba(107,114,128,0.12)",  // gray tint
      color: "#6b7280",
    }}
  >
    저층
  </span>
)}
```

This uses the same pattern as `DROP_LEVEL_CONFIG` badges (inline style with rgba background + colored text, rounded-full, px-1.5 py-0.5 text-[10px] font-bold).

### Anti-Patterns to Avoid

- **Modifying DB change_rate:** D-05 explicitly forbids this. Override only at query/render time.
- **Using filterTransactions() from price-normalization.ts for ranking:** That function is designed for chart timeseries and requires a `recentMedian` from a per-apartment dataset. Ranking lacks this data. Use a simpler direct filter.
- **Re-sorting after enrichment inside the cache path only:** Both paths (cache and fallback direct query) produce ranking arrays; the re-sort must happen after either path populates `drops`.
- **Calling applyRankingNormalization on `volume` and `recent` tabs:** These tabs don't display change_rate or drop_level, so normalization serves no purpose there. Apply only to `drops` and `highs`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Floor price adjustment factor | Custom multiplier | `adjustFloorPrice(tradePrice, floor)` from price-normalization.ts | Phase 10 canonical values — 1.1494/1.1111/1.0417 |
| Direct deal detection | String comparison inline | `isDirectDeal(dealType)` | Single source of truth for "직거래" enum |
| Badge styling | New CSS class | Inline style pattern from DROP_LEVEL_CONFIG | Consistent with existing badge vocabulary |

**Key insight:** All normalization math is already in price-normalization.ts. This phase is mostly about wiring those functions into the ranking data flow and adding one new field to the Transaction interface.

---

## Common Pitfalls

### Pitfall 1: Median Price Proxy for isDealSuspicious

**What goes wrong:** `isDealSuspicious(tradePrice, medianPrice, dealType)` requires a `medianPrice` argument. In the ranking context there is no per-complex rolling median available (unlike the chart context where all transactions for one apartment are loaded).

**Why it happens:** The function was designed for the chart detail page which has full transaction history for one complex. The home ranking page has at most 30 heterogeneous transactions across many complexes.

**How to avoid:** Use `highest_price` as the reference for suspicion detection: `trade_price < highest_price * 0.70`. This is a reasonable proxy because `highest_price` already represents a high-confidence market price for that complex+size. Alternatively, call `isDealSuspicious` with `highest_price` as the `medianPrice` argument — the function's logic is still sound.

**Warning signs:** If `isDealSuspicious` is called with `medianPrice = 0`, it will never return true (the function returns false when medianPrice is 0 effectively). Test with a known suspicious trade.

### Pitfall 2: Forgetting to Re-Sort After Filter

**What goes wrong:** After filtering out suspicious deals from `drops`, the array may have fewer than 10 items and the remaining items are no longer in `change_rate ASC` order relative to each other (they were already sorted, but items removed from the middle leave the order intact — actually the order IS preserved since filter maintains relative order). The issue is more subtle: `drops` is sliced to 10 from a pool of 30 in the cache. After filtering some of those 30, re-sorting ensures the best 10 remain.

**Why it happens:** `homepage_cache` stores 30 items per category (LIMIT 30 in refresh-cache query). `page.tsx` slices to 10 after `filterByType`. If enrichment happens after the slice, fewer than 10 items might remain. Enrichment must happen **before** the `.slice(0, 10)` call, on the full 30-item pool.

**How to avoid:** Apply `applyRankingNormalization` to the full `allDrops` / `allHighs` arrays before the `filterByType(...).slice(0, 10)` pipeline.

**Warning signs:** Ranking shows 6-7 items instead of 10 after filter.

### Pitfall 3: floor is null in AptTransaction

**What goes wrong:** `AptTransaction.floor` is typed `number | null`. The cache stores raw DB rows. If floor is null, `adjustFloorPrice(trade_price, null)` would need a null-guard (the function checks `FLOOR_ADJUSTMENT_FACTORS[floor]` which returns `undefined` for null/0, so it returns `tradePrice` unchanged — safe but only if null is handled as non-low-floor).

**Why it happens:** Some transactions genuinely have null floor in the DB. The `LOW_FLOOR_MAX = 3` check `t.floor <= 3` would evaluate `null <= 3` as false in JavaScript (null coerces to 0, so `0 <= 3` is true — this is a trap).

**How to avoid:** Guard explicitly: `t.floor !== null && t.floor > 0 && t.floor <= 3` for both enrichment and badge rendering. Never rely on implicit null coercion with numeric comparisons.

**Warning signs:** "저층" badge appearing on transactions where floor is not actually low.

### Pitfall 4: Transaction Cast in page.tsx

**What goes wrong:** `page.tsx` casts `drops as Transaction[]` directly. Once `floor` is added to `Transaction`, the cast will work only if the DB query/cache actually returns `floor`. The `txFields` constant in `refresh-cache/route.ts` already includes `floor`, so the cache path is safe. The direct-query fallback in `page.tsx` also already includes `floor` in `txFields`. Both paths are safe.

**Why it happens:** If someone removes `floor` from the select fields, the cast silently succeeds with `floor: undefined`, and the null guard in enrichment would pass incorrectly.

**How to avoid:** Keep `floor` in `txFields` in both `page.tsx` (fallback path) and `refresh-cache/route.ts`.

### Pitfall 5: HeroSection Does Not Need Floor

**What goes wrong:** HeroSection displays the top drop (`drops[0]`). It renders `drop_level` and `change_rate` from `heroTx`. After enrichment, `change_rate` on `heroTx` is already the floor-adjusted value (enrichment runs before hero assignment). HeroSection's local `Transaction` interface does not have `floor` — this is fine since HeroSection does not render a "저층" badge.

**Why it happens:** HeroSection defines its own local `Transaction` interface separate from RankingTabs. No change to HeroSection is needed.

**How to avoid:** Do not add `floor` to HeroSection's interface unnecessarily. The adjusted `change_rate` is transparently passed through the existing `change_rate` prop.

---

## Code Examples

### Full Enrichment Function (page.tsx or ranking-normalization.ts)

```typescript
// Source: internal — based on price-normalization.ts API + D-01..D-09
import { adjustFloorPrice, isDirectDeal, LOW_FLOOR_MAX } from "@/lib/price-normalization";
import type { AptTransaction } from "@/types/db";

export function applyRankingNormalization(txns: AptTransaction[]): AptTransaction[] {
  const filtered = txns.filter((t) => {
    // RANK-02: exclude suspicious direct deals
    if (isDirectDeal(t.deal_type) && t.highest_price !== null && t.highest_price > 0) {
      if (t.trade_price < t.highest_price * 0.70) return false;
    }
    return true;
  });

  return filtered.map((t) => {
    // RANK-01: recompute change_rate for low-floor trades
    if (
      t.floor !== null &&
      t.floor > 0 &&
      t.floor <= LOW_FLOOR_MAX &&
      t.highest_price !== null &&
      t.highest_price > 0
    ) {
      const adjustedPrice = adjustFloorPrice(t.trade_price, t.floor);
      const newRate = parseFloat(
        (((adjustedPrice - t.highest_price) / t.highest_price) * 100).toFixed(2)
      );
      return { ...t, change_rate: newRate };
    }
    return t;
  });
}
```

### Integration Point in page.tsx (cache path)

```typescript
// Apply BEFORE filterByType().slice(0, 10)
const allDrops = applyRankingNormalization(
  (typeof cache.drops === "string" ? JSON.parse(cache.drops) : cache.drops) ?? []
).sort((a, b) => (a.change_rate ?? 0) - (b.change_rate ?? 0));

const allHighs = applyRankingNormalization(
  (typeof cache.highs === "string" ? JSON.parse(cache.highs) : cache.highs) ?? []
);

drops = filterByType(allDrops, validType).slice(0, 10);
highs = filterByType(allHighs, validType).slice(0, 10);
```

### Low-Floor Badge in RankingTabs (RANK-03)

```typescript
// Place after the drop_level badge in the change_rate div
{(isDrop || isHigh) && t.floor != null && t.floor > 0 && t.floor <= 3 && (
  <span
    className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold"
    style={{
      backgroundColor: "rgba(107,114,128,0.12)",
      color: "#6b7280",
    }}
  >
    저층
  </span>
)}
```

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely code changes to existing files, no external tools or services required.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Not configured — no test infrastructure in project (Out of Scope per REQUIREMENTS.md) |
| Config file | None found |
| Quick run command | n/a |
| Full suite command | n/a |

Per REQUIREMENTS.md: "테스트 인프라 — 별도 마일스톤". No automated test infrastructure exists. Validation is manual.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RANK-01 | Low-floor change_rate recalculated to adjusted equivalent | manual | n/a | ❌ no test infra |
| RANK-02 | Suspicious direct deals absent from ranking | manual | n/a | ❌ no test infra |
| RANK-03 | "저층" badge visible on floor ≤ 3 items, rate shows adjusted value | manual | n/a | ❌ no test infra |

### Sampling Rate

- Per task commit: Visual inspection of ranking list on local dev server
- Per wave merge: Full page load + verify: (1) at least one 저층 badge visible in drops tab if low-floor data exists, (2) no known suspicious trades in top 10
- Phase gate: Manual review of live donjup.com ranking after deployment

### Wave 0 Gaps

None — no test infrastructure to set up (out of project scope).

---

## Key Technical Findings

### homepage_cache Already Has floor and deal_type

The `refresh-cache` cron (`src/app/api/cron/refresh-cache/route.ts`) already selects `floor` and `deal_type` in `txFields` (line 17-19). The `homepage_cache` table stores these fields in its JSON blobs. The cache path is safe to use immediately — no cron change needed.

### Direct-Query Fallback Also Already Has Both Fields

`page.tsx` line 92 defines `txFields` which includes `floor` and `deal_type`. Both code paths have the required data.

### Cache Stores 30, Page Shows 10

`refresh-cache` queries `LIMIT 30` for drops and highs. `page.tsx` slices to 10 after `filterByType`. The enrichment must operate on the full 30-item pool to ensure the final 10 shown are the best post-normalization results. This is the most important ordering constraint in the implementation.

### isDealSuspicious Signature Mismatch

The exported function signature is `isDealSuspicious(tradePrice, medianPrice, dealType)`. In the ranking context, use `highest_price` as the `medianPrice` argument — this is a deliberate and documented choice, not a bug.

### new-highs/page.tsx Currently Has No change_rate or floor Fields

`NewHighTransaction` interface (new-highs/page.tsx) does not include `change_rate`, `floor`, or `highest_price`. The page does not display change_rate. Per Claude's Discretion, applying normalization here is optional. If applied, it would only affect the suspicious-deal filter (direct deals with trade_price < highest_price * 0.70 could be removed). This is low-value without change_rate display and should be deferred unless the user explicitly requests it.

### drop_level Recalculation Not Required

After `change_rate` is overridden by enrichment, `drop_level` (stored in DB) may be stale relative to the new computed `change_rate`. Example: a floor-1 trade stored as `decline` (−10%) becomes `crash` (−17%) after adjustment. The decision (D-05) says DB columns are not touched, but the planner should decide whether to also recompute `drop_level` in-memory to keep the badge consistent. This is a minor Claude's Discretion item — recommend yes, compute `drop_level` locally to match adjusted `change_rate`.

---

## Open Questions

1. **drop_level consistency after change_rate override**
   - What we know: DB `drop_level` is based on unadjusted `change_rate`. After enrichment, `change_rate` is overridden but `drop_level` is not.
   - What's unclear: Should the "폭락"/"대폭락" badge reflect the adjusted rate or the stored rate?
   - Recommendation: Recompute `drop_level` in-memory using the same `calcDropLevel` thresholds (−10/−15/−25) applied to the adjusted `change_rate`. Implement a local `calcDropLevel` helper or extract from fetch-transactions.

2. **Highs ranking: floor adjustment direction**
   - What we know: For drops, adjusting low-floor trade_price upward makes change_rate less negative (closer to 0), which may move a 저층 trade down the drop ranking — correct behavior.
   - What's unclear: For highs (`is_new_high = true`), the page shows them sorted by `trade_date DESC`, not by change_rate. Floor adjustment doesn't affect ordering. The "저층" badge still applies per D-10/D-12.
   - Recommendation: Apply the same enrichment to highs (filter suspicious, adjust change_rate display) since the badge is expected to appear there per D-12.

3. **Fallback when enrichment empties a ranking**
   - What we know: If all 30 cached drops are suspicious (edge case), `applyRankingNormalization` would return 0 items.
   - What's unclear: Claude's Discretion item — what to show.
   - Recommendation: Existing fallback in RankingTabs (`"데이터 수집 중입니다"`) already handles empty arrays gracefully. No new fallback UI needed.

---

## Sources

### Primary (HIGH confidence)

- Source code inspection: `src/lib/price-normalization.ts` — confirmed function signatures, LOW_FLOOR_MAX=3, FLOOR_ADJUSTMENT_FACTORS
- Source code inspection: `src/app/page.tsx` — confirmed data flow, txFields, cache path, filterByType, slice(0,10) pipeline
- Source code inspection: `src/components/home/RankingTabs.tsx` — confirmed Transaction interface (floor absent), DROP_LEVEL_CONFIG badge pattern
- Source code inspection: `src/app/api/cron/refresh-cache/route.ts` — confirmed LIMIT 30, floor+deal_type in txFields
- Source code inspection: `src/types/db.ts` — confirmed AptTransaction.floor is `number | null`
- Source code inspection: `src/app/new-highs/page.tsx` — confirmed no change_rate/floor in NewHighTransaction
- Source code inspection: `docs/10-crash-criteria-v2.md` — confirmed drop_level thresholds (−10/−15/−25)
- Context file: `14-CONTEXT.md` — all locked decisions D-01 through D-16

### Secondary (MEDIUM confidence)

None — all findings are from direct code inspection (HIGH).

### Tertiary (LOW confidence)

None.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all reuse Phase 10 functions, verified by reading source
- Architecture: HIGH — data flow traced end-to-end through both cache and fallback paths
- Pitfalls: HIGH — null handling, ordering, and median proxy issues identified from code inspection

**Research date:** 2026-03-28
**Valid until:** Stable for 30 days (no external dependencies; purely internal code)
