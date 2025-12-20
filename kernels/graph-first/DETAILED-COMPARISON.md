# Detailed Comparison: Current Auto.js vs Graph-First

## The Key Realization

Both have a graph, but they build and use it very differently.

## Current Auto.js: How It Actually Works

Looking at the actual code in `auto-es6.js`:

### Dependency Discovery (Every Function Execution)

```javascript
// Lines 390-423: When updating a computed value
if (deps[name]) {
    Object.keys(deps[name]).forEach(dep => {
        if (dependents[dep] && dependents[dep][name]) {
            delete dependents[dep][name];  // Clear old reverse edges
        }
    });
}
deps[name] = {};  // ← Clear dependencies

let result = fn[name]();  // ← Run function

// Lines 447-451: In the getter (tracks access)
if (parent) {
    deps[parent][name] = true;              // ← Record forward edge
    if (!dependents[name]) dependents[name] = {};
    dependents[name][parent] = true;        // ← Record reverse edge
}
```

**What this means:**
1. Every time a function executes, its dependencies are **cleared** (line 404)
2. As the function runs and accesses values, dependencies are **rediscovered** (lines 448-450)
3. This happens **every time** the function runs

### Graph Traversal and Sorting (Every Update)

```javascript
// Lines 484-533: On every propagate() call

// Phase 1: Walk dependents to find affected nodes
let phase1_invalidate = (trigger_name, affected) => {
    if (dependents[trigger_name]) {
        Object.keys(dependents[trigger_name]).forEach(dep => {
            affected.add(dep);
            phase1_invalidate(dep, affected);  // ← Recursive walk
        });
    }
    return affected;
}

// Phase 2: Topological sort the affected nodes
let phase2_topological_sort = (variables) => {
    let sorted = [];
    let visit = (name) => {
        if (name in deps) {
            Object.keys(deps[name]).forEach(dep => {
                if (variables.has(dep)) {
                    visit(dep);  // ← DFS traversal
                }
            });
        }
        sorted.push(name);
    };
    variables.forEach(name => visit(name));
    return sorted;
}
```

**What this means:**
1. On every update, walk the `dependents` graph recursively
2. On every update, do topological sort via DFS
3. This happens **every time** you set a value

## Summary of Current Auto.js

**On every `$.data = [1,2,3]`:**
1. Walk graph to find affected (phase 1)
2. Sort affected nodes topologically (phase 2)
3. Clear dependencies for each affected node
4. Execute each node's function
5. Rediscover dependencies during execution
6. Detect changes, build trace, notify subscriptions

**Graph structure is dynamic:**
- `deps` and `dependents` change every time functions execute
- Dependencies tracked at runtime
- Graph topology recomputed on every update

## Graph-First: How It Works

### Dependency Discovery (Once, at Creation)

```javascript
class ReactiveGraph {
    constructor(definition) {
        // Run ONCE at creation
        for (let [name, node] of this.nodes) {
            if (node.type === 'computed') {
                // Discover dependencies by running with proxy
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

        // Compute topological order ONCE
        this._computeExecutionOrder();

        // Never changes after this!
    }
}
```

**What this means:**
1. Dependencies discovered once at creation
2. Reverse edges computed once
3. Execution order computed once
4. **Never recomputed**

### Graph Lookup (Every Update)

```javascript
// On every set:
set(name, value) {
    this.values.set(name, value);

    // Just LOOK UP pre-computed reverse edges
    const affected = this.graph.getAffectedNodes([name]);
    // ↑ No traversal - just Map.get()

    // Mark dirty
    for (let dep of affected) {
        this.dirty.add(dep);
    }
}

// getAffectedNodes just walks pre-built reverseEdges
getAffectedNodes(changed) {
    const queue = [...changed];
    while (queue.length > 0) {
        const name = queue.shift();
        const dependents = this.reverseEdges.get(name);  // ← O(1) lookup
        // ...
    }
}
```

**What this means:**
1. No dependency rediscovery
2. No topological sorting
3. Just look up pre-computed structures
4. Mark dirty and done (lazy)

## Summary of Graph-First

**On every `$.data = [1,2,3]`:**
1. Look up pre-computed `reverseEdges.get('data')`
2. Mark affected nodes dirty
3. Done (lazy)

**When accessing `$.msg`:**
1. Check if dirty
2. If yes, compute in pre-computed `executionOrder`
3. Dependencies already known, no rediscovery

**Graph structure is immutable:**
- `edges`, `reverseEdges`, `executionOrder` never change
- Dependencies fixed at creation
- No runtime rediscovery

## Side-by-Side: What Happens on Update

### Current Auto.js

```
$.data = [1,2,3]
    ↓
propagate(['data'])
    ↓
Phase 1: Invalidate
  - Walk dependents['data'] recursively
  - Build affected = Set(['count', 'msg'])
    ↓
Phase 2: Topological Sort
  - DFS through deps to order nodes
  - Result: ['count', 'msg']
    ↓
Phase 5: Recompute 'count'
  - Clear deps['count'] = {}
  - Run count function
  - Function accesses $.data
  - getter() records: deps['count']['data'] = true
  - getter() records: dependents['data']['count'] = true
  - Result: count = 3
    ↓
Phase 5: Recompute 'msg'
  - Clear deps['msg'] = {}
  - Run msg function
  - Function accesses $.count
  - getter() records: deps['msg']['count'] = true
  - getter() records: dependents['count']['msg'] = true
  - Result: msg = 'Got 3 items'
    ↓
Done
```

