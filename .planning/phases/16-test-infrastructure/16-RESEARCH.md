# Phase 16: 테스트 인프라 기반 - Research

**Researched:** 2026-03-28
**Domain:** Vitest + TypeScript + Next.js 16 path aliases + DB-dependent function mocking
**Confidence:** HIGH

## Summary

Phase 16의 목표는 Vitest를 설치·설정하고 두 순수 함수 모듈(`price-normalization.ts`, `cluster-index.ts`)에 유닛 테스트를 작성하는 것이다.

`price-normalization.ts`는 DB 의존성이 없는 완전한 순수 함수 모음이라 테스트 작성이 단순하다. 반면 `computeClusterIndex`는 `getPool()` DB 호출을 내부에서 직접 수행하는 async 함수다. 유닛 테스트에서 이를 처리하는 표준 방법은 `vi.mock('@/lib/db/client')`로 DB 호출을 mock하는 것이다.

프로젝트는 `tsconfig.json`에서 `"@/*": ["./src/*"]` path alias를 사용한다. Vitest config에서 `resolve.alias`를 명시적으로 설정해야 alias가 동작한다. 기존 `package.json`에 `"test"` 스크립트가 없으므로 추가가 필요하다.

CI 연동은 GitHub Actions `npm test` 실패 시 빌드 실패로 처리하는 표준 방식이다 — 별도 복잡한 설정 없이 exit code만으로 동작한다.

**Primary recommendation:** Vitest 4.1.2 + `vitest.config.ts` (path alias 포함) + `vi.mock` for DB dependency in cluster-index tests.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
None — all implementation choices are at Claude's discretion.

### Claude's Discretion
All implementation choices are at Claude's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and codebase conventions to guide decisions.

### Deferred Ideas (OUT OF SCOPE)
None — infrastructure phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEST-01 | Vitest가 설치·설정되어 `npm test`로 전체 테스트를 실행할 수 있다 | vitest.config.ts + package.json scripts.test 추가 |
| TEST-02 | price-normalization.ts의 모든 exported 함수에 유닛 테스트가 존재한다 | 6개 exported 함수 식별 완료 — 모두 순수 함수, mock 불필요 |
| TEST-03 | cluster-index.ts의 computeClusterIndex에 유닛 테스트가 존재한다 | vi.mock('@/lib/db/client')로 getPool mock 필요 |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Next.js 16.2.1 — training data와 다를 수 있으므로 `node_modules/next/dist/docs/` 우선 참조
- DB 연결: `ssl: { rejectUnauthorized: false }` 필수 (테스트에서 실제 DB 연결 시 해당)
- 커밋 후 push + `npx vercel --prod --yes` 배포
- 파일명: kebab-case, 변수: camelCase, 상수: UPPER_SNAKE_CASE

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | 4.1.2 | 테스트 러너 + assertion | Vite 기반, ESM/TypeScript 네이티브, Jest API 호환 |
| @vitest/coverage-v8 | 4.1.2 | 커버리지 리포트 | V8 네이티브, 별도 babel 불필요 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/node | ^20 (이미 설치됨) | Node.js 타입 | vitest 환경 변수 접근 시 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| vitest | jest | Jest는 ESM 설정 복잡, Next.js 16 + TypeScript strict 환경에서 추가 transform 설정 필요 |
| @vitest/coverage-v8 | @vitest/coverage-istanbul | V8이 더 빠르고 설정 적음, Istanbul은 더 정확한 branch 커버리지 |

**Installation:**
```bash
pnpm add -D vitest @vitest/coverage-v8
```

