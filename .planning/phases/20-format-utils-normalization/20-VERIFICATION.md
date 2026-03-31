---
phase: 20-format-utils-normalization
verified: 2026-03-31T10:55:00Z
status: passed
score: 11/11 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Visual spot-check: visit /rent, /today, /new-highs in browser"
    expected: "Area displays as 'N㎡ (N평)' in full-width columns; compact ranking cards show integer 평 only"
    why_human: "CSS layout determines which display mode renders — cannot verify without browser"
  - test: "Visual spot-check: null/empty fields display '-' consistently across all pages"
    expected: "No '0' or blank cells visible for missing data fields"
    why_human: "Requires live data rendering in browser to confirm formatNullable applied everywhere"
---

# Phase 20: Format Utils Normalization — Verification Report

**Phase Goal:** 모든 페이지에서 가격·면적·날짜·null 값이 단일 유틸 함수로 일관되게 표시된다
**Verified:** 2026-03-31T10:55:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `formatPriceShort(32000)` returns `'3.2억'` | VERIFIED | test passes: 26/26, format.ts line 55-62 |
| 2 | `formatPriceAxis(32000)` returns `'3.2억'` | VERIFIED | test passes, format.ts line 65-70 |
| 3 | `formatNullable(null)` returns `'-'` | VERIFIED | test passes, format.ts line 73-76 |
| 4 | `formatNullable(0)` returns `'-'` | VERIFIED | test passes, format.ts line 74 treats 0 as falsy |
| 5 | `formatArea(84.93)` returns `'84.93㎡ (25.7평)'` | VERIFIED | test passes, formatArea = formatSizeWithPyeong alias |
| 6 | `formatDateKo('2026-03-31T00:00:00Z')` returns `'2026-03-31'` | VERIFIED | test passes, format.ts line 82-93 |
| 7 | `makeSlug('11680', '래미안')` returns `'11680-래미안'` | VERIFIED | test passes, apt-url.ts line 2-8 |
| 8 | No local `formatPrice` definitions outside `src/lib/format.ts` | VERIFIED | grep returns only `src/lib/format.ts:2` |
| 9 | No local `sqmToPyeong` definitions outside `src/lib/format.ts` | VERIFIED | grep returns only `src/lib/format.ts:45` |
| 10 | No local `makeSlug`/`makeAptSlug` definitions outside `src/lib/apt-url.ts` | VERIFIED | grep returns only `src/lib/apt-url.ts:2` |
| 11 | 92 total tests pass with no regressions | VERIFIED | `npm test` → 92 passed (6 test files) |

