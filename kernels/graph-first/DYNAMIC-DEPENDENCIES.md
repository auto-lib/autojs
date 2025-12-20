# Solving Dynamic Dependencies in Graph-First Architecture

## The Problem

If the graph is built once and immutable, how do we handle dependencies that change based on runtime values?

### Example: Conditional Dependencies

```javascript
let $ = auto({
    showDetails: false,
    name: 'John',
    age: 30,
    display: ($) => {
        if ($.showDetails) {
            return $.name + ' is ' + $.age;  // Uses age
        } else {
            return $.name;  // Doesn't use age
        }
    }
});
```

**The graph structure depends on the data!**

When `showDetails = false`: `display` depends on `{showDetails, name}`
When `showDetails = true`: `display` depends on `{showDetails, name, age}`

**Problem**: If we build the graph once, how do we know `display` might depend on `age`?

## Three Strategies

### Strategy 1: Conservative Static Analysis (Current Implementation)

**Build the graph with ALL possible dependencies.**

Parse the function source code to find every `$.property` access, regardless of which branch executes.

#### Implementation

See `src/static-analysis.js` for the implementation.

```javascript
function discoverDependencies(fn, name) {
    const source = fn.toString();
    // "($) => { if ($.showDetails) return $.name + $.age; return $.name }"

    const regex = /\$\.(\w+)/g;
    const deps = new Set();
    let match;

    while ((match = regex.exec(source)) !== null) {
        deps.add(match[1]);  // Add every $.property found
    }

    return deps;
    // Result: Set(['showDetails', 'name', 'age'])
    // ✓ Includes age even if that branch didn't execute
}
```

#### Pros
- ✅ **Always correct** - won't miss dependencies
- ✅ **Graph stays immutable** - no runtime changes needed
- ✅ **Simple implementation** - just regex parsing
- ✅ **No runtime overhead** - discovery happens once at creation

#### Cons
- ⚠️ **Over-subscription** - may recompute when not strictly necessary
- ⚠️ **Can't handle dynamic access** - `$.data[$.key]` won't work perfectly
- ⚠️ **Can't handle destructuring** - `const { x, y } = $`

#### When to Use
- **Ideal for visualization apps** where:
  - Recomputation is cheap (pure functions)
  - Correctness matters more than performance
  - Graph topology is mostly static
  - Over-subscribing is acceptable

#### Example

```javascript
let $ = auto({
    enabled: false,
    data: [1, 2, 3],
    config: { sort: true },
    result: ($) => {
        if (!$.enabled) return 'N/A';
        return $.data.sort($.config);
    }
});

// Static analysis discovers: {enabled, data, config}
// Even though when enabled=false, only 'enabled' is accessed

$.data = [4, 5, 6];
// Result recomputes (even though enabled=false)
// Returns: 'N/A' (same as before)
// ⚠️ Unnecessary recomputation, but still correct!
```

**Trade-off accepted**: Occasional extra work for guaranteed correctness.

---

### Strategy 2: Runtime Dependency Tracking (Hybrid)

**Track which dependencies are ACTUALLY accessed during execution.**

Update the graph based on real execution patterns.

#### Implementation

See `src/runtime-tracking.js` for the implementation.

```javascript
class HybridGraphState extends GraphState {
    _compute(name) {
        const node = this.graph.nodes.get(name);
        const actualDeps = new Set();

        // Proxy that tracks actual access
        const proxy = new Proxy(this, {
            get(target, prop) {
                actualDeps.add(prop);  // Track what's REALLY accessed
                return self.get(prop);
            }
        });

        const result = node.fn(proxy);

        // Update graph if dependencies changed
        const oldDeps = this.graph.edges.get(name);
        if (!setsEqual(actualDeps, oldDeps)) {
            this._updateDependencies(name, actualDeps);
        }

        this.values.set(name, result);
    }

    _updateDependencies(name, newDeps) {
        // Update forward edges
        this.graph.edges.set(name, newDeps);

        // Rebuild reverse edges
        this._rebuildReverseEdges();

        // Recompute execution order
        this._recomputeExecutionOrder();
    }
}
```

#### Pros
- ✅ **Precise** - only tracks what's actually used
- ✅ **Adapts to runtime conditions** - graph evolves
- ✅ **No over-subscription** - minimal recomputation

#### Cons
- ❌ **Graph becomes mutable** - loses immutability guarantee
- ❌ **Runtime overhead** - tracking on every execution
- ❌ **More complex** - need to handle graph updates
- ❌ **Invalidation complexity** - what if deps change during execution?
- ❌ **Potential race conditions** - if async

