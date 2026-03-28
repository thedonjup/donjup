# Phase 18: Drizzle ORM 교체 - Research

**Researched:** 2026-03-28
**Domain:** Drizzle ORM, PostgreSQL, Node.js serverless DB migration
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- `import { db } from '@/lib/db'` 단일 진입점
- apt_transactions, apt_rent_transactions, finance_rates, apt_complexes 스키마 정의
- getPool().query(), createClient(), createRentServiceClient() 호출 0건
- 기존과 동일한 데이터 반환, 회귀 없음
- DB 스키마 변경 없음 (기존 테이블에 매핑만)
- CockroachDB ssl: { rejectUnauthorized: false } 필수 (CLAUDE.md)

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase.

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ORM-01 | Drizzle ORM이 설치·설정되어 Neon PostgreSQL에 연결된다 | drizzle-orm/node-postgres + pg Pool with ssl |
| ORM-02 | apt_transactions 테이블 Drizzle 스키마 정의 + raw SQL 쿼리 교체 | pgTable schema + select/where helpers |
| ORM-03 | apt_rent_transactions 테이블 Drizzle 스키마 정의 + supabase-style QueryBuilder 교체 | pgTable schema + upsert pattern |
| ORM-04 | finance_rates 테이블 Drizzle 스키마 정의 + 기존 쿼리 교체 | pgTable schema + upsert onConflictDoUpdate |
| ORM-05 | apt_complexes 및 기타 테이블 스키마 정의 + 모든 DB 접근 통일 | All remaining tables in schema file |
| ORM-06 | getPool().query() 직접 호출 0건 (cluster-index 포함) | sql`` tagged template for raw SQL in Drizzle |
</phase_requirements>

---

## Summary

The project currently uses a hand-rolled `QueryBuilder` class in `src/lib/db/client.ts` that mimics Supabase's PostgREST API on top of `node-postgres` (`pg`). Three wrapper functions expose the same interface: `createDbClient()`, `createServiceClient()`, and `createRentServiceClient()` — all ultimately delegating to one `pg.Pool`. Additionally, 8 files call `getPool().query()` directly with raw SQL strings (including `cluster-index.ts` and two search routes).

The migration replaces all of this with Drizzle ORM 0.45.x using the `drizzle-orm/node-postgres` adapter (not the Neon serverless HTTP driver, because the project already uses `pg` with a persistent Pool and the ssl config must be preserved). No schema migrations are needed — Drizzle will be configured with hand-written schemas that mirror existing tables.

The single entry point `src/lib/db/index.ts` (exported as `@/lib/db`) exposes one `db` instance. All 35 call sites are migrated to Drizzle query builder syntax. Existing Vitest mocks in `tests/integration/` mock `@/lib/db/client` and will need updating to mock `@/lib/db` instead.

**Primary recommendation:** Use `drizzle-orm/node-postgres` with the existing `pg.Pool`, define schemas in `src/lib/db/schema/`, export `db` from `src/lib/db/index.ts`, and migrate all call sites. Keep `ssl: { rejectUnauthorized: false }` on the Pool.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.45.2 | Type-safe query builder + schema | Current stable release (verified 2026-03-28) |
| drizzle-kit | 0.31.10 | CLI for schema introspection (`pull`) | Paired toolchain, optional for this phase |
| pg | ^8.20.0 | PostgreSQL driver | Already installed; drizzle-orm/node-postgres wraps it |
| @types/pg | ^8.20.0 | TypeScript types for pg | Already installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @neondatabase/serverless | 1.0.2 | HTTP/WebSocket Neon driver | NOT used here — would bypass existing Pool + ssl config |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| drizzle-orm/node-postgres | drizzle-orm/neon-http | neon-http uses HTTP, no ssl { rejectUnauthorized } issue — but changes connection semantics from TCP pool, higher latency on batched ops |
| Hand-written schemas | `drizzle-kit pull` | `pull` auto-generates from DB — useful verification step but not mandatory since types/db.ts already documents all columns |

**Installation:**
```bash
npm install drizzle-orm
npm install -D drizzle-kit
```
(`pg` and `@types/pg` already present.)

