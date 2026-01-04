# Block Graph Mechanics

**Date**: 2026-01-04
**Context**: How do blocks with dependencies actually work? How does staleness propagate across block boundaries?

---

## The Question

We've established blocks as boundaries. But blocks depend on other blocks:

```
Lines Block
├── lines_00: $ => $.datasets_to_load && $.data && $.choices_sorted
```

Here, `lines_00` depends on:
- `datasets_to_load` (from another block/source)
- `data` (from Data block)
- `choices_sorted` (from Search block)

**Questions:**
1. How does the graph work across block boundaries?
2. How does stale propagation work?
3. How does this integrate with UI (Svelte components)?

---

## Part 1: Two Graphs or One?

### Option A: Hierarchical Graphs (Blocks within Blocks)

```
App Graph
├── Data Block Graph
│   ├── data_000_async → dataset
│   └── (internal dependencies)
├── Lines Block Graph
│   ├── lines_00 → lines_01 → lines_02
│   └── (internal dependencies)
└── Cross-Block Dependencies
    ├── Lines.lines_00 → Data.data
    └── Lines.lines_00 → Search.choices_sorted
```

**Propagation**: Changes in Data block would trigger cross-block dependency to Lines block, which resolves its internal graph.

**Issues**:
- Complex propagation logic (cross-block vs intra-block)
- Block resolution order (topological sort of blocks?)
- Overhead of managing multiple graphs

### Option B: Flat Graph (Blocks as Metadata)

```
Global Function Graph
├── data_000_async → dataset
├── dataset → lines_00
├── choices_sorted → lines_00
├── lines_00 → lines_01
├── lines_01 → lines_02
└── ...
```

**Blocks are grouping metadata**:
```javascript
blocks = {
    data: ['data_000_async', 'dataset', ...],
    lines: ['lines_00', 'lines_01', 'lines_02', ...],
    search: ['choices_sorted', 'search_options', ...]
}
```

**Propagation**: Changes propagate through the flat function graph. Blocks don't change propagation, they're just labels.

---

## Part 2: Current Implementation (Flat Graph)

The blocks kernel currently implements **Option B**:

```javascript
// In resolver.js
class Resolver {
    constructor(graph, functions) {
        this.graph = graph;           // DirectedGraph of ALL functions
        this.functions = functions;   // Map of ALL functions
        this.values = new Map();      // ALL values
        this.stale = new Set();       // ALL stale functions
    }
}
```

**Blocks are just metadata** - they don't change execution:

```javascript
// When you create blocks
const $ = auto({
    // Data block functions
    data_000_async: async $ => { ... },
    dataset: $ => { ... },

    // Lines block functions
    lines_00: $ => { ... },
    lines_01: $ => { ... }
}, {
    blocks: {
        data: {
            inputs: ['fixed_data'],
            outputs: ['data', 'dataset'],
            functions: ['data_000_async', 'dataset']
        },
        lines: {
            inputs: ['datasets_to_load', 'data', 'choices_sorted'],
            outputs: ['charts', 'mainpoints'],
            functions: ['lines_00', 'lines_01', ...]
        }
    }
});
```

**Behind the scenes**:
1. All functions analyzed → one dependency graph
2. All functions in one resolver
3. Propagation happens through function graph
4. Blocks are just labels for querying/observing

---

## Part 3: How Stale Propagates Across Blocks

Let's trace what happens when a value changes:

### Step 1: User Changes Value

```javascript
$.datasets_to_load = [1, 2, 3];  // In UI component
```

### Step 2: Mark Dependents as Stale (DFS through graph)

```
datasets_to_load (changed)
  → lines_00 (depends on datasets_to_load)
    → lines_01 (depends on lines_00)
      → lines_02 (depends on lines_01)
        → ... (continues through graph)
```

**This crosses block boundaries automatically** because it's following the function dependency graph, not block boundaries.

### Step 3: Resolve in Topological Order

```javascript
// Resolver executes in order:
1. lines_00   // (datasets_to_load is fresh now)
2. lines_01   // (lines_00 just resolved)
3. lines_02   // (lines_01 just resolved)
4. ...
```

