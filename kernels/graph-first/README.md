# Graph-First Architecture

## Core Insight

Auto.js is fundamentally a **pure data transformation graph** for visualization and presentation. The graph structure (which variables depend on which) is static and known at creation time.

Current auto.js treats propagation as the primary concern, with the graph structure being implicit and rediscovered on every update. This approach inverts that: **the graph IS the thing**.

## Philosophy

For a data visualization tool where the graph topology is fixed:
- **Separate structure from state**: The graph (edges, nodes, order) is immutable. Only values flow through it.
- **Compute once, use many**: Build the graph structure once at creation, not on every update
- **Make the implicit explicit**: The graph should be a first-class, inspectable, visualizable object
- **Clarity over optimization**: Readable, maintainable, debuggable code

## Key Differences from Current Auto.js

### Current (941 lines)
```
50+ pieces of mutable state in closures
Graph structure implicit in deps/dependents objects
Rediscovers edges on every update (phase 1: invalidate)
Re-sorts on every update (phase 2: topological sort)
Hard to inspect: state scattered everywhere
Debug features bolted on: trigger history, root cause analysis
```

### Graph-First (~300 lines)
```
Graph is immutable, built once
Edges computed once, stored explicitly
Execution order computed once
Updates just walk pre-computed structures
Easy to inspect: graph.edges, graph.order
Debugging trivial: graph.toDot(), graph.getDependents()
```

## Architecture

Three clean layers:

### 1. ReactiveGraph (immutable)
- Built once from definition
- Discovers dependencies by running functions with proxy
- Validates (no cycles)
- Computes topological execution order
- Queryable: `graph.getDependents(name)`, `graph.getDependencies(name)`
- Visualizable: `graph.toDot()` generates GraphViz

### 2. GraphState (mutable values)
- Holds current values in Map
- Tracks which nodes are dirty
- Lazy evaluation: compute on access
- Or eager: `state.flush()` to compute all dirty

### 3. Auto API (thin wrapper)
- Familiar `$` proxy interface
- `$._` introspection shows graph + state
- Read-only for computed values (enforced by proxy)

## Benefits

**Readable**: Graph structure is visible and queryable
```js
console.log($._graph.edges)        // See all dependencies
console.log($._graph.order)        // See execution order
console.log($._graph.toDot())      // Visualize as GraphViz
```

**Testable**: Assert on graph structure directly
```js
assert.deepEqual($._.order, ['data', 'count', 'msg'])
assert($._.graph.edges.get('msg').has('count'))
```

**Debuggable**: Simple traces, easy visualization
```js
$._.graph.getDependents('data')    // Who depends on data?
$._.dirty                          // What needs recomputing?
```

**Robust**: Immutable graph = fewer edge cases
- Graph validation happens once at creation
- No runtime discovery means no runtime graph bugs
- Simpler implementation = easier to reason about

## Tradeoffs

**Conditional Dependencies**
Dynamic dependencies (conditionals in functions) need runtime tracking. But this is solvable and acceptable for clarity.

**Memory**
Graph stored separately from values uses slightly more memory. But negligible and worth it for maintainability.

**Discovery Accuracy**
Initial dependency discovery by running functions may miss conditional branches. Hybrid approach possible: track at runtime, validate against graph.

## Status

Experimental kernel exploring graph-centric architecture for Auto.js.

## Usage

See `src/graph-first.js` for implementation.
See `tests/` for test cases.