**Version verification:** Confirmed against npm registry 2026-03-28:
- `drizzle-orm@0.45.2`
- `drizzle-kit@0.31.10`

---

## Architecture Patterns

### Recommended Project Structure
```
src/lib/db/
├── index.ts          # exports: db (the Drizzle instance)
├── schema/
│   ├── apt-transactions.ts
│   ├── apt-rent-transactions.ts
│   ├── finance-rates.ts
│   ├── apt-complexes.ts
│   └── index.ts      # re-exports all tables
├── client.ts         # KEEP for now — legacy (remove after all callers migrated)
├── rent-client.ts    # KEEP for now — legacy
└── server.ts         # KEEP for now — legacy
```

After all callers are migrated `client.ts`, `rent-client.ts`, and `server.ts` are deleted.

### Pattern 1: Drizzle Instance (Single Entry Point)

**What:** One shared `db` instance using the existing `pg.Pool` config.
**When to use:** Always. This is `@/lib/db`.

```typescript
// src/lib/db/index.ts
// Source: https://orm.drizzle.team/docs/connect-neon (node-postgres section)
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("[db] DATABASE_URL is not set");
    pool = new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },  // REQUIRED — CockroachDB/Neon
      max: 10,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 10_000,
    });
    pool.on("error", (err) => {
      console.error("[db] Pool error:", err.message);
      pool = null;
    });
  }
  return pool;
}

export const db = drizzle({ client: getPool(), schema });
```

### Pattern 2: Schema Declaration (no migrations)

**What:** `pgTable` definitions that mirror existing DB tables. No `drizzle-kit generate` / `drizzle-kit migrate` run — tables already exist.
**When to use:** Phase 18 defines these; Phase 19+ references them.

```typescript
// src/lib/db/schema/apt-transactions.ts
// Source: https://orm.drizzle.team/docs/sql-schema-declaration
import { pgTable, text, integer, numeric, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

export const aptTransactions = pgTable("apt_transactions", {
  id:               text("id").primaryKey(),
  complexId:        text("complex_id"),
  regionCode:       text("region_code").notNull(),
  regionName:       text("region_name").notNull(),
  aptName:          text("apt_name").notNull(),
  sizeSqm:          numeric("size_sqm").notNull(),
  floor:            integer("floor"),
  tradePrice:       integer("trade_price").notNull(),
  tradeDate:        text("trade_date").notNull(),  // stored as YYYY-MM-DD string
  highestPrice:     integer("highest_price"),
  changeRate:       numeric("change_rate"),
  isNewHigh:        boolean("is_new_high").notNull().default(false),
  isSignificantDrop:boolean("is_significant_drop").notNull().default(false),
  dealType:         text("deal_type"),
  dropLevel:        text("drop_level").notNull().default("none"),
  propertyType:     integer("property_type").notNull().default(1),
  rawData:          jsonb("raw_data"),
  createdAt:        timestamp("created_at").defaultNow(),
});

export type AptTransaction = typeof aptTransactions.$inferSelect;
export type NewAptTransaction = typeof aptTransactions.$inferInsert;
```

### Pattern 3: Query Migration (QueryBuilder → Drizzle)

**What:** Replace `.from(table).select(...).eq(...).order(...).limit(...)` chains with Drizzle equivalents.
**When to use:** Every call site.

```typescript
// BEFORE (QueryBuilder)
const supabase = createServiceClient();
const { data, error } = await supabase
  .from("apt_complexes")
  .select("id,apt_name,region_code,slug")
  .eq("property_type", 1)
  .order("apt_name", { ascending: true })
  .limit(50);

// AFTER (Drizzle)
// Source: https://orm.drizzle.team/docs/select
import { db } from "@/lib/db";
import { aptComplexes } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

const data = await db
  .select({ id: aptComplexes.id, aptName: aptComplexes.aptName,
            regionCode: aptComplexes.regionCode, slug: aptComplexes.slug })
  .from(aptComplexes)
  .where(eq(aptComplexes.propertyType, 1))
  .orderBy(asc(aptComplexes.aptName))
  .limit(50);
```

### Pattern 4: Raw SQL for Complex Queries (cluster-index, search)

