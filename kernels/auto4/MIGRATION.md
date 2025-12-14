# Migration Plan: Replacing the Current Auto Library

This document outlines the path to replacing the current `@autolib/auto` library
with Auto4 in both `prices-app` and `trade-portal-app-v2`.

## Overview

The migration has two tracks:

1. **Backward Compatibility**: Auto4 must pass all existing tests
2. **New Architecture**: Gradually adopt blocks, tracing, and Chart abstraction

## Phase 1: Core Compatibility

### Goal
Auto4's basic reactive system works identically to current auto library.

### Steps

1. **Copy core files from auto3**
   - `kernel.js` - Intent router
   - `graph.js` - Reactive handlers
   - `auto.js` - `$.x` syntax wrapper

2. **Implement compatibility layer**
   ```javascript
   // auto-compat.js
   import { auto as auto4 } from './auto.js';

   // Wrap to match current API
   export function auto(obj, options) {
       // Handle current options format
       // Return proxy with ['#'] stores
       // Support all current features
   }
   ```

3. **Run existing test suite**
   ```bash
   # Copy auto4 to auto-es6.js location
   cp kernels/auto4/src/auto-compat.js auto-es6.js

   # Run existing tests
   node tests/runall.js
   ```

4. **Fix failures one by one**
   - Match internal state structure expected by tests
   - Ensure `_` internal object matches expectations
   - Handle edge cases (async, batching, subscriptions)

### Checklist
- [ ] Basic values work (tests 001-005)
- [ ] Computed functions work (tests 006-010)
- [ ] Circular detection works (tests 010-014)
- [ ] Subscriptions work (tests 015-022)
- [ ] Async functions work (tests 031-042)
- [ ] Batching works (tests 049-058)
- [ ] Change detection works (tests 060-065)
- [ ] All 66 tests pass

## Phase 2: Add New Features

### Goal
Add block architecture and tracing while maintaining compatibility.

### Steps

1. **Add block.js to auto4**
   - Port from auto3
   - Ensure blocks can contain auto-style state

2. **Add tracer.js**
   - Port from auto3
   - Make tracing optional (opt-in)

3. **Write new-format tests**
   - tests/test-001 through test-010
   - Simpler assertion style
   - Focus on behavior, not internal state

4. **Create test runner for new format**
   ```javascript
   // tests/run-auto4.js
   import { test as t001 } from './test-001-basic-init.js';
   // ...

   let results = [];
   for (let test of tests) {
       try {
           await test(createChart, mockFetcher, assert);
           results.push({ name: test.name, pass: true });
       } catch (e) {
           results.push({ name: test.name, pass: false, error: e });
       }
   }
   ```

### Test Format Comparison

**Old format** (internal state matching):
```javascript
export default {
    obj: { x: 1, y: ($) => $.x * 2 },
    fn: ($) => { $.x = 5; },
    _: {
        fn: ['y'],
        deps: { y: { x: true } },
        value: { x: 5, y: 10 },
        fatal: {}
    }
}
```

**New format** (behavioral):
```javascript
export function test(createChart, mockFetcher, assert) {
    let chart = createChart({ fetcher: mockFetcher });
    chart.setUrl('?dataset=test');
    assert.equal(chart.getData().lines.length, 1);
}
```

### Decision: Rewrite or Convert?

**Option A: Run both formats**
- Keep old tests as-is
- New tests use new format
- Pro: No risk to existing tests
- Con: Two test runners

**Option B: Convert old tests**
- Write converter script
- Transform old format to new format
- Pro: Single test suite
- Con: Risk of conversion bugs

**Recommendation**: Start with Option A, consider Option B later.

## Phase 3: prices-app Migration

### Goal
Replace state management in prices-app with Auto4 Chart.

### Current Architecture
```
state/
├── index.js    → init_global_state()
├── url.js      → URL parsing/generation
├── lines.js    → Data transformation pipeline
├── chart.js    → Chart calculations
└── ...         → Other modules
```

### Target Architecture
```
state/
├── chart.js    → createChart() with blocks
└── blocks/
    ├── urlParser.js
    ├── dataFetcher.js
    ├── dataProcessor.js
    └── chartRenderer.js
```

### Migration Steps

1. **Create Chart wrapper**
   ```javascript
   // state/chart.js
   import { createChart } from '@autolib/auto4';
   import { productionFetcher } from './fetcher.js';

   export const chart = createChart({
       fetcher: productionFetcher,
       tracer: process.env.NODE_ENV === 'development'
   });
   ```

