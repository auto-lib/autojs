# Lines as Boundaries: Theory Meets Practice

**Date**: 2026-01-04
**Context**: Analyzing real production code through the boundary paradigm

---

## The Question

We've established that **boundaries are the fundamental unit** - not functions. But what does this mean in practice?

Let's look at `/Users/karl/prices-app/src/state/lines.js` - a real production file with ~300 lines of reactive state management code.

**Can we see it through the boundary lens?**

---

## Part 1: What Is lines.js?

### The File Structure

```javascript
export default {
    lines_00: ($) => { /* filter and sort datasets */ },
    lines_01: ($) => { /* assign colors */ },
    lines_02: async $ => { /* convert currency */ },
    lines_02_all_null: $ => { /* check for null data */ },
    lines_03: ($) => { /* convert frequency */ },
    lines_04: ($) => { /* get points with dates */ },
    lines_05: ($) => { /* convert volume units */ },
    lines_06: ($) => { /* add indexes */ },
    lines_06_to_draw: _ => { /* filter drawable lines */ },
    maxindex: ($) => { /* find max index */ },
    minindex: ($) => { /* find min index */ },
    lines_latest_date: ($) => { /* find latest date */ },
    allpoints: ($) => { /* all points with indexes */ },
    lines_07: ($) => { /* add values */ },
    mainyears: ($) => { /* extract years */ },
    yeargroup: ($) => { /* group by year */ },
    maingroup: ($) => { /* main chart group */ },
    charts_all: ($) => { /* all charts */ },
    charts: ($) => { /* final charts */ },
    mainchart: ($) => { /* main chart */ },
    mainpoints: ($) => { /* main points */ },
    mainstartdate: ($) => { /* start date */ },
    mainenddate: ($) => { /* end date */ },
    mainlength: ($) => { /* length */ },
    mainchart_slug: ($) => { /* slug */ }
}
```

**Traditional view**: "A collection of 25+ functions that compute line chart data."

**Boundary view**: This is what?

---

## Part 2: The Boundary Interpretation

### Level 1: Each Function IS a Boundary

```javascript
// lines_00 is a boundary
lines_00: ($) => {
    if ($.datasets_to_load && $.data && $.choices_sorted.length > 0) {
        return sort_datasets_by_choices(
            $.data.filter(d => $.datasets_to_load.includes(d.id)),
            $.choices_sorted
        );
    }
    return null;
}
```

**As a boundary**:
```javascript
{
    name: 'lines_00',
    inputs: ['datasets_to_load', 'data', 'choices_sorted'],
    outputs: { lines_00: Array<Dataset> | null },
    resolve: (inputs) => { /* function body */ },
    implementation: 'function'
}
```

**This is an atomic boundary.**

Every function in the file is an atomic boundary. You can:
- Query: "Is lines_00 resolved for these inputs?"
- Cache: "Store result by input hash"
- Observe: "How many times did it execute?"
- Test: "Given inputs X, expect output Y"

### Level 2: The Pipeline IS a Composite Boundary

Look at the flow:
```
lines_00  →  lines_01  →  lines_02  →  lines_03
   ↓           ↓           ↓           ↓
lines_04  →  lines_05  →  lines_06  →  lines_07
   ↓           ↓           ↓           ↓
charts_all → charts
```

**This is a pipeline boundary**:
```javascript
{
    name: 'lines_pipeline',
    inputs: ['datasets_to_load', 'data', 'choices_sorted', 'currency',
             'frequency', 'volume_unit', ...],
    outputs: { charts: Array<Chart> },
    implementation: {
        boundaries: [lines_00, lines_01, lines_02, ...],
        wiring: /* dependency graph */
    }
}
```

**This is a composite boundary** made of atomic boundaries.

### Level 3: The File IS a Block Boundary

The entire file exports one object with ~25 functions.

**As a boundary**:
```javascript
{
    name: 'lines_block',
    inputs: {
        // From other blocks
        datasets_to_load: 'datasets',
        data: 'data',
        choices_sorted: 'search',
        currency: 'dataset',
        frequency: 'dataset',
        volume_unit: 'dataset',
        // ... etc
    },
    outputs: {
        // To UI components
        charts: Array<Chart>,
        mainchart: Chart,
        mainpoints: Array<Point>,
        // ... etc
    },
    implementation: {
        type: 'block',
        contains: [lines_00, lines_01, lines_02, ...]
    }
}
```

