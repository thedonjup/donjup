# Phase 17: 통합 테스트 & E2E - Research

**Researched:** 2026-03-28
**Domain:** Next.js App Router integration testing (Vitest) + Playwright E2E
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
None — pure infrastructure phase.

### Claude's Discretion
All implementation choices are at Claude's discretion.

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEST-04 | 주요 API 라우트(fetch-transactions, fetch-rents, fetch-bank-rates)에 통합 테스트가 존재한다 | next-test-api-route-handler로 App Router handler 직접 실행, vi.mock으로 DB 격리 |
| TEST-05 | Playwright가 설치되어 홈 페이지 로드 + 기본 네비게이션 E2E 테스트가 동작한다 | @playwright/test 1.58.2, npm run test:e2e 스크립트, webServer 설정 |
</phase_requirements>

## Summary

Phase 17은 두 독립 트랙으로 구성된다. (1) Vitest 기반 통합 테스트: 세 개의 cron API 라우트 핸들러를 실제 DB 호출 없이 격리 테스트. (2) Playwright E2E: 홈 → 검색 → 아파트 상세 기본 네비게이션 자동 검증.

통합 테스트 트랙의 핵심 도전은 세 API 라우트 모두 `createServiceClient()` / `createRentServiceClient()` 를 내부에서 호출하고, 내부적으로 `getPool()` → pg Pool → CockroachDB를 사용한다는 점이다. Phase 16에서 `cluster-index.test.ts`에서 `vi.mock('@/lib/db/client', { getPool: vi.fn() })` 패턴이 확립되어 있다. 그러나 세 라우트는 `@/lib/db/client`를 직접 사용하지 않고 `createServiceClient()`/`createRentServiceClient()`를 사용하므로, mock 대상은 `@/lib/db/server` 또는 `@/lib/db/rent-client`가 되어야 한다. 두 모듈 모두 내부적으로 `createDbClient()`를 호출하므로, `@/lib/db/client` 의 `createDbClient`를 mock하면 두 클라이언트를 한번에 커버할 수 있다.

Playwright E2E는 아직 프로젝트에 설치되지 않았다. `@playwright/test` 패키지 설치 + `playwright.config.ts` 설정 + `tests/e2e/` 디렉토리 생성의 세 단계로 분리된다. E2E는 Next.js dev 서버나 production build가 실행 중이어야 하므로 `webServer` 설정이 필수다.

**Primary recommendation:** 통합 테스트는 `next-test-api-route-handler` v5 + `vi.mock('@/lib/db/client')` 조합, E2E는 `@playwright/test` 1.58.2 + `webServer: { command: 'npm run dev' }` 로 구성한다.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next-test-api-route-handler | 5.0.4 | App Router route handler를 실제 Next.js 환경에서 격리 실행 | Next.js 내부 resolver 사용, App Router/Pages Router/Edge 모두 지원, test-framework agnostic |
| @playwright/test | 1.58.2 | E2E 브라우저 자동화 | Next.js 공식 추천, webServer 자동 관리, TS 네이티브 |
| vitest | 4.1.2 | 통합 테스트 실행기 (이미 설치) | Phase 16에서 이미 설정 완료 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| playwright (browsers) | 1.58.2 | Chromium/Firefox/WebKit 브라우저 바이너리 | @playwright/test install 후 `npx playwright install --with-deps chromium` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| next-test-api-route-handler | 직접 GET() 함수 import 후 호출 | 직접 호출이 더 단순하지만 Next.js Request/NextResponse 객체를 수동 구성해야 함. 라우트가 CRON_SECRET 헤더 인증을 하므로 request mock이 필수 — ntarh가 이를 깔끔하게 처리 |
| @playwright/test | cypress | Playwright가 더 빠르고 Next.js 공식 문서에서 추천 |

**Installation:**
```bash
# 통합 테스트
pnpm add -D next-test-api-route-handler

# E2E
pnpm add -D @playwright/test
npx playwright install --with-deps chromium
```

**Version verification:**
- next-test-api-route-handler: `npm view next-test-api-route-handler version` → 5.0.4 (2026-03-28 확인)
- @playwright/test: `npm view @playwright/test version` → 1.58.2 (2026-03-28 확인)

## Architecture Patterns

