# Graph-First Architecture: Deep Dive

## Overview

This document explains how the graph-first implementation works, stepping through the code from initialization to updates, and explores the dynamic dependency problem and alternative approaches.

## Core Components

The architecture has three layers:

```
┌─────────────────────────────────────┐
│   Auto API ($ proxy)                │  ← What users interact with
├─────────────────────────────────────┤
│   GraphState (values, dirty)        │  ← Mutable state
├─────────────────────────────────────┤
│   ReactiveGraph (structure)         │  ← Immutable graph
└─────────────────────────────────────┘
```

### 1. ReactiveGraph (Immutable Structure)

**Purpose**: Represents the dependency graph structure. Built once, never changes.

**Data:**
```javascript
{
    nodes: Map<string, NodeInfo>
        // NodeInfo = { name, type: 'static'|'computed', fn }
        // Example: 'count' -> { name: 'count', type: 'computed', fn: ($) => $.data.length }

    edges: Map<string, Set<string>>
        // Forward dependencies (what does X depend on?)
        // Example: 'msg' -> Set(['count'])

    reverseEdges: Map<string, Set<string>>
        // Reverse dependencies (who depends on X?)
        // Example: 'count' -> Set(['msg', 'doubled'])

    executionOrder: string[]
        // Topologically sorted list of computed nodes
        // Example: ['count', 'msg', 'doubled']
}
```

**Key Methods:**
- `getDependencies(name)` - What does this node depend on?
- `getDependents(name)` - Who depends on this node?
- `getAffectedNodes(changed)` - Given changes, what needs updating?
- `toDot()` - Generate GraphViz visualization

### 2. GraphState (Mutable Values)

**Purpose**: Holds the current values flowing through the graph.

**Data:**
```javascript
{
    graph: ReactiveGraph           // Reference to the structure
    values: Map<string, any>       // Current values
    dirty: Set<string>             // Which computed nodes need recomputing
    computing: Set<string>         // Currently being computed (cycle detection)
}
```

**Key Methods:**
- `get(name)` - Access value (compute if needed)
- `set(name, value)` - Update value, mark dependents dirty
- `flush()` - Eagerly compute all dirty nodes

### 3. Auto API (Proxy Wrapper)

**Purpose**: Provides the familiar `$` interface and introspection via `$._`

```javascript
const $ = new Proxy(state, {
    get(target, prop) {
        if (prop === '_') return introspection;
        if (prop === 'visualize') return () => graph.toDot();
        return state.get(prop);
    },
    set(target, prop, value) {
        state.set(prop, value);
        return true;
    }
});
```

## Initialization Flow

Let's trace what happens when you call:

```javascript
let $ = auto({
    data: null,
    count: ($) => $.data ? $.data.length : 0,
    msg: ($) => `Got ${$.count} items`
});
```

### Step 1: Create ReactiveGraph

**ReactiveGraph constructor:**

```javascript
constructor(definition) {
    this.nodes = new Map();
    this.edges = new Map();
    this.reverseEdges = new Map();
    this.executionOrder = [];

    this._build(definition);      // ← Start here
    this._validate();
    this._computeExecutionOrder();
}
```

### Step 2: Build Phase - Identify Nodes

**First pass in `_build()`:**

```javascript
// Iterate through definition
for (let [name, value] of Object.entries(definition)) {
    const isFunction = typeof value === 'function';

    this.nodes.set(name, {
        name: name,
        type: isFunction ? 'computed' : 'static',
        fn: isFunction ? value : null
    });
}
```

**Result after first pass:**
```javascript
nodes = Map {
    'data'  -> { name: 'data',  type: 'static',   fn: null },
    'count' -> { name: 'count', type: 'computed', fn: [Function] },
    'msg'   -> { name: 'msg',   type: 'computed', fn: [Function] }
}
```

### Step 3: Build Phase - Discover Dependencies

**Second pass in `_build()`:**

For each computed node, run its function with a tracking proxy:

```javascript
for (let [name, node] of this.nodes) {
    if (node.type === 'computed') {
        const deps = this._discoverDependencies(node.fn, name);
        this.edges.set(name, deps);

        // Build reverse edges
        for (let dep of deps) {
            if (!this.reverseEdges.has(dep)) {
                this.reverseEdges.set(dep, new Set());
            }
            this.reverseEdges.get(dep).add(name);
        }
    }
}
```

**How `_discoverDependencies()` works:**

```javascript
_discoverDependencies(fn, name) {
    const accessed = new Set();

    // Create proxy that tracks property access
    const proxy = new Proxy({}, {
        get(target, prop) {
            accessed.add(prop);  // ← Record the access
            return undefined;     // Value doesn't matter
        }
    });

    try {
        fn(proxy);  // Run the function: ($) => $.data ? $.data.length : 0
                    // This accesses proxy.data, so accessed = Set(['data'])
    } catch (e) {
        // Errors expected (undefined.length, etc) - ignore
    }

    return accessed;
}
```

**For `count` function `($) => $.data ? $.data.length : 0`:**
1. Proxy is created
2. Function runs: accesses `$.data` → proxy records 'data'
3. Accesses `$.data.length` → undefined.length throws, caught
4. Returns: `Set(['data'])`

**For `msg` function `($) => 'Got ' + $.count + ' items'`:**
1. Function runs: accesses `$.count` → proxy records 'count'
2. Returns: `Set(['count'])`

**Result after second pass:**
```javascript
edges = Map {
    'count' -> Set(['data']),
    'msg'   -> Set(['count'])
}

reverseEdges = Map {
    'data'  -> Set(['count']),
    'count' -> Set(['msg'])
}
```

### Step 4: Validate - Check for Cycles

```javascript
_validate() {
    const visiting = new Set();
    const visited = new Set();

    const visit = (name, path = []) => {
        if (visited.has(name)) return;
        if (visiting.has(name)) {
            // We've seen this node in the current path - cycle!
            throw new Error(`Circular dependency: ${[...path, name].join(' -> ')}`);
        }

        visiting.add(name);
        const deps = this.edges.get(name);
        if (deps) {
            for (let dep of deps) {
                visit(dep, [...path, name]);
            }
        }
        visiting.delete(name);
        visited.add(name);
    };

    for (let name of this.nodes.keys()) {
        if (this.nodes.get(name).type === 'computed') {
            visit(name);
        }
    }
}
```

**Example - this would throw:**
```javascript
auto({
    a: ($) => $.b + 1,
    b: ($) => $.a + 1  // Cycle: a -> b -> a
});
// Error: "Circular dependency: a -> b -> a"
```

### Step 5: Compute Execution Order

**Topological sort - dependencies before dependents:**

```javascript
_computeExecutionOrder() {
    const visited = new Set();
    const order = [];

    const visit = (name) => {
        if (visited.has(name)) return;
        visited.add(name);

        // Visit dependencies first (depth-first)
        const deps = this.edges.get(name);
        if (deps) {
            for (let dep of deps) {
                visit(dep);
            }
        }

        // Add to order after dependencies
        order.push(name);
    };

    for (let name of this.nodes.keys()) {
        if (this.nodes.get(name).type === 'computed') {
            visit(name);
        }
    }

    this.executionOrder = order;
}
```

**Trace for our example:**
1. Start with 'count':
   - Visit dependencies: visit('data')
     - 'data' is static, no dependencies, skip
   - Add 'count' to order: `['count']`
2. Continue with 'msg':
   - Visit dependencies: visit('count')
     - Already visited, skip
   - Add 'msg' to order: `['count', 'msg']`

**Result:**
```javascript
executionOrder = ['count', 'msg']
```

This ensures `count` always computes before `msg`.

### Step 6: Create GraphState

```javascript
const state = new GraphState(graph, definition);
```

**GraphState constructor:**
```javascript
constructor(graph, initialValues = {}) {
    this.graph = graph;
    this.values = new Map();
    this.dirty = new Set();
    this.computing = new Set();

    // Initialize static values only
    for (let [name, node] of graph.nodes) {
        if (node.type === 'static') {
            this.values.set(name, initialValues[name]);
        }
    }
}
```

