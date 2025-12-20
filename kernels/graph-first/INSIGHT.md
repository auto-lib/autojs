# The Graph Insight

## The Question

> What is Auto.js actually for? Why does it exist?

After years of building and debugging, the answer became clear:

**Auto.js is a pure data transformation graph for visualization.**

## What This Means

Your visualization app has:
- **Source data** (loaded from APIs, files, user input)
- **View state** (controls like "show in USD", "zoom to range", "filter by X")
- **Derived values** (transformed, filtered, aggregated data for display)

The relationships between these are **static and declarative**:
```
data → filtered → sorted → paginated → displayed
currency_setting → conversion_rate → chart_values
```

This is a **graph**. The topology (which things depend on which) doesn't change at runtime.

## The Old Problem

Without Auto.js, you write imperative code:

```javascript
function convertToUSD() {
    charts.forEach(chart => {
        chart.points.forEach(point => {
            point.value *= currencyRate();
        });
    });
}

function addChart(chart) {
    if (convertToUSD) convertChart(chart);
    charts.add(chart);
    updateWindows(); // Don't forget this!
}

function moveSlider(val) {
    start = val;
    updateWindows(); // Or this!
}
```

**Problems:**
- Manual dependency management ("don't forget to call updateWindows!")
- State spread across global variables
- No way to know what affects what
- Debugging is a nightmare
- One bug breaks everything

## The Auto.js Solution

Declare the relationships once:

```javascript
let $ = auto({
    // Source data
    data: null,
    currency: 'EUR',
    start: 0,
    end: 100,

    // Derived values
    convertToUSD: ($) => $.currency === 'USD',
    conversionRate: ($) => getCurrencyRate($.currency),
    convertedData: ($) => $.data.map(p => ({
        ...p,
        value: p.value * $.conversionRate
    })),
    windowedData: ($) => $.convertedData.filter(p =>
        p.x >= $.start && p.x <= $.end
    )
});

// The graph handles everything:
$.currency = 'USD';  // Automatically recomputes convertedData, windowedData
$.start = 50;        // Automatically recomputes windowedData
```

**Benefits:**
- Dependencies are automatic
- State is centralized
- Clear what depends on what (`$._`)
- Debugging is inspection
- Guaranteed consistency

## The Current Implementation Problem

Current Auto.js (941 lines) treats **propagation** as the primary concern:

```javascript
// 50+ pieces of mutable state
let deps = {};
let dependents = {};
let value = {};
let dirty = {};
// ... 40+ more

// 8-phase algorithm runs on every change
propagate() {
    phase1_invalidate()      // Discover affected nodes
    phase2_topological_sort() // Sort them
    phase3_capture_old_values()
    phase4_clear_values()
    phase5_recompute()
    phase6_detect_changes()
    phase7_build_trace()
    phase8_notify_subscriptions()
}
```

The graph is **implicit** - rediscovered on every update.

## The Graph-First Solution

If the graph is static and the graph IS the program, make it explicit:

```javascript
// Build graph once
class ReactiveGraph {
    nodes: Map           // What variables exist
    edges: Map           // What depends on what
    executionOrder: []   // Topological sort (computed once)

    getDependents(name)  // Query the graph
    getDependencies(name)
    toDot()             // Visualize it
}

// Values flow through the graph
class GraphState {
    values: Map          // Current values
    dirty: Set           // What needs updating

    get(name)           // Lazy: compute if needed
    set(name, value)    // Mark dependents dirty
}
```

**Result:**
- 300 lines vs 941
- Graph structure visible and queryable
- No rediscovery - walk pre-built structures
- Trivial to debug: `console.log($._.graph.toDot())`
- Simpler = fewer bugs

## Why This Matters

You've been adding debugging features (trigger history, root cause analysis, excessive call detection) because **the graph is hidden**.

With an explicit graph:
- Want to know what depends on X? `graph.getDependents(X)`
- Want to know why Y updated? `graph.getUpstreamGraph(Y)`
- Want to visualize it? `graph.toDot()`
- Want to test it? Assert on `graph.edges`

The graph structure **is the documentation, is the tests, is the debugging tool**.

## The Trade-off

**Current**: Optimized for execution speed, handles dynamic dependencies perfectly

**Graph-first**: Optimized for clarity, may over-subscribe on conditional dependencies

For a visualization tool where:
- Graph topology is static
- Clarity > micro-optimizations
- The graph itself is valuable to inspect

**Graph-first is the natural fit.**

## What Now?

This kernel explores what Auto.js looks like when designed around the core insight:

**It's not a reactive library that happens to form a graph.**
**It's a graph library that happens to be reactive.**

The graph is the thing. Make it first-class.
