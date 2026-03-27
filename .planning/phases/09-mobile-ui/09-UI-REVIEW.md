# Phase 9 — UI Review

**Audited:** 2026-03-27
**Baseline:** 09-UI-SPEC.md (approved design contract)
**Screenshots:** Not captured (no dev server detected at localhost:3000 or localhost:5173)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 2/4 | Empty state copy diverges from spec; "최근 금리 변동 이력" table has no mobile empty state body text |
| 2. Visuals | 3/4 | All focal points implemented; MobileBottomSheet uses md:hidden instead of spec-required sm:hidden breakpoint |
| 3. Color | 2/4 | MobileNav uses 5 hardcoded hex literals instead of CSS variables; HeroSection uses Tailwind named colors (text-gray-400, text-red-400) not in spec palette |
| 4. Typography | 3/4 | HeroSection missing break-keep on dynamic text span; RateDetailCard text-3xl is out of spec's 3-size constraint |
| 5. Spacing | 3/4 | py-0.5 and px-1.5 are standard Tailwind steps but h-[280px], h-[60vh], min-w-[20px] are arbitrary — most are spec-prescribed or acceptable exceptions |
| 6. Experience Design | 3/4 | Loading states present; Y-axis tickCount not capped at 4; TransactionTabs standalone area filter uses flex-wrap not horizontal scroll; "최근 금리 변동 이력" table lacks mobile card layout |

**Overall: 16/24**

---

## Top 3 Priority Fixes

1. **MobileNav uses hardcoded hex color variables instead of CSS custom properties** — Dark mode colors will break if the design system palette changes; duplicating light/dark values in JS instead of using `var(--color-*)` means the component is not theme-safe — Replace `const bg = isDark ? "#141b2d" : "#ffffff"` and the four companion variables (lines 94-98) with `background: "var(--color-surface-card)"`, `color: "var(--color-text-primary)"`, `borderColor: "var(--color-border)"` etc. to match the rest of the codebase pattern.

2. **"최근 금리 변동 이력" table on rate/page.tsx has no mobile card layout** — On mobile (<640px), this 5-column table (`지표, 현재, 이전, 변동, 기준일`) will overflow horizontally or truncate, exactly the same problem the bank rate table (which was fixed) had — Add `<div className="space-y-2 sm:hidden">` mobile cards above line 248, and add `hidden sm:block` to the existing `overflow-x-auto` wrapper div, mirroring the bank rate pattern already in the same file.

3. **Empty state copy in new-highs/page.tsx diverges from the Copywriting Contract** — A user who sees an empty state gets "신고가 데이터가 없습니다" (line 205) and "매일 자동으로 업데이트됩니다" instead of the spec-mandated "오늘의 신고가가 없습니다" heading and "아직 집계된 신고가 거래가 없어요. 내일 다시 확인해보세요." body — Replace the empty state copy at lines 205-208 to match the contract exactly.

---

## Detailed Findings

### Pillar 1: Copywriting (2/4)

**Contract vs. Implementation:**

| Contract copy | Actual copy | Status |
|---|---|---|
| `오늘의 신고가가 없습니다` (heading) | `신고가 데이터가 없습니다` | FAIL — wrong heading |
| `아직 집계된 신고가 거래가 없어요. 내일 다시 확인해보세요.` (body) | `매일 자동으로 업데이트됩니다` | FAIL — wrong body |
| `거래 내역이 없습니다` (TransactionTabs heading) | `거래 이력이 없습니다.` | Minor deviation — "이력" vs "내역", trailing period |
| `선택한 면적의 거래 내역이 없어요. 다른 면적을 선택해보세요.` (body) | `{size} 면적의 매매 이력이 없습니다.` | FAIL — no body copy, no guidance to select different size |
| Bank fallback labels (BANK_UNKNOWN → "기타") | Implemented correctly, all 19 codes present | PASS |
| `지도 불러오는 중` | `지도를 불러오는 중...` | Minor: spec says no ellipsis, implementation adds "..." |
| Error state: `데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.` | DB error silently falls through to empty state (new-highs line 70-72, rate line 70-72) — no user-visible error message | FAIL — error swallowed, user sees empty state not error |

Files: `src/app/new-highs/page.tsx:205-208`, `src/components/apt/TransactionTabs.tsx:311-312`

