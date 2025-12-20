# Answer: How Do We Solve Dynamic Dependencies?

## Your Question

> "if the graph is built once, how do we solve the dynamic dependencies issue?"

## The Short Answer

**You have three choices:**

1. **Static Analysis** (conservative) - Find ALL possible dependencies by parsing function source
2. **Runtime Tracking** (precise) - Let the graph change based on what's actually accessed
3. **Explicit Declaration** (manual) - Make users declare dependencies like React

**Recommendation for Auto.js**: Use Static Analysis (#1)

## Why This is Even a Problem

When you have conditional code:

```javascript
display: ($) => {
    if ($.showDetails) {
        return $.name + ' ' + $.age;  // Uses age
    } else {
        return $.name;  // Doesn't use age
    }
}
```

**The dependency graph depends on the data!**

- When `showDetails = false`: `display` depends on `{showDetails, name}`
- When `showDetails = true`: `display` depends on `{showDetails, name, age}`

If we build the graph once (immutable), how do we know `display` might need `age`?

## Solution 1: Static Analysis (RECOMMENDED)

**Parse the function source code to find EVERY `$.property` access.**

### How It Works

```javascript
function discoverDependencies(fn) {
    const source = fn.toString();
    // "($) => { if ($.showDetails) return $.name + $.age; return $.name }"

    const regex = /\$\.(\w+)/g;
    const deps = new Set();
    let match;

    while ((match = regex.exec(source)) !== null) {
        deps.add(match[1]);
    }

    return deps;
    // Returns: Set(['showDetails', 'name', 'age'])
    // ✓ Found age even though that branch doesn't always execute!
}
```

### Pros
- ✅ **Graph stays immutable** - no runtime changes
- ✅ **Always correct** - won't miss dependencies
- ✅ **Simple** - just regex parsing
- ✅ **No runtime overhead** - happens once at creation

### Cons
- ⚠️ **Over-subscription** - may recompute when not strictly necessary
- ⚠️ **Conservative** - finds dependencies that might never be used

### Example

```javascript
let $ = auto({
    enabled: false,
    data: [1, 2, 3],
    result: ($) => {
        if (!$.enabled) return 'N/A';
        return $.data.sort();
    }
});

// Static analysis finds: {enabled, data}

$.data = [4, 5, 6];
// ⚠️ result recomputes even though enabled=false
// Returns: 'N/A' (same as before)
// Trade-off: Extra work, but still correct!
```

### When to Use

**Perfect for data visualization apps** where:
- Recomputation is cheap (pure functions)
- Correctness matters more than performance
- Over-subscribing occasionally is acceptable

**This is what we recommend for graph-first Auto.js.**

## Solution 2: Runtime Tracking

**Track what's ACTUALLY accessed during execution and update the graph accordingly.**

### How It Works

```javascript
class RuntimeTrackingState {
    _compute(name) {
        const actualDeps = new Set();

        // Proxy tracks actual access
        const proxy = new Proxy(this, {
            get(target, prop) {
                actualDeps.add(prop);  // ← Track it!
                return self.get(prop);
            }
        });

        const result = node.fn(proxy);

        // Update graph if dependencies changed
        if (actualDeps !== staticDeps) {
            this.graph.updateDependencies(name, actualDeps);
        }
    }
}
```

### Pros
- ✅ **Precise** - only tracks what's actually used
- ✅ **No over-subscription** - minimal recomputation
- ✅ **Adapts** - graph evolves with runtime conditions

### Cons
- ❌ **Graph becomes mutable** - loses immutability guarantee
- ❌ **Runtime overhead** - tracking on every execution
- ❌ **More complex** - need to handle graph updates
- ❌ **Philosophical conflict** - breaks "graph-first" immutability

### Example

```javascript
let $ = autoWithRuntimeTracking({
    mode: 'simple',
    data: [1, 2, 3],
    extra: 'info',
    result: ($) => {
        if ($.mode === 'simple') {
            return $.data.length;
        } else {
            return $.data.join(',') + ' ' + $.extra;
        }
    }
});

// First access (mode='simple'):
// Tracks: {mode, data}
// Graph updated: result -> {mode, data}

$.extra = 'changed';
// ✓ result DOESN'T recompute (extra not tracked)

$.mode = 'detailed';
// result recomputes
// Tracks: {mode, data, extra}
// Graph updated: result -> {mode, data, extra}

$.extra = 'new';
// ✓ NOW result recomputes (extra is tracked)
```

### When to Use

- When dependencies are **highly dynamic**
- When **performance is critical** (can't afford over-subscription)
- When you're willing to **accept complexity**
- When you don't mind **mutable graph structure**

## Solution 3: Explicit Dependencies

**Make users declare what each function depends on.**

### How It Works

```javascript
// Helper function
function computed(deps, fn) {
    return { deps, fn };
}

// Usage
let $ = auto({
    showDetails: false,
    name: 'John',
    age: 30,

    // Explicitly declare dependencies
    display: computed(['showDetails', 'name', 'age'], ($) => {
        if ($.showDetails) {
            return $.name + ' ' + $.age;
        } else {
            return $.name;
        }
    })
});
```

### Pros
- ✅ **Graph stays immutable** - deps known at creation
- ✅ **Explicit** - no guessing, user controls exactly
- ✅ **No overhead** - no discovery or tracking
- ✅ **Type-safe** - can validate deps exist

### Cons
- ❌ **Manual** - user must maintain dependency lists
- ❌ **Error-prone** - easy to forget dependencies
- ❌ **Verbose** - more code to write
- ❌ **Can diverge** - deps can get out of sync with function

### Example (The Bug)

```javascript
let $ = auto({
    mode: 'simple',
    data: [1, 2, 3],
    extra: 'info',

    // ⚠️ Declared deps: [mode, data]
    // ⚠️ But function also uses extra!
    result: computed(['mode', 'data'], ($) => {
        if ($.mode === 'simple') {
            return $.data.length;
        } else {
            return $.data.join(',') + ' ' + $.extra;  // BUG!
        }
    })
});

$.mode = 'detailed';
// result = "1,2,3 info"

$.extra = 'new';
// ❌ result doesn't update (extra not in deps)
// ❌ Result is now stale!
```

### When to Use

- When you need **precise control**
- When you're using **TypeScript** (can validate)
- When dependencies are **obvious** and **simple**
- When you're willing to **maintain dependency lists**

## Comparison

| Aspect | Static Analysis | Runtime Tracking | Explicit |
|--------|----------------|------------------|----------|
| **Correctness** | ✅ Always (conservative) | ✅ Always (precise) | ⚠️ If user correct |
| **Graph Immutability** | ✅ Yes | ❌ No | ✅ Yes |
| **Performance** | ✅ Good | ⚠️ Overhead | ✅ Excellent |
| **Complexity** | ✅ Simple | ❌ Complex | ✅ Simple |
| **User Burden** | ✅ None | ✅ None | ❌ High |
| **Over-subscription** | ⚠️ Yes | ✅ No | Depends |

## Recommendation for Graph-First Auto.js

**Use Solution #1: Static Analysis**

### Why?

1. **Preserves immutability** - The graph stays immutable, which is the whole point of graph-first
2. **Simple implementation** - Just regex parsing, ~50 lines
3. **No user burden** - Works automatically
4. **Acceptable trade-off** - For visualization, occasional extra recomputation is fine

### Implementation

Already implemented in `src/static-analysis.js`:

```javascript
import { StaticAnalysisGraph } from './src/static-analysis.js';

const graph = new StaticAnalysisGraph(definition);
// Dependencies discovered by parsing function source
// Graph stays immutable
// Conservative but always correct
```

### Test It

```bash
# Run the demo
node src/static-analysis.js

# Compare all three strategies
node tests/compare-strategies.test.js
```

## Advanced: Hybrid Approach

**Best of both worlds**: Use static analysis by default, opt-in to runtime tracking for hot paths.

```javascript
auto({
    // Normal: static analysis (conservative)
    result: ($) => $.enabled ? $.data.process() : 'N/A',

    // Opt-in: runtime tracking (precise)
    optimized: {
        dynamic: true,  // Flag to enable runtime tracking
        fn: ($) => $.mode === 'complex' ? $.heavy.compute() : $.simple
    }
})
```

Most nodes use static (simple, immutable), but performance-critical paths can opt into runtime tracking.

## Current Auto.js Does It Differently

Current Auto.js uses **runtime tracking** BUT rebuilds the graph on every update.

**Why it works:**
- Dependencies discovered during execution (proxy tracking)
- Graph structure rebuilt every time (phase 1-2)
- Always accurate, never over-subscribes

**Graph-first is different because:**
- Graph built ONCE, not every update
- Must choose: conservative (static) or mutable (runtime)

This is the fundamental philosophical difference!

## Summary

Your question: **"if the graph is built once, how do we solve the dynamic dependencies issue?"**

**Answer**: You accept conservative dependency tracking via static analysis. Parse the function source to find ALL possible dependencies, even if some branches don't execute.

**Trade-off**: Occasional unnecessary recomputation for simplicity and guaranteed correctness.

**For visualization apps**: This trade-off is fine. Recomputing pure functions is cheap.

**For performance-critical apps**: Consider hybrid approach or runtime tracking.

The key insight: **Immutable graph + simple implementation + correctness > perfect optimization.**
