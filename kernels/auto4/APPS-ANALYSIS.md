# Application Analysis: prices-app and trade-portal-app-v2

This document analyzes how state is currently managed in the two target applications,
identifying patterns, pain points, and requirements for Auto4.

## Common Requirements

Both applications share fundamental requirements:

1. **URL-Encoded State**: All configuration is captured in the URL
2. **Browser Refresh**: Refreshing reproduces exact app state
3. **Embeddable**: Work correctly when embedded in other apps
4. **Svelte Integration**: Must work with Svelte's reactive system

## prices-app Analysis

### Location
`../prices-app`

### State Architecture

Uses `@autolib/auto` with a modular structure:

```
state/
├── index.js        # Merges all modules, creates global_state
├── setup.js        # UI layout flags, permissions
├── data.js         # Dataset metadata, presets
├── dataset.js      # Dataset selection logic
├── lines.js        # Data transformation pipeline (312 lines!)
├── params.js       # User parameters (currency, frequency)
├── chart.js        # Chart rendering calculations
├── url.js          # URL parsing/generation (382 lines!)
├── range.js        # Date range presets
└── components/     # Component-specific state
```

### Data Flow

```
URL/Props
    │
    ▼
init_url() → Parse parameters
    │
    ▼
setup/data states → Load metadata
    │
    ▼
dataset state → Select dataset
    │
    ▼
lines_00→07 → Transform data (7 stages!)
    │
    ▼
chart state → Calculate scales/paths
    │
    ▼
Components access via getContext(global_key)
    │
    ▼
render → Svelte reactivity
    │
    ▼
user interaction → state change → debounced update_url()
```

### URL Parameters

```
dataset     - Dataset nickname
preset      - Predefined preset name
start, end  - Date indexes
start_date, end_date - ISO date strings
compare     - Dataset IDs for comparison
yrs         - Years for year-over-year view
yearview    - Boolean for yearview mode
vol         - Show volumes (default true)
ranges      - Show min/max bands
currency    - Currency conversion
convert     - Frequency conversion
forwards    - Show forward prices
volumeunit  - Custom volume unit
tab, logging, embed_table, table_tab, etc.
```

### Lines Transformation Pipeline

The data goes through 7 sequential stages in `lines.js`:

```
lines_00 ← Filter datasets to load
    ↓
lines_01 ← Add comparison colors
    ↓
lines_02 ← Convert currencies (async)
    ↓
lines_03 ← Convert to target frequency
    ↓
lines_04 ← Create date points with year/period
    ↓
lines_05 ← Convert volume units
    ↓
lines_06 ← Add index values relative to main
    ↓
lines_07 ← Values within start/end range
```

### Pain Points

1. **Lines.js Complexity**: 312 lines, 7+ transformation stages, hard to debug
2. **URL.js Size**: 382 lines with bidirectional sync logic
3. **Hybrid State**: Mixes auto system + Svelte stores (especially wholesale)
4. **Promise Detection**: `typeof $.variable.then === 'function'` everywhere
5. **Magic Names**: `lines_00` through `lines_07` is opaque
6. **Scattered Date Logic**: Date handling in params.js, commonjs/convert.js, lines.js
7. **No Type Safety**: JavaScript without type checking
8. **Untestable**: Large state functions hard to unit test

### What Works Well

- Auto system's simplicity for basic reactivity
- Clear separation of concerns across files
- Subscription pattern for external effects

---

## trade-portal-app-v2 Analysis

### Location
`../trade-portal-app-v2`

### State Architecture

Also uses AutoJS but with TypeScript and more structure:

```
state/
├── global/
│   └── index.ts    # Shared: API cache, lookups, tabs
└── local/
    ├── setup.ts    # Main orchestrator (creates all modules)
    └── parts/
        ├── api.ts      # API call parameters
        ├── data.ts     # Data transformation (800+ lines)
        ├── chart.ts    # ECharts configuration
        ├── toggle.ts   # UI toggles
        ├── flow.ts     # User workflow state
        ├── url.ts      # URL serialization
        ├── inert.ts    # UI state (loading, expanded)
        ├── scale.ts    # Chart scaling
        └── maximum.ts  # Data aggregation for scales
```

### Initialization Pattern

Order-dependent setup with manual wiring:

```typescript
let api = make_api();              // 1st
let toggle = make_toggle();        // 2nd
let flow = make_flow(..., toggle); // 3rd (depends on toggle)
let inert = make_inert(...);       // 4th
let data = make_data(...);         // 5th (many deps)
let maximum = make_maximum(...);   // 6th
let scale = make_scale(...);       // 7th
let url = make_url(...);           // 8th
let chart = make_chart(...);       // 9th (all deps!)
let fetch = make_fetch(...);       // 10th

// Manual wiring
connect(toggle, data, ['toggle_regions_products_partners', ...]);
connect(api, data, ['api_partner_labels']);
```