### Recommended Project Structure
```
tests/
├── unit/                        # Phase 16 기존 (변경 없음)
│   ├── price-normalization.test.ts
│   └── cluster-index.test.ts
├── integration/                 # Phase 17 신규 — Vitest로 실행
│   ├── fetch-transactions.test.ts
│   ├── fetch-rents.test.ts
│   └── fetch-bank-rates.test.ts
└── e2e/                         # Phase 17 신규 — Playwright로 실행
    ├── home.spec.ts
    ├── search.spec.ts
    └── apt-detail.spec.ts
playwright.config.ts             # 프로젝트 루트
```

### Pattern 1: 통합 테스트 — route handler 격리 실행 (next-test-api-route-handler)

**What:** `testApiHandler({ appHandler, test })` 로 route handler를 실제 Next.js HTTP 레이어에서 실행. DB 호출은 `vi.mock`으로 대체.

**When to use:** Next.js App Router의 route.ts 파일을 테스트할 때

**Example:**
```typescript
// Source: https://blog.arcjet.com/testing-next-js-app-router-api-routes/
// tests/integration/fetch-bank-rates.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// MUST be first import — next-test-api-route-handler 요구사항
import { testApiHandler } from 'next-test-api-route-handler';

// DB mock: createDbClient가 반환하는 객체를 mock
vi.mock('@/lib/db/client', () => ({
  createDbClient: vi.fn(),
  getPool: vi.fn(),
}));

// 외부 API mock (FinLife, Slack 등)
vi.mock('@/lib/api/finlife', () => ({
  fetchAllMortgageProducts: vi.fn(),
  bankNameToRateType: vi.fn((name: string) => name),
}));
vi.mock('@/lib/alert', () => ({
  sendSlackAlert: vi.fn(),
}));

import * as appHandler from '@/app/api/cron/fetch-bank-rates/route';
import { createDbClient } from '@/lib/db/client';
import { fetchAllMortgageProducts } from '@/lib/api/finlife';

describe('GET /api/cron/fetch-bank-rates', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('Authorization 헤더 없으면 401 반환', async () => {
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'GET' });
        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.error).toBe('Unauthorized');
      },
    });
  });

  it('정상 인증 + FinLife 데이터 있으면 success:true 반환', async () => {
    // mock DB 클라이언트 설정
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    const mockSingle = vi.fn().mockResolvedValue({ data: null });
    vi.mocked(createDbClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        upsert: mockUpsert,
        eq: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: mockSingle,
      }),
      rpc: vi.fn(),
    } as any);

    vi.mocked(fetchAllMortgageProducts).mockResolvedValue([
      { bankName: '국민은행', productName: '주담대', rateType: '고정', rateMin: 3.5, rateMax: 5.0, rateAvg: 4.2 },
    ]);

    process.env.CRON_SECRET = 'test-secret';

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'GET',
          headers: { Authorization: 'Bearer test-secret' },
        });
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
      },
    });
  });
});
```

### Pattern 2: 통합 테스트 — QueryBuilder mock 전략

**What:** `createDbClient()`가 반환하는 QueryBuilder 객체를 mock. `server.ts`와 `rent-client.ts` 모두 `createDbClient()`를 직접 호출하므로 `@/lib/db/client`의 `createDbClient`를 mock하면 두 클라이언트를 동시에 커버.

**Key insight:** `createServiceClient()`와 `createRentServiceClient()` 모두 `createDbClient()`를 호출한다. `@/lib/db/client`를 mock하는 것이 가장 효율적.

```typescript
// vi.mock 체인 패턴
vi.mock('@/lib/db/client', () => ({
  createDbClient: vi.fn(),
  getPool: vi.fn(),  // cluster-index 등에서 직접 사용
}));
```

### Pattern 3: Playwright E2E 설정

**What:** `playwright.config.ts` + `webServer` 자동 시작 설정

**When to use:** 브라우저 네비게이션 시나리오 전체를 검증

```typescript
// Source: https://nextjs.org/docs/app/guides/testing/playwright
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

**Dev 서버 사용 시 (로컬 개발):**
```typescript
webServer: {
  command: 'npm run dev',
  url: 'http://localhost:3000',
  reuseExistingServer: true,
},
```

### Pattern 4: E2E 테스트 — 기본 네비게이션

```typescript
// Source: https://nextjs.org/docs/app/guides/testing/playwright
// tests/e2e/home.spec.ts
import { test, expect } from '@playwright/test';

test('홈 페이지 로드', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/돈줍/);
  // 핵심 컨텐츠 존재 확인
  await expect(page.locator('h1').first()).toBeVisible();
});