**Initial state:**
```javascript
values = Map {
    'data' -> null
}
dirty = Set {}  // Empty - nothing computed yet
```

Computed values (`count`, `msg`) are NOT computed yet - they're lazy!

### Step 7: Create Proxy and Return

```javascript
const proxy = new Proxy(state, {
    get(target, prop) {
        if (prop === '_') return { graph, deps, ... };
        return target.get(prop);
    },
    set(target, prop, value) {
        target.set(prop, value);
        return true;
    }
});

return proxy;
```

**Initialization complete!**

The graph structure is now immutable. Only values will change.

## Update Flow

Let's trace what happens when you do:

```javascript
$.count  // First access
$.data = [1, 2, 3]
$.msg    // Access after change
```

### Scenario 1: First Access to Computed Value

**`$.count` is accessed:**

```javascript
// Proxy get trap fires
get(target, prop) {
    return target.get('count');  // Call GraphState.get()
}
```

**GraphState.get('count'):**

```javascript
get(name) {
    const node = this.graph.nodes.get('count');
    // node = { name: 'count', type: 'computed', fn: [Function] }

    if (node.type === 'computed') {
        if (this.dirty.has('count') || !this.values.has('count')) {
            // 'count' has never been computed (!this.values.has('count') is true)
            this._compute('count');
        }
    }

    return this.values.get('count');
}
```

**GraphState._compute('count'):**

```javascript
_compute(name) {
    const node = this.graph.nodes.get('count');
    // node.fn = ($) => $.data ? $.data.length : 0

    // Cycle detection
    if (this.computing.has('count')) {
        throw new Error('Circular computation');
    }
    this.computing.add('count');

    try {
        // Create proxy for function to access values
        const self = this;
        const proxy = new Proxy(this, {
            get(target, prop) {
                if (prop === 'count') {
                    throw new Error('Cannot reference self');
                }
                return self.get(prop);  // Recursively get dependencies
            },
            set(target, prop, value) {
                throw new Error('Functions cannot set values');
            }
        });

        // Run the function
        const result = node.fn(proxy);
        // Function accesses $.data:
        //   proxy.get('data')
        //   -> self.get('data')
        //   -> this.values.get('data')
        //   -> null
        // Function: null ? null.length : 0 -> 0

        this.values.set('count', 0);
        this.dirty.delete('count');
    } finally {
        this.computing.delete('count');
    }
}
```

**Result:**
```javascript
values = Map {
    'data'  -> null,
    'count' -> 0
}
dirty = Set {}
```

Returns: `0`

### Scenario 2: Setting a Static Value

**`$.data = [1, 2, 3]` is executed:**

```javascript
// Proxy set trap fires
set(target, prop, value) {
    target.set('data', [1, 2, 3]);
    return true;
}
```

**GraphState.set('data', [1, 2, 3]):**

```javascript
set(name, value) {
    const node = this.graph.nodes.get('data');
    // node = { name: 'data', type: 'static', fn: null }

    if (node.type === 'computed') {
        throw new Error('Cannot set computed');
    }

    const oldValue = this.values.get('data');  // null

    if (oldValue === value) {
        return;  // No change - skip
    }

    // Update value
    this.values.set('data', [1, 2, 3]);

    // Find all affected nodes using pre-computed graph
    const affected = this.graph.getAffectedNodes(['data']);
    for (let dep of affected) {
        this.dirty.add(dep);
    }
}
```

**How `getAffectedNodes()` works:**

```javascript
getAffectedNodes(changedNames) {
    const affected = new Set();
    const queue = ['data'];  // Start with changed nodes

    while (queue.length > 0) {
        const name = queue.shift();  // 'data'
        const dependents = this.getDependents(name);
        // getDependents('data') -> reverseEdges.get('data') -> Set(['count'])

        for (let dep of dependents) {  // dep = 'count'
            if (!affected.has(dep)) {
                affected.add(dep);
                queue.push(dep);  // Queue 'count' to find its dependents
            }
        }
    }

    // Next iteration: name = 'count'
    //   getDependents('count') -> Set(['msg'])
    //   Add 'msg' to affected

    return affected;  // Set(['count', 'msg'])
}
```