**What:** `cluster-index.ts` and both search routes use dynamic `IN (${placeholders})` queries with variable-length arrays. Drizzle's `inArray()` handles this.
**When to use:** Dynamic list queries.

```typescript
// BEFORE (raw getPool().query())
const placeholders = regionCodes.map((_, i) => `$${i + 1}`).join(", ");
const sql = `SELECT trade_date, trade_price, floor, deal_type
             FROM apt_transactions WHERE region_code IN (${placeholders})
             AND property_type = 1 ORDER BY trade_date ASC`;
const result = await pool.query(sql, regionCodes);

// AFTER (Drizzle)
// Source: https://orm.drizzle.team/docs/select
import { db } from "@/lib/db";
import { aptTransactions } from "@/lib/db/schema";
import { eq, inArray, asc } from "drizzle-orm";

const rows = await db
  .select({ tradeDate: aptTransactions.tradeDate,
            tradePrice: aptTransactions.tradePrice,
            floor: aptTransactions.floor,
            dealType: aptTransactions.dealType })
  .from(aptTransactions)
  .where(
    and(
      inArray(aptTransactions.regionCode, regionCodes),
      eq(aptTransactions.propertyType, 1)
    )
  )
  .orderBy(asc(aptTransactions.tradeDate));
```

### Pattern 5: Upsert

**What:** `fetch-transactions`, `fetch-rents`, `fetch-bank-rates` cron routes upsert records.
**When to use:** Insert-or-update patterns.

```typescript
// Source: https://orm.drizzle.team/docs/insert
import { db } from "@/lib/db";
import { aptTransactions } from "@/lib/db/schema";

await db.insert(aptTransactions)
  .values(rows)
  .onConflictDoUpdate({
    target: aptTransactions.id,
    set: {
      tradePrice: sql`excluded.trade_price`,
      isNewHigh: sql`excluded.is_new_high`,
    },
  });

// Or ignore duplicates:
await db.insert(aptRentTransactions)
  .values(rows)
  .onConflictDoNothing();
```

### Pattern 6: Search Route (fully dynamic WHERE)

**What:** `src/app/api/search/route.ts` and `src/app/search/page.tsx` build dynamic WHERE clauses with variable conditions. Use Drizzle's `sql` tagged template for these.
**When to use:** The search routes have 10+ conditional filters; Drizzle `and(...filters)` with conditional array construction is the right pattern.

```typescript
import { db } from "@/lib/db";
import { aptComplexes } from "@/lib/db/schema";
import { and, gte, lte, ilike, or, SQL } from "drizzle-orm";

const filters: SQL[] = [];
if (q) filters.push(ilike(aptComplexes.aptName, `%${q}%`));
if (builtYearMin) filters.push(gte(aptComplexes.builtYear, parseInt(builtYearMin)));
if (priceMin) filters.push(gte(/* joined column */, parseInt(priceMin)));

const results = await db
  .select(...)
  .from(aptComplexes)
  .where(filters.length > 0 ? and(...filters) : undefined)
  .limit(50);
```

### Anti-Patterns to Avoid
- **Using `@neondatabase/serverless` HTTP driver:** Changes connection semantics and bypasses the existing ssl Pool config. Stick to `drizzle-orm/node-postgres`.
- **Calling `drizzle-kit migrate` or `drizzle-kit push`:** There are no migrations — existing tables must not be altered.
- **Keeping both `db` and `createServiceClient()` active in the same file:** Causes dual-connection overhead during migration window; migrate a file completely, don't mix patterns.
- **Camelcase vs snake_case mismatch:** Drizzle returns camelCase keys when column aliases are camelCase. Existing code expects snake_case (`trade_price`, not `tradePrice`). Use explicit `.select({ trade_price: aptTransactions.tradePrice, ... })` or use Drizzle's `casing: 'snake_case'` option when creating the db instance.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dynamic IN clause | Manual `$1,$2,$3` placeholder building | `inArray(col, values)` | Edge case: empty array returns FALSE automatically |
| Conditional WHERE | String concatenation | `and(...filters.filter(Boolean))` | Type-safe, no injection risk |
| Upsert conflict | Manual `ON CONFLICT` SQL string | `.onConflictDoUpdate({ target, set })` | Drizzle handles quoting/escaping |
| Count query | Parallel COUNT + SELECT | `db.select({ count: sql<number>\`count(*)\` })` | Drizzle aggregation helpers |
| Raw SQL escape hatch | String interpolation | `sql\`...\`` tagged template | Prevents SQL injection via parameterized execution |

