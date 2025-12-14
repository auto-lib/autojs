# Auto4 Architecture

## Overview

Auto4 is built in layers, each adding capabilities:

```
┌─────────────────────────────────────────────────────┐
│  Chart - domain-specific API for chart apps         │
│  (createChart, setUrl, getData, setCurrency, etc.)  │
├─────────────────────────────────────────────────────┤
│  Tracer - execution recording and diffing           │
│  (data diff, flow diff, code diff)                  │
├─────────────────────────────────────────────────────┤
│  Block - composable units with needs/gives          │
│  (wiring, cross-block communication)                │
├─────────────────────────────────────────────────────┤
│  Auto - single-block convenience API                │
│  ($.x syntax wrapper)                               │
├─────────────────────────────────────────────────────┤
│  Graph - reactive semantics                         │
│  (get, set, run, define, invalidate)                │
├─────────────────────────────────────────────────────┤
│  Kernel - intent router and policy engine           │
│  (immediate, deferred, dispatch, drop)              │
└─────────────────────────────────────────────────────┘
```

## Layer 1: Kernel (kernel.js)

The kernel is a universal intent processor. Everything is a signal.

### Signals
```javascript
sig('get', 'currency')      // Read a value
sig('set', { currency: 'EUR' })  // Write a value
sig('run', 'computedProp')  // Execute a computed function
```

### Policies
Each signal type has a policy:
- `immediate` - Execute now, return a value
- `deferred` - Queue for later execution
- `dispatch` - Send to another kernel/block
- `drop` - Ignore

### Queue and Execution
```javascript
kernel.send(sig('set', { x: 1 }));  // Queues the intent
kernel.step();  // Process one intent
kernel.run();   // Process all queued intents
```

### Transforms
Middleware that intercepts intents:
```javascript
kernel.addTransform((intent, state, sig) => {
    console.log('Intent:', intent);
    return intent;  // Pass through (or modify/drop)
});
```

### Peers
Connect kernels for cross-kernel communication:
```javascript
kernel.addPeer(otherKernel);
// Now 'dispatch' policy can route to other kernel
```

## Layer 2: Graph (graph.js)

Provides reactive semantics as handler configurations for the kernel.

### Handlers
- **get** - Read a value, track dependencies during computation
- **set** - Store value, trigger dependents via invalidation
- **run** - Execute a computed function, track its dependencies
- **define** - Define static or computed values
- **invalidate** - Cascade recomputation through dependents

### Dependency Tracking
```javascript
// During 'run' of function 'total':
sig('get', 'price')    // Records: total depends on price
sig('get', 'quantity') // Records: total depends on quantity
// Now changing 'price' or 'quantity' invalidates 'total'
```

### Circular Detection
```javascript
sig('check_circle', 'newDep')  // Throws if would create cycle
```

## Layer 3: Auto (auto.js)

Wraps kernel + graph with a friendly proxy API.

### The $ Proxy
```javascript
let $ = auto({
    price: 100,
    quantity: 2,
    total: ($) => $.price * $.quantity
});

$.price = 150;       // Triggers: set -> invalidate -> run
console.log($.total);  // 300 (automatically recomputed)
```

### Error Detection
- Side effects in functions -> fatal error
- Circular dependencies -> fatal error

## Layer 4: Block (block.js)

Composable units of reactivity with explicit interfaces.

### Block Structure
```javascript
{
    name: 'urlParser',
    needs: ['rawUrl'],           // Expected inputs
    gives: ['dataset', 'currency', 'start', 'end'],  // Outputs
    state: {
        rawUrl: null,
        dataset: ($) => parseDataset($.rawUrl),
        currency: ($) => parseCurrency($.rawUrl),
        // ...
    }
}
```

### Wiring
```javascript
wire('rawUrl', urlParserBlock, 'rawUrl');
// When 'rawUrl' changes, it flows to urlParserBlock
```

### Auto-wiring
```javascript
autoWire([urlParserBlock, dataFetcherBlock, chartBlock]);
// Automatically connects matching needs/gives names
```

### Cross-block Communication
Uses kernel dispatch policy:
- Block emits `output` signal for `gives` values
- Route function looks up wires
- Target block receives `input` signal

## Layer 5: Tracer (tracer.js)

Records execution for debugging and testing.

