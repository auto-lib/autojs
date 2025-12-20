# Comparison: Current Auto.js vs Graph-First

## What is Auto.js Actually Doing?

### Current Implementation (auto-es6.js, 941 lines)

**It's a procedural state machine that discovers the graph on every update.**

The graph structure is **implicit** - buried in 50+ pieces of mutable state:

```javascript
let deps = {};           // forward dependencies
let dependents = {};     // reverse dependencies
let fn = {};            // which vars are functions
let value = {};         // current values
let stack = [];         // call stack for tracking
let fatal = {};         // error state
let subs = {};          // subscriptions
let trace = {};         // transaction metadata
let in_batch = false;   // batch mode flag
let batch_triggers = [];
let call_timestamps = {}; // for excessive call detection
let static_value_history = {}; // for root cause analysis
let transaction_log = [];
// ... 40+ more variables!
```

Every update runs **8 phases** that rediscover the graph:

```javascript
let propagate = (triggers) => {
    phase1_invalidate()        // Walk dependents recursively
    phase2_topological_sort()  // Re-sort affected nodes
    phase3_capture_old_values()
    phase4_clear_values()
    phase5_recompute()
    phase6_detect_changes()    // Compare old vs new
    phase7_build_trace()       // Build metadata
    phase8_notify_subscriptions()
}
```

**The problem**: The graph isn't a "thing" - it's implicit in the execution flow.

### Graph-First Implementation (~300 lines)

**The graph IS the thing - built once, immutable, queryable.**

Three clean layers:

```javascript
// 1. ReactiveGraph - immutable structure
class ReactiveGraph {
    nodes = Map              // name -> { type, fn }
    edges = Map              // name -> Set(deps)
    reverseEdges = Map       // name -> Set(dependents)
    executionOrder = []      // topological sort

    // Built ONCE at creation
    // Queryable: getDependents(), getDependencies()
    // Visualizable: toDot()
}

// 2. GraphState - mutable values
class GraphState {
    values = Map             // name -> current value
    dirty = Set              // which nodes need recomputing

    // Lazy evaluation: compute on access
    // Or eager: flush() to compute all
}

// 3. Auto API - thin wrapper
function auto(definition) {
    const graph = new ReactiveGraph(definition)  // Build once
    const state = new GraphState(graph)
    return createProxy(state)
}
```

**The difference**: Graph structure computed once, updates walk pre-built structures.

## Side-by-Side

| Aspect | Current | Graph-First |
|--------|---------|-------------|
| **Lines of code** | 941 | ~300 |
| **Mutable state** | 50+ closure variables | 2 Maps, 1 Set |
| **Graph structure** | Implicit in deps/dependents | Explicit ReactiveGraph object |
| **Topology discovery** | Every update (phase 1) | Once at creation |
| **Topological sort** | Every update (phase 2) | Once at creation |
| **Introspection** | `$._` exposes scattered state | `$._.graph` is queryable object |
| **Visualization** | Not built-in | `$.visualize()` generates GraphViz |
| **Debugging** | Trigger history, root cause tracking | Graph queries, simple traces |

## Complexity Comparison

### Current: What Happens on `$.data = [1,2,3]`

```
1. Set value in closure variable `value['data'] = [1,2,3]`
2. Call propagate()
   a. Phase 1: Walk dependents object recursively
      - Start at 'data'
      - Check dependents['data'] -> has 'count'
      - Recurse: check dependents['count'] -> has 'msg'
      - Build affected set: {count, msg}
   b. Phase 2: Topological sort of affected nodes
      - DFS visit count -> depends on data
      - DFS visit msg -> depends on count
      - Result: [count, msg]
   c. Phase 3: Capture old values
      - old_values = { count: 0, msg: 'Got 0 items' }
   d. Phase 4: Clear values
      - delete value['count'], delete value['msg']
   e. Phase 5: Recompute
      - Trigger getter for count -> runs function -> sets value
      - Trigger getter for msg -> runs function -> sets value
   f. Phase 6: Detect changes
      - Compare old vs new with deep_equal
      - Build changed set
   g. Phase 7: Build trace
      - Create metadata object with triggers, changes, etc.
   h. Phase 8: Notify subscriptions
      - Call subscriber callbacks
3. Done
```

**50+ variables accessed, 8 functions called, graph rediscovered**

### Graph-First: What Happens on `$.data = [1,2,3]`

```
1. state.set('data', [1,2,3])
   - Check if value changed (yes)
   - Set value in Map
   - Look up pre-computed reverse edges: graph.reverseEdges.get('data')
   - Result: {count}
   - Mark 'count' dirty
   - Recursively mark: {msg}
2. Done (lazy - nothing computed yet)

// Later: $.msg is accessed
3. state.get('msg')
   - Check if dirty (yes)
   - Run function to compute
   - Access $.count (which is also dirty)
     - Run function to compute count
     - Delete from dirty set
   - Delete msg from dirty set
4. Return value
```

**2 Maps accessed, pre-computed graph walked, lazy evaluation**

## What About Dynamic Dependencies?

**Current**: Tracks dependencies at runtime during each execution
**Graph-First**: Discovers dependencies once at creation

### The Tradeoff

```javascript
// Conditional dependency
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

**Current behavior:**
- First run (showDetails=false): tracks deps as {showDetails, name}
- After $.age changes: display doesn't update (age not tracked)
- After $.showDetails = true: display recomputes, NOW tracks {showDetails, name, age}

**Graph-first behavior:**
- Creation: runs function once, discovers deps {showDetails, name, age}
- After $.age changes: display updates (over-subscribed)
- But always correct!

**Solution**: Over-subscription is fine for clarity. Could add runtime tracking if needed.

## Benefits of Graph-First

### 1. Readable
```javascript
// See the whole graph
console.log($._.graph.edges)

// Query it
$._.graph.getDependents('data')      // [count]
$._.graph.getDependencies('msg')     // [count]
$._.graph.getUpstreamGraph('msg')    // [data, count]
```

### 2. Testable
```javascript
// Assert on graph structure directly
assert.deepEqual($._.order, ['data', 'count', 'msg'])
assert($._.graph.edges.get('msg').has('count'))
assert.equal($._.graph.nodes.size, 3)
```

### 3. Debuggable
```javascript
// Visualize it
console.log($.visualize())  // GraphViz dot format

// Simple state inspection
console.log($._.dirty)      // [count, msg]
console.log($._.values)     // { data: [1,2,3], count: 3, msg: '...' }
```

### 4. Maintainable
- 300 lines vs 941
- 3 classes vs 50 closure variables
- Clear separation of concerns
- Immutable graph = no graph bugs

## Why Current Auto.js Grew Complex

Looking at the version history:
- 044_batched_updates.js (23,105 bytes)
- 050_call_rate_detection.js (39,764 bytes)
- 053_root_cause_analysis.js (56,965 bytes)
- 054_circular_reference_protection.js (58,375 bytes)

**The pattern**: Each debugging feature adds more state tracking because the graph is implicit.

With explicit graph:
- Call rate detection: query graph for affected nodes
- Root cause analysis: graph.getUpstreamGraph(name)
- Circular references: validated at graph creation
- Trigger history: simple trace log

## Conclusion

**Current Auto.js**: Optimized for runtime performance, graph is implicit
**Graph-First**: Optimized for clarity, graph is explicit and first-class

For a data visualization tool where:
- The graph topology is static
- Clarity and debuggability matter most
- The graph structure IS the program

**Graph-first is the natural architecture.**
