# What's Actually Different About "Graph-First"?

## Your Question

> "isn't the original code in auto a graph too? it just uses 4 variables to track - value, fn, dependencies and dependants ... isn't that also a graph? what about what you've done is different?"

**You're absolutely right.** The current Auto.js IS a graph. It has:
- `deps = {}` (forward edges)
- `dependents = {}` (reverse edges)
- `fn = {}` (which nodes are functions)
- `value = {}` (current values)

This IS a graph data structure!

So what's different?

## The Differences

### 1. **When Graph Topology is Computed**

**Current Auto.js**: Traverses and sorts the graph on EVERY update

```javascript
// Every time $.data = [1,2,3]:

let propagate = (triggers) => {
    // Phase 1: Walk the graph to find affected nodes
    let affected = new Set();
    triggers.forEach(trigger => {
        let trigger_affected = phase1_invalidate(trigger.name);
        // ↑ Walks dependents[trigger.name] recursively
        trigger_affected.forEach(name => affected.add(name));
    });

    // Phase 2: Sort the affected nodes topologically
    let sorted = phase2_topological_sort(affected);
    // ↑ DFS to compute execution order

    // ... continue with other phases
}
```

Every update does:
1. **Graph traversal** (walk dependents recursively)
2. **Topological sort** (DFS to order nodes)

**Graph-First**: Computes topology ONCE at creation

```javascript
// At creation:
class ReactiveGraph {
    constructor(definition) {
        this._build(definition);           // Build edges
        this._computeExecutionOrder();     // Topological sort ← ONCE
    }
}

// At update:
set(name, value) {
    // Just look up pre-computed reverse edges
    const affected = this.graph.getAffectedNodes([name]);
    // ↑ No traversal, no sorting - just lookup!
}
```

**Difference**: Work done once vs repeatedly.

### 2. **Separation of Structure from State**

**Current Auto.js**: Everything mixed together

```javascript
// All in closure scope:
let deps = {};          // Graph structure
let dependents = {};    // Graph structure
let fn = {};            // Graph structure
let value = {};         // Runtime state
let dirty = {};         // Runtime state
let stack = [];         // Runtime state
let subs = {};          // Runtime state
let trace = {};         // Runtime state
let in_batch = false;   // Runtime state
// ... 50+ more variables, all mixed together
```

The graph structure is **implicit** in these variables.

**Graph-First**: Structure separate from state

```javascript
// STRUCTURE (immutable)
class ReactiveGraph {
    nodes = Map       // What variables exist
    edges = Map       // What depends on what
    reverseEdges = Map
    executionOrder = []
}

// STATE (mutable)
class GraphState {
    values = Map      // Current values
    dirty = Set       // What needs recomputing
}
```

**Difference**: Clean separation of concerns.

### 3. **Graph as First-Class Object vs Implementation Detail**

**Current Auto.js**: Graph is implicit, scattered

You can't do:
```javascript
// This doesn't exist:
const graph = $.getGraph();
console.log(graph.edges);
console.log(graph.toDot());  // Visualize it

// Can't query:
graph.getDependents('data');
graph.getUpstreamGraph('msg');
```

The graph exists, but it's not a "thing" you can interact with.

**Graph-First**: Graph is a queryable object

```javascript
const graph = $._.graph;

// Query it
graph.getDependents('data');      // [count]
graph.getDependencies('msg');     // [count]
graph.getUpstreamGraph('msg');    // [data, count]

// Visualize it
console.log(graph.toDot());       // GraphViz format

// Inspect structure
graph.edges                        // Map of all dependencies
graph.executionOrder              // Topological order
```

**Difference**: Graph is visible and inspectable vs hidden implementation.

### 4. **Mutability**

**Current Auto.js**: Graph can change during execution

Looking at the code, `deps` and `dependents` are built once, but could theoretically be modified. The structure isn't protected.

**Graph-First**: Graph is immutable by design

```javascript
class ReactiveGraph {
    constructor(definition) {
        this.nodes = new Map();
        this.edges = new Map();
        // ... build graph

        // These never change after construction
        Object.freeze(this);
    }
}
```

**Difference**: Immutability guarantee.

### 5. **What's Primary**

This is the philosophical difference:

**Current Auto.js**: "Propagation is the thing, graph is how we implement it"
- Focus: How to propagate updates efficiently
- Graph: Implementation detail to track dependencies
- Architecture: Procedural (8 phases)

**Graph-First**: "Graph is the thing, propagation is a consequence"
- Focus: What is the structure of the computation
- Graph: The program itself
- Architecture: Declarative (graph + state)

## Visual Comparison

### Current Auto.js Architecture

```
┌─────────────────────────────────────────┐
│   PROPAGATION (8 phases)                │
│                                         │
│   Uses these implementation details:    │
│   - deps {}                             │
│   - dependents {}                       │
│   - value {}                            │
│   - fn {}                               │
│   - dirty {}                            │
│   - stack []                            │
│   - ... 40+ more variables              │
└─────────────────────────────────────────┘
```

Graph is implicit in the variables.

### Graph-First Architecture