**Version verification:** `npm view vitest version` → 4.1.2 (2026-03-28 확인)

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── price-normalization.ts     # 테스트 대상
│   └── cluster-index.ts           # 테스트 대상
tests/
├── unit/
│   ├── price-normalization.test.ts
│   └── cluster-index.test.ts
vitest.config.ts
```

> 주의: `tests/` 디렉토리를 프로젝트 루트에 두는 것이 Next.js App Router와 충돌 없이 가장 안전하다. `src/__tests__/` 도 가능하지만 Next.js가 `src/app/` 하위를 라우팅에 사용하므로 루트 레벨 `tests/` 가 명확하다.

### Pattern 1: vitest.config.ts (path alias 포함)
**What:** `tsconfig.json`의 `@/*` alias를 Vitest가 인식하도록 resolve.alias 명시
**When to use:** 프로젝트에 `@/` path alias가 있는 경우 항상 필요

```typescript
// vitest.config.ts — 프로젝트 루트
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Pattern 2: price-normalization.ts 순수 함수 테스트
**What:** 외부 의존성 없는 순수 함수 — mock 불필요, 입출력만 검증
**When to use:** 모든 exported 함수

```typescript
// tests/unit/price-normalization.test.ts
import { describe, it, expect } from 'vitest';
import {
  adjustFloorPrice,
  isDirectDeal,
  isDealSuspicious,
  computeMedianPrice,
  computeMovingMedian,
  filterTransactions,
  groupByMonth,
  LOW_FLOOR_MAX,
  FLOOR_ADJUSTMENT_FACTORS,
} from '@/lib/price-normalization';

describe('adjustFloorPrice', () => {
  it('1층 거래를 x1.1494 환산한다', () => {
    expect(adjustFloorPrice(10000, 1)).toBe(Math.round(10000 * 1.1494));
  });
  it('4층 이상은 원가 반환한다', () => {
    expect(adjustFloorPrice(10000, 4)).toBe(10000);
  });
});
```

### Pattern 3: computeClusterIndex DB mock 테스트
**What:** `vi.mock`으로 `getPool`을 mock하여 DB 없이 로직 테스트
**When to use:** DB 의존성이 있는 함수의 유닛 테스트

```typescript
// tests/unit/cluster-index.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeClusterIndex } from '@/lib/cluster-index';

// DB 모듈 전체 mock
vi.mock('@/lib/db/client', () => ({
  getPool: vi.fn(),
}));

import { getPool } from '@/lib/db/client';

describe('computeClusterIndex', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('빈 regionCodes 배열이면 빈 배열 반환', async () => {
    const result = await computeClusterIndex([]);
    expect(result).toEqual([]);
  });

  it('DB 데이터로 월별 지수를 계산한다', async () => {
    const mockQuery = vi.fn().mockResolvedValue({
      rows: [
        { trade_date: '2024-01-15', trade_price: '50000', floor: '5', deal_type: null },
        { trade_date: '2024-01-20', trade_price: '52000', floor: '7', deal_type: null },
        { trade_date: '2024-02-10', trade_price: '55000', floor: '6', deal_type: null },
        // ... 최소 minTransactions(3) 충족을 위한 추가 행
      ],
    });
    vi.mocked(getPool).mockReturnValue({ query: mockQuery } as ReturnType<typeof getPool>);

    const result = await computeClusterIndex(['1234567890'], 1);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('month');
    expect(result[0]).toHaveProperty('index');
  });
});
```

### Pattern 4: package.json scripts
**What:** `npm test` → vitest run (CI 모드, watch 없음)

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Anti-Patterns to Avoid
- **`environment: 'jsdom'` 설정:** 서버 사이드 코드(DB 클라이언트)를 테스트하므로 `node` 환경 사용. jsdom은 브라우저 컴포넌트 테스트용
- **path alias 없이 상대 경로로 import 변환:** 테스트 파일에서도 `@/lib/...` alias를 그대로 사용. vitest.config.ts의 resolve.alias가 처리
- **실제 DB에 연결하는 유닛 테스트:** 유닛 테스트는 항상 DB를 mock. 실제 DB 연결 테스트는 Phase 17 통합 테스트 범위
- **`globals: true` 설정:** `describe/it/expect`를 명시적으로 import하는 것이 TypeScript strict 모드에서 더 안전. globals 사용 시 tsconfig에 별도 타입 선언 필요

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TypeScript 변환 | 커스텀 ts-node 설정 | vitest (내장 esbuild) | Vitest는 TypeScript를 네이티브로 처리 |
| Path alias 해석 | 커스텀 module resolver | vitest.config.ts resolve.alias | 표준 방법, 2줄로 완료 |
| Mock 초기화 | 수동 상태 관리 | vi.clearAllMocks() in beforeEach | Vitest 내장 |
| CI 실패 처리 | 별도 스크립트 | vitest run exit code | 프로세스 exit code 1로 자동 CI 실패 |

**Key insight:** Vitest는 Next.js + TypeScript 프로젝트에서 Jest보다 설정이 훨씬 단순하다. 추가 babel/transform 설정이 필요 없다.

## Exported Functions Inventory (TEST-02 대상)

`price-normalization.ts`에서 export되는 모든 항목:

| Export | Type | 특이사항 |
|--------|------|---------|
| `LOW_FLOOR_MAX` | const (number) | 값 검증 |
| `FLOOR_ADJUSTMENT_FACTORS` | const (Record) | 객체 내용 검증 |
| `adjustFloorPrice` | function | 층별 분기 테스트 필요 |
| `isDirectDeal` | function | null 케이스 포함 |
| `isDealSuspicious` | function | 경계값 테스트 중요 |
| `computeMedianPrice` | function | 홀수/짝수 배열, 빈 배열 |
| `computeMovingMedian` | function | 3개월 윈도우 로직 |
| `filterTransactions` | function | lowFloorMode 3가지 분기 + 직거래 처리 |
| `groupByMonth` | function | 날짜 파싱, 정렬 |

총 9개 export (함수 7개 + 상수 2개). TEST-02는 "모든 exported 함수"이므로 함수 7개 커버 필요.

## Critical Implementation Notes

### computeClusterIndex mock 시 주의사항

`cluster-index.ts`는 `getPool()`을 함수 본문 안에서 직접 호출한다 (모듈 레벨이 아님). `vi.mock` hoisting이 정상 동작하려면 mock을 파일 최상단에 선언해야 한다. Vitest는 `vi.mock` 호출을 자동으로 파일 상단으로 hoist하므로 import 순서와 무관하게 동작한다.

```typescript
// 이 순서로 작성해도 Vitest가 vi.mock을 먼저 실행함
import { computeClusterIndex } from '@/lib/cluster-index'; // OK
vi.mock('@/lib/db/client', () => ({ getPool: vi.fn() }));  // hoist됨
```

### `vi.mocked()` vs 타입 캐스팅

TypeScript strict 모드에서 mock된 함수의 타입을 올바르게 처리하려면 `vi.mocked(getPool)` 사용:

```typescript
import { getPool } from '@/lib/db/client';
vi.mocked(getPool).mockReturnValue({ query: mockQuery } as unknown as ReturnType<typeof getPool>);
```

### CI 설정

GitHub Actions가 이미 있는지 확인 필요. 없으면 간단한 `.github/workflows/test.yml` 생성:

```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
```

## Common Pitfalls

### Pitfall 1: Path alias 미설정으로 import 실패
**What goes wrong:** `Cannot find module '@/lib/price-normalization'` 에러
**Why it happens:** `tsconfig.json`의 paths는 TypeScript 컴파일러용 — Vitest의 모듈 해석기는 별도 설정 필요
**How to avoid:** `vitest.config.ts`에 `resolve.alias: { '@': path.resolve(__dirname, './src') }` 반드시 추가
**Warning signs:** 테스트 실행 시 module not found 에러

### Pitfall 2: `vi.mock` hoisting 이해 부족
**What goes wrong:** mock이 적용되지 않아 실제 DB 연결 시도
**Why it happens:** `vi.mock`을 조건부로 사용하거나 factory 함수 내에서 외부 변수 참조
**How to avoid:** `vi.mock` factory는 외부 변수를 참조할 수 없음 (hoisting 때문에). 필요하면 `vi.hoisted()` 사용
**Warning signs:** `Error: DATABASE_URL environment variable is not set`

### Pitfall 3: `filterTransactions` 제네릭 타입 테스트 복잡성
**What goes wrong:** 제네릭 타입 `T extends { floor, trade_price, deal_type }` 때문에 타입 에러
**Why it happens:** 테스트 입력 객체가 제네릭 제약 조건을 만족하지 않는 경우
**How to avoid:** 테스트 픽스처에 필수 필드 3개를 명시적으로 포함한 객체 배열 사용
**Warning signs:** TypeScript 컴파일 에러 (런타임은 정상)

### Pitfall 4: `computeMovingMedian` 윈도우 로직 검증
**What goes wrong:** 3개월 이동 윈도우 경계 케이스 미테스트
**Why it happens:** 첫 번째 달(이전 달 없음)과 세 번째 달부터의 동작이 다름
**How to avoid:** 단일 달, 2달, 3달 이상 케이스를 각각 테스트
**Warning signs:** 실 데이터에서 첫 달 median이 0으로 나오는 경우

## Code Examples

### Complete vitest.config.ts
```typescript
// Source: vitest 공식 문서 https://vitest.dev/config/
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### filterTransactions 테스트 예시 (adjust 모드)
```typescript
describe('filterTransactions - adjust 모드', () => {
  it('저층 거래를 고층 환산가로 변환하여 normal에 포함', () => {
    const txns = [
      { floor: 1, trade_price: 10000, deal_type: null },
    ];
    const result = filterTransactions(txns, { lowFloorMode: 'adjust', recentMedian: 10000 });
    // 1층: x1.1494 = 11494, recentMedian(10000) * 0.90 = 9000 통과
    expect(result.normal).toHaveLength(1);
    expect(result.normal[0].trade_price).toBe(Math.round(10000 * 1.1494));
    expect(result.normal[0].original_price).toBe(10000);
  });

  it('90% 미만 거래는 excluded로 분류', () => {
    const txns = [
      { floor: 5, trade_price: 8000, deal_type: null },
    ];
    const result = filterTransactions(txns, { lowFloorMode: 'adjust', recentMedian: 10000 });
    // 8000 < 10000 * 0.90 = 9000
    expect(result.excluded).toHaveLength(1);
    expect(result.normal).toHaveLength(0);
  });
});
```

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | vitest 실행 | ✓ | 24.13.1 | — |
| pnpm | 패키지 설치 | ✓ (pnpm-lock.yaml 존재) | — | npm |
| vitest | TEST-01 | ✗ (미설치) | — | 설치 필요 |
| @vitest/coverage-v8 | 커버리지 | ✗ (미설치) | — | 선택적 |
| GitHub Actions | CI 자동화 | 미확인 | — | 수동 `npm test` |

**Missing dependencies with no fallback:**
- vitest — 설치 필수 (TEST-01 블로커)

**Missing dependencies with fallback:**
- @vitest/coverage-v8 — 선택적, TEST-01~03에 필수 아님
- GitHub Actions — CI 설정 없어도 `npm test`는 로컬에서 동작

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.ts` (Wave 0에서 생성) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEST-01 | `npm test` 실행 시 Vitest 동작 | smoke | `npm test` | ❌ Wave 0 |
| TEST-02 | price-normalization.ts exported 함수 각각에 유닛 테스트 존재 | unit | `npm test` | ❌ Wave 0 |
| TEST-03 | computeClusterIndex에 유닛 테스트 존재 | unit | `npm test` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` — path alias 포함 Vitest 설정
- [ ] `tests/unit/price-normalization.test.ts` — covers TEST-02
- [ ] `tests/unit/cluster-index.test.ts` — covers TEST-03
- [ ] `package.json` scripts.test 추가 — covers TEST-01

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Jest + babel-jest | Vitest (네이티브 ESM) | 2022~2023 | TypeScript + ESM 프로젝트에서 설정 대폭 간소화 |
| ts-jest | vitest 내장 esbuild | 2022 | 별도 transform 설정 불필요 |

**Deprecated/outdated:**
- `jest.config.js` + `babel.config.js` 조합: Next.js 15+ + TypeScript 5 + ESM 환경에서 설정 복잡도가 높아 Vitest로 대체 추세

## Open Questions

1. **GitHub Actions 존재 여부**
   - What we know: `.github/` 디렉토리 확인 안 함
   - What's unclear: CI 워크플로우가 이미 있는지
   - Recommendation: 플래너가 `.github/workflows/` 확인 태스크 포함. 없으면 신규 생성, 있으면 `npm test` step 추가

2. **pnpm vs npm 설치 명령**
   - What we know: `pnpm-lock.yaml`이 존재하므로 pnpm 사용 중
   - What's unclear: CI에서 pnpm 설치가 설정되어 있는지
   - Recommendation: 설치 명령은 `pnpm add -D vitest @vitest/coverage-v8` 사용. `npm test`는 package.json scripts를 통해 동작하므로 npm/pnpm 무관

## Sources

### Primary (HIGH confidence)
- vitest 공식 문서 — https://vitest.dev/config/ (path alias, environment 설정)
- vitest 소스 — `npm view vitest version` → 4.1.2 확인 (2026-03-28)
- 프로젝트 코드 직접 분석 — `price-normalization.ts`, `cluster-index.ts` 전체 읽음

### Secondary (MEDIUM confidence)
- vitest `vi.mock` hoisting 동작 — vitest 공식 문서의 mocking 가이드

### Tertiary (LOW confidence)
- GitHub Actions yml 예시 — 표준 패턴이나 프로젝트별 기존 CI 설정 확인 필요

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm registry에서 버전 직접 확인
- Architecture: HIGH — 프로젝트 코드 직접 분석, exported 함수 목록 완전 파악
- Pitfalls: HIGH — vi.mock hoisting은 Vitest 공식 문서에서 명확히 문서화된 동작

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (Vitest는 안정적이나 major 버전 변경 시 재확인)
