# Production Readiness: What It Takes to Make a Kernel Work

**Date**: 2026-01-03
**Context**: Integrating blocks kernel with prices-app revealed critical gaps between "tests passing" and "production working"

## The Three Parts of Kernel Validation

A kernel must satisfy three distinct requirements:

1. **Test Suite** - Behavioral correctness (~75 tests)
2. **Feature Set** - Capabilities (async, subscriptions, tracing, etc.)
3. **Production App** - Real-world usage patterns ← **THIS WAS MISSING**

## Critical Discovery: The Async Gap

### What Happened

The blocks kernel integration with prices-app revealed a critical issue:

```
✅ Tests passing (75/75)
✅ Async functions executing
✅ API data fetching (5805 items)
❌ App stuck on white loading screen
```

**Root cause**: Async functions completed, but dependent reactive values didn't recompute automatically.

### The Async Dependency Chain

```
data_000_async (async API fetch - 500ms)
  ↓ (resolves)
data_001_colors (sync transform)
  ↓
data_002_ensure_count (sync filter)
  ↓
data (sync filter)
  ↓
pre_dataset (async fetch_dataset)
  ↓ (resolves)
dataset (sync selector)
  ↓
loading (sync computed: !dataset)
```

**The problem**: When `data_000_async` resolved, the resolver didn't trigger propagation to recompute `data_001_colors` → `data_002_ensure_count` → etc.

### Why Tests Didn't Catch This

Our test suite has async tests, but they don't test **async propagation**:

```js
// ✅ Tests cover this (simple async)
{
    obj: {
        data: async ($) => [1, 2, 3],
        count: ($) => $.data.length
    }
}

// ❌ Tests DON'T cover this (deep async chains)
{
    obj: {
        async_fetch: async ($) => { /* 500ms API call */ },
        transform_1: ($) => $.async_fetch.map(...),
        transform_2: ($) => $.transform_1.filter(...),
        final: ($) => $.transform_2.reduce(...)
    }
}
```

**Gap**: Tests verify that async functions execute and resolve. They DON'T verify that:
- Dependent values recompute after async resolution
- Subscribers are notified after async resolution
- Multi-level async chains propagate correctly
- Errors in async functions are handled gracefully

## What Makes a Kernel "Production-Ready"

### 1. Core Reactivity (Tested ✓)
- Synchronous dependency tracking
- Topological ordering
- Circular dependency detection
- Basic subscription support

### 2. Async Support (Partially Tested ⚠️)
- **Tested**: Async function execution, promise resolution
- **NOT tested**: Async propagation, subscription notifications on async completion

### 3. Real-World Patterns (Not Tested ✗)
- Deep async dependency chains (5+ levels)
- Mixed sync/async dependencies
- Async functions that depend on other async functions
- Error recovery in async chains
- Race conditions in concurrent async operations
- Subscription updates triggering during async resolution

### 4. Production Integration (Not Tested ✗)
- Framework compatibility (Svelte stores, React hooks)
- Performance under load (1000+ reactive values)
- Memory management (subscriptions, cleanup)
- Developer experience (error messages, debugging)

## Diagnostic Infrastructure Required

### In the Kernel

Every kernel should support a **debug mode** that logs:

```js
// Example: blocks kernel with debug flag
auto(definition, {
    debug: true,  // Enable verbose logging
    debugFilter: ['async', 'propagation', 'subscriptions']
})
```

**What to log:**
1. **Async lifecycle**:
   - `⏳ ASYNC_START: functionName`
   - `✅ ASYNC_COMPLETE: functionName (500ms)`
   - `❌ ASYNC_ERROR: functionName - error message`

2. **Propagation events**:
   - `🔄 PROPAGATE: varName → [dep1, dep2, dep3]`
   - `⚡ EXECUTE: varName (stale=true)`
   - `✅ RESOLVED: varName = value`

3. **Subscription notifications**:
   - `📢 NOTIFY: varName → 5 subscribers`
   - `📥 SUBSCRIBE: varName (id: 042)`
   - `📤 UNSUBSCRIBE: varName (id: 042)`

4. **Error tracking**:
   - `🔴 ERROR: varName - Circular dependency detected: [a, b, c]`
   - `🔴 FATAL: varName - Unhandled error in subscriber`

### In the Application

Applications should add **component load markers**:

```svelte
<script>
console.log('✅ ComponentName.svelte loaded');

// State inspection
console.log('State:', {
    loading: $loading,
    dataset: $dataset ? 'set' : 'null'
});
</script>
```

**What to track:**
1. Component initialization order
2. Which reactive values are accessed
3. When subscriptions are created
4. State transitions (loading → loaded → error)