**Result after set:**
```javascript
values = Map {
    'data'  -> [1, 2, 3],
    'count' -> 0           // Still old value!
}
dirty = Set { 'count', 'msg' }  // Marked for recomputation
```

**Important**: Values aren't recomputed immediately (lazy evaluation)!

### Scenario 3: Accessing After Change

**`$.msg` is accessed:**

```javascript
get('msg') {
    const node = this.graph.nodes.get('msg');

    if (node.type === 'computed') {
        if (this.dirty.has('msg') || !this.values.has('msg')) {
            // 'msg' is dirty!
            this._compute('msg');
        }
    }

    return this.values.get('msg');
}
```

**_compute('msg'):**

```javascript
_compute('msg') {
    const node = this.graph.nodes.get('msg');
    // node.fn = ($) => `Got ${$.count} items`

    const proxy = new Proxy(this, {
        get(target, prop) {
            return self.get(prop);
        }
    });

    const result = node.fn(proxy);
    // Function accesses $.count:
    //   proxy.get('count')
    //   -> self.get('count')
    //   -> Check if dirty: YES
    //   -> _compute('count') first!

    this.values.set('msg', result);
    this.dirty.delete('msg');
}
```

**Nested _compute('count'):**

```javascript
_compute('count') {
    const result = node.fn(proxy);
    // Function: $.data ? $.data.length : 0
    //   $.data -> self.get('data') -> [1, 2, 3]
    //   [1, 2, 3].length -> 3

    this.values.set('count', 3);
    this.dirty.delete('count');
}
```

**Back to _compute('msg'):**

```javascript
const result = node.fn(proxy);
// $.count is now 3
// Result: "Got 3 items"

this.values.set('msg', 'Got 3 items');
```

**Final state:**
```javascript
values = Map {
    'data'  -> [1, 2, 3],
    'count' -> 3,
    'msg'   -> 'Got 3 items'
}
dirty = Set {}  // All clean
```

Returns: `"Got 3 items"`

## The Dynamic Dependency Problem

### The Issue

You mentioned: **"the graph can change"** - and you're absolutely right!

**Example:**

```javascript
let $ = auto({
    showDetails: false,
    name: 'John',
    age: 30,
    display: ($) => {
        if ($.showDetails) {
            return $.name + ' is ' + $.age;  // Depends on age
        } else {
            return $.name;  // Doesn't depend on age
        }
    }
});
```

**During discovery (first run):**
```javascript
// showDetails is undefined during discovery
// if (undefined) -> false branch
// Only accesses: $.name
// Discovered deps: Set(['showDetails', 'name'])
// MISSING: age!
```

**Later:**
```javascript
$.showDetails = true;
// display is marked dirty
// Recomputes, NOW accesses age
// But age isn't in edges!
```

**The graph topology is data-dependent!**

### Current Behavior in Graph-First

The current implementation **over-subscribes**:

```javascript
// First run tries both branches:
try {
    fn(proxy);  // Proxy tracks ALL accesses
} catch (e) {
    // Errors expected
}

// Even though only one branch executes, proxy saw:
// $.showDetails, $.name, $.age (from undefined.age access)
```

**Result:** Conservative dependency tracking.

- **Pro**: Always correct - won't miss updates
- **Con**: May recompute when not strictly necessary

### Solution 1: Runtime Dependency Tracking (Hybrid)

Track dependencies during actual execution, not discovery:

```javascript
class HybridGraphState extends GraphState {
    _compute(name) {
        const actualDeps = new Set();

        const proxy = new Proxy(this, {
            get(target, prop) {
                actualDeps.add(prop);  // Track what's ACTUALLY accessed
                return self.get(prop);
            }
        });

        const result = node.fn(proxy);

        // Compare to static graph
        const staticDeps = this.graph.edges.get(name);
        if (!setsEqual(actualDeps, staticDeps)) {
            // Dependencies changed!
            // Update graph or handle accordingly
        }

        this.values.set(name, result);
    }
}
```