**Score:** 11/11 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/format.ts` | All format utility exports | VERIFIED | Exports: formatPrice, formatKrw, sqmToPyeong, formatSizeWithPyeong, formatPriceShort, formatPriceAxis, formatNullable, formatArea, formatDateKo (94 lines) |
| `src/lib/apt-url.ts` | makeSlug central definition | VERIFIED | Exports: makeSlug (8 lines, substantive) |
| `tests/unit/format.test.ts` | Unit tests for all format functions | VERIFIED | 145 lines, 26 expect() assertions, all pass |
| `src/components/charts/PriceHistoryChart.tsx` | Central format imports | VERIFIED | Line 14: `import { formatPrice, formatPriceAxis, sqmToPyeong } from "@/lib/format"` |
| `src/app/apt/[region]/[slug]/opengraph-image.tsx` | Central formatPrice import | VERIFIED | Line 5: `import { formatPrice } from "@/lib/format"` |
| `src/lib/cardnews/templates/rank-item.tsx` | Central formatPrice import | VERIFIED | Line 3: `import { formatPrice } from "@/lib/format"` |
| `src/app/api/cron/generate-seeding/route.ts` | formatKrw (원 units) import | VERIFIED | Line 7: `import { formatKrw } from "@/lib/format"`, 8 call sites confirmed |
| `src/components/apt/AptDetailClient.tsx` | Central formatPriceShort + sqmToPyeong | VERIFIED | Line 13: `import { sqmToPyeong, formatPriceShort } from "@/lib/format"` |
| `src/components/apt/TransactionTabs.tsx` | Central sqmToPyeong import | VERIFIED | Line 4: `import { formatPrice, sqmToPyeong } from "@/lib/format"` |
| `src/app/rent/page.tsx` | Central formatArea + makeSlug | VERIFIED | `import { formatPrice, formatArea } from "@/lib/format"` + `import { makeSlug } from "@/lib/apt-url"` |
| `src/app/today/page.tsx` | Central makeSlug | VERIFIED | Line 7: `import { makeSlug } from "@/lib/apt-url"` |
| `src/app/new-highs/page.tsx` | Central makeSlug | VERIFIED | Line 7: `import { makeSlug } from "@/lib/apt-url"` |
| `src/app/themes/[slug]/page.tsx` | Central makeSlug | VERIFIED | Line 8: `import { makeSlug } from "@/lib/apt-url"` |
| `src/components/home/RankingTabs.tsx` | Central makeSlug | VERIFIED | Line 6: `import { makeSlug } from "@/lib/apt-url"` |
| `src/app/dam/users/page.tsx` | formatDateKo replacing local formatDate | VERIFIED | Line 5: `import { formatDateKo } from "@/lib/format"`, used at lines 210, 213 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `tests/unit/format.test.ts` | `src/lib/format.ts` | `import { formatPriceShort, formatNullable, formatArea, formatDateKo, formatPriceAxis }` | WIRED | Confirmed in test file header |
| `tests/unit/format.test.ts` | `src/lib/apt-url.ts` | `import { makeSlug }` | WIRED | Confirmed in test file header |
| `PriceHistoryChart.tsx` | `src/lib/format.ts` | `import { formatPrice, formatPriceAxis, sqmToPyeong }` | WIRED | Line 14, all 3 functions used in chart rendering |
| `generate-seeding/route.ts` | `src/lib/format.ts` | `import { formatKrw }` | WIRED | 8 active call sites confirmed in route body |
| `today/page.tsx` | `src/lib/apt-url.ts` | `import { makeSlug }` | WIRED | Line 7, used in slug generation for links |
| `TransactionTabs.tsx` | `src/lib/format.ts` | `import { sqmToPyeong }` | WIRED | Line 4, used in area display |

### Data-Flow Trace (Level 4)

Level 4 skipped for this phase. All modified files are presentational consumers of format functions — they receive data from DB queries established in earlier phases. The format functions are pure transformers (input → string), not data sources. No hollow-prop or disconnected-data risk applies.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All 26 format unit tests pass | `npm test -- tests/unit/format.test.ts` | 26 passed (0 failed) | PASS |
| Full test suite no regressions | `npm test` | 92 passed across 6 files | PASS |
| No local formatPrice outside central module | `grep -rn "function formatPrice\b" src/` | Only `src/lib/format.ts:2` | PASS |
| No local sqmToPyeong outside central module | `grep -rn "function\|const sqmToPyeong" src/` | Only `src/lib/format.ts:45` | PASS |
| No local makeSlug/makeAptSlug outside apt-url | `grep -rn "function\|const make.*Slug" src/` | Only `src/lib/apt-url.ts:2` | PASS |
| generate-seeding uses formatKrw (원 units) | grep formatKrw in route.ts | Line 7 import + 8 call sites | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DATA-01 | 20-01, 20-02 | 가격 표시가 formatPrice 단일 함수로 통일되고, 축약형은 formatPriceShort로 명확히 분리된다 | SATISFIED | formatPrice in format.ts only; formatPriceShort exported and used in AptDetailClient, PriceHistoryChart; no local duplicates |
| DATA-02 | 20-01, 20-03 | null/빈값 표시가 전체 페이지에서 일관된 규칙("-")으로 통일된다 | SATISFIED | formatNullable implemented and tested; dam/users, themes, RankingTabs updated; AptNews relative-time formatDate correctly left local (different semantics) |
| DATA-03 | 20-01, 20-03 | 면적 표시가 모든 페이지에서 "㎡ (평)" 병기 형식으로 통일된다 | SATISFIED | formatArea = formatSizeWithPyeong alias; rent/page.tsx uses formatArea(sqm) → "N㎡ (N평)"; compact contexts use Math.round(sqmToPyeong(sqm))평 per plan decision |
| DATA-04 | 20-01, 20-02, 20-03 | 포맷 유틸 함수가 단일 모듈에서 관리된다 | SATISFIED | grep confirms zero local duplicates; all 12 consumer files import from @/lib/format or @/lib/apt-url |

No orphaned requirements. REQUIREMENTS.md maps DATA-01~04 exclusively to Phase 20, all 4 covered.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/apt/AptNews.tsx` | 117 | Local `function formatDate` definition | INFO | Intentional — returns relative time ("2시간 전"), completely different from ISO→YYYY-MM-DD. Excluded from plan per Plan 03 Task 2 explicit note. No action needed. |

No blockers. No warnings.

### Human Verification Required

#### 1. Area format visual check

**Test:** Open `/rent` in browser, inspect area column in the apartment list table
**Expected:** Area displays as "84.93㎡ (25.7평)" in full-width contexts; compact ranking cards elsewhere show "25평" format
**Why human:** CSS layout context determines which rendering path is active — programmatic grep confirms formatArea is called but browser viewport determines visual output

#### 2. Null field display consistency

**Test:** Navigate to any apartment detail page with missing jeonse/high-floor price data
**Expected:** Empty price fields show "-" rather than "0" or blank
**Why human:** Requires live DB data with null values to confirm formatNullable coverage is complete across all display paths

### Gaps Summary

No gaps. All 11 automated truths verified, all 15 artifact checks pass, all 6 key links confirmed wired, all 4 requirements satisfied. The 2 human verification items are confirmatory (visual rendering), not blockers to phase completion.

---

## Commit Verification

All 6 documented commits verified in git history:

| Commit | Plan | Description |
|--------|------|-------------|
| `d1422f4` | 20-01 | test: add failing tests for format utility functions |
| `706abf4` | 20-01 | feat: implement format utility functions + makeSlug |
| `90adecc` | 20-02 | feat: replace price format duplicates in chart, OG image, cardnews, seeding |
| `8d9ad2b` | 20-02 | feat: replace local sqmToPyeong and formatPriceShort in AptDetailClient |
| `f1ee56c` | 20-03 | feat: replace local sqmToPyeong/makeAptSlug/makeSlug with central imports |
| `9ca3b89` | 20-03 | feat: replace local makeSlug/formatDate with central imports |

---

_Verified: 2026-03-31T10:55:00Z_
_Verifier: Claude (gsd-verifier)_
