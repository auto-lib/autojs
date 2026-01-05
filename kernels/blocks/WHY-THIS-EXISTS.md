# Why Does This Exist?

**Date**: 2026-01-04
**Context**: What problem does reactive state management actually solve?

---

## The Core Question

You're right: **You could just write one giant function that computes everything.**

```javascript
function computeEverything(url, dataset_chosen, show_volumes, currency) {
    const data = fetchData(url);
    const dataset = data.find(d => d.id === dataset_chosen);
    const lines = processLines(dataset, currency);
    const charts = generateCharts(lines, show_volumes);
    const svg = renderChart(charts);
    return { data, dataset, lines, charts, svg };
}

// When anything changes:
const result = computeEverything(url, dataset_chosen, show_volumes, currency);
```

**This works.** It's simple. Why not just do this?

---

## Part 1: The Problem

### Scenario: User clicks toggle

```javascript
// Before: show_volumes = false
const before = computeEverything(url, dataset_chosen, false, currency);

// User clicks toggle
// After: show_volumes = true
const after = computeEverything(url, dataset_chosen, true, currency);
```

**What actually needs to recompute?**
- `fetchData(url)` - NO (url didn't change)
- `data.find(...)` - NO (data and dataset_chosen didn't change)
- `processLines(...)` - NO (dataset and currency didn't change)
- `generateCharts(...)` - YES (show_volumes changed)
- `renderChart(...)` - YES (charts changed)

**But we recomputed EVERYTHING.** Including expensive operations like `fetchData`.

### The Real Cost

In prices-app:
- `fetchData`: 200ms (network request)
- `processLines`: 50ms (25 functions, data processing)
- `generateCharts`: 30ms
- `renderChart`: 20ms

**Total**: 300ms

**But only 50ms was necessary** (generateCharts + renderChart).

**We wasted 250ms** recomputing things that didn't change.

---

## Part 2: The Naive Solution

### Cache Individual Functions

```javascript
const cache = new Map();

function fetchData(url) {
    const key = url;
    if (cache.has(key)) return cache.get(key);

    const result = /* fetch... */;
    cache.set(key, result);
    return result;
}
```

**Problem 1: You have to manually add caching to every function.**

**Problem 2: You have to manually track dependencies.**

```javascript
function generateCharts(lines, show_volumes) {
    const key = hash(lines, show_volumes); // How to hash lines?
    if (cache.has(key)) return cache.get(key);

    const result = /* compute... */;
    cache.set(key, result);
    return result;
}
```

What if `lines` is a 10,000 element array? Hashing is expensive.

**Problem 3: Cache invalidation.**

When `currency` changes:
- `processLines` cache is invalid
- `generateCharts` cache is invalid (depends on lines)
- `renderChart` cache is invalid (depends on charts)

**You have to manually invalidate caches.** And know which caches depend on which.

**This gets complicated fast.**

---

## Part 3: What Reactive State Management Does

### It's Automatic Incremental Computation

```javascript
const $ = auto({
    url: '/api/data',
    dataset_chosen: 1,
    show_volumes: false,
    currency: 'USD',

    data: async $ => fetchData($.url),
    dataset: $ => $.data.find(d => d.id === $.dataset_chosen),
    lines: $ => processLines($.dataset, $.currency),
    charts: $ => generateCharts($.lines, $.show_volumes),
    svg: $ => renderChart($.charts)
});

// When show_volumes changes:
$.show_volumes = true;

// System automatically:
// 1. Knows that charts depends on show_volumes (dependency tracking)
// 2. Marks charts and svg as stale (dependency propagation)
// 3. Does NOT recompute data, dataset, or lines (caching)
// 4. Only recomputes charts and svg (minimal work)
```

**What you get for free:**
1. **Automatic dependency tracking** - System knows charts depends on show_volumes
2. **Automatic cache invalidation** - Stale propagates through dependencies
3. **Automatic minimal recomputation** - Only recomputes what's necessary
4. **Automatic execution order** - Topological sort ensures correct order

**You just define WHAT each value is. The system handles WHEN to compute it.**

---

## Part 4: It's NOT Just a Cache

You said: "It's kind of just a cache?"

**Yes and no.**

### A Cache Memoizes

```javascript
const cache = (fn) => {
    const memo = new Map();
    return (...args) => {
        const key = hash(args);
        if (memo.has(key)) return memo.get(key);
        const result = fn(...args);
        memo.set(key, result);
        return result;
    };
};

const expensiveFn = cache((x, y) => {
    // expensive computation
});
```

**Problem**: You have to call it with arguments every time. The cache doesn't know when arguments changed.

### Reactive State Knows Dependencies

```javascript
const $ = auto({
    x: 1,
    y: 2,
    result: $ => expensiveComputation($.x, $.y)
});

// System knows: result depends on x and y
// When x changes, result is automatically marked stale
// When you read result, it recomputes (if stale)
```

**It's not just caching results. It's maintaining an invariant:**

**"All values match their definitions"**

When `x` changes, `result` is "wrong" (doesn't match `expensiveComputation(x, y)`).
The system knows this and fixes it.

### It's Constraint Maintenance

Like a spreadsheet:
```
A1: 10
A2: 20
A3: =A1 + A2
```

When you change A1 to 15, A3 automatically updates to 35.

**The system maintains the constraint**: `A3 = A1 + A2`

Auto.js does the same thing, but for JavaScript:
```javascript
const $ = auto({
    A1: 10,
    A2: 20,
    A3: $ => $.A1 + $.A2
});

$.A1 = 15;
console.log($.A3); // 35 (automatically recomputed)
```

---

## Part 5: Breaking Down One Giant Function

You said: "This library is a way of breaking down one function into parts"

**Exactly right.**

### The Giant Function

```javascript
function compute(url, dataset_chosen, show_volumes, currency) {
    // Step 1
    const data = fetchData(url);

    // Step 2
    const dataset = data.find(d => d.id === dataset_chosen);

    // Step 3
    const lines = processLines(dataset, currency);

    // Step 4
    const charts = generateCharts(lines, show_volumes);

    // Step 5
    const svg = renderChart(charts);

    return { data, dataset, lines, charts, svg };
}
```

**Problem**: When anything changes, you rerun everything.

### Broken Into Parts

```javascript
const $ = auto({
    url: ...,
    dataset_chosen: ...,
    show_volumes: ...,
    currency: ...,

    data: $ => fetchData($.url),                      // Step 1
    dataset: $ => $.data.find(...),                   // Step 2
    lines: $ => processLines($.dataset, $.currency),  // Step 3
    charts: $ => generateCharts($.lines, ...),        // Step 4
    svg: $ => renderChart($.charts)                   // Step 5
});
```

**Now**: When `show_volumes` changes, only Steps 4 and 5 rerun.

**It's incremental computation** - recompute only the parts that changed.

### The Trade-off

**Giant function**:
- Simple: One function, sequential execution
- Wasteful: Recomputes everything on any change

**Reactive state**:
- Complex: Dependency tracking, graph execution
- Efficient: Recomputes only what's necessary

**When is reactive state worth it?**
- When recomputation is expensive
- When inputs change frequently
- When different inputs change at different times

---

## Part 6: Everything Is a Value

You said: "It differs from procedural programming in that everything is a value"

**Yes. This is declarative, not imperative.**

### Imperative (Procedural)

```javascript
// DO this, THEN do that
function updateUI() {
    const data = fetchData();
    const filtered = filterData(data);
    const chart = makeChart(filtered);
    renderChart(chart);
}
```

**You describe the steps.** The HOW.

### Declarative (Reactive)

```javascript
const $ = auto({
    data: async $ => fetchData(),
    filtered: $ => filterData($.data),
    chart: $ => makeChart($.filtered),
    rendered: $ => renderChart($.chart)
});
```

**You describe the relationships.** The WHAT.

**The system figures out the steps** (topological sort determines execution order).

### Why Declarative?

**Separation of concerns**:
- You define: WHAT values are (relationships)
- System handles: WHEN to compute (timing)
- System handles: HOW to optimize (caching, incremental)

**This is powerful when:**
- Timing is complex (different inputs change at different times)
- Optimization is important (don't recompute unnecessarily)
- Relationships are clearer than sequences

---

## Part 7: The Resolver's Job

You said: "The resolver is just saying the function graph isn't correct?"

**Exactly.**

### The Invariant

**All values should match their definitions.**

```javascript
const $ = auto({
    a: 1,
    b: $ => $.a + 1,
    c: $ => $.b + 1
});
```

**Invariant**:
- `b === a + 1`
- `c === b + 1`

**When `a` changes to 5:**
- `b` is now 2, but `a + 1` is 6 → BROKEN
- `c` is now 3, but `b + 1` is 7 (will be) → BROKEN

**The resolver's job: Fix the invariant.**

```javascript
$.a = 5;  // Breaks invariant

// Resolver:
// 1. b is stale (depends on a)
// 2. c is stale (depends on b)
// 3. Recompute b = 5 + 1 = 6
// 4. Recompute c = 6 + 1 = 7
// Invariant restored!
```

**The graph is the specification.** The resolver makes reality match the specification.

---

## Part 8: When Do You Want This?

You asked: "In what circumstances would you want to define things like that?"

### When Reactive Is Better

**1. Complex UI State**

Web apps:
- User changes toggle → some parts of UI update
- API call completes → some parts of UI update
- Scroll position changes → some parts of UI update

**Without reactive**: Manually update each affected part (easy to miss something)
**With reactive**: Define dependencies, updates automatic

**2. Data Pipelines**

```javascript
const $ = auto({
    rawData: async $ => fetchData($.url),
    cleaned: $ => cleanData($.rawData),
    transformed: $ => transformData($.cleaned, $.config),
    aggregated: $ => aggregate($.transformed),
    chart: $ => visualize($.aggregated, $.chartType)
});
```

When `config` changes:
- Don't refetch raw data (expensive)
- Don't re-clean data (unnecessary)
- DO re-transform, re-aggregate, re-chart

**Reactive state handles this automatically.**

**3. Spreadsheet-Like Applications**

Anything where values depend on other values:
- Financial models
- Data dashboards
- Configuration systems

**4. Real-Time Updates**

When multiple things can change at different times:
- WebSocket messages arrive
- User edits form fields
- Timers fire
- API calls complete

**Reactive state keeps everything in sync automatically.**

### When Reactive Is Overkill

**1. Simple Scripts**

```javascript
// Just do this:
const result = processData(input);
console.log(result);

// Don't need reactive state
```

**2. One-Time Computations**

If you compute once and never update, procedural is simpler.

**3. Sequential Pipelines**

If data flows in one direction with no branches:
```javascript
const result = step3(step2(step1(input)));
```

No need for reactive - no partial updates.

**4. No Recomputation**

If nothing ever changes, reactive is overhead for no benefit.

---

## Part 9: The Real Power

### It's About Automatic Coordination

**Imagine prices-app without reactive state:**

```javascript
class App {
    constructor() {
        this.data = null;
        this.dataset = null;
        this.lines = null;
        this.charts = null;
    }

    setDatasetChosen(id) {
        this.dataset = this.data.find(d => d.id === id);
        this.updateLines();    // Remember to call this!
        this.updateCharts();   // And this!
        this.updateUI();       // And this!
    }

    setCurrency(curr) {
        // What needs updating?
        // Lines? Yes
        // Charts? Yes (depends on lines)
        // Dataset? No
        // But how do I know? I have to track manually...
        this.updateLines();
        this.updateCharts();
        this.updateUI();
    }

    updateLines() {
        this.lines = processLines(this.dataset, this.currency);
        // Wait, do I need to update charts here too?
    }
}
```

**Every setter has to know:**
1. What depends on this value?
2. In what order should they update?
3. What if an async operation is pending?

**This is HARD. And error-prone.**

### With Reactive State

```javascript
const $ = auto({
    dataset_chosen: null,
    currency: 'USD',

    dataset: $ => $.data.find(d => d.id === $.dataset_chosen),
    lines: $ => processLines($.dataset, $.currency),
    charts: $ => generateCharts($.lines, $.show_volumes)
});

// Just set values
$.dataset_chosen = 5;
$.currency = 'EUR';

// Everything updates automatically, in the correct order
```

**You define relationships once. Updates happen automatically.**

---

## Part 10: What It Actually Is

### The Fundamental Insight

**You're right**: This IS just breaking down one giant function into parts, with automatic caching and dependency tracking.

**But that's powerful** because:

1. **Incremental Computation** - Only recompute what changed
2. **Declarative Structure** - Define WHAT, not WHEN
3. **Automatic Coordination** - Dependencies tracked and maintained automatically
4. **Optimized Execution** - Minimal recomputation, correct order

### The Analogy

**It's like a build system** (Make, Webpack):

```makefile
output.pdf: chapter1.md chapter2.md
    pandoc chapter1.md chapter2.md -o output.pdf

chapter1.md: data.csv
    process-data data.csv > chapter1.md
```

When `data.csv` changes:
- Rebuild `chapter1.md` (depends on data.csv)
- Rebuild `output.pdf` (depends on chapter1.md)
- DON'T rebuild `chapter2.md` (doesn't depend on data.csv)

**Make tracks dependencies and does minimal rebuilds.**

**Auto.js does the same for JavaScript values.**

### The Use Case

**When you have:**
- Complex computation with many steps
- Expensive operations (API calls, data processing)
- Multiple inputs that change independently
- Need to keep derived state in sync

**Then reactive state management:**
- Saves you from manual coordination
- Ensures minimal recomputation
- Keeps everything consistent

**That's why it exists.**

---

## Part 11: The Core Value Proposition

### What You Write

```javascript
const $ = auto({
    a: 1,
    b: $ => $.a + 1,
    c: $ => $.b + $.a
});
```

**Four lines. Simple.**

### What You Get

1. **Automatic dependency tracking** - System knows b depends on a, c depends on a and b
2. **Automatic cache invalidation** - When a changes, b and c are marked stale
3. **Automatic execution order** - Computes b before c (topological sort)
4. **Automatic minimal recomputation** - Only recomputes what changed
5. **Automatic async handling** - If b is async, c waits
6. **Automatic error propagation** - If b throws, c doesn't run
7. **Observable state** - Can watch changes, track executions

**Manually implementing all this would be 100+ lines of complex code.**

**That's the value.**

---

## Part 12: Why Prices-App Uses This

### The Alternative

```javascript
// Manual coordination nightmare
class State {
    updateDataset(id) {
        this.dataset = this.data.find(...);
        this.invalidateLines();
        this.invalidateCharts();
        this.invalidateMainpoints();
        this.invalidateYearGroup();
        // ... 20 more things
        // Did I miss anything?
    }

    updateCurrency(curr) {
        this.currency = curr;
        // What needs updating?
        // I have to track this manually for every setter
        // And remember the order
        // And handle async
        // And handle errors
    }
}
```

**200+ functions. Each can depend on multiple inputs. Each input change can affect multiple functions.**

**Manual coordination: IMPOSSIBLE.**

### With Reactive State

```javascript
const $ = auto({
    // Define relationships
    dataset: $ => $.data.find(d => d.id === $.dataset_chosen),
    lines_00: $ => sort($.data, $.choices_sorted),
    // ... 200 more definitions
});

// Just set values
$.dataset_chosen = 5;

// Everything updates automatically
```

**Coordination is automatic. Order is automatic. Minimal recomputation is automatic.**

**This is why prices-app needs reactive state.**

---

## Conclusion

### You're Right

- **Yes**, it's breaking one giant function into parts
- **Yes**, it's sophisticated caching with dependency tracking
- **Yes**, the resolver maintains invariants (values match definitions)

### But That's The Point

**The problem**: Complex computations with multiple inputs that change independently

**The solution**: Define relationships, let system handle timing and optimization

**The benefit**: Automatic coordination, minimal recomputation, declarative structure

**When you need it**: Complex UIs, data pipelines, spreadsheet-like apps, real-time updates

**When you don't**: Simple scripts, one-time computations, sequential pipelines

---

**Reactive state management is fundamentally about:**

**Trading complexity (dependency tracking, graph execution) for convenience (automatic updates, minimal recomputation).**

**When your computation is complex enough, that trade-off is worth it.**

That's why this exists.