### MCP Console Monitoring

For browser-based apps, use MCP tools to capture console output:

```bash
# Check for errors
grep -E '"type":"(console.error|console.trace)"' mapped-console.jsonl

# Track async operations
grep "ASYNC" mapped-console.jsonl

# Find where execution stopped
grep "✅" mapped-console.jsonl | tail -20
```

## The Incremental Discovery Process

**Key insight**: Integrating a kernel with a real app is NOT binary (works/doesn't work). It's an **incremental discovery process**.

### Phase 1: Initial Integration
- Symlink/install kernel
- App compiles ✓
- App runs... but blank screen

### Phase 2: Component Load Tracing
Add logs to trace how far execution gets:
```
✅ App.svelte loaded
✅ Portal.svelte loaded
✅ Global.svelte loaded
✅ LoadingBalls.svelte loaded ← Found it!
```

**Discovery**: Loading overlay is rendering (white screen)

### Phase 3: State Inspection
Check why loading state is stuck:
```
loading = true
dataset = null
```

**Discovery**: Dataset never resolves

### Phase 4: Async Tracing
Add logs to async operations:
```
⏳ data_000_async: STARTING
✅ data_000_async: COMPLETED (got 5805 items)
❌ dataset: returning null (no dataset ready)
```

**Discovery**: Async completes but dependents don't recompute

### Phase 5: Root Cause
Resolver doesn't propagate after async resolution.

**Fix**: Add `resolveAll()` call in async completion callback.

## Required Test Coverage Additions

### Async Propagation Tests

```js
// Test: Multi-level async dependency chain
{
    name: 'async_propagation_chain',
    obj: {
        async_fetch: async ($) => {
            await sleep(50);
            return [1, 2, 3];
        },
        transform_1: ($) => $.async_fetch.map(x => x * 2),
        transform_2: ($) => $.transform_1.filter(x => x > 2),
        count: ($) => $.transform_2.length
    },
    tests: [
        { get: 'count', expect: 3 }, // Should work after async resolves
    ]
}
```

### Subscription Notification Tests

```js
// Test: Subscribers notified after async resolution
{
    name: 'async_subscription_notification',
    obj: {
        data: async ($) => {
            await sleep(50);
            return [1, 2, 3];
        },
        count: ($) => $.data.length
    },
    tests: [
        {
            subscribe: 'count',
            expect_calls: 2, // Once immediate, once after async
            expect_values: [undefined, 3]
        }
    ]
}
```

### Error Handling Tests

```js
// Test: Async error doesn't crash system
{
    name: 'async_error_handling',
    obj: {
        failing_fetch: async ($) => {
            throw new Error('Network error');
        },
        fallback: ($) => $.failing_fetch || 'default'
    },
    tests: [
        { get: 'fallback', expect: 'default' },
        { fatal: 'failing_fetch', expect: /Network error/ }
    ]
}
```

## Documentation Requirements

Every kernel must document:

1. **Async behavior**: How are async functions handled?
2. **Propagation model**: Eager vs lazy? When do values recompute?
3. **Subscription guarantees**: When are subscribers notified?
4. **Error handling**: What happens when functions throw?
5. **Performance characteristics**: Time/space complexity
6. **Framework integration**: Svelte stores? React hooks?
7. **Debug mode**: How to enable logging?
8. **Known limitations**: What doesn't work yet?

## Lessons for Future Kernels

### 1. Build with Debugging in Mind

Don't add logging as an afterthought. Build it into the core:

```js
class Resolver {
    constructor(graph, functions, options = {}) {
        this.debug = options.debug || false;
        this.debugFilter = options.debugFilter || [];
    }

    _log(category, message, data) {
        if (!this.debug) return;
        if (this.debugFilter.length && !this.debugFilter.includes(category)) return;
        console.log(`[${category}] ${message}`, data);
    }

    async _execute(name) {
        this._log('execute', `EXECUTE ${name}`, { stale: this.stale.has(name) });
        // ... execution logic
    }
}
```

### 2. Test with Real Patterns

Don't just test features in isolation. Test real-world patterns:
- API fetching
- Data transformation pipelines
- Form validation chains
- UI state machines

### 3. Provide Integration Guides

Document HOW to integrate, not just API reference:
- Svelte store adapter example
- React hook wrapper example
- Debug mode setup
- Common pitfalls

### 4. Use Production Apps as Validation

Tests are necessary but not sufficient. Validate against:
- At least one non-trivial production app (like prices-app)
- Different frameworks (Svelte, React, Vue)
- Different patterns (data fetching, forms, charts)

## Case Study: Static Analysis vs Runtime Tracking

**Date**: 2026-01-03
**Issue**: Circular dependency in prices-app that only manifests with static analysis

### The Circular Dependency

```
data → data_002_ensure_count → data_001_colors → data_000_async → url_name → name → data
```

This cycle exists in the **code structure** but not in **runtime execution** due to conditional logic:

```js
// In data_000_async (data.js:63)
if ($.chart_only) {
    let url = `${base}/dataset/${$.url_name}`;  // Only runs when chart_only=true
    // ...
}

// In name (data.js:115)
if ($.specie_filter && $.data && $.data.length > 0) {
    return $.data[0].nickname;  // Only runs when specie_filter is set
}
```

**At runtime**, these conditions are mutually exclusive - when one is true, the other is false. But **static analysis** sees both code paths and creates dependency edges for both.

### Why This Matters

**Runtime tracking** (like v0.54 auto.js):
- ✅ Only creates edges for dependencies that actually execute
- ✅ Handles conditional dependencies naturally
- ❌ Complex implementation (proxy tracking, call stack monitoring)
- ❌ Higher runtime overhead

**Static analysis** (like blocks kernel):
- ✅ Simple implementation (regex parsing of function source)
- ✅ Zero runtime overhead for dependency tracking
- ✅ Dependency graph known at initialization
- ❌ Cannot distinguish conditional from unconditional dependencies
- ❌ More conservative (reports cycles that may not execute)

### The Fix: Code Refactoring

Instead of implementing runtime tracking (which would complicate the kernel), we refactored the app code:

**Before** (creates cycle):
```js
data_000_async: async $ => {
    if ($.chart_only) {
        let url = `${base}/dataset/${$.url_name}`;  // Depends on url_name
        return await fetch_url(url);
    }
}
```

**After** (breaks cycle by inlining):
```js
data_000_async: async $ => {
    if ($.chart_only) {
        // Inline url_name logic to avoid circular dependency
        let dataset_name = '';
        if ($.ui_name) {
            dataset_name = $.ui_name;
        } else {
            // Parse URL directly instead of depending on url_name
            const url = $.original_url;
            dataset_name = url.searchParams.get('dataset') || '';
            // ... (rest of url_name logic inlined)
        }

        let url = `${base}/dataset/${dataset_name}`;
        return await fetch_url(url);
    }
}
```

### Design Tradeoff

This highlights a fundamental tradeoff in kernel design:

**Option 1: Static Analysis** (blocks kernel)
- Simpler kernel implementation
- May require app code refactoring to avoid false-positive cycles
- Forces developers to write code with clearer dependencies
- Easier to debug (dependency graph is explicit)

**Option 2: Runtime Tracking** (v0.54)
- More complex kernel implementation
- App code can use conditional dependencies freely
- Harder to debug (dependencies change at runtime)
- May hide unclear dependency patterns

**Decision**: The blocks kernel prioritizes simplicity. The refactoring required was straightforward (20 lines of inlined code), and the result is actually clearer - `data_000_async` no longer has a hidden dependency on `url_name`.

### Testing Implications

This issue reveals another gap in the test suite:

**Current tests**: Don't cover conditional dependencies
**Needed tests**:
```js
// Test: Conditional dependency should not create cycle
{
    name: 'conditional_no_cycle',
    obj: {
        a: ($) => $.b ? 'a-uses-b' : 'a-no-b',
        b: ($) => $.c ? 'b-uses-c' : 'b-no-c',
        c: ($) => $.a ? 'c-uses-a' : 'c-no-a'
    }
    // With runtime tracking: ✅ No cycle (none of the conditions trigger)
    // With static analysis: ❌ Cycle detected: a → b → c → a
}
```

**Recommendation**: Add a category of tests that specifically validate how the kernel handles conditional dependencies. Document whether the kernel uses static analysis (and thus reports conservative cycles) or runtime tracking (and thus only reports actual cycles).

## Summary: The Gap Between Tests and Production

**Tests validate**: "Does the kernel do what it's supposed to do?"
**Production validates**: "Does the kernel do what users need?"

These are related but distinct questions. A kernel can pass all tests and still fail in production because:

1. **Tests are too simple** - They don't capture real complexity
2. **Tests are too isolated** - They don't test integration patterns
3. **Tests are too synchronous** - They don't stress async behavior
4. **Tests don't test the edges** - Race conditions, errors, cleanup
5. **Tests don't stress dependency patterns** - Conditional dependencies, deep chains, complex graphs

**The solution**: Treat production integration as a discovery process, not a pass/fail test. Build diagnostic infrastructure, add targeted logs, trace incrementally, and document what you learn for the next kernel.
