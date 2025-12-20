# Strategy Selection Guide

The three-layer architecture supports **three different strategies** for discovering dependencies. This guide helps you choose the right one.

## The Three Strategies

### 1. Static Analysis (Default)

**How it works:** Parse function source code to find ALL `$.property` accesses.

```javascript
const $ = auto.static({
    enabled: false,
    data: [1, 2, 3],
    result: ($) => $.enabled ? $.data.length : $.data.join(',')
});

// Dependencies found: {enabled, data}
// Both branches analyzed, even though only one executes
```

**Characteristics:**
- ✅ Conservative - never misses dependencies
- ✅ Simple - just parse the source
- ✅ Fast - happens once at creation
- ✅ Predictable - same graph every time
- ✅ Graph is immutable
- ⚠️ May over-subscribe (track unused branches)
- ❌ Can't handle computed property access: `$[variable]`

**When to use:**
- **Default choice** - use unless you have specific reasons not to
- Data visualization (stated Auto.js use case)
- Static dependency graphs
- When predictability matters more than precision
- When occasional unnecessary recomputation is acceptable

### 2. Runtime Tracking

**How it works:** Track actual property accesses during execution using Proxies.

```javascript
const $ = auto.runtime({
    enabled: false,
    data: [1, 2, 3],
    result: ($) => $.enabled ? $.data.length : $.data.join(',')
});

// Dependencies found: {enabled}
// Only tracks what was actually accessed
```

**Characteristics:**
- ✅ Precise - only tracks actual accesses
- ✅ Handles computed property access: `$[variable]`
- ✅ Adapts to runtime behavior
- ⚠️ More complex - requires Proxy tracking
- ⚠️ Graph can become mutable (dependencies may change)
- ⚠️ May miss branches not executed initially
- ⚠️ Slightly slower - tracking overhead

**When to use:**
- Dynamic property access: `$.items[$[currentIndex]]`
- When precision matters (large graphs, expensive computations)
- When different execution paths have very different dependencies
- When you understand the trade-offs of mutable graphs

**Warning:** If dependencies change at runtime, graph structure changes:

```javascript
const $ = auto.runtime({
    mode: 'simple',
    data: [1, 2, 3],
    result: ($) => $.mode === 'complex' ? $.data.join(',') : $.data.length
});

// Initial: deps = {mode, data} - both accessed because length
console.log($.result);  // 3

// Change mode
$.mode = 'complex';
console.log($.result);  // "1,2,3"

// Now deps still {mode, data} - join also accesses data
```

But if initial execution doesn't access something:

```javascript
const $ = auto.runtime({
    show: false,
    data: [1, 2, 3],
    result: ($) => $.show ? $.data.join(',') : 'hidden'
});

// Initial: deps = {show} - data NOT accessed!
console.log($.result);  // "hidden"

// Later
$.show = true;
console.log($.result);  // "1,2,3"
// Now deps = {show, data} - graph mutated!
```

### 3. Explicit Dependencies

**How it works:** You declare dependencies manually, like React's `useEffect`.

```javascript
import { computed } from './src/auto-layered.js';

const $ = auto.explicit({
    enabled: false,
    data: [1, 2, 3],
    result: computed(['enabled', 'data'], ($) => $.enabled ? $.data.length : $.data.join(','))
});

// Dependencies: exactly what you declared
```

**Characteristics:**
- ✅ Explicit - no surprises
- ✅ Precise - you control exactly what's tracked
- ✅ Immune to code changes that don't affect dependencies
- ✅ Graph is immutable
- ⚠️ More verbose
- ⚠️ Manual maintenance required
- ❌ Can declare wrong dependencies (user error)

**When to use:**
- Maximum control and explicitness
- When you want dependencies visible in code
- When dependency analysis is difficult (complex functions)
- When migrating from React (familiar pattern)
- When you want to document dependencies explicitly

**Warning:** You can declare incorrect dependencies:

```javascript
// WRONG - missing 'data' dependency
const $ = auto.explicit({
    data: [1, 2, 3],
    count: computed(['enabled'], ($) => $.data.length)  // BUG!
});

$.data = [1, 2, 3, 4, 5];
console.log($.count);  // Still 3! Doesn't recompute because 'data' not declared
```

## Comparison Table

