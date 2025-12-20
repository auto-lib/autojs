# Migration Guide: Current Auto.js → Three-Layer Architecture

## Quick Comparison

### Current Auto.js
```javascript
import auto from './auto-es6.js';

const $ = auto({
    data: null,
    count: ($) => $.data?.length ?? 0,
    msg: ($) => `Got ${$.count} items`
});

$.data = [1, 2, 3];
console.log($.msg);  // "Got 3 items"
```

### Three-Layer Architecture
```javascript
import auto from './kernels/graph-first/src/auto-layered.js';

const $ = auto({
    data: null,
    count: ($) => $.data?.length ?? 0,
    msg: ($) => `Got ${$.count} items`
});

$.data = [1, 2, 3];
console.log($.msg);  // "Got 3 items"
```

**The API is identical!** The difference is internal architecture.

## What Changed Internally?

### Current Auto.js Architecture

**Single-file, mixed concerns** (941 lines):
```javascript
// auto-es6.js
let deps = {};           // What does X depend on
let dependents = {};     // Who depends on X
let fn = {};             // Computation functions
let value = {};          // Current values
// ... 50+ more variables

function propagate() {
    // Phase 1: Invalidate
    // Phase 2: Topological sort (happens on EVERY update)
    // Phase 3: Capture old values
    // Phase 4: Clear values
    // Phase 5: Recompute
    // Phase 6: Detect changes
    // Phase 7: Build trace
    // Phase 8: Notify subscriptions
}
```

**Key behaviors:**
- Clears `deps[name] = {}` on every function execution
- Rediscovers dependencies by tracking property accesses
- Re-sorts topologically on every update
- Graph structure is implicit in scattered variables

### Three-Layer Architecture

**Three independent modules** (~720 lines total):

```javascript
// Layer 1: Pure graph (270 lines)
class DirectedGraph {
    constructor() {
        this.nodes = new Map();
        this.edges = new Map();
        this.reverseEdges = new Map();
    }
    topologicalSort() { /* computed once */ }
}

// Layer 2: Build graph (230 lines)
class StaticAnalysisBuilder {
    build(definition) {
        // Analyzes function source to find ALL $.property accesses
        // Returns immutable DirectedGraph
    }
}

// Layer 3: Use graph (120 lines)
class ReactiveSystem {
    constructor(graph) {
        this.graph = graph;  // Never changes!
        this.values = new Map();
        this.dirty = new Set();
    }

    set(name, value) {
        // Use pre-computed graph.getReachable()
        // No rediscovery, no re-sorting
    }
}
```

**Key behaviors:**
- Graph structure computed **once** at creation
- Dependencies never rediscovered after initial build
- Topological order cached, never recomputed
- Graph is first-class, queryable object

## API Compatibility

### Basic Usage - Identical

```javascript
// Both work exactly the same
const $ = auto({
    x: 1,
    y: 2,
    sum: ($) => $.x + $.y
});

$.x = 10;
console.log($.sum);  // 12
```

### Introspection - Enhanced

```javascript
// Current Auto.js
console.log($._);
// { fn: [...], deps: {...}, value: {...}, subs: {...}, fatal: {...} }

// Three-layer (more structured)
console.log($._);
// {
//   graph: DirectedGraph { /* full graph object */ },
//   deps: { sum: ['x', 'y'] },        // What does X depend on
//   dependents: { x: ['sum'], y: ['sum'] },  // Who depends on X
//   fn: ['sum'],                      // All computed properties
//   value: { x: 10, y: 2, sum: 12 }, // Current values
//   dirty: [],                        // Dirty nodes
//   order: ['x', 'y', 'sum']         // Execution order
// }
```

### New Capabilities

```javascript
// Visualize the graph
console.log($.visualize());
// Returns GraphViz DOT format

// Query the graph
console.log($._graph.getReachable(['x']));
// Set(['sum']) - what does x affect?

console.log($._graph.getPredecessors('sum'));
// Set(['x', 'y']) - what does sum depend on?

// Choose strategy
const $1 = auto.static(definition);    // Parse source (default)
const $2 = auto.runtime(definition);   // Track at runtime
const $3 = auto.explicit(definition);  // Manual declaration
```

## Converting Existing Code

### Step 1: Change Import

```javascript
// Before
import auto from './auto-es6.js';

// After
import auto from './kernels/graph-first/src/auto-layered.js';
```

### Step 2: Test It

Your code should work identically! Run your tests:

```bash
# Current tests
cd tests && node runall.js

# Should work with new architecture too
```

### Step 3: Choose Strategy (Optional)

If you have dynamic dependencies (conditionals), you might want to explicitly choose a strategy:

```javascript
// Conservative: finds ALL possible dependencies (default)
const $ = auto.static({
    enabled: false,
    data: [1, 2, 3],
    result: ($) => $.enabled ? $.data.length : 'N/A'
});
// Deps: {enabled, data} - both branches analyzed

// Precise: tracks actual runtime accesses
const $ = auto.runtime({
    enabled: false,
    data: [1, 2, 3],
    result: ($) => $.enabled ? $.data.length : 'N/A'
});
// Deps: {enabled} - only executed branch

// Explicit: you declare dependencies
import { computed } from './kernels/graph-first/src/auto-layered.js';
const $ = auto.explicit({
    enabled: false,
    data: [1, 2, 3],
    result: computed(['enabled', 'data'], ($) => $.enabled ? $.data.length : 'N/A')
});
// Deps: {enabled, data} - exactly what you declared
```

### Step 4: Use New Features (Optional)

```javascript
// Visualize dependencies
console.log($.visualize());
// Use for debugging, documentation, or visualization

// Query the graph
if ($._graph.hasCycle()) {
    console.error('Circular dependency!', $._graph.getCycles());
}

// Inspect execution order
console.log($._order);  // ['data', 'count', 'msg']

// Use graph for other purposes
const graph = $._graph;
// It's a generic DirectedGraph - use for tasks, builds, etc.
```

## Converting Tests

### Current Test Format

```javascript
// tests/files/005_dependent_function.js
export default {
    obj: { data: null, count: ($) => $.data?.length ?? 0 },
    fn: ($) => { $.data = [1,2,3] },
    _: {
        fn: ['count'],
        deps: { count: { data: true } },
        value: { data: [1,2,3], count: 3 },
        fatal: {}
    }
}
```

### Three-Layer Test Format

```javascript
// Similar, but deps format slightly different
import { test, assert } from './test-framework.js';

test('dependent function', () => {
    const $ = auto({
        data: null,
        count: ($) => $.data?.length ?? 0
    });

    $.data = [1, 2, 3];

    // Same assertions
    assert.deepEqual($._fn, ['count']);
    assert.deepEqual($._deps, { count: ['data'] });  // Array, not object
    assert.deepEqual($._value, { data: [1,2,3], count: 3 });
});
```

**Key difference:** Dependencies are `{ count: ['data'] }` instead of `{ count: { data: true } }`

## Benefits of Migration

### 1. Simpler Mental Model

**Current Auto.js:**
- "How does it track dependencies?" → "Clears and rediscovers them on every function call"
- "When is the graph sorted?" → "On every update during propagation"
- "Where is the graph?" → "Scattered across deps, dependents, fn objects"

**Three-layer:**
- "How does it track dependencies?" → "Static analysis of function source at creation"
- "When is the graph sorted?" → "Once, at creation time"
- "Where is the graph?" → "`$._graph` - a DirectedGraph object"

### 2. Easier Debugging

```javascript
// Current Auto.js - opaque internal state
console.log($._);  // Big object, hard to understand

// Three-layer - structured, queryable
console.log($.visualize());  // See the graph visually
console.log($._graph.getReachable(['data']));  // Query relationships
console.log($._order);  // See execution order
```

### 3. Better Testing

```javascript
// Test each layer independently
test('graph operations', () => {
    const g = new DirectedGraph();
    g.addEdge('a', 'b');
    assert.deepEqual(g.topologicalSort(), ['a', 'b']);
});

test('static analysis', () => {
    const builder = new StaticAnalysisBuilder();
    const graph = builder.build({ x: 1, y: ($) => $.x });
    assert(graph.getPredecessors('y').has('x'));
});

test('reactive system', () => {
    const graph = /* ... */;
    const reactive = new ReactiveSystem(graph);
    // Test reactive behavior independently
});
```

### 4. Reusability

```javascript
// Use DirectedGraph for anything
import DirectedGraph from './kernels/graph-first/src/layer1-graph.js';

const tasks = new DirectedGraph();
tasks.addEdge('build', 'test');
tasks.addEdge('test', 'deploy');
console.log(tasks.topologicalSort());  // ['build', 'test', 'deploy']

// Use ReactiveSystem with any graph
import ReactiveSystem from './kernels/graph-first/src/layer3-reactive.js';
const reactive = new ReactiveSystem(myCustomGraph);
```

