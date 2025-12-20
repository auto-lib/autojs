# Side-by-Side Comparison: Current vs Three-Layer

This document shows the **same Auto.js code** working in both architectures, highlighting what's the same and what's different.

## Example 1: Basic Reactive Variables

### Code (Identical)

```javascript
const $ = auto({
    data: null,
    count: ($) => $.data ? $.data.length : 0,
    msg: ($) => `Got ${$.count} items`
});

$.data = [1, 2, 3];
console.log($.msg);  // "Got 3 items"

$.data = [1, 2, 3, 4, 5];
console.log($.msg);  // "Got 5 items"
```

### Current Auto.js - What Happens

#### Initialization
```
1. Parse definition
2. Create empty state:
   - fn = { count: function, msg: function }
   - deps = { count: {}, msg: {} }
   - dependents = { data: {}, count: {}, msg: {} }
   - value = { data: null, count: undefined, msg: undefined }

3. Run initial propagation:
   - Call count() → tracks $.data access → deps.count = { data: true }
   - Call msg() → tracks $.count access → deps.msg = { count: true }
   - Build dependents from deps:
     - dependents.data = { count: true }
     - dependents.count = { msg: true }
```

#### First Update ($.data = [1,2,3])
```
1. Setter called for 'data'
2. Mark dependents dirty:
   - Walk dependents.data → mark 'count' dirty
   - Walk dependents.count → mark 'msg' dirty

3. 8-Phase Propagation:
   Phase 1: Invalidate (already done above)
   Phase 2: Topological sort
     - Clear deps: deps.count = {}, deps.msg = {}
     - Visit each dirty node, track accesses, rebuild deps
     - Sort: [count, msg]
   Phase 3: Capture old values
   Phase 4: Clear values
   Phase 5: Recompute in sorted order
     - count() → tracks $.data → deps.count = { data: true }
     - msg() → tracks $.count → deps.msg = { count: true }
   Phase 6: Detect changes
   Phase 7: Build trace
   Phase 8: Notify subscriptions
```

**Key point:** Dependencies are **cleared and rediscovered** on every update!

### Three-Layer - What Happens

#### Initialization
```
1. Layer 2 (StaticAnalysisBuilder):
   - Parse function sources:
     - count: "($) => $.data ? $.data.length : 0"
       → finds $.data (appears twice, same dependency)
     - msg: "($) => `Got ${$.count} items`"
       → finds $.count

2. Build DirectedGraph:
   - Nodes: {data, count, msg}
   - Edges: data→count, count→msg
   - Compute topological sort ONCE: [data, count, msg]
   - Graph is now IMMUTABLE

3. Layer 3 (ReactiveSystem):
   - Initialize values:
     - value.data = null (static)
     - value.count = undefined (computed, will compute on first access)
     - value.msg = undefined (computed, will compute on first access)
   - dirty = {count, msg} (not yet computed)
```

#### First Access (console.log($.msg))
```
1. get('msg') called
2. msg is dirty and not computed yet
3. Compute msg:
   - Execute msg function
   - Accesses $.count → triggers get('count')
   - count is dirty, compute it:
     - Execute count function
     - Returns 3
   - Returns "Got 3 items"
```

#### First Update ($.data = [1,2,3])
```
1. set('data', [1,2,3]) called
2. Check if changed: null !== [1,2,3] → yes
3. Update: value.data = [1,2,3]
4. Mark affected dirty:
   - Use PRE-COMPUTED graph.getReachable(['data'])
   - Returns {count, msg}
   - dirty = {count, msg}
5. Done! (lazy evaluation - will compute on next access)
```

**Key point:** Graph structure was computed **once** and **never changes**!

## Example 2: Conditional Dependencies

### Code (Identical)

```javascript
const $ = auto({
    enabled: false,
    data: [1, 2, 3],
    result: ($) => $.enabled ? $.data.length : 'disabled'
});

console.log($.result);  // "disabled"

$.enabled = true;
console.log($.result);  // 3

$.data = [1, 2, 3, 4, 5];
console.log($.result);  // 5
```

### Current Auto.js - What Happens

```
Initialization:
  - result() executes → enabled=false → accesses $.enabled only
  - deps.result = { enabled: true }
  - dependents.enabled = { result: true }
  - dependents.data = {} (not accessed!)

First access ($.result):
  - Returns "disabled"

Update ($.enabled = true):
  - Mark result dirty (it depends on enabled)
  - Recompute result():
    - enabled=true now → accesses $.enabled AND $.data
    - deps.result = { enabled: true, data: true } (UPDATED!)
    - dependents.data = { result: true } (UPDATED!)

Update ($.data = [1,2,3,4,5]):
  - Mark result dirty (NOW it depends on data)
  - Recompute result()
  - Returns 5
```