**Blocks don't affect execution order** - topological sort of the flat function graph determines order.

### Step 4: Observe at Block Level (Optional)

```javascript
// After propagation completes
console.log($.blocks.lines.stats);
// {
//   executions: { lines_00: 1, lines_01: 1, lines_02: 1, ... },
//   totalExecutions: 10,
//   staleCount: 0
// }
```

**Blocks let you observe groups** but don't change propagation.

---

## Part 4: Block Dependencies

When we say "Lines block depends on Data block", what do we mean?

### Function-Level Dependencies (Actual)

```javascript
lines_00: $ => {
    if ($.datasets_to_load && $.data && $.choices_sorted) {
        return sort_datasets_by_choices(
            $.data.filter(d => $.datasets_to_load.includes(d.id)),
            $.choices_sorted
        );
    }
}
```

**Real dependencies**:
- `lines_00` → `datasets_to_load`
- `lines_00` → `data` (from Data block)
- `lines_00` → `choices_sorted` (from Search block)

### Block-Level Dependencies (Inferred)

```javascript
// We can infer: Lines block depends on Data block
// Because: Some function in Lines depends on some function in Data

blocksGraph = {
    nodes: ['data', 'search', 'lines', 'charts'],
    edges: [
        { from: 'data', to: 'lines' },      // lines_00 uses data
        { from: 'search', to: 'lines' },    // lines_00 uses choices_sorted
        { from: 'lines', to: 'charts' }     // charts use lines_XX outputs
    ]
}
```

**This is metadata** - useful for visualization, understanding, documentation. But execution uses the function graph.

---

## Part 5: How This Works with UI (Svelte Integration)

### Current prices-app Pattern

```javascript
// In state/index.js
export const $ = auto({
    // All blocks combined
    ...dataFunctions,
    ...searchFunctions,
    ...linesFunctions,
    ...chartFunctions
});

// In Toggles.svelte
import { $ } from '../state';

function toggle() {
    $.show_volumes = !$.show_volumes;  // Direct mutation
}

// In Search.svelte
$: if ($data) {
    // Reactive statement automatically runs when $data changes
}
```

**Key points**:
1. **One global `$`** - All functions in one reactive object
2. **Components import `$`** - Svelte's reactive statements track access
3. **Direct mutation** - Change values directly, propagation is automatic
4. **Svelte reactivity** - `$:` statements re-run when dependencies change

### With Explicit Blocks (Hypothetical)

```javascript
// In state/index.js
export const dataBlock = auto({
    data_000_async: async $ => { ... },
    dataset: $ => { ... }
}, { blockName: 'data' });

export const linesBlock = auto({
    lines_00: $ => { ... },
    lines_01: $ => { ... }
}, { blockName: 'lines', imports: [dataBlock] });

// All blocks connected in one graph
export const $ = connectBlocks([dataBlock, linesBlock, searchBlock, ...]);

// In Toggles.svelte
import { $ } from '../state';
// Same as before! Components don't change
```

**Behind the scenes**:
- All block functions merged into one graph
- One resolver for all blocks
- Components still import one `$` proxy
- **Blocks are organizational, not isolation boundaries**

---

## Part 6: Do Blocks Notify Parents or Children?

**Answer: Neither. Functions notify dependents (through the flat graph).**

Let's trace it:

### Scenario: User clicks dataset in Search.svelte

```javascript
// In Search.svelte
function select_dataset(id) {
    $.dataset_chosen = id;  // Mutation
}
```

### Propagation Flow

```
1. $.dataset_chosen = id
     ↓ (marks dependents stale)
2. dataset (depends on dataset_chosen) → STALE
     ↓
3. lines_00 (depends on dataset) → STALE
     ↓
4. lines_01 (depends on lines_00) → STALE
     ↓
5. ... (continues through graph)
     ↓
6. charts (depends on lines_XX) → STALE
```