---

### Pillar 2: Visuals (3/4)

**Screen focal points (per spec):**

| Screen | Spec focal point | Status |
|---|---|---|
| HeroSection | `text-2xl` dynamic price stat | PASS — `text-2xl` implemented at line 29 |
| New-highs | Rank badge + apt name + price in first card row | PASS — card layout at lines 107-141 |
| Apt detail | Area chip selector row just below title | PASS — `overflow-x-auto whitespace-nowrap` at AptDetailClient.tsx:147 |
| Chart | PriceHistoryChart at 280px | PASS — `h-[280px] sm:h-[240px]` at PriceHistoryChart.tsx:107 |
| Transaction list | Card list with rank badge | PASS — TransactionTabs mobile cards at lines 185-238 |
| Map | Full-viewport canvas; bottom sheet below fold | PARTIAL — bottom sheet uses `md:hidden` (768px) not `sm:hidden` (640px); on 640-767px devices it does not render |
| Rate | Bank name + rate value pairs in card list | PASS — bank card layout at rate/page.tsx:175-198 |

**Icon accessibility:** HamburgerButton at MobileNav.tsx:29 has `aria-label="메뉴 열기"`. Close button at line 146 has `aria-label="메뉴 닫기"`. ThemeToggle at line 46 has aria-label. All icon-only buttons are labeled. PASS.

**Visual hierarchy:** Section headings use `text-2xl font-extrabold t-text` on new-highs and `text-2xl font-extrabold t-text` on rate. Rank badges (28px) provide clear positional identity on card lists. Card structure (price right-aligned, bold; meta text tertiary) follows established hierarchy pattern.

**Finding:** MobileBottomSheet breakpoint mismatch — `md:hidden` at line 27 means the bottom sheet is hidden on desktops but also absent on 640-767px tablet/large-phone viewport. The spec states: "breakpoint reference: sm: = 640px" and the MapSidePanel (desktop panel) presumably appears at some breakpoint. A 700px device would see neither the desktop panel nor the bottom sheet.

Files: `src/components/map/MobileBottomSheet.tsx:27`

---

### Pillar 3: Color (2/4)

**Spec rule:** "All colors must reference existing CSS variables. No hex literals in new code."

**Violations found:**

| File | Line(s) | Hardcoded value | Should be |
|---|---|---|---|
| `MobileNav.tsx` | 94 | `"#141b2d"` (dark bg) | `var(--color-surface-card)` |
| `MobileNav.tsx` | 94 | `"#ffffff"` (light bg) | `var(--color-surface-card)` |
| `MobileNav.tsx` | 95 | `"#f1f5f9"` / `"#0f172a"` (text primary) | `var(--color-text-primary)` |
| `MobileNav.tsx` | 96 | `"#94a3b8"` / `"#475569"` (text secondary) | `var(--color-text-secondary)` |
| `MobileNav.tsx` | 97 | `"#1e293b"` / `"#e2e8f0"` (border) | `var(--color-border)` |
| `MobileNav.tsx` | 98 | `"#1e293b"` / `"#f1f5f9"` (hover bg) | `var(--color-surface-elevated)` |
| `HeroSection.tsx` | 22 | `text-gray-400` | Not a design system color — should use `t-text-tertiary` |
| `HeroSection.tsx` | 32 | `text-red-400` | Use `style={{ color: "var(--color-semantic-drop)" }}` |
| `HeroSection.tsx` | 82 | `text-gray-400` | `t-text-tertiary` |
| `PriceHistoryChart.tsx` | 112-113, 119 | `"#059669"` (stroke + fill) | Acceptable — Recharts SVG props cannot accept CSS vars directly; this is a known SVG limitation |
| `TransactionTabs.tsx` | 10-12 | `DROP_LEVEL_CONFIG` hex values | Acceptable — static config objects; values match semantic tokens |
| `MobileBottomSheet.tsx` | 53, 60, 67 | `"#94a3b8"`, `"#ef4444"`, `"#10b981"` as color props to FilterChip | These are prop-passed values to a custom component; review FilterChip to see if it accepts CSS var strings |
| `rate/page.tsx` | 428 | `"#ef4444"` / `"#059669"` in MiniAreaChart color prop | Same SVG limitation as chart — acceptable |

