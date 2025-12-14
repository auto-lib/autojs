# Auto4: Chart-Centric State Management

## Vision

Auto4 is a reimagining of the auto state management library with a clear focus:

**The central object is a Chart** - every time you initialize state, you're really initializing a chart.

This library is designed for two real-world applications:
- `prices-app` - Price charting application
- `trade-portal-app-v2` - Trade data visualization

Both share fundamental requirements:
1. **URL-encoded state** - Refreshing the browser reproduces the exact app state
2. **Embeddable** - State works correctly when embedded in other apps
3. **Traceable** - You can see exactly how state changes propagate
4. **Testable** - Pure JavaScript testing without browser/framework

## The Chart Object

```javascript
// Pure JavaScript - no framework, no browser
let chart = createChart({
    fetcher: mockFetcher  // Injectable for testing
});

// Try to get data before configuration - error
chart.getData();  // Error: URL not set

// Set URL (as if user navigated)
chart.setUrl('?dataset=brent&currency=USD&start=2024-01');

// Now we can get chart data
let data = chart.getData();
// { lines: [...], labels: [...], dates: [...] }

// Make a change
chart.setCurrency('EUR');

// Trace shows the full path of that change
let trace = chart.getTrace();
// {
//   trigger: { type: 'set', key: 'currency', value: 'EUR' },
//   steps: [
//     { name: 'currency', from: 'USD', to: 'EUR' },
//     { name: 'convertedPrices', recomputed: true },
//     { name: 'chartData', recomputed: true },
//     { name: 'url', from: '?...&currency=USD', to: '?...&currency=EUR' }
//   ]
// }

// Get the new URL
let newUrl = chart.getUrl();
// '?dataset=brent&currency=EUR&start=2024-01'

// Set the same URL - nothing should change
chart.setUrl(newUrl);
let trace2 = chart.getTrace();
// { trigger: { type: 'setUrl', value: '...' }, steps: [] }  // Empty - no change

// Open up the components
let { urlParser, dataFetcher, dataProcessor } = chart.components;

// Each is also a state object you can inspect
console.log(urlParser.state);
// { dataset: 'brent', currency: 'EUR', start: '2024-01', ... }
```

## Key Principles

### 1. Controlled Access
- State is accessed through the chart object, not scattered globals
- Components are composable and swappable
- Dependencies are explicit and injectable

### 2. URL as Source of Truth
- URL encodes the complete configuration state
- `chart.setUrl(url)` is the primary way to initialize state
- `chart.getUrl()` always reflects current state
- Bidirectional sync: URL changes trigger state, state changes update URL

### 3. Full Traceability
- Every state change produces a trace
- Traces show the complete path: trigger -> intermediate steps -> final effects
- Useful for debugging, testing, and understanding the system

### 4. Component Architecture
Components are the building blocks:

```
Chart
├── UrlParser      - Parses/generates URL parameters
├── DataFetcher    - Handles API calls (injectable/mockable)
├── DataProcessor  - Transforms raw data (currency, frequency, etc.)
├── ChartRenderer  - Calculates scales, paths, tooltips
└── State          - Reactive state container (auto-based)
```

Each component:
- Has its own state variables
- Can be accessed and tested independently
- Connects to other components via defined interfaces

### 5. Testing Philosophy
Tests are pure JavaScript, no DOM, no framework:

```javascript
// test-001-basic-init.js
import { createChart } from './chart.js';

let chart = createChart({ fetcher: mockFetcher });

// Before URL set
assert.throws(() => chart.getData(), 'URL not set');

// After URL set
chart.setUrl('?dataset=brent');
let data = chart.getData();
assert.ok(data.lines.length > 0);
```

Progressive complexity:
1. Basic initialization
2. URL parsing
3. Data fetching (mocked)
4. Data transformation
5. State changes and tracing
6. URL round-trip (set -> change -> getUrl -> setUrl -> no change)
7. Component composition
8. Block-based architecture
9. Cross-block tracing

## Building on auto3

Auto4 builds on the kernel/block architecture from auto3:

- **Kernel**: Policy-based intent router
- **Graph**: Reactive handler configurations
- **Blocks**: Composable units with `needs` and `gives`
- **Tracer**: Records execution for diffing

The key addition is the **Chart** abstraction that ties everything together
with a domain-specific API.

## Migration Path

The goal is to replace the current auto library usage in both apps:

1. **Pass old tests**: New library must pass existing test suite
2. **New test format**: Write new tests in the simpler format shown above
3. **Gradual replacement**: Can convert old tests or run both formats
4. **Feature parity**: All current features work (batching, async, subscriptions)
5. **New features**: Blocks, tracing, URL-centric design

## Directory Structure

```
kernels/auto4/
├── README.md           # This file
├── ARCHITECTURE.md     # Technical architecture details
├── APPS-ANALYSIS.md    # Analysis of prices-app and trade-portal
├── CHART-OBJECT.md     # The chart abstraction in detail
├── MIGRATION.md        # Path to replace current library
├── TESTS-PLAN.md       # Testing strategy
│
├── src/
│   ├── kernel.js       # Core intent router (from auto3)
│   ├── graph.js        # Reactive handlers (from auto3)
│   ├── block.js        # Block composition (from auto3)
│   ├── tracer.js       # Execution tracing (from auto3)
│   ├── auto.js         # Convenience wrapper (from auto3)
│   └── chart.js        # The Chart abstraction (NEW)
│
└── tests/
    ├── test-001-basic-init.js
    ├── test-002-url-parse.js
    ├── test-003-data-fetch.js
    ├── test-004-data-transform.js
    ├── test-005-state-change.js
    ├── test-006-trace-basic.js
    ├── test-007-url-roundtrip.js
    ├── test-008-components.js
    ├── test-009-blocks.js
    └── test-010-cross-block-trace.js
```

## Status

This is a design document and planning workspace. The implementation will
proceed incrementally, starting with the simplest tests and building up.