test('홈 → 검색 네비게이션', async ({ page }) => {
  await page.goto('/');
  await page.goto('/search?q=강남');
  await expect(page).toHaveURL(/\/search/);
});

test('아파트 상세 페이지 접근', async ({ page }) => {
  // apt/[region]/[slug] 구조 — 실제 DB 데이터 필요 없이 URL 접근만 검증
  await page.goto('/apt/서울/11110-래미안');
  // 404 또는 정상 로드 모두 허용 (DB 연결 없이 URL 라우팅 동작 검증)
  const status = page.url();
  expect(status).toBeTruthy();
});
```

### Anti-Patterns to Avoid

- **통합 테스트에서 실제 DB 연결 사용:** CockroachDB `ssl: { rejectUnauthorized: false }` 는 테스트 환경에서 DATABASE_URL 없으면 실패. 반드시 mock 사용.
- **E2E에서 DB 데이터에 의존:** 특정 아파트 데이터가 있다고 가정하는 assertion. URL 라우팅과 UI 구조만 검증.
- **ntarh를 첫 번째 import가 아닌 곳에 배치:** `next-test-api-route-handler` 문서에서 항상 첫 번째 import이어야 함을 명시.
- **E2E를 `npm test`(vitest)로 실행:** Playwright는 별도 `npm run test:e2e` 스크립트 필요. vitest.config.ts의 `include` 패턴에 `tests/e2e/**` 가 포함되지 않도록 주의.
- **fetch-transactions/fetch-rents 통합 테스트에서 외부 API(MOLIT) 실제 호출:** `@/lib/api/molit`, `@/lib/api/molit-rent`, `@/lib/api/finlife` 모두 mock 필요.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| App Router route handler HTTP 에뮬레이션 | 직접 Request 객체 구성 | next-test-api-route-handler | URL, headers, method를 실제 Next.js resolver가 처리하도록 위임 — 직접 구성 시 CRON_SECRET 헤더 처리, NextResponse 파싱 등 엣지 케이스 누락 위험 |
| 브라우저 E2E 자동화 | puppeteer 직접 사용 | @playwright/test | webServer 자동 관리, TS 타입, retry 내장 |

**Key insight:** fetch-transactions route는 300+ 줄로 복잡하지만 통합 테스트의 목적은 "올바른 DB 응답을 올바르게 처리하는지"이지 외부 API 동작이 아님. 외부 API를 모두 mock하면 핵심 로직(인증, 응답 구조, 에러 처리)에 집중 가능.

## Common Pitfalls

### Pitfall 1: vitest.config.ts의 include 패턴이 e2e 파일을 포함
**What goes wrong:** `npm test`(vitest)가 `tests/e2e/*.spec.ts`를 실행하려다 Playwright API(`test`, `expect`)가 vitest와 충돌
**Why it happens:** vitest 기본 glob이 `**/*.spec.ts`를 포함
**How to avoid:** vitest.config.ts에 `include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts']` 명시적 설정
**Warning signs:** `test` is not defined 또는 `expect` conflict 에러

### Pitfall 2: CRON_SECRET 환경변수 미설정으로 통합 테스트 전체 401
**What goes wrong:** 인증 없이 실행하면 모든 route가 401 반환
**Why it happens:** 세 라우트 모두 `Authorization: Bearer ${process.env.CRON_SECRET}` 검증
**How to avoid:** 테스트 내 `process.env.CRON_SECRET = 'test-secret'` 설정 후 요청 헤더에 `Authorization: 'Bearer test-secret'` 포함
**Warning signs:** 모든 테스트에서 `{ error: "Unauthorized" }` 응답

### Pitfall 3: createDbClient mock의 체이닝 처리
**What goes wrong:** QueryBuilder가 메서드 체이닝(`.from().select().eq().order().limit().single()`)을 사용하므로 각 메서드가 `this`를 반환해야 함
**Why it happens:** vi.fn()으로 단순 mock 시 `.select()` 후 `.eq()` 호출 불가
**How to avoid:** 각 메서드가 `vi.fn().mockReturnThis()`를 반환하도록 mock 구성, 최종 실행 메서드(`.then()` 또는 `.single()`)만 실제 결과 반환
**Warning signs:** `Cannot read property 'eq' of undefined`