**This is a block boundary** - a higher-level composite.

### Level 4: Lines is Part of the App Boundary

```
App Boundary
├── Data Block
│   ├── data_000_async
│   ├── dataset
│   └── ...
├── Search Block
│   ├── search_options
│   ├── grouped_data
│   └── ...
├── Lines Block ← This file
│   ├── lines_00
│   ├── lines_01
│   └── ...
└── Chart Block
    ├── svg_renderer
    └── ...
```

**The app itself is a boundary** composed of block boundaries composed of function boundaries.

**Boundaries all the way down. And all the way up.**

---

## Part 3: What This Reveals

### 1. Natural Boundaries Emerge from Code Structure

Look at lines.js. It naturally has:
- **Inputs**: From $.datasets_to_load, $.data, $.currency, etc.
- **Outputs**: $.charts, $.mainpoints, $.mainyears, etc.
- **Implementation**: A pipeline of transformations

**We didn't design it as a boundary. It emerged naturally.**

Good code structure creates natural boundaries.

### 2. Boundaries Make Dependencies Explicit

```javascript
lines_00: ($) => {
    // Dependencies are explicit
    if ($.datasets_to_load && $.data && $.choices_sorted.length > 0) {
        // ...
    }
}
```

You can see:
- What goes in (datasets_to_load, data, choices_sorted)
- What comes out (sorted and filtered datasets)
- What happens (filtering and sorting)

**The boundary makes the interface visible.**

### 3. Boundaries Enable Testing at Any Level

**Test atomic boundary**:
```javascript
test('lines_00 filters and sorts', () => {
    const $ = {
        datasets_to_load: [1, 2],
        data: [...],
        choices_sorted: [...]
    };
    const result = lines_00($);
    expect(result).toEqual([...]);
});
```

**Test composite boundary**:
```javascript
test('lines pipeline produces charts', () => {
    const $ = {
        datasets_to_load: [1],
        data: [...],
        currency: 'USD',
        frequency: 'monthly',
        // ... all inputs
    };
    const result = $.charts;  // Runs entire pipeline
    expect(result).toHaveLength(1);
});
```

**Test block boundary**:
```javascript
test('lines block transforms data to charts', () => {
    const linesBlock = createBlock({
        inputs: { datasets_to_load, data, ... },
        implementation: /* lines.js functions */
    });

    const result = linesBlock.resolve({
        datasets_to_load: [1],
        data: [...],
        ...
    });

    expect(result.charts).toBeDefined();
});
```

**You can test at the level that makes sense for what you're validating.**

### 4. Boundaries Enable Caching at Any Level

**Cache per function** (fine-grained):
```javascript
// Cache lines_00 result
lines_00.resolve({ datasets_to_load, data, choices_sorted })
// → Cache hit/miss per function
```

**Cache per pipeline** (coarse-grained):
```javascript
// Cache entire pipeline result
linesPipeline.resolve({ datasets_to_load, data, ... })
// → If hit, skip ALL 25 functions!
```

**You tune the trade-off** by choosing where to cache.

Small boundaries = more cache lookups, finer control
Large boundaries = fewer cache lookups, coarser control

### 5. Boundaries Make Composition Clear

lines.js depends on other blocks:
```javascript
lines_00: ($) => {
    // Depends on datasets block
    if ($.datasets_to_load &&
        // Depends on data block
        $.data &&
        // Depends on search block
        $.choices_sorted.length > 0) {
        // ...
    }
}
```

**The boundaries compose**:
```
data block → lines block → chart block → UI
```

This is **explicit** - you can see the dependency structure.

---

## Part 4: The Practical Insight

### Before Boundaries

lines.js is:
- "A bunch of functions"
- "State management code"
- "Transformations for chart data"

**It's code. You read it, modify it, hope it works.**

### After Boundaries

lines.js is:
- **A block boundary** with defined inputs and outputs
- **Composed of atomic boundaries** (each function)
- **Part of a larger boundary tree** (the app)
- **Cacheable at multiple levels** (function, pipeline, block)
- **Testable at multiple levels** (unit, integration, e2e)
- **Observable at multiple levels** (function stats, block stats, app stats)

**It's a structured system with queryable properties.**

### The Shift

**Before**: "Write functions that compute values."

You think about:
- What does this function do?
- What are the inputs?
- What's the output?

**After**: "Define boundaries with interfaces."