**Then resolver runs**:
```
1. Resolve dataset (in Data block)
2. Resolve lines_00 (in Lines block)
3. Resolve lines_01 (in Lines block)
4. ...
5. Resolve charts (in Charts block)
```

**Svelte components** that subscribed to `$.charts` get notified:
```javascript
// In FullChart.svelte
$: if ($charts) {
    // Re-runs automatically when charts changes
    renderChart($charts);
}
```

**The notification direction is**:
- **Downstream** through function dependencies (dataset → lines_00 → lines_01 → charts)
- **Not block-to-block** but function-to-function
- **Svelte subscription** provides UI updates

---

## Part 7: Block Independence

You asked: "every block works independently as well?"

**Yes and no.**

### Independent Concerns

Each block encapsulates:
- **Its own functions** - Data block has data functions, Lines block has lines functions
- **Its own logic** - How it transforms inputs to outputs
- **Its own statistics** - Can query block-level stats independently

```javascript
// Observe Lines block independently
console.log($.blocks.lines.stats.cacheHitRate);
// → 0.85 (85% cache hit rate)

// Test Lines block independently
test('lines block produces charts', () => {
    const result = testBlock('lines', {
        inputs: { datasets_to_load: [1], data: [...], ... },
        expectedOutputs: { charts: [...] }
    });
    expect(result).toPass();
});
```

### Dependent Execution

But blocks are **not isolated**:
- Functions in different blocks can depend on each other
- Propagation crosses block boundaries freely
- Execution order determined by function dependencies, not block structure

**Think of blocks as modules/namespaces**, not as isolated processes.

---

## Part 8: The Block Graph as Metadata

Here's the key insight:

**There are TWO graphs**:

1. **Function Dependency Graph** (execution)
   - Nodes: Functions
   - Edges: Function A depends on function B
   - **This is what executes**

2. **Block Dependency Graph** (organization)
   - Nodes: Blocks
   - Edges: Some function in Block A depends on some function in Block B
   - **This is metadata** for understanding, visualization, documentation

### Function Graph (Execution)

```
data_000_async → dataset → lines_00 → lines_01 → charts
      ↑                      ↑
      |                      |
   fixed_data          choices_sorted
```

**This determines execution order.**

### Block Graph (Organization)

```
Data Block → Lines Block → Charts Block
   ↑            ↑
   |            |
Input      Search Block
```

**This helps you understand structure** but doesn't change execution.

---

## Part 9: Why This Design?

### Why Not Hierarchical Blocks?

Hierarchical blocks (blocks within blocks with isolated graphs) would require:

1. **Cross-block communication protocol** - How do blocks talk?
2. **Block resolution order** - Topological sort of blocks
3. **Input/output boundaries** - Strict interfaces between blocks
4. **Propagation complexity** - Intra-block vs inter-block propagation

**Benefits**: Stronger encapsulation, clearer interfaces

**Costs**: More complex, more overhead, harder to debug

### Why Flat Graph with Block Metadata?

Current design:
- **Simple**: One graph, one resolver, straightforward propagation
- **Flexible**: Functions can depend on any other function
- **Familiar**: Like modules in JavaScript (organizational, not isolating)
- **Observable**: Can still query block-level stats
- **Testable**: Can still test blocks as units

**Blocks provide structure without complexity.**

---

## Part 10: Practical Implications

### For prices-app

Current code doesn't need to change:
```javascript
// state/index.js
export const $ = auto({
    ...require('./data'),
    ...require('./search'),
    ...require('./lines'),
    ...require('./dataset'),
    ...require('./components/compare')
});
```

With explicit blocks (optional):
```javascript
export const $ = auto({
    ...require('./data'),
    ...require('./search'),
    ...require('./lines'),
    ...require('./dataset'),
    ...require('./components/compare')
}, {
    blocks: {
        data: {
            functions: ['data_000_async', 'dataset', ...],
            inputs: ['fixed_data'],
            outputs: ['data', 'dataset']
        },
        lines: {
            functions: ['lines_00', 'lines_01', ...],
            inputs: ['datasets_to_load', 'data', 'choices_sorted'],
            outputs: ['charts', 'mainpoints', 'mainchart']
        }
        // ... more blocks
    }
});
```