2. **Map existing modules to blocks**

   | Current Module | Auto4 Block |
   |----------------|-------------|
   | url.js (init_url, update_url) | urlParser, urlState |
   | lines.js (lines_00-07) | dataProcessor |
   | chart.js | chartRenderer |
   | data.js + fetch.js | dataFetcher |

3. **Migrate lines.js pipeline**
   ```javascript
   // Old: lines_00 → lines_01 → ... → lines_07
   // New: Single block with clear transformation stages

   const dataProcessorBlock = {
       name: 'dataProcessor',
       needs: ['rawData', 'currency', 'frequency', 'dateRange'],
       gives: ['processedData'],
       state: {
           // Explicit stages
           filtered: ($) => filterDatasets($.rawData),
           colored: ($) => addColors($.filtered),
           converted: ($) => convertCurrency($.colored, $.currency),
           frequencyAdjusted: ($) => adjustFrequency($.converted, $.frequency),
           withDates: ($) => addDatePoints($.frequencyAdjusted),
           volumeConverted: ($) => convertVolumes($.withDates),
           indexed: ($) => addIndexValues($.volumeConverted),
           processedData: ($) => filterByRange($.indexed, $.dateRange)
       }
   };
   ```

4. **Update Svelte components**
   ```svelte
   <!-- Old -->
   <script>
       import { getContext } from 'svelte';
       const state = getContext('global_key');
       $: data = $state.charts;
   </script>

   <!-- New -->
   <script>
       import { chart } from '../state/chart.js';
       const { lines, labels } = chart['#'];
   </script>
   ```

5. **Test incrementally**
   - Replace one module at a time
   - Verify URL round-trip after each change
   - Run existing tests

## Phase 4: trade-portal-app-v2 Migration

### Goal
Same as prices-app, but with TypeScript.

### Additional Considerations

1. **TypeScript definitions**
   ```typescript
   // types/auto4.d.ts
   interface Chart<T> {
       setUrl(url: string): void;
       getUrl(): string;
       getData(): ChartData;
       setCurrency(currency: string): void;
       // ...
   }

   interface Block<N extends string[], G extends string[]> {
       name: string;
       needs: N;
       gives: G;
       state: Record<string, any>;
   }
   ```

2. **Handle order-dependent init**
   - Current: Manual wiring with `connect()`
   - New: Auto-wiring via needs/gives
   - Benefit: Eliminates init order bugs

3. **Fix URL timing issue**
   - Current: Hack with delayed date parsing
   - New: Proper dependency declaration
   ```javascript
   // data_dates is a dependency of URL parsing
   const urlParserBlock = {
       needs: ['rawUrl', 'availableDates'], // explicit dependency
       // ...
   };
   ```

## Phase 5: Shared Blocks

### Goal
Extract common blocks that work in both apps.

### Shared Blocks

1. **currencyConverter**
   - Needs: data, currency, rates
   - Gives: convertedData

2. **frequencyConverter**
   - Needs: data, frequency
   - Gives: frequencyAdjustedData

3. **dateRangeFilter**
   - Needs: data, start, end
   - Gives: filteredData

4. **urlSerializer**
   - Needs: all config values
   - Gives: url

### Per-App Blocks

- prices-app: comparison lines, volume units, yearview
- trade-portal: partner aggregation, product groups, ECharts options

## Timeline

**Week 1-2: Phase 1**
- Port core files
- Implement compatibility layer
- Pass all 66 tests

**Week 3-4: Phase 2**
- Add blocks and tracer
- Write new-format tests
- Dual test runner

**Week 5-8: Phase 3**
- prices-app migration
- One module per week
- Full test coverage

**Week 9-12: Phase 4**
- trade-portal migration
- TypeScript definitions
- Fix timing issues

**Week 13+: Phase 5**
- Extract shared blocks
- Documentation
- Performance tuning

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking existing functionality | Run old tests continuously |
| Performance regression | Benchmark before/after |
| Svelte integration issues | Test store bridge thoroughly |
| Async edge cases | Port async tests first |
| URL round-trip failures | Test-007 is critical gate |

## Success Criteria

1. All 66 existing tests pass
2. All 10 new-format tests pass
3. URL round-trip works perfectly
4. No performance regression
5. Tracing helps debugging
6. Code is simpler and more testable