### URL Parameters

```
regions         - Selected regions (Norway, Iceland)
flow            - Import/Export
products        - Product codes
partners        - Trading partners
view            - bar/line/barline/table/summary/ytd
layout          - default/compact/headline/minimal
frequency       - Monthly/Quarterly/Annual
currency        - USD/EUR/etc
unit            - kg/mt/etc
value_volume    - value/volume
total_per_volume - total/per volume
group_by        - regions/products/partners
startdate, enddate - Date range
datazoom_start, datazoom_end - Zoom percentages
toggle          - Hidden series in legend
extended        - Standard vs extended data
title           - For embedded mode
preset_category, preset_name - Presets
```

### Data Transformation Pipeline

Similar to prices-app but more stages:

```
data_compressed (API response)
    ↓
data_raw (decompressed)
    ↓
data_validated (Zod schema)
    ↓
data_converted (currency conversion)
    ↓
data_grouped (group by label/date)
    ↓
data_merged (merge grouped)
    ↓
data_freq (frequency conversion)
    ↓
data_final
    ├→ data_final_values
    ├→ data_final_volumes
    └→ data_final_per_volume
```

### Pain Points

1. **Order-Dependent Init**: 10+ modules must be created in exact order
2. **Manual Wiring**: String-based connection, no compile-time checks
3. **data.ts Complexity**: 800+ lines, 10+ transformation stages
4. **URL Timing Bug**: "This is a hack" - need data to decode URL dates
5. **Deeply Coupled**: 10 arguments to some module functions
6. **Global State Pollution**: Mixes cache, tabs, lookups, UI state
7. **Fetch Orchestration**: 250 lines with deep nesting
8. **Multiple Date Formats**: "Jan 2024", "202401", "Q1 2024", "Jan_2024"

### What Works Well

- Full TypeScript with complex types
- Centralized state location
- Dual API (direct + stores)
- Comprehensive URL serialization

---

## Comparison

| Aspect | prices-app | trade-portal-app-v2 |
|--------|-----------|---------------------|
| Language | JavaScript | TypeScript |
| Lines of State | ~2,134 | ~2,873 |
| Modules | 14 global + 11 component | 10+ local + global |
| Dependencies | Loosely coupled | Tightly coupled |
| Init Order | Scattered | Strictly ordered |
| Wiring | Implicit | Manual connect() |
| Testing | Difficult | Very difficult |
| Pain Points | lines.js, url.js | data.ts, wiring |

## Requirements for Auto4

Based on this analysis, Auto4 must provide:

### Must Have

1. **URL First-Class**: Built-in URL parsing/generation, not bolted on
2. **Composable Blocks**: Replace manual wiring with needs/gives
3. **Traceable**: See exactly how changes propagate
4. **Type Safe**: TypeScript support with inference
5. **Testable**: Pure JS testing without framework
6. **Svelte Bridge**: `['#']` store access pattern

### Should Have

1. **Validation**: Schema validation at boundaries
2. **Async Handling**: First-class async/Promise support
3. **Error Boundaries**: Errors in one block don't crash others
4. **Caching**: Built-in request caching strategy
5. **Date Utilities**: Centralized date format handling

### Nice to Have

1. **Hot Reload**: Replace blocks without losing state
2. **Visual Debugger**: See block graph and data flow
3. **Replay**: Record and replay state changes
4. **Performance Monitoring**: Track slow computations

## Migration Strategy

### Phase 1: Foundation
- Implement kernel, graph, block, tracer (based on auto3)
- Create Chart abstraction with URL-centric API
- Pass basic tests from current test suite

### Phase 2: prices-app
- Create blocks for: urlParser, dataFetcher, dataProcessor, chartRenderer
- Map lines_00→07 stages to explicit block pipeline
- Migrate url.js to UrlParser block
- Test with mock fetcher

### Phase 3: trade-portal-app-v2
- Same block structure but with TypeScript
- Replace manual wiring with auto-wire
- Simplify data.ts into composable transformations
- Fix URL timing issue with proper dependency declaration

### Phase 4: Unification
- Shared blocks between apps (different configs)
- Common testing patterns
- Documentation and examples

## Key Insights

1. **The Chart is Central**: Both apps fundamentally manage chart state
2. **URL is Critical**: URL-state sync is complex and error-prone in both
3. **Transformation Pipeline**: Both have multi-stage data transformation
4. **Testing is Hard**: Current architecture makes unit testing difficult
5. **Wiring is Manual**: Both require manual dependency management
6. **Types Help**: trade-portal's TypeScript catches more errors

Auto4 should make the chart object explicit, URL handling built-in,
transformation stages composable blocks, and wiring automatic.
