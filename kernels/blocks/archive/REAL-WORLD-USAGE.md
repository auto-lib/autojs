# Real-World Usage of Auto.js in Charting Applications

This document explains how auto.js is actually used in production charting applications (`prices-app` and `trade-portal-app-v2`), with emphasis on the critical distinction between URL and data.

## Key Concepts: URL vs Data

### URL - State Encoding String

**What it is**: A string (query parameters) that encodes the complete UI state of the chart application.

**Purpose**: When you navigate to a URL, the chart appears consistently with the same configuration and UI controls.

**Examples**:
```
# Prices App
/data/prices/salmon/overview
?dataset=brent&currency=USD&start=2024-01&end=2024-12&frequency=monthly

# Trade Portal
?regions=156,392&flow=Import&products=0304,1604&view=bar&currency=USD&startdate=2023&enddate=2024
```

**What it controls**:
- Selected dataset/products
- Currency selection (USD, EUR, etc.)
- Date range (start/end dates)
- Frequency (monthly, weekly, etc.)
- Chart view type (bar, line, table, etc.)
- UI toggle states
- Filters and comparisons

**Key insight**: The URL is the *configuration* of the chart, not the source of data.

### Data - External Data Source

**What it is**: The actual data that feeds the chart - typically from an API, but can be files or test fixtures.

**Purpose**: Provides the raw numbers, prices, dates, and metadata that get visualized.

**Examples**:
```javascript
// Prices App - fetching dataset prices
const base = 'https://api.ucn-data.com';
const data = await fetch(`${base}/titles`);
// Returns: [
//   { id: 1, name: "Guangdong shrimp", prices: [...], dates: [...] },
//   { id: 2, name: "Norway salmon", prices: [...], dates: [...] }
// ]

// Trade Portal - fetching trade statistics
const client = createTRPCProxyClient<AppRouter>({
    url: PUBLIC_API_URL + '/trpc'
});
const data = await client.trade.query({
    regions: [156, 392],
    products: ['0304', '1604'],
    flow: 'Import'
});
// Returns: { dates: [...], values: [...], volumes: [...] }

// Testing - static data
const data = {
    prices: [100, 105, 103, 108, 112],
    dates: ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05']
};
```

**Common data sources**:
- `/datasets/usd_rates.json` - Currency exchange rates
- `https://api.ucn-data.com/titles` - All available datasets
- `https://api.ucn-data.com/dataset/${name}` - Specific dataset prices
- tRPC endpoints - Trade flow data (values, volumes by country/product/time)

## Architecture Pattern

Both apps follow a similar reactive pattern using auto.js:

### 1. State Structure

State is organized into logical modules:

```javascript
// prices-app/src/state/index.js
export default {
    setup,      // Initial setup and configuration
    theme,      // Theme/styling
    dataset,    // Selected dataset(s)
    data,       // Data fetching and processing
    url,        // URL parsing and generation
    params,     // UI parameters (currency, frequency, date range)
    lines,      // Chart line data
    range,      // Date range handling
    chart,      // Chart rendering
    // ... component-specific state
}
```

### 2. URL Parsing

URL parameters are parsed and set into the auto state:

```javascript
// prices-app/src/state/url.js
export function init_url($, payload) {
    let __url = $.external_url ? $.external_url : window.location.toString();
    let _url = new URL(__url);

    // Parse query parameters and set state
    $.currency = getval(_url, 'currency', 'USD');
    $.frequency = getval(_url, 'frequency', 'monthly');
    $.start_date = getval(_url, 'start', null);
    $.end_date = getval(_url, 'end', null);

    // ... more parameter parsing
}
```