**Accent usage:** `var(--color-brand-600)` is used for chip active states, area selector toggle, and tab active states — all within spec's declared uses. Not overused for generic borders. PASS on accent discipline.

**60/30/10 color split:** Dominant surface (`--color-surface-page`) used for page background. Cards use `--color-surface-card`. Brand green (`brand-600`) reserved for interactive active states. Ratio is approximately correct in the card-heavy layouts.

---

### Pillar 4: Typography (3/4)

**Spec constraint:** Exactly 3 sizes (12px/text-xs, 14px/text-sm, 24px/text-2xl), exactly 2 weights (400/normal, 600/semibold).

**Sizes found in phase files:**

| Class | Count | In spec? |
|---|---|---|
| text-xs (12px) | 57 | PASS |
| text-sm (14px) | 37 | PASS |
| text-2xl (24px) | 3 | PASS |
| text-lg (18px) | 5 | OUT OF SPEC — used for section h2 labels in rate/page.tsx and AptDetailClient.tsx |
| text-3xl (30px) | 2 | OUT OF SPEC — RateDetailCard metric value (rate/page.tsx:409) |
| text-base (16px) | 1 | OUT OF SPEC — HeroSection subtext (line 82) |
| text-xl | 1 | OUT OF SPEC — appears once |
| text-4xl, text-6xl | 1 each | These are desktop sizes (behind sm:/lg: prefixes) — acceptable |

**Analysis:** The spec states "Scope: mobile-only phase (< 640px). Desktop sizes are out of scope." The `text-lg` usages (rate section headings, chart section heading) appear without breakpoint qualifiers, meaning they render at 18px on mobile. The `text-3xl` in RateDetailCard renders the interest rate value (e.g., "3.50%") at 30px on mobile — outside the declared 3-size scale.

**Weights found:**

| Class | Count | In spec? |
|---|---|---|
| font-bold | 51 | Acceptable (bold maps to weight 700, near semibold 600) |
| font-semibold | 7 | PASS (weight 600) |
| font-medium | 15 | OUT OF SPEC — weight 500, not in declared 2-weight set |
| font-extrabold | 3 | OUT OF SPEC — weight 800 |
| font-black | 1 | OUT OF SPEC — weight 900 (HeroSection h1) |

**Finding:** The spec's "exactly 2 weights" constraint (400, 600) is aspirational but the existing codebase already uses font-extrabold on section headings and font-black on the hero. These are pre-existing patterns that the spec's own "Source" section references ("text-2xl font-extrabold" on new-highs). The real new violation is font-medium appearing in multiple new-phase components. The missing `break-keep` on HeroSection's dynamic text span (specified in component inventory for MOBILE-06) was not added — the plan called for `break-keep` on the dynamic text span but line 29 only has `leading-tight tracking-tight` without `break-keep`.

Files: `src/components/home/HeroSection.tsx:29` (missing `break-keep`), `src/app/rate/page.tsx:409` (text-3xl mobile violation), `src/components/layout/MobileNav.tsx:169` (fontSize: "15px" inline — not a Tailwind class but still out of spec)

---

### Pillar 5: Spacing (3/4)

**Spec scale:** xs=4px, sm=8px, md=16px, lg=24px, xl=32px, 2xl=48px, 3xl=64px.

**Standard Tailwind mapping:** p-1=4px, p-2=8px, p-4=16px, p-6=24px, p-8=32px.

**Top spacing classes (all standard Tailwind steps):**
- `px-4` (69 uses) = 16px = md token — PASS
- `py-3` (62 uses) = 12px — between sm(8) and md(16), not on spec scale but this is an existing pattern throughout the codebase
- `gap-2` (12 uses) = 8px = sm token — PASS
- `gap-3` (8 uses) = 12px — minor exception, matches existing codebase

**Arbitrary values requiring attention:**