### Recording
```javascript
tracer.startRun({ description: 'currency change' });
// ... execute changes ...
tracer.endRun(finalState, handlers);
```

### Three Levels of Diffing

**Data Diff** - What values changed?
```javascript
tracer.diffData(runId1, runId2);
// { changed: ['currency', 'convertedPrices'], added: [], removed: [], unchanged: ['dataset'] }
```

**Flow Diff** - What execution path was taken?
```javascript
tracer.diffFlow(runId1, runId2);
// { matched: [...], onlyInRun1: [...], onlyInRun2: [...] }
```

**Code Diff** - What handlers changed?
```javascript
tracer.diffCode(runId1, runId2);
// { changed: [], added: [], removed: [] }
```

### Hashing
- Each handler is hashed (function code + policy)
- Allows detecting code changes between runs
- Deterministic across identical code

## Layer 6: Chart (chart.js)

Domain-specific API tying everything together.

### Creation
```javascript
let chart = createChart({
    fetcher: customFetcher,  // Injectable
    tracer: true             // Enable tracing
});
```

### URL-Centric API
```javascript
chart.setUrl('?dataset=brent&currency=USD');
chart.getUrl();  // Current state as URL
```

### Data Access
```javascript
chart.getData();      // Chart lines, labels, dates
chart.getDataset();   // Current dataset info
chart.getCurrency();  // Current currency
```

### Mutations
```javascript
chart.setCurrency('EUR');
chart.setDateRange('2024-01', '2024-12');
chart.setFrequency('monthly');
```

### Tracing
```javascript
chart.setCurrency('EUR');
let trace = chart.getTrace();
// Full path from trigger to all effects
```

### Components
```javascript
let { urlParser, fetcher, processor, renderer } = chart.components;
// Each component is a Block with its own state
```

## Data Flow

```
URL String
    │
    ▼
┌──────────────┐
│  URL Parser  │  Block: needs[rawUrl] gives[dataset,currency,start,end,...]
└──────────────┘
    │
    ▼
┌──────────────┐
│ Data Fetcher │  Block: needs[dataset] gives[rawData]
└──────────────┘
    │
    ▼
┌───────────────┐
│Data Processor │  Block: needs[rawData,currency,frequency] gives[processedData]
└───────────────┘
    │
    ▼
┌───────────────┐
│Chart Renderer │  Block: needs[processedData,dimensions] gives[lines,scales,paths]
└───────────────┘
    │
    ▼
Chart Data (lines, labels, tooltips)
```

## State Change Flow

```
User Action (e.g., setCurrency('EUR'))
    │
    ▼
Chart.setCurrency('EUR')
    │
    ▼
sig('set', { currency: 'EUR' })
    │
    ▼ (kernel processes)
sig('invalidate', ['convertedPrices', ...])
    │
    ▼
sig('run', 'convertedPrices')
    │
    ▼ (during run, emits output)
sig('output', { convertedPrices: [...] })
    │
    ▼ (dispatch to wired blocks)
sig('input', { processedData: [...] })
    │
    ▼
... cascades through all affected blocks ...
    │
    ▼
URL updates, trace recorded
```

## Key Invariants

1. **Everything is an intent** - Serializable, hashable, traceable
2. **Policies are declarative** - Easy to compare and reason about
3. **Flow is explicit via dispatch** - Can see exactly what goes where
4. **No side effects in computed functions** - Enforced at runtime
5. **URL always reflects state** - Bidirectional sync
6. **Traces are complete** - Show full path from trigger to effects

## Comparison to Current Auto Library

| Aspect | Current Auto | Auto4 |
|--------|--------------|-------|
| Core | Single reactive object | Kernel + blocks |
| API | `$.x` proxy | Chart object + blocks |
| Composition | One big state | Multiple blocks with interfaces |
| Tracing | Transaction trace | Full execution recording + diff |
| URL | App-specific | Built into Chart abstraction |
| Testing | Internal state matching | Behavioral + trace-based |
| Dependencies | Implicit via access | Explicit needs/gives |

## Open Questions

1. **Svelte Integration**: How does `['#']` store bridge work with blocks?
2. **Async Handling**: How do async fetches interact with tracing?
3. **Error Boundaries**: How do errors in one block affect others?
4. **Hot Reload**: Can blocks be replaced without losing state?
5. **Performance**: Overhead of kernel dispatch vs direct calls?
