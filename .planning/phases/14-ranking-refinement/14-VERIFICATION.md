---
phase: 14-ranking-refinement
verified: 2026-03-28T00:00:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 14: Ranking Refinement Verification Report

**Phase Goal:** 폭락·신고가 랭킹이 저층 노이즈와 이상거래를 제거한 신뢰할 수 있는 순위를 보여준다
**Verified:** 2026-03-28
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | 폭락 랭킹에서 저층 거래의 변동률이 고층 환산 기준으로 표시된다 | VERIFIED | `applyRankingNormalization` in page.tsx lines 74-90: floor 1-3 trades get `adjustedPrice = adjustFloorPrice(t.trade_price, t.floor)` and `change_rate` overwritten before rendering |
| 2 | 직거래 저가(최고가 대비 30% 이상 저가) 거래가 랭킹에서 제외된다 | VERIFIED | Filter pass lines 61-72: `isDirectDeal(t.deal_type) && t.trade_price < t.highest_price * 0.70` returns false |
| 3 | 저층(3층 이하) 거래에 '저층' 뱃지가 표시된다 | VERIFIED | RankingTabs.tsx lines 243-253: badge renders when `t.floor != null && t.floor > 0 && t.floor <= 3`, inside `(isDrop \|\| isHigh)` block |
| 4 | 이상거래 제외 후에도 랭킹이 10건을 채우려 시도한다 (30건 풀에서 필터) | VERIFIED (cache path) | refresh-cache/route.ts lines 25-29: cache stores LIMIT 30 for drops and highs; normalization applied to full pool before slice(0,10). Note: fallback direct-query path fetches only LIMIT 10 — fallback is exceptional path, cache path is primary runtime path |
| 5 | drop_level 뱃지가 조정된 change_rate에 맞게 재계산된다 | VERIFIED | `calcDropLevel(newRate)` called on adjusted rate at page.tsx line 87; result overwrites `drop_level` in returned object |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/page.tsx` | `applyRankingNormalization` function + integration | VERIFIED | Function defined lines 59-91; imported `adjustFloorPrice`, `isDirectDeal`, `LOW_FLOOR_MAX` at line 18; wired into cache path lines 125-130 and fallback path lines 159-164 |
| `src/components/home/RankingTabs.tsx` | `Transaction.floor` field + low-floor badge rendering | VERIFIED | `floor?: number | null` added at line 15; `deal_type?: string | null` at line 16; badge rendered lines 243-253 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/page.tsx` | `src/lib/price-normalization.ts` | `import adjustFloorPrice, isDirectDeal, LOW_FLOOR_MAX` | WIRED | Line 18: `import { adjustFloorPrice, isDirectDeal, LOW_FLOOR_MAX } from "@/lib/price-normalization"` — all three symbols used in `applyRankingNormalization` |
| `src/app/page.tsx` | `src/components/home/RankingTabs.tsx` | `drops/highs props with floor field populated` | WIRED | Lines 241-247: `<RankingTabs drops={(drops as Transaction[])} highs={(highs as Transaction[])} ...>`; `AptTransaction` has `floor: number | null` (types/db.ts line 28); cache stores `floor` field (refresh-cache/route.ts line 17 txFields) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `src/app/page.tsx` | `drops`, `highs` | `homepage_cache` table (primary) / `apt_transactions` direct query (fallback) | Yes — DB query with `floor`, `deal_type`, `change_rate`, `highest_price` fields; refresh-cache stores up to 30 items with all required fields | FLOWING |
| `src/components/home/RankingTabs.tsx` | `t.floor` | Passed via `drops`/`highs` props from page.tsx | Yes — `floor` fetched from DB in txFields, stored in cache, parsed and passed through | FLOWING |

### Behavioral Spot-Checks

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| `applyRankingNormalization` exists in page.tsx | `grep -n "applyRankingNormalization" src/app/page.tsx` | Lines 59 (def), 125, 127, 159, 163 (calls) | PASS |
| Both cache and fallback paths call normalization | Lines 125/127 (cache), 159/163 (fallback) | Confirmed in file | PASS |
| drops re-sorted after normalization | `grep -n "sort" src/app/page.tsx` | Lines 126, 160 both sort by `change_rate ASC` | PASS |
| 저층 badge scoped to drops/highs only | Badge at line 243 is inside `(isDrop \|\| isHigh)` block opened at line 223 | Confirmed — volume and recent never enter that block | PASS |
| TypeScript compiles cleanly | `npx tsc --noEmit` | Exit code 0 | PASS |
| Commits exist | `git log --oneline` | `8f3aeb0` (page.tsx), `5632868` (RankingTabs.tsx) | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| RANK-01 | 14-01-PLAN.md | 폭락/신고가 변동률을 층별 보정 후 가격 기준으로 산출한다 (저층 노이즈 제거) | SATISFIED | `adjustFloorPrice` applied in `applyRankingNormalization` map pass for floor 1-3; `change_rate` overwritten before ranking display |
| RANK-02 | 14-01-PLAN.md | 이상거래(직거래 저가, 친족 거래 추정)를 랭킹 산정에서 자동 제외한다 | SATISFIED | `isDirectDeal` + `trade_price < highest_price * 0.70` filter removes suspicious direct deals before slice |
| RANK-03 | 14-01-PLAN.md | 랭킹 리스트에서 저층 거래는 "저층" 라벨을 표시하되, 변동률은 고층 환산 기준으로 산출한다 | SATISFIED | "저층" badge renders in RankingTabs for floor 1-3; `change_rate` already floor-adjusted from server |

No orphaned requirements — all three RANK IDs declared in 14-01-PLAN.md frontmatter and all three are satisfied.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | — | — | None found |

No TODO, FIXME, placeholder comments, empty returns, or stub patterns found in either modified file.

### Human Verification Required

#### 1. Low-floor badge visual on real data

**Test:** Open homepage drops tab on a device with live data. Find a transaction with floor 1-3.
**Expected:** Gray "저층" badge appears adjacent to the severity badge (폭락/하락/대폭락). The displayed change_rate should be less negative than the raw DB value would be (floor-adjusted price is higher, so rate is closer to zero).
**Why human:** Cannot verify badge rendering or adjusted rate values without running the app and checking against known floor 1-3 transactions.

#### 2. Suspicious direct deal exclusion

**Test:** Identify a known direct deal where trade_price < highest_price * 0.70 in the apt_transactions table. Confirm it does not appear in the drops ranking on the homepage.
**Expected:** The transaction is absent from the top-10 drops list.
**Why human:** Requires querying live DB for candidate transactions and checking the rendered UI.

#### 3. Highs tab 저층 badge

**Test:** Open homepage, switch to 신고가 TOP tab. If any new-high transaction has floor 1-3, the badge should appear.
**Expected:** Badge visible on low-floor new highs (same gray style as in drops tab).
**Why human:** Requires live data with floor 1-3 new-high transactions.

### Gaps Summary

No gaps. All five observable truths are verified. The fallback direct-query path fetches LIMIT 10 rather than 30 (so filtering there reduces the final pool if suspicious deals are present), but this is the expected behavior per the plan — the primary runtime path is the cache path which correctly uses the 30-item pool. The plan explicitly acknowledged this limitation in Task 1 step 5.

---

_Verified: 2026-03-28_
_Verifier: Claude (gsd-verifier)_