| Location | Value | Justification |
|---|---|---|
| `PriceHistoryChart.tsx:107` | `h-[280px]` | Spec-prescribed (CONTEXT.md decision #4) — PASS |
| `MobileBottomSheet.tsx:28` | `h-[160px]` / `h-[60vh]` | 160px spec-prescribed (plan 03); 60vh is viewport-relative for expanded state — acceptable |
| `TransactionTabs.tsx:141,168` | `min-w-[20px]` | Badge minimum width — acceptable badge pattern |
| `text-[10px]`, `text-[11px]` | Multiple | Sub-pixel badge text, not spacing but typography — see Pillar 4 |

**Finding:** `py-3` (12px) is used extensively as card row padding but is not on the declared spacing scale (which goes xs=4, sm=8, md=16). This is a pre-existing pattern and the spec notes "Card minimum height: 64px" which is preserved. No new non-standard spacing values were introduced that violate the scale outside of the spec-prescribed exceptions.

---

### Pillar 6: Experience Design (3/4)

**Loading states:**
- Map SDK: `!sdkReady` renders "지도를 불러오는 중..." with `whitespace-nowrap` — PASS (spec-required text, no wrapping)
- KakaoMap uses `100dvh` — PASS (plan 03 requirement)
- Server-rendered pages (new-highs, rate): no client-side loading states needed for SSR pages — appropriate

**Error states:**
- `new-highs/page.tsx:70-72`: DB error caught but only `console.error` logged; user sees empty state not error state
- `rate/page.tsx:70-72`: Same — silent catch, falls through to empty rate card
- Spec requires: "데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요." for error states
- Neither page distinguishes between "truly empty data" and "failed to fetch data"

**Empty states:**
- TransactionTabs sale empty: "거래 이력이 없습니다." — partial PASS (missing guidance body per spec)
- TransactionTabs rent empty: "전월세 이력이 없습니다." — same issue
- New-highs empty: wrong copy (see Pillar 1)

**Interaction patterns:**

| Pattern | Spec | Implemented | Status |
|---|---|---|---|
| MobileNav body scroll lock | `document.body.style.overflow = 'hidden'` | MobileNav.tsx:72 | PASS |
| Backdrop touchAction: none | Required | MobileNav.tsx:114 | PASS |
| Backdrop onTouchStart e.preventDefault | Required | MobileNav.tsx:119 | PASS |
| Area chip `overflow-x-auto whitespace-nowrap -mx-4 px-4` | Required | AptDetailClient.tsx:147 — missing `-mx-4` edge-to-edge extension | PARTIAL — chips don't extend to viewport edges as specified |
| Chip active: `bg-brand-500 text-white border-brand-500` | Required | Uses `var(--color-brand-600)` not `brand-500`; no explicit `border-brand-500` — uses background override only | MINOR — brand-600 vs brand-500, and no active border distinction |
| Chart max 4 Y-axis ticks | Required | No `tickCount` prop on YAxis (line 117) | FAIL — recharts auto-calculates tick count; could produce >4 ticks on tall charts |
| Scroll lock on TransactionTabs standalone area filter | No spec requirement | Uses `flex flex-wrap` not horizontal scroll | Note: only shown when `externalSelectedSize === undefined` (standalone mode, no parent AptDetailClient); acceptable |
| MobileBottomSheet `env(safe-area-inset-bottom)` | Required | line 34 | PASS |

**Tap targets:** New-highs cards have `minHeight: 64` and full-width `<Link>` block — PASS. Rate bank cards are `div` not `Link` — appropriate for non-navigable data rows. TransactionTabs sale/rent cards are `div` not interactive — appropriate (no navigation from transaction history).

---

## Files Audited

- `src/app/new-highs/page.tsx`
- `src/app/rate/page.tsx`
- `src/components/home/HeroSection.tsx`
- `src/components/layout/MobileNav.tsx`
- `src/components/apt/AptDetailClient.tsx`
- `src/components/charts/PriceHistoryChart.tsx`
- `src/components/apt/TransactionTabs.tsx`
- `src/components/map/KakaoMap.tsx`
- `src/components/map/MobileBottomSheet.tsx`
- `src/app/globals.css`
- `.planning/phases/09-mobile-ui/09-UI-SPEC.md`
- `.planning/phases/09-mobile-ui/09-CONTEXT.md`
- `.planning/phases/09-mobile-ui/09-01-PLAN.md`
- `.planning/phases/09-mobile-ui/09-02-PLAN.md`
- `.planning/phases/09-mobile-ui/09-03-PLAN.md`

---

## Registry Audit

Registry audit: 0 third-party blocks checked — shadcn not initialized (`components.json` absent). No registry safety section required.