```javascript
// trade-portal-app-v2/src/js/url.ts
export function init_url(url_search_params, flow, toggle, inert, data, api, url) {
    let regions = params.get("regions");  // "156,392"
    let products = params.get("products");  // "0304,1604"
    let flow_type = params.get("flow");  // "Import" or "Export"

    // Set into reactive state
    flow.flow_region_labels = get_region_labels(regions.split(","));
    flow.flow_product_labels = products.split(',');
    flow.flow_import_export = flow_type;

    toggle.toggle_currency = params.get("currency") || "USD";
    toggle.toggle_frequency = params.get("frequency") || "Monthly";
    // ... more UI state
}
```

### 3. Data Fetching

Data is fetched based on URL-derived state, using async functions:

```javascript
// prices-app/src/state/data.js
export default {
    // Async data fetch - returns promise
    data_000_async: async ($) => {
        if ($.fixed_data) return $.fixed_data;  // For testing

        const base = import.meta.env.VITE_UCN_API == 'live'
            ? 'https://api.ucn-data.com'
            : 'http://localhost:8000';

        let url = `${base}/dataset/${$.url_name}`;
        if ($.datasetcomparisons && $.datasetcomparisons.length > 0) {
            url = url + ',' + $.datasetcomparisons.join(',');
        }

        return await fetch_url(url);
    },

    // Computed: Process fetched data
    data_001_colors: ($) =>
        $.data_000_async == null ? null :
        $.data_000_async.map((dataset, i) => ({
            ...dataset,
            color: COLORS.find(c => c.category == dataset.category)?.hex
        })),

    // Computed: Filter data
    data: ($) =>
        $.specie_filter && $.data_002_ensure_count
            ? $.data_002_ensure_count.filter(d => d.specie == $.specie_filter)
            : $.data_002_ensure_count
}
```

```javascript
// trade-portal-app-v2/src/js/api.ts
async function call_api(global_auto, inert, api, data, toggle, flow, url, chart) {
    // Build API request from state
    const params = {
        regions: flow.flow_region_numbers,
        products: flow.flow_product_codes,
        flow: flow.flow_import_export,
        period_start: api.api_period_start,
        period_end: api.api_period_end,
        // ... more parameters
    };

    // Check cache first
    const cacheKey = JSON.stringify({ params });
    let cached = getWithExpiry(cacheKey);
    if (cached) return cached;

    // Call API
    const client = await get_client();
    const result = await client.trade.query(params);

    // Cache result
    setWithExpiry(cacheKey, result, 1000 * 60 * 60);  // 1 hour

    return result;
}
```

### 4. Reactive Data Pipeline

Data flows through a chain of computed values:

```javascript
// URL → URL parsing
$.external_url = "?dataset=salmon&currency=EUR&start=2024-01"

// URL params → State
$.url_name = "salmon"
$.ui_currency = "EUR"
$.ui_frequency = "monthly"

// State → Data fetch
$.data_000_async = fetch(`${api}/dataset/salmon`)

// Data → Processing
$.data_001_colors = $.data_000_async.map(addColors)
$.data_002_ensure_count = $.data_001_colors.filter(minQuotes)
$.data = $.specie_filter ? $.data_002_ensure_count.filter(...) : $.data_002_ensure_count

// Data → Dataset selection
$.dataset = $.data.find(d => d.url_name == $.url_name)

// Dataset → Currency conversion
$.currency = $.ui_currency || $.dataset.currency
$.rates_000_async = fetch('/datasets/usd_rates.json')
$.ratesToUsd = $.rates_000_async

// Dataset + params → Chart data
$.lines_02 = $.dataset.prices.map(convertCurrency)
$.mainpoints = $.lines_02.flatMap(processPoints)
$.mainchart = {
    points: $.mainpoints,
    min: Math.min(...$.mainpoints.map(p => p.price)),
    max: Math.max(...$.mainpoints.map(p => p.price))
}

// Chart data → Rendering
<Chart data={$._['#'].mainchart} />
```

### 5. URL Generation (Bi-directional Sync)

State changes update the URL:

```javascript
// prices-app/src/layouts/portal/salmon/state.ts
url: (_) => {
    if (_.embedded || !_.active) return;

    let url = `/data/prices/salmon/${_.active_tab.toLowerCase()}`;
    if (_.active_tab == 'countries') {
        url += `/${_.countries_tab.toLowerCase()}`;
    }

    window.history.pushState("", "", url);
}
```