**Key insight:** The existing `QueryBuilder` in `client.ts` (700+ lines) already reimplements what Drizzle provides correctly. After migration, that entire class is deleted.

---

## Common Pitfalls

### Pitfall 1: Column Name Case Mismatch
**What goes wrong:** Drizzle returns column values under the TypeScript alias name (camelCase) by default, but existing application code destructures `{ trade_price, trade_date }` (snake_case).
**Why it happens:** Drizzle maps TypeScript property names to return keys, not DB column names.
**How to avoid:** Use `db = drizzle({ client: pool, schema, casing: 'snake_case' })` — this tells Drizzle to use snake_case for both input and output. Verified in drizzle-orm docs (casing option). Alternatively, be explicit: `.select({ trade_price: aptTransactions.tradePrice })`.
**Warning signs:** TypeScript errors on destructured properties; data queries return `undefined` for expected fields.

### Pitfall 2: SSL Config Lost
**What goes wrong:** Forgetting `ssl: { rejectUnauthorized: false }` on the new Pool in `src/lib/db/index.ts`.
**Why it happens:** Copy-paste from Drizzle docs which omit this Neon/CockroachDB-specific option.
**How to avoid:** The Pool config in `src/lib/db/index.ts` must mirror the one in `client.ts` exactly.
**Warning signs:** `DEPTH_ZERO_SELF_SIGNED_CERT` or connection timeout errors in production.

### Pitfall 3: Date Handling
**What goes wrong:** The existing `QueryBuilder.query()` converts `Date` objects to `YYYY-MM-DD` strings. Drizzle does NOT do this automatically — `timestamp` columns return `Date` objects.
**Why it happens:** pg driver returns `Date` instances for timestamp columns; React cannot serialize these.
**How to avoid:** Schema declarations for date columns: use `text("trade_date")` (stored as text in DB) or add a post-process step. Check actual DB column types before deciding.
**Warning signs:** `Error: Objects are not valid as a React child` on serialization in Server Components.