**Behavior:** Dependencies **discovered dynamically** as code executes different branches.

### Three-Layer (Static Analysis) - What Happens

```
Initialization (StaticAnalysisBuilder):
  - Parse result source: "($) => $.enabled ? $.data.length : 'disabled'"
  - Find ALL $.property accesses: {$.enabled, $.data}
  - deps.result = ['enabled', 'data'] (BOTH branches!)
  - Build graph:
    - enabled → result
    - data → result
  - Graph is IMMUTABLE

First access ($.result):
  - Compute: enabled=false → returns "disabled"
  - Graph unchanged

Update ($.enabled = true):
  - Mark affected: getReachable(['enabled']) = {result}
  - dirty = {result}
  - Next access will recompute

Update ($.data = [1,2,3,4,5]):
  - Mark affected: getReachable(['data']) = {result}
  - dirty = {result}
  - Next access will recompute
```

**Behavior:** Dependencies **discovered statically** from source analysis. Graph never changes.

**Trade-off:** Even when `enabled=false`, changes to `data` mark `result` dirty (conservative over-subscription).

### Three-Layer (Runtime Tracking) - What Happens

```
Initialization (RuntimeTrackingBuilder):
  - Execute result() with tracking proxy
  - enabled=false → accesses $.enabled only
  - deps.result = ['enabled']
  - Graph built from actual accesses

Update ($.enabled = true):
  - Mark affected: getReachable(['enabled']) = {result}
  - Recompute result() with tracking:
    - enabled=true now → accesses $.enabled AND $.data
    - Update graph! deps.result = ['enabled', 'data']
    - Graph MUTATED

Update ($.data = [1,2,3,4,5]):
  - Mark affected: getReachable(['data']) = {result}
  - Recompute
```

**Behavior:** Similar to current Auto.js - tracks actual accesses, graph can mutate.

## Example 3: Introspection

### Current Auto.js

```javascript
const $ = auto({
    a: 1,
    b: 2,
    sum: ($) => $.a + $.b
});

console.log($._);
```

**Output:**
```javascript
{
  fn: {
    sum: [Function]
  },
  deps: {
    sum: { a: true, b: true }
  },
  value: {
    a: 1,
    b: 2,
    sum: 3
  },
  subs: {},
  fatal: {}
}
```

**Format:**
- `deps` is an object of objects: `{ sum: { a: true, b: true } }`
- No reverse mapping (who depends on what)
- No graph object
- No execution order
- No visualization

### Three-Layer

```javascript
const $ = auto({
    a: 1,
    b: 2,
    sum: ($) => $.a + $.b
});

console.log($._);
```

**Output:**
```javascript
{
  graph: DirectedGraph {
    nodes: Map {
      'a' => { type: 'static', initialValue: 1 },
      'b' => { type: 'static', initialValue: 2 },
      'sum' => { type: 'computed', fn: [Function] }
    },
    edges: Map {
      'a' => Set { 'sum' },
      'b' => Set { 'sum' }
    },
    reverseEdges: Map {
      'sum' => Set { 'a', 'b' }
    }
  },
  deps: {
    sum: ['a', 'b']  // What does sum depend on
  },
  dependents: {
    a: ['sum'],      // Who depends on a
    b: ['sum']       // Who depends on b
  },
  fn: ['sum'],       // List of computed properties
  value: {
    a: 1,
    b: 2,
    sum: 3
  },
  dirty: [],
  order: ['a', 'b', 'sum']  // Topological order
}
```

**Format:**
- `deps` is object of arrays: `{ sum: ['a', 'b'] }`
- Has `dependents` (reverse mapping)
- Has `graph` (full DirectedGraph object)
- Has `order` (topological sort)
- Can query graph: `$._graph.getReachable(['a'])`
- Can visualize: `$.visualize()`

### Additional Capabilities (Three-Layer Only)

```javascript
// Visualize as GraphViz DOT
console.log($.visualize());
/*
digraph G {
  rankdir=LR;
  node [shape=box];

  "a" [label="📊 a"];
  "b" [label="📊 b"];
  "sum" [label="⚙️ sum"];

  "a" -> "sum";
  "b" -> "sum";
}
*/

// Query the graph
console.log($._graph.getSuccessors('a'));  // Set(['sum'])
console.log($._graph.getPredecessors('sum'));  // Set(['a', 'b'])
console.log($._graph.getReachable(['a']));  // Set(['sum'])

// Check for cycles
console.log($._graph.hasCycle());  // false

// Get execution order
console.log($._order);  // ['a', 'b', 'sum']
```

## Example 4: Complex Graph

### Code (Identical)