This creates the **URL ⟷ State** bidirectional sync:
- URL → State (on page load/navigation)
- State → URL (on user interaction)

## Testing Implications for Blocks Kernel

### Current Blocks Example Was Wrong

The original example mixed up URL and data:

```javascript
// WRONG - url is not a data source
const result = await diffDrivenTest({
    url: 'http://api.example.com/prices?dataset=oil',  // ❌ This is state, not data source
    fetcher: mockFetcher,
    codeOriginal,
    codeModified
});
```

### Corrected Test Structure

```javascript
// CORRECT - url is state, data is the source
const result = await diffDrivenTest({
    // URL: Chart configuration (state)
    url: '?dataset=guangdong_shrimp&currency=EUR&start=2024-01&end=2024-12&frequency=monthly',

    // Data: External data source
    data: {
        source: 'https://api.ucn-data.com/titles',  // OR static for testing
        fetcher: mockFetcher  // Injectable for testing
    },

    codeOriginal,
    codeModified
});
```

### Real-World Test Example

```javascript
const pricesAppTest = {
    // State encoding
    url: {
        dataset: 'guangdong_shrimp_monthly_60',
        currency: 'USD',
        start: '2024-01',
        end: '2024-12',
        frequency: 'monthly',
        comparisons: ['norway_salmon', 'scotland_salmon']
    },

    // Data sources
    data: {
        datasets: mockFetcher('https://api.ucn-data.com/titles'),
        // Returns: [
        //   { id: 1, url_name: 'guangdong_shrimp_monthly_60', prices: [...], dates: [...] },
        //   { id: 2, url_name: 'norway_salmon', prices: [...], dates: [...] }
        // ]

        rates: mockFetcher('/datasets/usd_rates.json')
        // Returns: { EUR: 0.85, GBP: 0.73, ... }
    },

    // Code: Reactive computation blocks
    code: [
        // Block 1: URL parsing
        {
            name: 'url_parser',
            needs: ['url'],
            gives: ['dataset_name', 'currency', 'date_range', 'comparison_names'],
            state: {
                dataset_name: ($) => $.url.dataset,
                currency: ($) => $.url.currency,
                date_range: ($) => ({ start: $.url.start, end: $.url.end }),
                comparison_names: ($) => $.url.comparisons || []
            }
        },

        // Block 2: Data fetching
        {
            name: 'data_fetcher',
            needs: ['dataset_name', 'comparison_names'],
            gives: ['main_dataset', 'comparison_datasets'],
            state: {
                all_datasets: async ($) => await $.data.datasets(),
                main_dataset: ($) => $.all_datasets.find(d => d.url_name == $.dataset_name),
                comparison_datasets: ($) => $.comparison_names.map(
                    name => $.all_datasets.find(d => d.url_name == name)
                )
            }
        },

        // Block 3: Currency conversion
        {
            name: 'converter',
            needs: ['main_dataset', 'comparison_datasets', 'currency'],
            gives: ['converted_main', 'converted_comparisons'],
            state: {
                rates: async ($) => await $.data.rates(),
                rate: ($) => $.rates[$.currency] || 1.0,
                converted_main: ($) => ({
                    ...$.main_dataset,
                    prices: $.main_dataset.prices.map(p => p * $.rate)
                }),
                converted_comparisons: ($) => $.comparison_datasets.map(ds => ({
                    ...ds,
                    prices: ds.prices.map(p => p * $.rate)
                }))
            }
        },

        // Block 4: Chart data generation
        {
            name: 'chart_builder',
            needs: ['converted_main', 'converted_comparisons', 'date_range'],
            gives: ['chart_data'],
            state: {
                all_lines: ($) => [$.converted_main, ...$.converted_comparisons],
                filtered_by_date: ($) => $.all_lines.map(line => ({
                    ...line,
                    points: line.prices.map((price, i) => ({
                        date: line.dates[i],
                        price
                    })).filter(p =>
                        p.date >= $.date_range.start &&
                        p.date <= $.date_range.end
                    )
                })),
                chart_data: ($) => ({
                    lines: $.filtered_by_date,
                    xAxis: $.filtered_by_date[0].points.map(p => p.date),
                    series: $.filtered_by_date.map(line => ({
                        name: line.name,
                        data: line.points.map(p => p.price)
                    }))
                })
            }
        }
    ],

    // Expected chart output
    chart: {
        lines: [...],
        xAxis: ['2024-01', '2024-02', ...],
        series: [...]
    }
};
```

