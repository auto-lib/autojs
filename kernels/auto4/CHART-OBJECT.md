# The Chart Object

## Core Idea

Every time you initialize state, you're really initializing a **Chart**.

The Chart object is the central abstraction in Auto4. It represents a complete,
self-contained unit of chart state that can be:

- Configured via URL
- Queried for data
- Mutated through explicit methods
- Traced for debugging
- Tested without a browser

## Usage

### Creating a Chart

```javascript
import { createChart } from './chart.js';

// Create with dependencies
let chart = createChart({
    fetcher: myFetcher,     // Data fetching implementation
    tracer: true            // Enable execution tracing
});
```

### The Fetcher

The fetcher is an injectable dependency that handles data fetching:

```javascript
// Production fetcher
const productionFetcher = {
    async fetchDataset(datasetId) {
        const response = await fetch(`/api/dataset/${datasetId}`);
        return response.json();
    },
    async fetchCurrencyRates(currency) {
        const response = await fetch(`/api/rates/${currency}`);
        return response.json();
    }
};

// Test fetcher (mock)
const mockFetcher = {
    async fetchDataset(datasetId) {
        return mockData[datasetId];
    },
    async fetchCurrencyRates(currency) {
        return mockRates[currency];
    }
};
```

### Lifecycle

```javascript
// 1. Create chart
let chart = createChart({ fetcher: mockFetcher });

// 2. Chart exists but is not ready
chart.isReady();        // false
chart.getData();        // throws: "URL not set"

// 3. Set URL (initializes from URL parameters)
chart.setUrl('?dataset=brent&currency=USD');

// 4. Now chart is ready
chart.isReady();        // true
let data = chart.getData();
// { lines: [...], labels: [...], dates: [...] }
```

## API Reference

### Configuration

```javascript
chart.setUrl(urlString)           // Initialize from URL
chart.getUrl()                    // Get current state as URL

chart.setDataset(datasetId)       // Set dataset
chart.setCurrency(currency)       // Set currency (triggers conversion)
chart.setFrequency(frequency)     // Set frequency (daily/weekly/monthly)
chart.setDateRange(start, end)    // Set visible date range
chart.setCompare([...datasetIds]) // Add comparison datasets
```

### Data Access

```javascript
chart.getData()           // Get chart data { lines, labels, dates }
chart.getDataset()        // Get current dataset info
chart.getCurrency()       // Get current currency
chart.getFrequency()      // Get current frequency
chart.getDateRange()      // Get { start, end }
chart.getRawData()        // Get unprocessed fetched data
```

### State Queries

```javascript
chart.isReady()           // Is chart fully initialized?
chart.isLoading()         // Is data currently being fetched?
chart.hasError()          // Did an error occur?
chart.getError()          // Get error details
```

### Tracing

```javascript
chart.getTrace()          // Get trace from last operation
chart.getTraces()         // Get all traces
chart.clearTraces()       // Clear trace history
```

### Components

```javascript
let { urlParser, fetcher, processor, renderer } = chart.components;

// Each component is a Block with its own state
urlParser.state;          // { rawUrl, dataset, currency, ... }
processor.state;          // { rawData, convertedData, ... }
```

## The Trace

Every state change produces a trace showing the full path of effects:

```javascript
chart.setCurrency('EUR');
let trace = chart.getTrace();

// Trace structure:
{
    id: 42,
    timestamp: 1704326400000,
    trigger: {
        type: 'setCurrency',
        value: 'EUR'
    },
    steps: [
        { block: 'config', key: 'currency', from: 'USD', to: 'EUR' },
        { block: 'processor', key: 'needsConversion', from: false, to: true },
        { block: 'processor', key: 'convertedPrices', recomputed: true },
        { block: 'renderer', key: 'lines', recomputed: true },
        { block: 'urlState', key: 'url', from: '?...USD', to: '?...EUR' }
    ],
    duration: 5  // ms
}
```

## URL Round-Trip Test

A critical test is the URL round-trip:

```javascript
// Set initial URL
chart.setUrl('?dataset=brent&currency=USD&start=2024-01');

// Make a change
chart.setCurrency('EUR');

// Get the resulting URL
let newUrl = chart.getUrl();
// '?dataset=brent&currency=EUR&start=2024-01'

// Set that exact URL
chart.setUrl(newUrl);

// Trace should show no changes
let trace = chart.getTrace();
assert.deepEqual(trace.steps, []);  // Nothing changed!
```

This validates:
1. URL generation correctly reflects state
2. URL parsing correctly sets state
3. No spurious recomputations

## Component Architecture

The Chart is composed of Blocks:

```
┌─────────────────────────────────────────────────────────────────────┐
│                            CHART                                     │
│                                                                      │
│  ┌──────────────┐   ┌──────────────┐   ┌───────────────┐            │
│  │  URL Parser  │──▶│ Data Fetcher │──▶│Data Processor │            │
│  │              │   │              │   │               │            │
│  │ needs:       │   │ needs:       │   │ needs:        │            │
│  │   rawUrl     │   │   dataset    │   │   rawData     │            │
│  │              │   │              │   │   currency    │            │
│  │ gives:       │   │ gives:       │   │   frequency   │            │
│  │   dataset    │   │   rawData    │   │               │            │
│  │   currency   │   │   loading    │   │ gives:        │            │
│  │   start      │   │   error      │   │   processedData│           │
│  │   end        │   │              │   │               │            │
│  └──────────────┘   └──────────────┘   └───────────────┘            │
│          │                                      │                    │
│          │                                      ▼                    │
│          │                            ┌───────────────┐             │
│          │                            │Chart Renderer │             │
│          │                            │               │             │
│          │                            │ needs:        │             │
│          │                            │   processedData│            │
│          │                            │   dimensions  │             │
│          │                            │               │             │
│          │                            │ gives:        │             │
│          │                            │   lines       │             │
│          │                            │   scales      │             │
│          │                            │   tooltips    │             │
│          │                            └───────────────┘             │
│          │                                      │                    │
│          ▼                                      ▼                    │
│  ┌──────────────────────────────────────────────────┐               │
│  │                   URL State                       │               │
│  │                                                   │               │
│  │  needs: dataset, currency, start, end, lines     │               │
│  │  gives: url                                       │               │
│  └──────────────────────────────────────────────────┘               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Block Definitions

**URL Parser Block**
```javascript
{
    name: 'urlParser',
    needs: ['rawUrl'],
    gives: ['dataset', 'currency', 'frequency', 'start', 'end', 'compare'],
    state: {
        rawUrl: null,
        dataset: ($) => $.rawUrl ? parseParam($.rawUrl, 'dataset') : null,
        currency: ($) => $.rawUrl ? parseParam($.rawUrl, 'currency') || 'USD' : 'USD',
        frequency: ($) => $.rawUrl ? parseParam($.rawUrl, 'convert') || 'daily' : 'daily',
        start: ($) => $.rawUrl ? parseParam($.rawUrl, 'start') : null,
        end: ($) => $.rawUrl ? parseParam($.rawUrl, 'end') : null,
        compare: ($) => $.rawUrl ? parseParam($.rawUrl, 'compare')?.split(',') || [] : []
    }
}
```

**Data Fetcher Block**
```javascript
{
    name: 'dataFetcher',
    needs: ['dataset'],
    gives: ['rawData', 'loading', 'error'],
    init: (block, { fetcher }) => {
        block.fetcher = fetcher;  // Inject dependency
    },
    state: {
        dataset: null,
        rawData: async ($, set) => {
            if (!$.dataset) return null;
            try {
                const data = await $.fetcher.fetchDataset($.dataset);
                set(data);
            } catch (e) {
                $.error = e.message;
                set(null);
            }
        },
        loading: ($) => $.rawData === undefined,
        error: null
    }
}
```

**Data Processor Block**
```javascript
{
    name: 'dataProcessor',
    needs: ['rawData', 'currency', 'frequency'],
    gives: ['processedData'],
    state: {
        rawData: null,
        currency: 'USD',
        frequency: 'daily',

        // Multi-stage transformation
        converted: ($) => $.rawData ? convertCurrency($.rawData, $.currency) : null,
        frequencyAdjusted: ($) => $.converted ? adjustFrequency($.converted, $.frequency) : null,
        processedData: ($) => $.frequencyAdjusted
    }
}
```

**Chart Renderer Block**
```javascript
{
    name: 'chartRenderer',
    needs: ['processedData', 'dimensions'],
    gives: ['lines', 'scales', 'tooltips'],
    state: {
        processedData: null,
        dimensions: { width: 800, height: 400 },

        lines: ($) => $.processedData ? computeLines($.processedData) : [],
        scales: ($) => $.processedData ? computeScales($.processedData, $.dimensions) : null,
        tooltips: ($) => $.lines ? computeTooltips($.lines) : []
    }
}
```

**URL State Block**
```javascript
{
    name: 'urlState',
    needs: ['dataset', 'currency', 'frequency', 'start', 'end'],
    gives: ['url'],
    state: {
        dataset: null,
        currency: 'USD',
        frequency: 'daily',
        start: null,
        end: null,

        url: ($) => {
            if (!$.dataset) return null;
            let params = new URLSearchParams();
            params.set('dataset', $.dataset);
            if ($.currency !== 'USD') params.set('currency', $.currency);
            if ($.frequency !== 'daily') params.set('convert', $.frequency);
            if ($.start) params.set('start', $.start);
            if ($.end) params.set('end', $.end);
            return '?' + params.toString();
        }
    }
}
```

## Svelte Integration

The Chart provides Svelte store access via the `['#']` pattern:

```svelte
<script>
    import { createChart } from './chart.js';

    const chart = createChart({ fetcher });
    const stores = chart['#'];

    // Destructure stores
    const { lines, labels, currency, loading } = stores;

    // Use in template