You think about:
- Where should boundaries be?
- What are the inputs/outputs?
- How do boundaries compose?
- At what level should I cache/test/observe?

**It's a structural way of thinking.**

---

## Part 5: What This Means for lines.js

### Current State

lines.js works well. It's readable, maintainable, and performs adequately.

**As boundaries**, it has:
- ✅ Clear inputs (from $)
- ✅ Clear outputs (to $)
- ✅ Explicit dependencies (via static analysis)
- ✅ Atomic functions (each function is a boundary)
- ✅ Natural pipeline (data flows through transformations)

**It already embodies boundary principles**, even though it wasn't designed that way.

### What Could Change?

**1. Explicit Block Definition**

Currently implicit:
```javascript
export default {
    lines_00: ...,
    lines_01: ...,
    // ...
}
```

Could be explicit:
```javascript
export default createBlock({
    name: 'lines',
    inputs: ['datasets_to_load', 'data', 'choices_sorted', 'currency', ...],
    outputs: ['charts', 'mainchart', 'mainpoints', ...],
    functions: {
        lines_00: ...,
        lines_01: ...,
        // ...
    }
});
```

**Benefits**:
- Validates inputs/outputs at block level
- Can query block stats (how many functions, how many resolved, etc.)
- Can cache at block level (skip entire pipeline if inputs unchanged)
- Can test block in isolation

**2. Sub-Block Organization**

Currently flat:
```
lines_block
├── lines_00
├── lines_01
├── ...
└── lines_07
```

Could be hierarchical:
```
lines_block
├── filter_block
│   ├── lines_00 (filter datasets)
│   └── lines_01 (assign colors)
├── transform_block
│   ├── lines_02 (currency)
│   ├── lines_03 (frequency)
│   └── lines_04 (get points)
├── process_block
│   ├── lines_05 (volume units)
│   └── lines_06 (add indexes)
└── output_block
    ├── lines_07 (add values)
    └── charts (final output)
```

**Benefits**:
- Clearer organization
- Can cache at sub-block level
- Can test sub-blocks independently
- Can reuse sub-blocks elsewhere

**3. Input/Output Validation**

Currently trusting:
```javascript
lines_00: ($) => {
    if ($.datasets_to_load && $.data && $.choices_sorted.length > 0) {
        // Proceed
    }
    return null;
}
```

Could validate:
```javascript
const linesBlock = createBlock({
    inputs: {
        datasets_to_load: { type: 'array', required: true },
        data: { type: 'array', required: true },
        choices_sorted: { type: 'array', required: true }
    },
    // ...
});

// Runtime validation when block resolves
linesBlock.resolve(inputs);  // Throws if inputs invalid
```

**Benefits**:
- Catch errors at boundary entry
- Document expected inputs
- Fail fast with clear errors

---

## Part 6: The Deeper Implication

### It's Already There

lines.js already IS a block boundary. The functions already ARE atomic boundaries.

**We're just naming what exists.**

Good reactive code naturally creates boundaries:
- Functions with clear inputs/outputs
- Pipelines of transformations
- Dependencies that compose

**Boundaries aren't something you add. They emerge from good structure.**

### The Library's Role

What does auto.js / blocks kernel do?

**It makes boundaries first-class.**

Instead of:
- Boundaries are implicit (code structure)
- Caching is per-function (fixed granularity)
- Testing is ad-hoc (write tests manually)
- Observation requires instrumentation (add logging)

You get:
- Boundaries are explicit (defined and queryable)
- Caching is per-boundary (variable granularity)
- Testing is structural (test at any boundary level)
- Observation is built-in (stats at every boundary)

**The library doesn't create boundaries. It recognizes and empowers them.**

### The Paradigm

This is **boundary-oriented programming**:

**Not**: "I'm writing functions to compute chart data"

**But**: "I'm defining boundaries (interfaces) and their implementations"

**Not**: "The code is a list of functions"

**But**: "The code is a tree of boundaries"

**Not**: "Execution is calling functions"

**But**: "Execution is resolving boundaries"

---

## Part 7: Practical Questions

### Should lines.js change?

**Current**: Works well, readable, maintainable.

**With explicit boundaries**: Would be:
- More structured (clear inputs/outputs)
- More testable (block-level tests)
- More cacheable (block-level caching)
- More observable (block-level stats)

**Trade-off**: Additional structure vs simplicity.

**Answer**: Depends on needs.
- If testing/caching/observation at block level would help → add structure
- If current code is sufficient → keep it simple