### Diff-Driven Testing Workflow

Now we can test the **exact same data** with **different configurations**:

```javascript
// Test 1: USD currency
const testUSD = {
    url: { dataset: 'shrimp', currency: 'USD', ... },
    data: sameMockData,
    code: blocks_v1
};

// Test 2: EUR currency (different URL state, same data)
const testEUR = {
    url: { dataset: 'shrimp', currency: 'EUR', ... },
    data: sameMockData,
    code: blocks_v1
};

// Test 3: Modified code (same state, same data)
const testModifiedCode = {
    url: { dataset: 'shrimp', currency: 'USD', ... },
    data: sameMockData,
    code: blocks_v2  // Different implementation
};

// Diff: USD vs EUR
const diff1 = compareResults(runTest(testUSD), runTest(testEUR));
// Shows: currency conversion applied, prices changed

// Diff: v1 vs v2 code
const diff2 = compareResults(runTest(testUSD), runTest(testModifiedCode));
// Shows: which blocks changed, which variables changed, causality trace
```

## Component Composition Pattern

Both apps use a pattern where components get slices of the global state:

```javascript
// prices-app/src/state.js
export let init_component_state = (global) => {
    let ret = {};

    // Find all component_* keys
    Object.keys(global['#']).forEach(key => {
        if (key.startsWith('component_')) {
            ret[key] = {};
            global[key].forEach(varName => {
                ret[key][varName] = global['#'][varName];  // Svelte store
            });
        }
    });

    return ret;
};

// Example: Navigator component gets these vars
component_navigator: ['dataset', 'datasetcomparisons', 'data', 'loading']

// Results in:
{
    component_navigator: {
        dataset: store<Dataset>,
        datasetcomparisons: store<string[]>,
        data: store<Dataset[]>,
        loading: store<boolean>
    }
}
```

```javascript
// trade-portal-app-v2 pattern - explicit connections
import { connect } from "@state_lib/util.ts";

let flowState = auto(flowObj);
let chartState = auto(chartObj);

// Connect specific variables from flow to chart
connect(flowState, chartState, [
    'flow_regions',
    'flow_products',
    'flow_import_export'
]);

// Now chart can read: $.flow_regions, $.flow_products, etc.
```

This is essentially **manual block wiring** - components are like blocks with explicit inputs/outputs.

## Summary

**URL**: Query parameters that encode chart configuration state
- Parsed into reactive state variables
- Updated when state changes (bidirectional)
- Makes charts shareable and bookmark-able
- Example: `?dataset=salmon&currency=EUR&start=2024-01`

**Data**: External sources that provide the raw numbers
- Fetched based on URL-derived state
- Can be APIs, JSON files, or test fixtures
- Example: `https://api.ucn-data.com/dataset/salmon` → `{ prices: [...], dates: [...] }`

**Blocks**: Reactive computation units that transform data
- URL Parser Block: URL string → state variables
- Data Fetcher Block: state → API calls → data
- Converter Block: data + params → transformed data
- Chart Builder Block: transformed data → chart output

The **diff-driven testing** approach lets us test:
1. Same data, different URL (configuration changes)
2. Same URL, different code (implementation changes)
3. Same code, different data (data changes)

And trace exactly which blocks/variables caused which chart changes.