### 5. Flexibility

```javascript
// Swap strategies
const $ = auto(definition, { builder: new CustomBuilder() });

// Mix layers
const graph = new StaticAnalysisBuilder().build(definition);
// Modify graph if needed
graph.addEdge('extra', 'dependency');
const reactive = new ReactiveSystem(graph);
```

## Migration Checklist

- [ ] Read THREE-LAYERS.md to understand the architecture
- [ ] Read LAYERED-IMPLEMENTATION.md for implementation details
- [ ] Run `node tests/test-layers.js` to see all tests pass
- [ ] Run `node example-layered.js` to see examples
- [ ] Update imports in your code
- [ ] Run existing tests to verify compatibility
- [ ] Choose dependency tracking strategy if needed
- [ ] Update test assertions for new `_` format if needed
- [ ] Explore new graph introspection features
- [ ] Consider using DirectedGraph for other purposes

## Gradual Migration

You don't have to migrate everything at once:

### Option 1: Side-by-side
```javascript
import auto1 from './auto-es6.js';
import auto2 from './kernels/graph-first/src/auto-layered.js';

const $old = auto1(definition);
const $new = auto2(definition);

// Compare behavior
assert.equal($old.result, $new.result);
```

### Option 2: Feature flags
```javascript
const useGraphFirst = process.env.USE_GRAPH_FIRST === 'true';
const auto = useGraphFirst
    ? await import('./kernels/graph-first/src/auto-layered.js')
    : await import('./auto-es6.js');
```

### Option 3: Per-instance
```javascript
// Use old for complex dynamic behavior
const $complex = autoOld(complexDefinition);

// Use new for static graphs
const $simple = autoNew(simpleDefinition);
```

## Common Issues

### Issue 1: Missing Dependencies in Conditionals

**Problem:**
```javascript
const $ = auto.runtime({
    mode: 'simple',
    data: [1, 2, 3],
    result: ($) => $.mode === 'simple' ? $.data.length : $.data.join(',')
});
// Runtime tracking: deps = {mode} - misses 'data' if not accessed!
```

**Solution:** Use static analysis (default) or explicit:
```javascript
// Static (default) - finds both branches
const $1 = auto.static(definition);

// Explicit - declare what you know
const $2 = auto.explicit({
    mode: 'simple',
    data: [1, 2, 3],
    result: computed(['mode', 'data'], ($) => ...)
});
```

### Issue 2: Circular Dependencies Detected

The three-layer architecture detects circular dependencies at **creation time**, not runtime:

```javascript
// Current Auto.js - fails at runtime when you try to access
const $ = auto({ a: ($) => $.b, b: ($) => $.a });
console.log($.a);  // Error during computation

// Three-layer - fails at creation
const $ = auto({ a: ($) => $.b, b: ($) => $.a });
// Error: Circular dependencies detected: a -> b -> a
```

**Solution:** Fix your dependency graph. The error message shows the cycle.

### Issue 3: Test Assertion Format Changed

```javascript
// Current Auto.js
assert.deepEqual($._deps, { count: { data: true } });

// Three-layer
assert.deepEqual($._deps, { count: ['data'] });
```

**Solution:** Update test assertions to expect arrays instead of objects.

## Performance Notes

The user indicated they're **not concerned with speed/optimization** but rather with **readability, maintainability, robustness, testability**.

The three-layer architecture optimizes for those goals:

- **Readability:** Clear separation of concerns, each layer ~100-270 lines
- **Maintainability:** Independent modules, easy to modify one without affecting others
- **Robustness:** Earlier error detection (cycles at creation), immutable graph
- **Testability:** Each layer tested independently

Performance characteristics:
- **Initialization:** Slightly slower (static analysis, topological sort)
- **Updates:** Potentially faster (no rediscovery, no re-sorting) or slower (conservative dependencies)
- **Memory:** Slightly more (graph object + metadata)

For data visualization (the stated use case), these trade-offs are acceptable.

## Next Steps

1. **Experiment:** Try the three-layer architecture with your actual use cases
2. **Compare:** Run side-by-side with current Auto.js to verify identical behavior
3. **Evaluate:** Does the clearer architecture help with your goals?
4. **Decide:** Adopt fully, partially, or continue with current Auto.js

The three-layer architecture is designed to be a **drop-in replacement** with the same API but a **clearer internal structure**.
