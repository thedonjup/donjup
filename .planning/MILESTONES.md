# Milestones

## v1.2 코드 품질 강화 (Shipped: 2026-03-28)

**Phases completed:** 4 phases, 9 plans, 9 tasks

**Key accomplishments:**

- Vitest integration tests for three cron routes using next-test-api-route-handler + vi.mock DB isolation, covering 401 auth rejection and success paths without real DB or external API calls
- Playwright 1.58.2 E2E infrastructure with chromium-only project, webServer auto-start, and 4 passing tests covering home page load + basic navigation.
- drizzle-orm@0.45.2 installed via pnpm with 13 pgTable schemas and singleton db entry point using ssl:{rejectUnauthorized:false} on Neon PostgreSQL
- Explicit snake_case aliases:
- All 27 API routes and cron jobs migrated from Supabase QueryBuilder to Drizzle ORM with correct upsert patterns, TypeScript-clean with zero API route errors
- All 8 remaining getPool() call sites migrated to Drizzle, legacy DB files (client.ts/server.ts/rent-client.ts) deleted, test mocks updated to @/lib/db — zero legacy DB patterns remain in the codebase
- 1. [Rule 1 - Bug] Two additional files had no-unused-vars not in plan

---

## v1.1 데이터 분석 고도화 (Shipped: 2026-03-28)

**Phases completed:** 6 phases, 12 plans, 18 tasks

**Key accomplishments:**

- One-liner:
- One-liner:
- One-liner:
- 면적별 순수전세가율(%) + 갭 금액(매매가 - 전세가)을 3-column 카드로 AptDetailClient에 추가, page.tsx 전체 기준 StatCard 2개 제거
- 면적별 전세가율 추이를 월별 LineChart로 표시 — solid/dashed 듀얼 라인 패턴, PriceHistoryChart 아래 배치
- Two 'use client' accordion/expandable components for rate page interactions — RateIndicatorAccordion with CSS max-height transitions and BankRateExpandable with mobile card + desktop table layouts, both collapsed by default
- Hero card with bank average rate at top, accordion for 5 rate indicators, expandable bank rows — flat page transformed to hierarchy with BANK_UNKNOWN filtered from average computation
- One-liner:
- One-liner:
- One-liner:
- One-liner:

---