**Boundaries don't require ceremony. The pattern matters, not the syntax.**

### How to identify boundaries?

Look for:
1. **Natural groupings** - Functions that work together (lines.js is one)
2. **Clear interfaces** - Sets of inputs and outputs
3. **Composition** - Boundaries that depend on other boundaries
4. **Reusability** - Logic that might be used elsewhere

**Example in lines.js**:
- `lines_00` through `lines_07` = data transformation pipeline (one boundary)
- `mainchart`, `mainpoints`, `mainstartdate` = main chart extraction (another boundary)
- `yeargroup` = year-based grouping (yet another boundary)

**These could be separate blocks.**

### How to evolve code toward boundaries?

**Phase 1**: Recognize implicit boundaries
- Document inputs/outputs in comments
- Group related functions
- Make dependencies explicit

**Phase 2**: Make boundaries explicit
- Use `createBlock()` to define blocks
- Specify inputs/outputs
- Add validation

**Phase 3**: Leverage boundary features
- Cache at block level
- Test at block level
- Observe block stats

**You don't have to do this all at once. Boundaries can be adopted incrementally.**

---

## Part 8: The Connection to Blocks v1

The current blocks kernel (`/kernels/blocks/src/`) implements:
1. **DirectedGraph** - Graph structure
2. **StaticAnalysis** - Extract dependencies
3. **Blocks** - Group functions with inputs/outputs (optional)
4. **Resolver** - Execute functions in topological order
5. **Auto** - Integration API

**What's missing?**

**Explicit block boundaries as first-class entities.**

Currently:
- You can group functions into blocks
- But blocks are just metadata
- They don't cache, test, or observe as units

**Blocks v2 would**:
- Make blocks first-class boundaries
- Support caching at block level
- Enable testing at block level
- Provide stats at block level
- Support hierarchical composition (blocks within blocks)

**lines.js would become**:
```javascript
const linesBlock = createBlock({
    name: 'lines',
    inputs: { datasets_to_load, data, currency, ... },
    outputs: { charts, mainchart, mainpoints, ... },
    functions: { lines_00, lines_01, ... },
    blocks: {
        transform: [lines_02, lines_03, lines_04],
        process: [lines_05, lines_06]
    }
});

// Resolve the entire block
linesBlock.resolve(inputs);  // → outputs

// Or cache it
linesBlock.cached(inputs);  // → cached outputs or null

// Or get stats
linesBlock.stats();  // → { executions, cacheHitRate, avgDuration, ... }
```

**This is the vision.**

---

## Part 9: Summary

### What We Discovered

Looking at lines.js through the boundary lens reveals:

1. **Functions ARE atomic boundaries** - Each function has inputs, outputs, and can be resolved
2. **The file IS a composite boundary** - It groups related functions with a clear interface
3. **Boundaries already exist in good code** - Structure creates natural boundaries
4. **The library makes boundaries first-class** - Turns implicit structure into explicit, queryable entities
5. **This enables new capabilities** - Caching, testing, observation at multiple levels

### The Practical Takeaway

You don't need to rewrite lines.js. **It already embodies boundary principles.**

What changes is **how you think about it**:
- Not "a collection of functions"
- But "a hierarchy of boundaries"

And what becomes possible:
- Cache at any level (function, pipeline, block)
- Test at any level (unit, integration, block)
- Observe at any level (function stats, block stats)

**Boundaries aren't a feature you add. They're a lens through which you see structure.**

### The Vision

**Blocks v2** would make this explicit:
- Blocks as first-class boundaries
- Hierarchical composition (boundaries within boundaries)
- Caching, testing, observation at every level
- The same interface from function to app

**Everything is a boundary. Boundaries all the way down.**

And lines.js? It's already there. It just doesn't know it yet.

---

## Conclusion

This is the power of the boundary paradigm:

**It doesn't require changing working code. It changes how you understand it.**

Once you see lines.js as a boundary - with inputs, outputs, implementation, and composition - you see:
- What it depends on (inputs from other blocks)
- What it provides (outputs to UI components)
- How it's structured (pipeline of transformations)
- Where you could cache (at any boundary)
- How you could test (at any level)

**The code stays the same. Your understanding deepens.**

And when you're ready to leverage that understanding - to cache at block level, test at block level, observe at block level - the structure is already there.

**You're just making the implicit explicit.**

That's the essence of boundary-oriented programming.