| Feature | Static Analysis | Runtime Tracking | Explicit |
|---------|----------------|------------------|----------|
| **Default?** | ✅ Yes | No | No |
| **Precision** | Conservative | Precise | Exact (if correct) |
| **Graph mutability** | Immutable | Mutable | Immutable |
| **Performance** | Fast | Slight overhead | Fast |
| **Handles conditionals** | All branches | Executed branch | As declared |
| **Handles `$[variable]`** | ❌ No | ✅ Yes | ✅ Yes |
| **User error risk** | Low | Low | Medium (wrong deps) |
| **Verbosity** | Low | Low | High |
| **Best for** | Default, static graphs | Dynamic access, precision | Maximum control |

## Decision Tree

```
Do you need computed property access like $[variable]?
├─ YES → Runtime Tracking or Explicit
└─ NO → Continue...

Do you want maximum explicitness and control?
├─ YES → Explicit Dependencies
└─ NO → Continue...

Do you have expensive computations in rarely-executed branches?
├─ YES → Consider Runtime Tracking
└─ NO → Static Analysis (default)

Are your dependency graphs mostly static?
├─ YES → Static Analysis (default)
└─ NO → Consider Runtime Tracking

Do you value simplicity and predictability?
└─ YES → Static Analysis (default)
```

**For most cases:** Use **Static Analysis** (the default). It's simple, predictable, and correct.

## Real-World Examples

### Example 1: Data Visualization Dashboard

**Use case:** Transform data for charts, tables, visualizations.

```javascript
const $ = auto.static({
    rawData: null,
    filteredData: ($) => $.rawData?.filter(d => d.value > 0) ?? [],
    chartData: ($) => $.filteredData.map(d => ({ x: d.date, y: d.value })),
    stats: ($) => ({
        count: $.filteredData.length,
        sum: $.filteredData.reduce((a, b) => a + b.value, 0),
        avg: $.filteredData.reduce((a, b) => a + b.value, 0) / $.filteredData.length
    })
});
```

**Why Static Analysis:**
- Dependencies are static and clear
- All code paths always execute
- No dynamic property access
- Simplicity and predictability matter

### Example 2: Dynamic Form with Conditional Fields

**Use case:** Form where fields depend on other fields' values.

```javascript
const $ = auto.static({
    formType: 'individual',  // or 'business'
    showTaxId: ($) => $.formType === 'business',

    // Individual fields
    firstName: '',
    lastName: '',

    // Business fields
    companyName: '',
    taxId: '',

    // Validation
    isValid: ($) => {
        if ($.formType === 'individual') {
            return $.firstName && $.lastName;
        } else {
            return $.companyName && $.taxId;
        }
    }
});
```