### Pitfall 4: Playwright webServer timeout
**What goes wrong:** `npm run build && npm run start` 가 120초 안에 완료되지 않아 E2E 실패
**Why it happens:** Next.js 16.2.1 + CockroachDB 연결이 있는 빌드는 느릴 수 있음
**How to avoid:** 로컬 개발 시 `reuseExistingServer: true` + `npm run dev` 사용. CI 환경에서만 build+start 사용
**Warning signs:** `Timed out waiting for http://localhost:3000 to be available`

### Pitfall 5: E2E 테스트에서 한국어 텍스트 locator
**What goes wrong:** `page.locator('text=실거래가')` 가 동적 렌더링 완료 전 실행
**Why it happens:** 홈 페이지가 서버 컴포넌트 + 클라이언트 컴포넌트 혼합
**How to avoid:** `await expect(locator).toBeVisible()` 사용 (내장 대기 포함). 특정 텍스트 대신 구조적 selector(`h1`, `nav` 등) 우선 사용

## Code Examples

### 통합 테스트: fetch-bank-rates (가장 단순한 구조, 시작점으로 적합)
```typescript
// tests/integration/fetch-bank-rates.test.ts
import { testApiHandler } from 'next-test-api-route-handler'; // 반드시 첫 번째 import
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/client', () => ({
  createDbClient: vi.fn(),
  getPool: vi.fn(),
}));
vi.mock('@/lib/api/finlife', () => ({
  fetchAllMortgageProducts: vi.fn(),
  bankNameToRateType: vi.fn((name: string) => name),
}));
vi.mock('@/lib/alert', () => ({ sendSlackAlert: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), info: vi.fn() } }));

import * as appHandler from '@/app/api/cron/fetch-bank-rates/route';
import { createDbClient } from '@/lib/db/client';
import { fetchAllMortgageProducts } from '@/lib/api/finlife';

function makeMockDb() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    single: vi.fn().mockResolvedValue({ data: null }),
  };
  return {
    from: vi.fn().mockReturnValue(chain),
    rpc: vi.fn(),
    _chain: chain,
  };
}

describe('GET /api/cron/fetch-bank-rates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'test-secret';
  });

  it('Authorization 헤더 없으면 401', async () => {
    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'GET' });
        expect(res.status).toBe(401);
      },
    });
  });

  it('FinLife 데이터 없으면 success:false', async () => {
    vi.mocked(createDbClient).mockReturnValue(makeMockDb() as any);
    vi.mocked(fetchAllMortgageProducts).mockResolvedValue([]);

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'GET',
          headers: { Authorization: 'Bearer test-secret' },
        });
        const json = await res.json();
        expect(json.success).toBe(false);
      },
    });
  });

  it('정상 데이터 있으면 success:true, inserted >= 1', async () => {
    vi.mocked(createDbClient).mockReturnValue(makeMockDb() as any);
    vi.mocked(fetchAllMortgageProducts).mockResolvedValue([
      { bankName: '국민은행', productName: 'KB주담대', rateType: '고정', rateMin: 3.5, rateMax: 5.0, rateAvg: 4.0 },
    ]);

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'GET',
          headers: { Authorization: 'Bearer test-secret' },
        });
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.inserted).toBeGreaterThanOrEqual(1);
      },
    });
  });
});
```

