---
phase: 14-ranking-refinement
plan: "01"
subsystem: homepage-ranking
tags: [ranking, normalization, floor-adjustment, direct-deal-filter, badge]
dependency_graph:
  requires: [price-normalization.ts, AptTransaction type, homepage_cache]
  provides: [applyRankingNormalization, low-floor badge rendering]
  affects: [homepage drops/highs ranking display, RankingTabs component]
tech_stack:
  added: []
  patterns: [server-side enrichment before client render, inline normalization without DB mutation]
key_files:
  created: []
  modified:
    - src/app/page.tsx
    - src/components/home/RankingTabs.tsx
decisions:
  - "Use highest_price as median proxy for suspicious direct deal detection (no per-complex median available in ranking context)"
  - "Re-sort drops by change_rate ASC after normalization so adjusted rankings reflect true severity order"
  - "Badge rendered inside (isDrop || isHigh) block — volume and recent tabs never see the low-floor badge"
metrics:
  duration: "~8 minutes"
  completed: "2026-03-28"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
---

# Phase 14 Plan 01: Ranking Normalization + Low-Floor Badge Summary

## One-liner

Floor-price adjustment and suspicious-deal filtering applied server-side to homepage drops/highs ranking, with gray "저층" badge rendered in RankingTabs for floor 1-3 transactions.

## What Was Built

### Task 1 — Server-side ranking normalization (page.tsx)

Added three pieces to `src/app/page.tsx`:

1. **Import** `adjustFloorPrice`, `isDirectDeal`, `LOW_FLOOR_MAX` from `@/lib/price-normalization`.

2. **`calcDropLevel` helper** — local duplicate of the cron route's function (not exported there); maps adjusted `change_rate` to `"normal" | "decline" | "crash" | "severe"`.

3. **`applyRankingNormalization(txns)`** — two-pass enrichment:
   - **Filter pass (RANK-02)**: removes direct deals where `trade_price < highest_price * 0.70` (suspicious low-ball deals that distort rankings).
   - **Map pass (RANK-01)**: for floors 1-3 with a valid `highest_price`, computes `adjustedPrice = adjustFloorPrice(trade_price, floor)`, recalculates `change_rate` against `highest_price`, and overwrites `drop_level` via `calcDropLevel`.

4. **Cache path wiring**: normalization applied to the full pool (up to 30 items from cache) before `filterByType().slice(0, 10)`. Drops re-sorted by `change_rate ASC` after normalization so the ordering reflects adjusted rates.

5. **Fallback path wiring**: same normalization applied to direct DB query results before `slice(0, 10)`.

6. `volume` and `recent` arrays are **not** touched — they don't use `change_rate`/`drop_level`.

### Task 2 — Transaction interface + low-floor badge (RankingTabs.tsx)

1. **Extended `Transaction` interface** with `floor?: number | null` and `deal_type?: string | null`.

2. **"저층" badge** rendered inside the `(isDrop || isHigh)` block, adjacent to the `drop_level` badge. Conditions: `t.floor != null && t.floor > 0 && t.floor <= 3`. Gray styling: `bg: rgba(107,114,128,0.12)`, `color: #6b7280` — consistent with `DROP_LEVEL_CONFIG` badge pattern but visually distinct from severity badges. Badge does **not** appear in volume or recent tabs.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| 1 — server-side normalization | 8f3aeb0 | src/app/page.tsx |
| 2 — badge rendering | 5632868 | src/components/home/RankingTabs.tsx |

## Verification

- `npx next build` passes with no TypeScript errors after both tasks.
- `applyRankingNormalization` exists in page.tsx, both cache and fallback paths call it.
- `drops` re-sorted by `change_rate ASC` after normalization.
- `Transaction.floor` and `Transaction.deal_type` added to interface.
- "저층" badge conditional on `floor 1-3`, only in drops/highs tabs.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. The `floor` field is populated from DB (`apt_transactions.floor`) and flows through the cache. The badge will render whenever real floor data is present.

## Self-Check: PASSED

- `src/app/page.tsx` — modified, contains `applyRankingNormalization`
- `src/components/home/RankingTabs.tsx` — modified, contains `저층`
- Commit `8f3aeb0` — confirmed in git log
- Commit `5632868` — confirmed in git log