**Why Static Analysis:**
- Conservative tracking is safe - validates all fields
- Forms are typically small (over-subscription doesn't matter)
- Predictable behavior is important for forms
- All branches should be validated anyway

**Alternative with Explicit:**
```javascript
const $ = auto.explicit({
    formType: 'individual',
    showTaxId: computed(['formType'], ($) => $.formType === 'business'),
    firstName: '',
    lastName: '',
    companyName: '',
    taxId: '',
    isValid: computed(['formType', 'firstName', 'lastName', 'companyName', 'taxId'], ($) => {
        if ($.formType === 'individual') {
            return $.firstName && $.lastName;
        } else {
            return $.companyName && $.taxId;
        }
    })
});
```

**Why Explicit might be better:**
- Makes dependencies visible in code
- Acts as documentation
- Prevents accidental dependency changes

### Example 3: Dynamic Property Access

**Use case:** Access properties dynamically based on configuration.

```javascript
const $ = auto.runtime({
    config: { displayField: 'summary' },
    data: { summary: 'Quick view', details: 'Full information' },

    // Dynamic property access
    display: ($) => $.data[$.config.displayField]
});

console.log($.display);  // "Quick view"

$.config = { displayField: 'details' };
console.log($.display);  // "Full information"
```

**Why Runtime Tracking:**
- Static analysis can't parse `$.data[$.config.displayField]`
- Needs to track actual property accesses at runtime

**Alternative with Explicit:**
```javascript
const $ = auto.explicit({
    config: { displayField: 'summary' },
    data: { summary: 'Quick view', details: 'Full information' },

    // Declare both possible dependencies
    display: computed(['config', 'data'], ($) => $.data[$.config.displayField])
});
```

**Why Explicit might be better:**
- Graph remains immutable
- Dependencies are clear
- Simpler than runtime tracking

### Example 4: Expensive Computations

**Use case:** Some branches have very expensive computations.

```javascript
const $ = auto.runtime({
    dataSource: 'cache',  // or 'compute'

    cachedResult: [/* precomputed */],

    expensiveComputation: ($) => {
        // Very expensive - only want to run when needed
        return complexAlgorithm($.rawData);
    },

    result: ($) => $.dataSource === 'cache'
        ? $.cachedResult
        : $.expensiveComputation
});
```

**Why Runtime Tracking:**
- If `dataSource === 'cache'`, don't want `expensiveComputation` in deps
- Static analysis would track both branches
- Precision matters for performance

**Alternative:** Restructure to avoid the issue:
```javascript
const $ = auto.static({
    dataSource: 'cache',
    cachedResult: [/* precomputed */],
    rawData: [/* ... */],

    // Only compute when explicitly accessed
    expensiveResult: ($) => complexAlgorithm($.rawData),

    // Conditional doesn't execute both branches
    result: ($) => $.dataSource === 'cache' ? $.cachedResult : null
});

// Manually access when needed
if ($.dataSource !== 'cache') {
    const result = $.expensiveResult;
}
```

## Mixing Strategies

You can use different strategies for different Auto instances:

```javascript
// Static for simple dashboards
const $dashboard = auto.static(dashboardDef);

// Runtime for complex dynamic UI
const $dynamicUI = auto.runtime(dynamicDef);

// Explicit for critical business logic
const $businessLogic = auto.explicit(businessDef);
```

You **cannot** mix strategies within a single Auto instance.

## Recommendations by Use Case

### Data Visualization (Auto.js primary use case)
→ **Static Analysis** (default)

**Rationale:**
- Graphs are typically static
- Clarity and predictability matter
- Occasional over-computation is acceptable
- Simple mental model

### Interactive Applications
→ **Static Analysis** or **Explicit**

**Rationale:**
- Static: if dependency patterns are clear
- Explicit: if you want documentation value

### Complex Business Logic
→ **Explicit Dependencies**

**Rationale:**
- Dependencies as documentation
- Explicit is clearer for code review
- Reduces ambiguity

### Dynamic UIs with Computed Access
→ **Runtime Tracking** or **Explicit**

**Rationale:**
- Runtime: if you need automatic tracking
- Explicit: if you can declare all possible accesses

### Performance-Critical Paths
→ **Runtime Tracking** or **Explicit**

**Rationale:**
- Avoid over-subscription from static analysis
- Only track what's actually needed

## Common Mistakes

### Mistake 1: Using Runtime for Everything

**Don't do this:**
```javascript
// Using runtime just because it sounds more precise
const $ = auto.runtime(simpleStaticDefinition);
```

**Why it's wrong:**
- Adds complexity with no benefit
- Graph can mutate unexpectedly
- Static analysis is simpler and sufficient

**Do this:**
```javascript
const $ = auto.static(simpleStaticDefinition);
// or just
const $ = auto(simpleStaticDefinition);  // default is static
```

### Mistake 2: Incorrect Explicit Dependencies

**Don't do this:**
```javascript
const $ = auto.explicit({
    data: [1, 2, 3],
    // BUG: missing 'data' dependency!
    count: computed([], ($) => $.data.length)
});
```

**Why it's wrong:**
- Won't recompute when data changes
- Silent bug

**Do this:**
```javascript
const $ = auto.explicit({
    data: [1, 2, 3],
    count: computed(['data'], ($) => $.data.length)
});
```

Or use static analysis if you're unsure:
```javascript
const $ = auto.static({
    data: [1, 2, 3],
    count: ($) => $.data.length  // Dependencies discovered automatically
});
```

### Mistake 3: Assuming Runtime Catches Future Branches

**Don't do this:**
```javascript
const $ = auto.runtime({
    mode: 'a',
    data: { a: 1, b: 2, c: 3 },
    result: ($) => $.data[$.mode]
});

// Initial execution: mode='a', so deps={mode, data}
// But this was LUCKY - if data[mode] wasn't accessed, data wouldn't be in deps!
```

**Why it's risky:**
- Depends on initial execution path
- Different initial values = different graph

**Do this:**
```javascript
// Explicit - clear and predictable
const $ = auto.explicit({
    mode: 'a',
    data: { a: 1, b: 2, c: 3 },
    result: computed(['mode', 'data'], ($) => $.data[$.mode])
});
```

## Summary

**Default choice:** Static Analysis
- Simple, predictable, correct
- Best for Auto.js's primary use case (data visualization)
- Use unless you have specific reasons to choose otherwise

**Choose Runtime Tracking when:**
- Need computed property access: `$[variable]`
- Have expensive computations in rare branches
- Need maximum precision in large graphs

**Choose Explicit Dependencies when:**
- Want dependencies as documentation
- Need maximum control
- Have complex functions where analysis is hard
- Migrating from React patterns

**When in doubt:** Start with Static Analysis. It's the default for a reason.