**Work done:**
- Graph traversal (recursive walk)
- Topological sort (DFS)
- Dependency rediscovery (every function execution)

### Graph-First

```
$.data = [1,2,3]
    ↓
GraphState.set('data', [1,2,3])
    ↓
graph.reverseEdges.get('data')
  → Set(['count'])
    ↓
Recursively check reverseEdges.get('count')
  → Set(['msg'])
    ↓
affected = Set(['count', 'msg'])
    ↓
Mark dirty:
  dirty.add('count')
  dirty.add('msg')
    ↓
Done (lazy - no execution yet)

// Later: $.msg is accessed

$.msg
    ↓
GraphState.get('msg')
    ↓
Check: dirty.has('msg')? YES
    ↓
_compute('msg')
  - Function accesses $.count
  - $.count is also dirty
  - Recursively _compute('count')
    - Function accesses $.data
    - $.data is NOT dirty (not a function)
    - Return data value
  - count = 3
  - msg = 'Got 3 items'
    ↓
Done
```

**Work done:**
- Map lookups (pre-computed structures)
- No traversal, no sorting, no dependency discovery

## The Three Key Differences

### 1. When Dependencies Are Discovered

**Current:** During every function execution
- `deps[name] = {}` clears
- Function runs
- Getter tracks accesses
- Dependencies rebuilt

**Graph-First:** Once at creation
- Run function with proxy at startup
- Track dependencies
- Store in immutable graph
- Never rediscover

### 2. When Topology Is Computed

**Current:** On every update
- Phase 1: Walk dependents recursively
- Phase 2: Topological sort via DFS
- Every propagate() call

**Graph-First:** Once at creation
- Build reverseEdges once
- Compute executionOrder once
- Just look up on update

### 3. Graph Mutability

**Current:** Mutable
- `deps` changes every function execution
- `dependents` changes every function execution
- Graph structure dynamic

**Graph-First:** Immutable
- `edges` set at creation, never changes
- `reverseEdges` set at creation, never changes
- `executionOrder` set at creation, never changes
- Graph structure static

## Complexity Comparison

### Current Auto.js

On `$.data = [1,2,3]` affecting `count` and `msg`:

```
Time Complexity:
- Phase 1 (invalidate): O(dependents) - recursive walk
- Phase 2 (topo sort): O(V + E) - DFS over affected nodes
- Phase 5 (recompute): O(functions) - execute each
- Dependency tracking: O(accesses) - for each $.property access

Total: O(V + E) per update
```

### Graph-First

On `$.data = [1,2,3]`:

```
Time Complexity:
- reverseEdges lookup: O(1) - Map.get()
- Mark dirty: O(affected) - simple iteration
- (No computation yet - lazy)

On $.msg access:
- Check dirty: O(1)
- Execute functions: O(functions)
- No dependency tracking overhead

Total: O(affected) per update, O(functions) per access
```

## Memory Comparison

### Current Auto.js

```
~50 closure variables:
- deps: {}
- dependents: {}
- fn: {}
- value: {}
- dirty: {}
- stack: []
- subs: {}
- trace: {}
- tnode: {}
- in_batch: bool
- batch_triggers: []
- ... 40+ more

Each updated on every execution
```

### Graph-First

```
ReactiveGraph (immutable):
- nodes: Map
- edges: Map
- reverseEdges: Map
- executionOrder: []

GraphState (mutable):
- values: Map
- dirty: Set
- computing: Set

Clean separation, fewer variables
```

## So What's Actually Better?

### Current Auto.js Strengths

- ✅ Perfect dynamic dependency tracking
- ✅ Graph adapts to runtime conditions
- ✅ Battle-tested (current implementation)

### Current Auto.js Weaknesses

- ❌ Rediscovers dependencies every execution
- ❌ Re-sorts graph every update
- ❌ 941 lines, 50+ variables
- ❌ Graph structure hidden/implicit
- ❌ Hard to inspect or debug

### Graph-First Strengths

- ✅ Dependencies discovered once
- ✅ Topology computed once
- ✅ ~300 lines, clean separation
- ✅ Graph visible and queryable
- ✅ Immutable structure (fewer bugs)
- ✅ Easy to inspect and debug

### Graph-First Weaknesses

- ❌ Conservative dependency tracking (over-subscription)
- ❌ Graph can't adapt to runtime conditions (without runtime tracking variant)

## Final Answer to Your Question

> "isn't the original code in auto a graph too?"

**Yes!** Current Auto.js IS a graph (deps/dependents).

**But:**
- Current: Graph rebuilt/rediscovered during every execution
- Graph-First: Graph built once, immutable, reused

**It's not about HAVING a graph vs NOT having a graph.**

**It's about WHEN and HOW OFTEN you compute the graph structure.**

Current: "Discover graph dynamically as we go"
Graph-First: "Build graph once, use it forever"

That's the real difference.