### Pitfall 4: Test Mock Breakage
**What goes wrong:** All existing integration tests (`tests/integration/*.test.ts`) mock `@/lib/db/client`. After migration, production code imports from `@/lib/db` instead.
**Why it happens:** Vitest `vi.mock('@/lib/db/client', ...)` no longer intercepts anything.
**How to avoid:** Update each integration test's `vi.mock` to target `@/lib/db`. The mock shape changes: instead of `{ createDbClient, getPool }`, it becomes `{ db: { select, insert, update, delete, ... } }`.
**Warning signs:** Integration tests pass (mocks don't fire) but actual DB calls execute — tests become no-ops.

### Pitfall 5: `inArray` with Empty Array
**What goes wrong:** `inArray(col, [])` generates invalid SQL.
**Why it happens:** Drizzle v0.28+ throws or generates `= ANY(ARRAY[])` which may fail.
**How to avoid:** Guard before using: `if (regionCodes.length === 0) return [];`. The existing `QueryBuilder.in()` already handles this (returns FALSE condition) — replicate that guard.
**Warning signs:** SQL syntax errors on requests with empty filter arrays.

### Pitfall 6: `drizzle-kit push/generate` Destructive Risk
**What goes wrong:** Running `drizzle-kit push` or `drizzle-kit generate && migrate` when schema types differ from actual DB (e.g., `integer` vs `numeric` mismatch) can alter or drop columns.
**Why it happens:** Kit infers differences between schema and DB state.
**How to avoid:** This phase does NOT run drizzle-kit migrations. `drizzle.config.ts` is only needed if `drizzle-kit pull` is used for introspection. Never run push/migrate in production for this phase.

---

## Code Examples

### Schema Index File
```typescript
// src/lib/db/schema/index.ts
export * from "./apt-transactions";
export * from "./apt-rent-transactions";
export * from "./finance-rates";
export * from "./apt-complexes";
export * from "./page-views";
export * from "./daily-reports";
export * from "./push-subscriptions";
export * from "./content-queue";
export * from "./seeding-queue";
export * from "./reb-price-indices";
export * from "./homepage-cache";
export * from "./analytics-daily";
```

### apt_rent_transactions Schema
```typescript
// src/lib/db/schema/apt-rent-transactions.ts
import { pgTable, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";

export const aptRentTransactions = pgTable("apt_rent_transactions", {
  id:           text("id").primaryKey(),
  regionCode:   text("region_code").notNull(),
  regionName:   text("region_name").notNull(),
  aptName:      text("apt_name").notNull(),
  sizeSqm:      numeric("size_sqm"),
  floor:        integer("floor"),
  deposit:      integer("deposit"),
  monthlyRent:  integer("monthly_rent"),
  rentType:     text("rent_type"),         // "전세" | "월세"
  contractType: text("contract_type"),
  tradeDate:    text("trade_date"),
  createdAt:    timestamp("created_at").defaultNow(),
});
```

### finance_rates Schema
```typescript
// src/lib/db/schema/finance-rates.ts
import { pgTable, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";

export const financeRates = pgTable("finance_rates", {
  id:         text("id").primaryKey(),
  rateType:   text("rate_type").notNull(),
  rateValue:  numeric("rate_value").notNull(),
  prevValue:  numeric("prev_value"),
  changeBp:   integer("change_bp"),
  baseDate:   text("base_date").notNull(),
  source:     text("source").notNull(),
  createdAt:  timestamp("created_at").defaultNow(),
});
```

### Updated Integration Test Mock Pattern
```typescript
// tests/integration/fetch-transactions.test.ts (after migration)
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from:   vi.fn().mockReturnThis(),
    where:  vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoNothing: vi.fn().mockResolvedValue({ rowCount: 1 }),
    // ... etc.
  },
}));
```

---

## Codebase Inventory — All Call Sites

### Files using `createClient()` / `createServiceClient()` (18 files)
(All must import `db` from `@/lib/db` after migration)

Query/read patterns (Server Components and API routes):
- `src/app/page.tsx`
- `src/app/market/page.tsx`, `[sido]/page.tsx`, `[sido]/[sigungu]/page.tsx`
- `src/app/apt/[region]/[slug]/page.tsx` — also uses `createRentServiceClient()`
- `src/app/daily/[date]/page.tsx`, `archive/page.tsx`
- `src/app/rent/page.tsx`
- `src/app/trend/page.tsx`, `today/page.tsx`, `new-highs/page.tsx`, `themes/`, `rate/`
- `src/app/api/analytics/pageview/route.ts`, `popular/route.ts`
- `src/app/api/apt/route.ts`, `[id]/route.ts`, `extremes/route.ts`
- `src/app/api/bank-rates/route.ts`
- `src/app/api/rate/history/route.ts`
- `src/app/api/daily/route.ts`, `[date]/route.ts`
- `src/app/apt/[region]/[slug]/opengraph-image.tsx`
- `src/app/apt/sitemap.ts`

Cron/write patterns:
- `src/app/api/cron/fetch-transactions/route.ts`
- `src/app/api/cron/fetch-rents/route.ts`
- `src/app/api/cron/fetch-bank-rates/route.ts`, `fetch-rates/route.ts`
- `src/app/api/cron/fetch-reb-index/route.ts`
- `src/app/api/cron/enrich-complexes/route.ts`
- `src/app/api/cron/generate-report/route.ts`, `generate-cardnews/route.ts`
- `src/app/api/cron/generate-seeding/route.ts`
- `src/app/api/cron/geocode-complexes/route.ts`
- `src/app/api/cron/validate-data/route.ts`, `post-instagram/route.ts`
- `src/app/api/cron/send-push/route.ts`
- `src/app/api/dam/*.ts`, `seeding/route.ts`
- `src/app/api/push/subscribe/route.ts`
- `src/app/map/page.tsx`

### Files using `getPool().query()` directly (8 files — ORM-06 target)
- `src/lib/cluster-index.ts` — `SELECT ... WHERE region_code IN ($1...$N)` → `inArray`
- `src/app/api/search/route.ts` — complex dynamic WHERE → `and(...filters)`
- `src/app/search/page.tsx` — same pattern as search route
- `src/app/index/[clusterId]/page.tsx` — `SELECT region_code, trade_price ... WHERE region_code IN (...)` → `inArray`
- `src/app/api/cron/analytics/route.ts` — `CREATE TABLE IF NOT EXISTS` DDL + inserts → `sql` tagged template
- `src/app/api/cron/coupang/route.ts` — raw queries
- `src/app/api/cron/news/route.ts` — raw queries
- `src/app/api/cron/refresh-cache/route.ts` — raw queries

---

## Tables to Schema-ify

All tables found in the codebase (from `.from("...")` audit):

| Table | Frequency | ORM Req | Priority |
|-------|-----------|---------|----------|
| apt_transactions | 48 | ORM-02 | P1 |
| apt_complexes | 29 | ORM-05 | P1 |
| finance_rates | 11 | ORM-04 | P1 |
| daily_reports | 11 | ORM-05 | P1 |
| content_queue | 5 | ORM-05 | P2 |
| push_subscriptions | 4 | ORM-05 | P2 |
| page_views | 4 | ORM-05 | P2 |
| apt_rent_transactions | 4 | ORM-03 | P1 |
| seeding_queue | 3 | ORM-05 | P2 |
| reb_price_indices | 2 | ORM-05 | P2 |
| instagram_posts | 1 | ORM-05 | P3 |
| homepage_cache | 1 | ORM-05 | P3 |
| analytics_daily | runtime DDL | ORM-06 | P2 |

P1 = ORM-01–06 explicitly required. P2/P3 = needed for ORM-06 (all callers removed).

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test -- --reporter=verbose` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ORM-01 | `db` instance connects without error | smoke | `npm test -- tests/unit/db-connection.test.ts` | ❌ Wave 0 |
| ORM-02 | apt_transactions queries return same data shape | unit | `npm test -- tests/unit/schema-apt-transactions.test.ts` | ❌ Wave 0 |
| ORM-03 | apt_rent_transactions queries return same data shape | unit | part of schema test | ❌ Wave 0 |
| ORM-04 | finance_rates upsert works | unit | part of schema test | ❌ Wave 0 |
| ORM-05 | All `.from()` calls compile without error | TypeScript | `npx tsc --noEmit` | ✅ (tsc) |
| ORM-06 | Zero `getPool()` calls in src (excluding lib/db/) | static | `grep -r "getPool" src --include="*.ts" | grep -v "lib/db/"` | ✅ (grep) |

Integration tests that currently mock `@/lib/db/client` must be updated:
- `tests/integration/fetch-transactions.test.ts` — mock target changes to `@/lib/db`
- `tests/integration/fetch-rents.test.ts` — mock target changes
- `tests/integration/fetch-bank-rates.test.ts` — mock target changes

Unit test `tests/unit/cluster-index.test.ts` — mocks `getPool` from `@/lib/db/client`; must be updated to mock `db` from `@/lib/db`.

### Sampling Rate
- **Per task commit:** `npx tsc --noEmit`
- **Per wave merge:** `npm test`
- **Phase gate:** `npm test` green + `grep -r "getPool\|createClient\|createServiceClient\|createRentServiceClient" src --include="*.ts" --include="*.tsx" | grep -v "lib/db/index"` returns 0 lines

### Wave 0 Gaps
- [ ] `tests/unit/db-schema.test.ts` — verifies schema type inference compiles (ORM-01–05)
- [ ] Update `tests/integration/fetch-transactions.test.ts` mock target — ORM-06
- [ ] Update `tests/integration/fetch-rents.test.ts` mock target — ORM-03
- [ ] Update `tests/integration/fetch-bank-rates.test.ts` mock target — ORM-04
- [ ] Update `tests/unit/cluster-index.test.ts` mock target — ORM-06

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| node/npm | Install packages | ✓ | (project active) | — |
| drizzle-orm | ORM-01 | ✗ (not installed) | — | Install in Wave 0 |
| drizzle-kit | Schema introspection | ✗ (not installed) | — | Install in Wave 0 (devDep) |
| pg | DB driver | ✓ | ^8.20.0 | — |
| DATABASE_URL | DB connection | ✓ (in .env) | — | — |

**Missing dependencies with no fallback:**
- `drizzle-orm` — must be installed before any schema/query code is written

**Missing dependencies with fallback:**
- `drizzle-kit` — only needed for `drizzle-kit pull` (optional introspection); can skip and write schemas by hand from `src/types/db.ts`

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Supabase JS client | Hand-rolled QueryBuilder on pg | v1.1 (Phase ~10) | All callers already use QueryBuilder API |
| Separate Supabase + rent service | Single pg Pool for all DB | v1.1 | createRentServiceClient() is already a no-op wrapper |

**Deprecated/outdated in THIS project:**
- `src/lib/db/client.ts` QueryBuilder (700 lines): Replaced entirely by Drizzle
- `src/lib/db/rent-client.ts`: Wrapper around createDbClient(); deleted after migration
- `src/lib/db/server.ts`: createClient/createServiceClient wrappers; deleted after migration

---

## Open Questions

1. **`trade_date` column type in DB**
   - What we know: In `src/types/db.ts`, `AptTransaction.trade_date` is typed `string`. The existing `QueryBuilder.query()` converts `Date → YYYY-MM-DD` string before returning. This suggests the DB may store as `date` type that pg returns as `Date`.
   - What's unclear: Actual Postgres column type (`text` vs `date` vs `timestamp`).
   - Recommendation: Declare as `text("trade_date")` in schema first. If pg returns `Date`, add `.mapFromDriverValue()` or handle in the select. Verify by inspecting actual query result in dev.

2. **analytics_daily DDL in cron route**
   - What we know: `src/app/api/cron/analytics/route.ts` runs `CREATE TABLE IF NOT EXISTS analytics_daily (...)` at runtime via `pool.query()`.
   - What's unclear: Whether this table should be schema-managed or kept as raw SQL.
   - Recommendation: Use Drizzle's `sql` tagged template for the DDL call (counts as ORM-06 compliant since it goes through `db`'s underlying connection). Define a schema for the table for type safety on subsequent queries.

3. **Search route complexity**
   - What we know: Both `src/app/api/search/route.ts` and `src/app/search/page.tsx` build highly dynamic WHERE with 10+ conditional filters, JOIN, and ranking expressions.
   - What's unclear: Whether Drizzle's conditional filter pattern handles all cases cleanly vs. needing `sql` tagged template.
   - Recommendation: Use `and(...filters)` with optional filter array for most conditions. Fall back to `db.execute(sql\`...\`)` for the ranking/scoring expressions. Both approaches are ORM-06 compliant (no raw `pool.query()`).

---

## Sources

### Primary (HIGH confidence)
- https://orm.drizzle.team/docs/connect-neon — node-postgres adapter setup verified
- https://orm.drizzle.team/docs/sql-schema-declaration — pgTable, column types, $inferSelect
- https://orm.drizzle.team/docs/select — select, where, orderBy, limit, inArray
- https://orm.drizzle.team/docs/insert — insert, onConflictDoUpdate, onConflictDoNothing
- npm registry (2026-03-28) — drizzle-orm@0.45.2, drizzle-kit@0.31.10 confirmed

### Secondary (MEDIUM confidence)
- https://neon.com/docs/guides/drizzle — Drizzle + Neon setup guide
- Codebase audit: `src/lib/db/client.ts`, `src/types/db.ts`, all 35 call-site files

### Tertiary (LOW confidence)
- None — all critical claims verified against official docs or codebase

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against npm registry
- Architecture: HIGH — based on direct codebase audit of all 35 call sites
- Pitfalls: HIGH — based on existing code patterns (date conversion in QueryBuilder, mock patterns in tests)
- Test impact: HIGH — tests explicitly inspected

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (drizzle-orm releases frequently; check changelog before implementation)