#### When to Use
- When dependencies are **highly dynamic**
- When **performance is critical** (can't afford over-subscription)
- When you need **perfect tracking**
- When you're willing to **accept complexity**

#### Example

```javascript
let $ = auto({
    mode: 'simple',
    data: [1, 2, 3],
    extra: { detail: 'info' },
    result: ($) => {
        if ($.mode === 'simple') {
            return $.data.length;
        } else {
            return $.data.join(',') + ' ' + $.extra.detail;
        }
    }
});

// First run (mode='simple'):
// Tracks: {mode, data}
// Graph updated: result -> {mode, data}

$.mode = 'detailed';
// result recomputes (mode changed)
// Now tracks: {mode, data, extra}
// Graph updated: result -> {mode, data, extra}

$.extra = { detail: 'new' };
// result recomputes (extra now tracked)

// Later:
$.mode = 'simple';
// result recomputes (mode changed)
// Now tracks: {mode, data} again
// Graph updated: result -> {mode, data}

$.extra = { detail: 'changed' };
// result DOESN'T recompute (extra no longer tracked)
// ✓ Perfect optimization!
```

**Trade-off**: More complex, but perfectly precise.

---

### Strategy 3: Explicit Dependencies (Manual)

**Make the user declare dependencies explicitly.**

Like React's `useEffect` dependency array.

#### Implementation

See `src/explicit-deps.js` for the implementation.

```javascript
auto({
    display: {
        deps: ['showDetails', 'name', 'age'],
        fn: ($) => $.showDetails ? $.name + ' ' + $.age : $.name
    }
})

// Or alternative syntax:
auto({
    display: computed(['showDetails', 'name', 'age'],
        ($) => $.showDetails ? $.name + ' ' + $.age : $.name
    )
})
```

#### Pros
- ✅ **Explicit** - no guessing, user controls exactly
- ✅ **Graph stays immutable** - deps known at creation
- ✅ **No overhead** - no discovery or tracking needed
- ✅ **Type-safe** - can validate deps exist

#### Cons
- ❌ **Manual** - user must maintain dependency lists
- ❌ **Error-prone** - easy to forget dependencies
- ❌ **Verbose** - more code to write
- ❌ **Divergence** - deps can get out of sync with function

#### When to Use
- When you need **precise control**
- When you have **complex dependencies**
- When you want **type safety** (TypeScript)
- When you're willing to **maintain dependency lists**

#### Example

```javascript
let $ = auto({
    mode: 'simple',
    data: [1, 2, 3],
    extra: 'info',

    // Explicit: only recomputes when mode or data changes
    result: computed(['mode', 'data'], ($) => {
        if ($.mode === 'simple') {
            return $.data.length;
        } else {
            return $.data.join(',') + ' ' + $.extra;
            // ⚠️ BUG: Uses $.extra but not in deps!
        }
    })
});

$.extra = 'new';
// result doesn't recompute (extra not in deps)
// Bug! Result is now stale!
```

**Trade-off**: Full control, but can shoot yourself in the foot.

---

## Comparison Table

| Aspect | Static Analysis | Runtime Tracking | Explicit Deps |
|--------|----------------|------------------|---------------|
| **Correctness** | ✅ Always (conservative) | ✅ Always (precise) | ⚠️ If user correct |
| **Graph Immutability** | ✅ Yes | ❌ No | ✅ Yes |
| **Performance** | ✅ Good | ⚠️ Overhead | ✅ Excellent |
| **Complexity** | ✅ Simple | ❌ Complex | ✅ Simple |
| **Over-subscription** | ⚠️ Yes | ✅ No | Depends on user |
| **User Burden** | ✅ None | ✅ None | ❌ High |
| **Dynamic Access** | ⚠️ Limited | ✅ Full | ✅ Full |

## Recommendation for Auto.js

**For a data visualization library, use Strategy 1: Static Analysis**

### Why?

1. **Your use case**: Data transformation for visualization
   - Recomputing is cheap (pure functions)
   - Over-subscription doesn't hurt much
   - Correctness is critical

2. **Philosophy**: Graph-first means immutable graph
   - Static analysis preserves this
   - Runtime tracking breaks it

3. **Simplicity**: Keep the architecture clean
   - No mutable graph state
   - No complex invalidation logic
   - Easy to reason about

4. **Trade-off is acceptable**:
   - Occasional unnecessary recompute vs complex runtime tracking
   - Worth it for simplicity and guarantees

### Implementation

Current `graph-first.js` uses proxy-based discovery which is semi-conservative.

**Upgrade to full static analysis:**

```javascript
// In ReactiveGraph._build()
for (let [name, node] of this.nodes) {
    if (node.type === 'computed') {
        // Use static analysis instead of proxy
        const deps = this._discoverDependenciesStatic(node.fn, name);
        this.edges.set(name, deps);
        // ... build reverse edges
    }
}

_discoverDependenciesStatic(fn, name) {
    const source = fn.toString();
    const regex = /\$\.(\w+)/g;
    const deps = new Set();
    let match;

    while ((match = regex.exec(source)) !== null) {
        if (match[1] !== name) {  // Don't include self
            deps.add(match[1]);
        }
    }

    return deps;
}
```

See `src/static-analysis.js` for full implementation.

## Advanced: Hybrid Approach

**Best of both worlds**: Start with static analysis, add runtime tracking as opt-in.

```javascript
auto({
    // Normal: static analysis (conservative)
    result: ($) => $.enabled ? $.data.process() : 'N/A',

    // Opt-in: runtime tracking (precise)
    optimized: {
        dynamic: true,  // Enable runtime tracking
        fn: ($) => $.mode === 'complex' ? $.a + $.b + $.c : $.a
    }
})
```

Most nodes use static (simple, immutable), but critical hot paths can opt-in to runtime tracking.

## What About Current Auto.js?

Current Auto.js uses **runtime tracking** - it discovers dependencies by running functions and tracking what's accessed via proxies.

**Why does it work?**
- Graph is rebuilt on every update (phase 1-2)
- Dependencies tracked during execution
- Always accurate, never over-subscribes

**Why is graph-first different?**
- Graph built once, not every update
- Must choose: conservative (static) or mutable (runtime)

**The philosophical shift:**
- Current: "Discover graph as we go"
- Graph-first: "Build graph once, query it"

This necessitates choosing an approach to dynamic dependencies.

## Conclusion

**For graph-first Auto.js visualization library:**

✅ **Use Static Analysis (Strategy 1)**
- Preserves immutable graph
- Simple implementation
- Acceptable over-subscription
- Guaranteed correctness

Optional: Provide runtime tracking as opt-in for performance-critical nodes.

The key insight: **For visualization, occasional extra computation is fine. Simplicity and correctness matter more.**
