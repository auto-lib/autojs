# Testing Strategy for Auto4

## Philosophy

Auto4 testing follows two approaches:

1. **Backward Compatibility**: Pass all 66 existing auto library tests
2. **Behavioral Testing**: New tests focus on behavior, not internal state

## Test Formats

### Old Format (Internal State Matching)

The existing tests validate exact internal state:

```javascript
export default {
    obj: { x: 1, y: ($) => $.x * 2 },
    fn: ($) => { $.x = 5; },
    _: {
        fn: ['y'],
        subs: {},
        deps: { y: { x: true } },
        value: { x: 5, y: 10 },
        fatal: {}
    }
}
```

**Advantages**:
- Catches internal inconsistencies
- Documents expected data structures
- Regression prevention

**Disadvantages**:
- Brittle to implementation changes
- Hard to understand intent
- Couples tests to internals

### New Format (Behavioral)

Auto4 tests focus on observable behavior:

```javascript
export function test(createChart, mockFetcher, assert) {
    let chart = createChart({ fetcher: mockFetcher });
    chart.setUrl('?dataset=test&currency=USD');

    chart.setCurrency('EUR');

    let data = chart.getData();
    assert.equal(data.lines[0].values[0], 90);  // 100 * 0.9
}
```

**Advantages**:
- Tests real use cases
- Resilient to refactoring
- Easier to understand

**Disadvantages**:
- May miss internal bugs
- Requires good mocks

## Test Categories

### 1. Basic Lifecycle (001-002)
- Chart creation
- Not ready before URL
- Ready after URL
- URL parsing

### 2. Data Flow (003-004)
- Fetcher injection
- Data fetching
- Currency conversion
- Frequency conversion
- Date range filtering

### 3. State Changes (005)
- Mutation propagation
- URL updates on change

### 4. Tracing (006, 010)
- Trace structure
- Trigger recording
- Step recording
- Cross-block tracing

### 5. URL Round-Trip (007)
- **Critical test**
- Set URL -> change state -> get URL -> set URL -> no changes
- Validates bidirectional sync

### 6. Components (008-009)
- Component access
- Block structure
- Needs/gives verification

## Progressive Complexity

Tests are ordered by complexity:

| Test | Complexity | Dependencies |
|------|------------|--------------|
| 001 | Basic | None |
| 002 | Basic | URL parsing |
| 003 | Medium | Async, mocking |
| 004 | Medium | Transformations |
| 005 | Medium | State propagation |
| 006 | Medium | Tracing system |
| 007 | High | Full round-trip |
| 008 | Medium | Component architecture |
| 009 | High | Block architecture |
| 010 | High | Cross-block tracing |

## Test Utilities

### Mock Fetcher
```javascript
export const mockFetcher = {
    async fetchDataset(datasetId) {
        return mockData[datasetId] || {
            id: datasetId,
            prices: [100, 110, 120],
            dates: ['2024-01', '2024-02', '2024-03']
        };
    },
    async fetchCurrencyRates(currency) {
        return { USD: 1, EUR: 0.9, GBP: 0.8 };
    }
};
```

### Assert Helpers
```javascript
export const assert = {
    ok(value, msg) {
        if (!value) throw new Error(msg || 'Assertion failed');
    },
    equal(actual, expected, msg) {
        if (actual !== expected) {
            throw new Error(msg || `Expected ${expected}, got ${actual}`);
        }
    },
    deepEqual(actual, expected, msg) {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(msg || `Deep equal failed`);
        }
    },
    throws(fn, msg) {
        let threw = false;
        try { fn(); } catch (e) { threw = true; }
        if (!threw) throw new Error(msg || 'Expected function to throw');
    }
};
```

## Running Tests

### New Format Tests
```bash
cd kernels/auto4
node tests/run.js
```

### Old Format Tests (compatibility)
```bash
# From project root
node tests/runall.js
```

### Single Test
```bash
node tests/run.js test-007-url-roundtrip.js
```

## Test Runner Structure

```javascript
// tests/run.js
import * as fs from 'fs';
import * as path from 'path';
import { createChart } from '../src/chart.js';
import { mockFetcher } from './mock-fetcher.js';
import { assert } from './assert.js';

const testFiles = fs.readdirSync(__dirname)
    .filter(f => f.startsWith('test-') && f.endsWith('.js'))
    .sort();

async function runTests() {
    let passed = 0, failed = 0;

    for (const file of testFiles) {
        const module = await import(`./${file}`);
        const tests = Object.entries(module)
            .filter(([name]) => name.startsWith('test'));

        for (const [name, fn] of tests) {
            try {
                await fn(createChart, mockFetcher, assert);
                console.log(`PASS: ${file}::${name}`);
                passed++;
            } catch (e) {
                console.log(`FAIL: ${file}::${name}`);
                console.log(`  ${e.message}`);
                failed++;
            }
        }
    }

    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

runTests();
```

## Critical Tests

### Test 007: URL Round-Trip

This is the most important test. It validates:

1. **URL generation** correctly reflects state
2. **URL parsing** correctly sets state
3. **No spurious recomputations**
4. **Change detection** works correctly

If this test fails, the library is fundamentally broken.

```javascript
chart.setUrl('?dataset=brent&currency=USD');
chart.setCurrency('EUR');
let url = chart.getUrl();  // Should have currency=EUR
chart.setUrl(url);         // Should produce no changes
assert.deepEqual(trace.steps, []);
```

### Test 006: Basic Tracing

Validates the tracing system works:

1. **Trigger recorded** with type and value
2. **Steps recorded** showing what changed
3. **Before/after values** captured

If this test fails, debugging is impossible.

## Future Tests

As the library matures, add tests for:

- Error handling (fetcher fails, invalid URL, etc.)
- Async edge cases (race conditions, cancellation)
- Performance (large datasets, many updates)
- Memory (no leaks on repeated setUrl)
- Svelte integration (store reactivity)

## Relation to Existing Tests

The 66 tests in `tests/files/` test the low-level auto system.
The 10 tests in `kernels/auto4/tests/` test the high-level Chart API.

Both must pass:
- Old tests ensure the core reactive system works
- New tests ensure the Chart abstraction works

## Test-Driven Development

When adding features:

1. Write test first (new format)
2. Run test (should fail)
3. Implement feature
4. Run test (should pass)
5. Run all tests (should all pass)
6. Commit