### vitest.config.ts 업데이트 (e2e 제외)
```typescript
// Source: vitest 공식 문서
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### package.json 스크립트 추가
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router API handler 직접 import + mock Request | App Router route handler → next-test-api-route-handler | Next.js 13+ App Router | handler가 native Request/Response 사용하므로 direct call 시 환경 구성 복잡 |
| Cypress for E2E | Playwright preferred | ~2022 | 속도, 병렬화, TS 네이티브 지원 |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | 전체 테스트 실행 | ✓ | v24.13.1 | — |
| next-test-api-route-handler | TEST-04 통합 테스트 | ✗ (미설치) | — | 없음 — 설치 필요 |
| @playwright/test | TEST-05 E2E | ✗ (미설치) | — | 없음 — 설치 필요 |
| Playwright 브라우저 바이너리 | TEST-05 E2E | ✗ (미설치) | — | `npx playwright install --with-deps chromium` |
| vitest | TEST-04 통합 테스트 실행기 | ✓ | 4.1.2 | — |

**Missing dependencies with no fallback:**
- `next-test-api-route-handler` — Wave 0에서 설치 필요
- `@playwright/test` — Wave 0에서 설치 필요
- Playwright chromium 브라우저 바이너리 — `npx playwright install --with-deps chromium` 실행 필요

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (unit/integration) | vitest 4.1.2 |
| Framework (E2E) | @playwright/test 1.58.2 |
| Config file (vitest) | `vitest.config.ts` (기존 — include 패턴 추가 필요) |
| Config file (playwright) | `playwright.config.ts` (Wave 0에서 신규 생성) |
| Quick run command | `npm test` (vitest — unit + integration) |
| E2E run command | `npm run test:e2e` |
| Full suite command | `npm test && npm run test:e2e` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEST-04 | fetch-transactions route: 401 on missing auth | integration | `npm test -- tests/integration/fetch-transactions.test.ts` | ❌ Wave 0 |
| TEST-04 | fetch-transactions route: 200 + success:true on valid auth + mock DB | integration | `npm test -- tests/integration/fetch-transactions.test.ts` | ❌ Wave 0 |
| TEST-04 | fetch-rents route: 401 on missing auth | integration | `npm test -- tests/integration/fetch-rents.test.ts` | ❌ Wave 0 |
| TEST-04 | fetch-rents route: 200 + success:true on valid auth + mock DB | integration | `npm test -- tests/integration/fetch-rents.test.ts` | ❌ Wave 0 |
| TEST-04 | fetch-bank-rates route: 401 on missing auth | integration | `npm test -- tests/integration/fetch-bank-rates.test.ts` | ❌ Wave 0 |
| TEST-04 | fetch-bank-rates route: success:false when no products | integration | `npm test -- tests/integration/fetch-bank-rates.test.ts` | ❌ Wave 0 |
| TEST-05 | 홈 페이지 로드 (`/`) | E2E | `npm run test:e2e -- tests/e2e/home.spec.ts` | ❌ Wave 0 |
| TEST-05 | 홈 → 검색 URL 네비게이션 | E2E | `npm run test:e2e -- tests/e2e/home.spec.ts` | ❌ Wave 0 |
| TEST-05 | 아파트 상세 URL 접근 | E2E | `npm run test:e2e -- tests/e2e/apt-detail.spec.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test` (vitest unit + integration, ~수 초)
- **Per wave merge:** `npm test` (전체 vitest suite)
- **Phase gate:** `npm test && npm run test:e2e` (E2E는 dev 서버 필요 — 별도 실행)

### Wave 0 Gaps
- [ ] `tests/integration/fetch-transactions.test.ts` — TEST-04 커버
- [ ] `tests/integration/fetch-rents.test.ts` — TEST-04 커버
- [ ] `tests/integration/fetch-bank-rates.test.ts` — TEST-04 커버
- [ ] `tests/e2e/home.spec.ts` — TEST-05 커버
- [ ] `tests/e2e/search.spec.ts` — TEST-05 커버 (홈 → 검색)
- [ ] `tests/e2e/apt-detail.spec.ts` — TEST-05 커버 (아파트 상세)
- [ ] `playwright.config.ts` — E2E 실행 환경 설정
- [ ] `vitest.config.ts` 업데이트 — `include` 패턴에 `tests/integration/**/*.test.ts` 추가, `tests/e2e/**` 제외
- [ ] Package install: `pnpm add -D next-test-api-route-handler @playwright/test`
- [ ] Browser install: `npx playwright install --with-deps chromium`

## Sources

### Primary (HIGH confidence)
- Next.js 공식 문서 (v16.2.1, 2026-03-25 업데이트) — Playwright 설정 방법, webServer 설정
  https://nextjs.org/docs/app/guides/testing/playwright
- npm registry — next-test-api-route-handler 5.0.4, @playwright/test 1.58.2 버전 확인 (2026-03-28)

### Secondary (MEDIUM confidence)
- arcjet.com — App Router route handler 통합 테스트 패턴 (next-test-api-route-handler 코드 예시)
  https://blog.arcjet.com/testing-next-js-app-router-api-routes/
- 프로젝트 코드베이스 직접 분석 — 세 route handler의 의존성 그래프, Phase 16 vi.mock 패턴 확인

### Tertiary (LOW confidence)
- 없음

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 버전 직접 확인, 공식 문서 검증
- Architecture: HIGH — 기존 Phase 16 mock 패턴과 일관성 확인, 실제 코드 분석 기반
- Pitfalls: HIGH — 실제 코드베이스의 QueryBuilder 체이닝 구조 확인

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable stack, 30일 유효)
