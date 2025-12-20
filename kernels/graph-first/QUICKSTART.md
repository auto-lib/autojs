# Quick Start: Dynamic Dependencies Solutions

## TL;DR

**Question**: If the graph is built once, how do we handle conditional dependencies?

**Answer**: Three solutions implemented - **Static Analysis is recommended**.

## Run the Demos

```bash
cd kernels/graph-first

# See all three strategies compared side-by-side
node tests/compare-strategies.test.js

# Or run each individually:

# Strategy 1: Static Analysis (recommended)
node src/static-analysis.js

# Strategy 2: Runtime Tracking (precise but complex)
node src/runtime-tracking.js

# Strategy 3: Explicit Dependencies (manual)
node src/explicit-deps.js

# Run all tests
node tests/basic.test.js
```

## The Three Solutions

### 1. Static Analysis (Recommended)

**Parse function source to find ALL dependencies**

```javascript
// Finds: {enabled, data, config}
// Even though when enabled=false, only 'enabled' is accessed
result: ($) => {
    if (!$.enabled) return 'N/A';
    return $.data.sort($.config);
}
```

**Pros**: Simple, immutable graph, always correct
**Cons**: May over-subscribe (compute when not strictly needed)
**Use when**: Building visualization apps where occasional extra work is fine

### 2. Runtime Tracking

**Track actual dependencies during execution**

```javascript
import { autoWithRuntimeTracking } from './src/runtime-tracking.js';

const $ = autoWithRuntimeTracking({
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

// Initially tracks: {mode, data}
// After mode='detailed', tracks: {mode, data, extra}
// Graph updates dynamically!
```

**Pros**: Perfectly precise, no wasted work
**Cons**: Graph becomes mutable, more complex
**Use when**: Performance is critical, complexity acceptable

### 3. Explicit Dependencies

**Declare dependencies manually**

```javascript
import { autoWithExplicitDeps, computed } from './src/explicit-deps.js';

const $ = autoWithExplicitDeps({
    showDetails: false,
    name: 'John',
    age: 30,

    // Must declare all deps
    display: computed(['showDetails', 'name', 'age'], ($) => {
        if ($.showDetails) {
            return $.name + ' ' + $.age;
        } else {
            return $.name;
        }
    })
});
```

**Pros**: Explicit control, immutable graph
**Cons**: Manual work, error-prone
**Use when**: You need precise control and don't mind manual maintenance

## See Them Compared

```bash
node tests/compare-strategies.test.js
```

Output shows:
- How each handles conditional dependencies
- Performance trade-offs
- When to use each approach

## Recommendation

**For graph-first Auto.js visualization library:**

Use **Static Analysis** because:
1. Graph stays immutable (the whole point!)
2. Simple implementation
3. No user burden
4. Over-subscription is acceptable for viz apps
5. Always correct

See `ANSWER.md` for detailed explanation.

## Implementation Files

- `src/static-analysis.js` - Strategy 1 implementation
- `src/runtime-tracking.js` - Strategy 2 implementation
- `src/explicit-deps.js` - Strategy 3 implementation
- `tests/compare-strategies.test.js` - Side-by-side comparison

## Documentation

- `ANSWER.md` - Direct answer to "how do we solve dynamic dependencies?"
- `DYNAMIC-DEPENDENCIES.md` - Complete technical explanation
- `ARCHITECTURE.md` - Full system walkthrough
- `VISUAL-GUIDE.md` - Diagrams showing how it works