**Tradeoff:**
- More accurate (only track what's used)
- But need to track on every execution (overhead)
- Graph becomes mutable

### Solution 2: Pessimistic Static Analysis

Parse the function body to find ALL possible dependencies:

```javascript
_discoverDependencies(fn) {
    const source = fn.toString();
    // "($) => { if ($.showDetails) return $.name + $.age; return $.name }"

    const regex = /\$\.(\w+)/g;
    const deps = new Set();
    let match;

    while ((match = regex.exec(source)) !== null) {
        deps.add(match[1]);
    }

    return deps;  // Set(['showDetails', 'name', 'age'])
}
```

**Tradeoff:**
- Simple, conservative
- Over-subscribes on conditionals
- But graph stays immutable

### Solution 3: Explicit Dependencies (React-style)

Require users to declare dependencies:

```javascript
auto({
    display: {
        deps: ['showDetails', 'name', 'age'],
        fn: ($) => $.showDetails ? $.name + ' is ' + $.age : $.name
    }
})
```

**Tradeoff:**
- Exact control
- But manual, error-prone

### Solution 4: Accept Over-Subscription

For a visualization tool:
- Recomputing is cheap (pure functions)
- Correctness matters more than micro-optimizations
- Conservative = always correct

**This is what the current implementation does** - and it's fine!

### Recommendation

For graph-first philosophy:
- **Keep the graph immutable**
- **Use pessimistic static analysis** (parse function source)
- **Document the over-subscription behavior**

If dynamic dependencies are critical:
- Use Solution 1 (hybrid runtime tracking)
- But accept that graph structure becomes mutable

## Alternative Graph-Centered Architectures

Beyond the current approach, here are other ways to center everything around the graph:

### Alternative 1: Dataflow DSL

Instead of JavaScript functions, use a declarative DSL:

```javascript
auto({
    data: static(null),
    count: computed(
        depends('data'),
        ({ data }) => data ? data.length : 0
    ),
    msg: computed(
        depends('count'),
        ({ count }) => `Got ${count} items`
    )
})
```

**Benefits:**
- Dependencies explicit (no discovery needed)
- Graph is declarative, easy to serialize/visualize
- No dynamic dependency problem

**Drawbacks:**
- Less flexible than full JavaScript
- Learning curve for DSL

### Alternative 2: Builder Pattern

Construct graph explicitly:

```javascript
const graph = new ReactiveGraph();

graph.addStatic('data', null);
graph.addComputed('count', ['data'], ({ data }) => data?.length ?? 0);
graph.addComputed('msg', ['count'], ({ count }) => `Got ${count} items`);

const $ = graph.build();
```

**Benefits:**
- Graph construction is explicit
- Type-safe (TypeScript)
- Easy to introspect during building

**Drawbacks:**
- Verbose
- Loses concise object literal syntax

### Alternative 3: Graph-First, Compile to Execution Plan

Build graph, then compile to optimized execution function:

```javascript
class CompiledGraph {
    constructor(graph) {
        this.graph = graph;
        this.plan = this._compile(graph);
    }

    _compile(graph) {
        // Generate optimized update function
        const code = `
            function update(values, changed) {
                ${graph.executionOrder.map(name => {
                    const node = graph.nodes.get(name);
                    return `values.${name} = ${node.fn.toString()}(values);`;
                }).join('\n')}
            }
        `;
        return eval(code);  // or use Function constructor
    }

    propagate(changed) {
        this.plan(this.values, changed);
    }
}
```

**Benefits:**
- Graph is immutable, first-class
- Execution is optimized (no proxy overhead)
- Can optimize based on graph structure

**Drawbacks:**
- Complex compilation step
- Less debuggable (generated code)
- Security concerns (eval)

### Alternative 4: Incremental Computation (Adapton-style)

Make the graph self-adjusting:

```javascript
class IncrementalGraph {
    constructor(definition) {
        this.graph = new ReactiveGraph(definition);
        this.memo = new Map();  // Memoize results
        this.stable = new Set(); // Which nodes are stable
    }

    get(name) {
        if (this.stable.has(name)) {
            return this.memo.get(name);  // Cached
        }

        // Check if dependencies are stable
        const deps = this.graph.getDependencies(name);
        const allStable = Array.from(deps).every(d => this.stable.has(d));

        if (allStable) {
            // Dependencies unchanged, result is stable
            this.stable.add(name);
            return this.memo.get(name);
        }

        // Recompute
        const result = this._compute(name);
        this.memo.set(name, result);
        this.stable.add(name);
        return result;
    }
}
```

**Benefits:**
- Automatic memoization
- Minimal recomputation
- Graph structure guides optimization

**Drawbacks:**
- Complexity in tracking stability
- Memory overhead for memoization

### Alternative 5: Event-Sourced Graph

Store graph mutations as events:

```javascript
class EventSourcedGraph {
    constructor(definition) {
        this.baseGraph = new ReactiveGraph(definition);
        this.events = [];  // Log of all changes
        this.snapshots = new Map();  // Cached states
    }

    set(name, value) {
        const event = { type: 'set', name, value, time: Date.now() };
        this.events.push(event);

        // Rebuild state by replaying events
        this._applyEvent(event);
    }

    replayTo(time) {
        // Time travel: replay events up to time
        const state = new GraphState(this.baseGraph);
        for (let event of this.events) {
            if (event.time <= time) {
                this._applyEvent(event, state);
            }
        }
        return state;
    }
}
```

**Benefits:**
- Perfect debugging (time-travel)
- Audit trail of all changes
- Can replay/rewind

**Drawbacks:**
- Memory overhead
- Complexity

### Alternative 6: Constraint-Based Graph

Instead of directed dependencies, declare constraints:

```javascript
auto.constraints({
    nodes: ['data', 'count', 'msg'],
    constraints: [
        { type: 'compute', output: 'count', inputs: ['data'],
          fn: (data) => data?.length ?? 0 },
        { type: 'compute', output: 'msg', inputs: ['count'],
          fn: (count) => `Got ${count} items` }
    ]
});
```

**Benefits:**
- Declarative constraints
- Could solve in different directions (bidirectional)
- Graph structure very explicit

**Drawbacks:**
- More complex (constraint solving)
- Overkill for simple reactive system

## Comparison of Approaches

| Approach | Graph Immutability | Complexity | Flexibility | Debuggability |
|----------|-------------------|------------|-------------|---------------|
| Current Graph-First | ✓ Immutable | Low | High (JS) | ✓ Excellent |
| Dataflow DSL | ✓ Immutable | Medium | Medium | ✓ Good |
| Builder Pattern | ✓ Immutable | Low | High | ✓ Good |
| Compiled | ✓ Immutable | High | High | ⚠ Harder |
| Incremental | ✓ Immutable | High | High | ⚠ Complex |
| Event-Sourced | ✓ Immutable | High | High | ✓ Excellent |
| Constraint-Based | ✓ Immutable | Very High | Medium | ⚠ Complex |

## Recommendation

For your use case (data visualization, clarity over optimization):

**Stick with current graph-first approach**, with these enhancements:

1. **Add static analysis for dependencies** (parse function source)
2. **Keep graph immutable**
3. **Accept over-subscription** (it's fine for viz)
4. **Enhance introspection** (more graph queries)

If you need dynamic dependencies:
- Add **runtime dependency tracking** as opt-in
- Let graph edges be updated based on actual execution
- Keep graph structure queryable

The current architecture is clean, understandable, and fits your goals perfectly.

## Summary

**How it works:**
1. **Build graph once**: Parse definition, discover dependencies, validate, sort
2. **Store values separately**: Graph is structure, state is values
3. **Lazy evaluation**: Compute only when accessed
4. **Pre-computed traversal**: Use pre-built edges/order for updates

**Dynamic dependencies:**
- Current: Conservative (over-subscribes)
- Solutions: Runtime tracking, static analysis, or accept conservative

**Alternatives:**
- Many ways to be "graph-first"
- Current approach balances simplicity with power
- Trade complexity for clarity

The key insight: **The graph IS the program**. Everything else is just data flowing through it.