**Benefits of explicit blocks**:
- Can query `$.blocks.lines.stats`
- Can visualize block dependency graph
- Can test blocks as units
- Better documentation

**Code execution**: Identical with or without block metadata

### For UI Components

Components import and use `$` normally:
```javascript
// In any .svelte component
import { $ } from '../state';

// Set values
$.dataset_chosen = id;

// Read values (reactive)
$: if ($charts) {
    renderChart($charts);
}
```

**Blocks are invisible to components** - they see one reactive object.

---

## Part 11: Block-Level Operations (Future)

With blocks as first-class, you could:

### 1. Cache at Block Level

```javascript
// Cache entire Lines block result
linesBlock.cached({
    datasets_to_load: [1, 2],
    data: [...],
    choices_sorted: [...]
});
// → If cache hit, skip ALL functions in block
```

### 2. Observe Block Statistics

```javascript
$.blocks.lines.stats
// {
//   executionCount: 145,
//   cacheHitRate: 0.75,
//   averageDuration: 50ms,
//   functions: {
//     lines_00: { executions: 145, avgDuration: 5ms, ... },
//     lines_01: { executions: 145, avgDuration: 3ms, ... },
//     ...
//   }
// }
```

### 3. Test Blocks as Units

```javascript
test('lines block transforms data correctly', () => {
    const result = $.blocks.lines.resolve({
        datasets_to_load: [1],
        data: [...],
        choices_sorted: [...]
    });

    expect(result.charts).toBeDefined();
    expect(result.charts.length).toBe(1);
});
```

### 4. Visualize Block Dependencies

```javascript
visualizeBlocks($);
// Shows:
// Data → Lines → Charts
//   ↓      ↑
// Dataset  Search
```

**But execution still uses the flat function graph.**

---

## Part 12: Summary

### How the Graph Works

**One flat function dependency graph** determines execution order. Blocks are metadata for grouping, observing, and testing.

### How Stale Propagates

**Through function dependencies**, not block boundaries. When a value changes, all dependent functions become stale, regardless of which block they're in.

### How UI Integration Works

**Components import one global `$`** that contains all functions from all blocks. Changes propagate automatically through the function graph. Svelte's reactivity subscribes to values and re-runs when they change.

**Blocks don't create isolation** - they create organization.

### Notification Direction

**Downstream through function dependencies**:
```
dataset_chosen → dataset → lines_00 → lines_01 → charts → UI
```

Not "block notifies parent/child" but "function notifies dependents."

### The Two Graphs

1. **Function graph** (execution) - determines what runs when
2. **Block graph** (organization) - helps you understand and observe

**Execution uses #1. Understanding uses #2.**

---

## Part 13: The Analogy

Think of blocks like **modules in JavaScript**:

```javascript
// data.js (Data block)
export const dataset = ...;

// lines.js (Lines block)
import { dataset } from './data.js';
export const charts = ...;

// app.js
import { dataset } from './data.js';
import { charts } from './lines.js';
```

**Modules provide**:
- Organization (separate files)
- Namespacing (clear boundaries)
- Documentation (imports show dependencies)

**But at runtime**: Everything is in one JavaScript context. Functions can call each other freely. No isolation.

**Blocks are the same**:
- Organization (group related functions)
- Namespacing (blocks.lines.*)
- Documentation (inputs/outputs)
- **But at runtime**: One dependency graph, one resolver, functions depend on functions

**Blocks are organizational, not architectural boundaries.**

---

## Conclusion

Your intuition was right to question how blocks work together. The answer is:

**Blocks are conceptual boundaries (for understanding), not execution boundaries (for isolation).**

The actual graph is flat - all functions in one dependency graph. Stale propagates through function dependencies, crossing block boundaries freely. UI components see one reactive object.

**Blocks help you think and observe**, but don't change how execution works.

This keeps the system simple while still providing the benefits of structured thinking.

In Blocks v2, if we wanted stricter boundaries, we'd need to rethink this - but at the cost of significant complexity.