```javascript
const $ = auto({
    rawData: [
        { id: 1, value: 10, enabled: true },
        { id: 2, value: 20, enabled: false },
        { id: 3, value: 30, enabled: true }
    ],
    filterEnabled: true,

    filteredData: ($) => $.filterEnabled
        ? $.rawData.filter(d => d.enabled)
        : $.rawData,

    count: ($) => $.filteredData.length,

    sum: ($) => $.filteredData.reduce((a, d) => a + d.value, 0),

    average: ($) => $.count > 0 ? $.sum / $.count : 0,

    report: ($) => `${$.count} items, sum=${$.sum}, avg=${$.average.toFixed(1)}`
});

console.log($.report);
// "2 items, sum=40, avg=20.0"

$.filterEnabled = false;
console.log($.report);
// "3 items, sum=60, avg=20.0"
```

### Current Auto.js - Dependency Discovery

```
After first computation:

deps = {
  filteredData: { filterEnabled: true, rawData: true },
  count: { filteredData: true },
  sum: { filteredData: true },
  average: { count: true, sum: true },
  report: { count: true, sum: true, average: true }
}

dependents = {
  rawData: { filteredData: true },
  filterEnabled: { filteredData: true },
  filteredData: { count: true, sum: true },
  count: { average: true, report: true },
  sum: { average: true, report: true },
  average: { report: true }
}
```

**How discovered:** Tracked during initial execution of each function.

**When updated:** Rediscovered every time function executes (deps cleared, then rebuilt).

### Three-Layer - Graph Structure

```
After initialization (StaticAnalysisBuilder):

Graph:
  rawData ──→ filteredData ──→ count ──→ average ──→ report
                           └──→ sum ────┘
  filterEnabled ──┘

Edges (from → to):
  rawData → filteredData
  filterEnabled → filteredData
  filteredData → count
  filteredData → sum
  count → average
  sum → average
  average → report
  count → report
  sum → report

Topological order:
  [rawData, filterEnabled, filteredData, count, sum, average, report]
```

**How discovered:** Static analysis of function sources at creation.

**When updated:** Never! Graph is immutable.

### Performance Comparison

#### Update `$.rawData` (add new item)

**Current Auto.js:**
```
1. Mark dependents dirty: filteredData
2. Walk dependents recursively: count, sum, average, report
3. Topological sort:
   - Clear all deps
   - Visit each function in dependency order
   - Track accesses, rebuild deps
   - Sort
4. Recompute: filteredData, count, sum, average, report
```

**Three-Layer:**
```
1. getReachable(['rawData']) → {filteredData, count, sum, average, report}
   (pre-computed, instant)
2. Mark dirty: filteredData, count, sum, average, report
3. Next access will recompute in topological order
   (order pre-computed at initialization)
```

**Difference:**
- Current: Rediscovers deps, re-sorts every time
- Three-layer: Uses pre-computed graph and order

## Summary Table

| Aspect | Current Auto.js | Three-Layer |
|--------|----------------|-------------|
| **API** | `const $ = auto(def)` | `const $ = auto(def)` (identical) |
| **Behavior** | Reactive updates | Reactive updates (identical) |
| **Dependencies** | Discovered at runtime | Static analysis (default) |
| **Graph structure** | Rebuilt on every update | Built once, immutable |
| **Topological sort** | Every update | Once at creation |
| **Introspection** | Limited (`$._`) | Rich (`$._`, `$.visualize()`, graph queries) |
| **Complexity** | 941 lines, 50+ variables | ~720 lines, 3 classes |
| **Mental model** | "Reactive library with implicit graph" | "Graph library that's reactive" |
| **Testing** | Single monolith | Three independent layers |
| **Reusability** | Auto.js specific | DirectedGraph reusable |
| **Flexibility** | One approach | Swappable strategies |
| **Debugging** | Console.log internal state | Visualize graph, query structure |

## Migration Impact

### What Stays the Same ✅

- Public API (`auto(definition)`)
- Reactive behavior (updates propagate)
- Lazy evaluation (compute on access)
- Circular dependency detection
- Core functionality

### What Changes 📝

- Internal architecture (cleaner, three layers)
- Introspection format (`$._deps` is arrays not objects)
- Error messages (earlier detection, clearer messages)
- When dependencies are discovered (creation vs runtime)

### What's New 🎉

- Graph visualization (`$.visualize()`)
- Graph queries (`$._graph.getReachable()`, etc.)
- Strategy selection (`auto.static()`, `auto.runtime()`, `auto.explicit()`)
- Reusable DirectedGraph class
- Independent layer testing
- Immutable graph structure (default)

## Conclusion

The three-layer architecture provides the **same API and behavior** as current Auto.js, but with a **clearer internal structure** that emphasizes the graph as a first-class concept.

**For users:** Drop-in replacement with enhanced introspection.

**For maintainers:** Clearer separation of concerns, easier testing, better debuggability.

**For the visualization use case:** Perfect fit - static graphs, pure transformations, inspectable structure.