</script>

{#if $loading}
    <Loading />
{:else}
    <ChartDisplay lines={$lines} labels={$labels} />
{/if}

<CurrencySelector bind:value={$currency} />
```

## Testing Patterns

### Basic Test
```javascript
// test-001-basic-init.js
import { createChart, mockFetcher } from './chart.js';

let chart = createChart({ fetcher: mockFetcher });

// Not ready before URL
assert.equal(chart.isReady(), false);
assert.throws(() => chart.getData());

// Ready after URL
chart.setUrl('?dataset=test');
assert.equal(chart.isReady(), true);
```

### Trace Test
```javascript
// test-006-trace-basic.js
let chart = createChart({ fetcher: mockFetcher, tracer: true });
chart.setUrl('?dataset=test&currency=USD');

chart.setCurrency('EUR');
let trace = chart.getTrace();

assert.equal(trace.trigger.type, 'setCurrency');
assert.equal(trace.trigger.value, 'EUR');
assert.ok(trace.steps.some(s => s.key === 'currency'));
assert.ok(trace.steps.some(s => s.key === 'convertedPrices'));
```

### URL Round-Trip Test
```javascript
// test-007-url-roundtrip.js
let chart = createChart({ fetcher: mockFetcher, tracer: true });

chart.setUrl('?dataset=test&currency=USD&start=2024-01');
chart.setCurrency('EUR');

let newUrl = chart.getUrl();
chart.setUrl(newUrl);

let trace = chart.getTrace();
assert.deepEqual(trace.steps, []);  // No changes!
```

### Component Test
```javascript
// test-008-components.js
let chart = createChart({ fetcher: mockFetcher });
chart.setUrl('?dataset=test');

let { urlParser, processor } = chart.components;

// Access component state directly
assert.equal(urlParser.state.dataset, 'test');
assert.ok(processor.state.processedData);
```

## Open Design Questions

1. **Circular URL Updates**: When state changes URL, and URL re-parses, how to prevent loops?
2. **Partial State**: What if only some URL params are set?
3. **Error Propagation**: How do errors in one block affect getData()?
4. **Async Loading**: How to handle loading states in traces?
5. **Dimensions**: Where do chart dimensions come from? (Window size? Container? Props?)