```
┌─────────────────────────────────────────┐
│   GRAPH (first-class, immutable)        │
│   - nodes, edges, order                 │
└─────────────────────────────────────────┘
             ↓ queries
┌─────────────────────────────────────────┐
│   STATE (values, dirty flags)           │
│   - Uses graph to know what to update   │
└─────────────────────────────────────────┘
             ↓ uses
┌─────────────────────────────────────────┐
│   PROPAGATION (simple traversal)        │
│   - Look up pre-computed structures     │
└─────────────────────────────────────────┘
```

Graph is the primary thing, everything else follows from it.

## Code Comparison

Let me show the actual difference in what happens on update:

### Current Auto.js: `$.data = [1,2,3]`

```javascript
// From auto-es6.js lines 644-677:

let propagate = (triggers) => {
    txn_counter += 1;
    current_triggers = triggers;

    // PHASE 1: Invalidate - walk the graph
    let affected = new Set();
    triggers.forEach(trigger => {
        let trigger_affected = phase1_invalidate(trigger.name);
        // ↓ This walks dependents recursively
        trigger_affected.forEach(name => affected.add(name));
    });

    // PHASE 2: Topological sort - sort the nodes
    let sorted = affected.size > 0
        ? phase2_topological_sort(affected)
        : [];
    // ↓ This does DFS to compute order

    // PHASE 3-8: ...
    let old_values = phase3_capture_old_values(sorted);
    phase4_clear_values(sorted);
    phase5_recompute(sorted, 'txn_' + txn_counter);
    let actually_changed = phase6_detect_changes(triggers, sorted, old_values);
    let trace = phase7_build_trace(triggers, actually_changed, txn_counter);
    phase8_notify_subscriptions(actually_changed);

    return trace;
}
```

**Work done**:
- Walk graph (find affected)
- Sort graph (topological order)
- Then update

### Graph-First: `$.data = [1,2,3]`

```javascript
// From graph-first.js:

set(name, value) {
    const node = this.graph.nodes.get(name);

    if (node.type === 'computed') {
        throw new Error('Cannot set computed');
    }

    const oldValue = this.values.get(name);
    if (oldValue === value) return;

    // Update value
    this.values.set(name, value);

    // LOOK UP pre-computed affected nodes
    const affected = this.graph.getAffectedNodes([name]);
    // ↓ Just walks pre-built reverseEdges

    // Mark dirty (lazy - don't compute yet)
    for (let dep of affected) {
        this.dirty.add(dep);
    }
}
```

**Work done**:
- Look up pre-computed reverse edges
- Mark dirty
- Done (lazy)

When you access `$.msg`:

```javascript
get(name) {
    if (this.dirty.has(name)) {
        this._compute(name);  // Computes in pre-computed order
    }
    return this.values.get(name);
}
```

## What's the Same?

Both have:
- Dependency graph (nodes and edges)
- Topological ordering
- Lazy vs eager evaluation options
- Dirty tracking

## What's Actually Different?

| Aspect | Current Auto.js | Graph-First |
|--------|----------------|-------------|
| **When topology computed** | Every update (phase 1-2) | Once at creation |
| **Graph visibility** | Implicit in variables | First-class object |
| **Structure/state separation** | Mixed together | Clean separation |
| **Query graph** | Can't easily | `graph.getDependents()` etc |
| **Visualize graph** | Not built-in | `graph.toDot()` |
| **Mutability** | Could mutate | Immutable |
| **Philosophy** | Propagation-first | Graph-first |
| **Lines of code** | 941 | ~300 |

## The Real Difference: What Gets Recomputed?

**Current Auto.js**: Graph structure computation

Every update:
1. Walk `dependents` to find affected (graph traversal)
2. Topological sort affected nodes (graph algorithm)
3. Then execute updates

**Graph-First**: No graph structure computation

Every update:
1. Look up pre-computed `reverseEdges` (O(1) map lookup)
2. Mark dirty using pre-computed structure
3. Compute in pre-computed `executionOrder`

## Is This Actually Better?

**For understanding**: YES
- Graph structure is visible
- Easy to inspect and debug
- Clear separation of concerns

**For performance**: MAYBE
- Less repeated computation (sort once vs every update)
- But overhead of class instances
- For small graphs, negligible difference
- For large graphs, graph-first could be faster

**For maintainability**: YES
- 300 lines vs 941
- Cleaner architecture
- Immutable graph = fewer edge cases

## The Philosophical Shift

**Current Auto.js asks**: "How do we efficiently propagate updates?"
- Answer: Track dependencies, sort affected nodes, execute in order
- Graph is a means to an end

**Graph-First asks**: "What is the structure of this computation?"
- Answer: Here's the graph (nodes, edges, order)
- Propagation is just data flowing through the graph

## Summary

You're right that current Auto.js has a graph. The difference is:

1. **Computational**: Graph topology computed once vs every update
2. **Structural**: Graph as object vs graph implicit in variables
3. **Philosophical**: Graph as THE thing vs graph as implementation detail

**Current**: Graph exists but is hidden, structure recomputed repeatedly
**Graph-first**: Graph is visible, structure computed once and reused

The name "graph-first" means: **Build the graph once, make it first-class, make everything else follow from it.**

Does this clarify the difference?
