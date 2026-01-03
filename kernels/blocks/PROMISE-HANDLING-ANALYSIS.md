# Promise Handling Analysis: Was the Old Way Wrong?

**Date**: 2026-01-03
**Context**: After implementing async propagation fixes, prices-app needs `Array.isArray()` guards throughout the codebase.

## TL;DR

**The old way was incomplete, not wrong**. The blocks kernel had async support but didn't fully implement Promise detection. The fixes are **architecturally correct** for the blocks kernel, but there's a valid alternative approach that would require fewer app code changes.

---

## The Old Behavior (Before Fixes)

### What Happened
```javascript
// In resolver.js (BEFORE fixes)
const result = fn($, set);

if (result && typeof result.then === 'function') {
    // Register .then() handler but DON'T store Promise
    result.then(value => {
        this.values.set(name, value);
        // ... resolve dependents
    });
}
```

**Problem**: Promise wasn't stored in `values`, so:
1. Dependent functions couldn't detect pending state
2. Functions executed with `undefined` or stale cached values
3. Svelte components tried to iterate over undefined → crashes

### Why Did This Partially Work?

The app code was written with assumptions:
- `$.data` would be either a complete array OR null/undefined
- NOT that `$.data` could be a Promise (transitional state)

Guards like `if (!$.data)` protected against null/undefined but not Promises.

---

## The New Behavior (After Fixes)

### What Changed
```javascript
// In resolver.js (AFTER fixes)
const result = fn($, set);

if (result && typeof result.then === 'function') {
    // Store Promise IMMEDIATELY so dependents can detect it
    this.values.set(name, result);

    // Then await it
    result.then(value => {
        this.values.set(name, value);
        // ... resolve dependents
    });
}
```

**Plus**: Functions now check dependencies before executing:
```javascript
// Skip if dependency is stale (not computed)
if (this.stale.has(dep)) return false;

// Skip if dependency is a Promise (not resolved)
const depValue = this.values.get(dep);
if (depValue && typeof depValue.then === 'function') {
    return false;
}
```

### Result
- ✅ Dependent functions wait for async to complete
- ✅ No premature execution with incomplete data
- ✅ Integration tests pass
- ❌ App code now sees Promises in transitional states
- ❌ Needs `Array.isArray()` guards throughout

---

## Was the Old Way Wrong?

### Answer: **Incomplete, not fundamentally wrong**

The blocks kernel was designed with async support but **incomplete implementation**:

1. **Async function detection**: ✅ Worked
2. **Promise resolution**: ✅ Worked
3. **Promise storage**: ❌ Missing (my fix)
4. **Dependency skipping**: ❌ Incomplete (my fix)

The old code would:
- Execute async functions correctly
- Register `.then()` handlers correctly
- BUT fail to prevent premature execution of dependents

**This is a bug in the kernel**, not the app code.

---

## Comparison with v0.54 (Runtime Tracking)

### How v0.54 Handles This

v0.54 uses **runtime dependency tracking**:
```javascript
// v0.54 approach (conceptual)
function execute(name) {
    const deps = trackDependenciesAtRuntime(() => {
        return fn($); // Actually runs the function to see what it accesses
    });

    // Only records dependencies that were actually accessed
    // If $.data is a Promise, the function might not access it at all
}
```

**Key difference**: v0.54 only tracks dependencies that are **actually accessed at runtime**.

If a function has this guard:
```javascript
if ($.chart_only) {
    return $.dataset_async;  // Accesses dataset_async
} else {
    return $.titles_async;   // Accesses titles_async
}
```

v0.54 records:
- When `chart_only = true`: depends on `chart_only`, `dataset_async`
- When `chart_only = false`: depends on `chart_only`, `titles_async`

**Static analysis** (blocks kernel) always sees BOTH paths and records:
- Depends on: `chart_only`, `dataset_async`, `titles_async`

---

## Two Valid Approaches

### Approach 1: Current (Store Promises, Require Guards) ✅

**Philosophy**: "Expose reality to the app"

**Pros**:
- Honest about system state
- App code can handle loading states explicitly
- Enables sophisticated loading UIs
- More control for app developers

**Cons**:
- Requires guards throughout app code
- Breaking change from v0.54 behavior
- More verbose state functions

**Example**:
```javascript
// State function
grouped_data: $ => {
    if (!Array.isArray($.data)) return [];  // Guard against Promise
    return $.data.filter(/* ... */);
}

// Svelte component
{#each ($search_options || []) as item}
    <!-- Already handles empty array -->
{/each}
```

---

### Approach 2: Hide Promises (Like v0.54) ⚠️

**Philosophy**: "Make async transparent"

**Pros**:
- App code doesn't need Promise guards
- Closer to v0.54 behavior
- Less verbose state functions
- Easier migration from v0.54

**Cons**:
- Can't distinguish "loading" from "empty"
- Less explicit about system state
- Might hide bugs where async handling matters

**Implementation**:
```javascript
// In Proxy's get handler
get: (target, prop) => {
    const value = this.values.get(prop);

    // Hide Promises from functions
    if (value && typeof value.then === 'function') {
        return undefined; // OR return cached old value
    }

    return value;
}
```

**Result**: Functions never see Promises, always get resolved values or undefined.

---

## Recommendation

### Short Term: Stick with Approach 1 (Current)

**Reasons**:
1. **Architecturally correct**: Exposing Promises is honest about system state
2. **Already working**: Integration tests pass, kernel is correct
3. **Better long-term**: Enables proper loading states in UI
4. **Not that many guards needed**: Most state functions already check `if (!$.data)`

**Action**: Add `Array.isArray()` guards where needed (systematic fix, not refactor)

### Medium Term: Consider v0.54 Compatibility Mode

Add an **option** to hide Promises for easier v0.54 migration:

```javascript
auto(functions, {
    hidePendingAsync: true  // Hide Promises from dependent functions
});
```

This gives users choice:
- `false` (default): Expose Promises, require guards (honest, explicit)
- `true`: Hide Promises, v0.54-like behavior (convenient, implicit)

---

## Systematic Fix for prices-app

The fix is straightforward and not a full refactor:

### Pattern 1: Data checks
```javascript
// BEFORE
if ($.data) {
    $.data.forEach(/* ... */);
}

// AFTER
if (Array.isArray($.data)) {
    $.data.forEach(/* ... */);
}
```

### Pattern 2: Svelte templates
```javascript
// BEFORE
{#each $list as item}

// AFTER
{#each ($list && Array.isArray($list) ? $list : []) as item}
```

### Pattern 3: Optional chaining
```javascript
// BEFORE
if ($charts.length > 0) {

// AFTER
if ($charts?.length > 0) {
```

### Scope
Estimated changes needed:
- ~10-15 state functions (search.js, dataset.js, lines.js, compare.js)
- ~5-10 Svelte components (Search, Compare, PortalTable, etc.)
- ~30-50 lines total

**This is not a refactor**, it's a targeted fix to handle async states properly.

---

## Conclusion

### The Question: "Was the old way wrong?"

**Answer**: The old kernel implementation was incomplete. It had async support but didn't prevent premature execution of dependents.

### The Question: "Is this necessary?"

**Answer**: Yes, for correctness. But there are two valid approaches:
1. **Current**: Expose Promises, require guards (architecturally better)
2. **Alternative**: Hide Promises, v0.54-like behavior (easier migration)

### Recommendation

**Keep current approach** (expose Promises) because:
- It's architecturally correct
- Integration tests validate it works
- Enables proper loading states in UI
- The fix is systematic, not a refactor (~30-50 lines)

**Optional**: Add `hidePendingAsync` option for v0.54 compatibility mode in the future.

---

## Next Steps

1. ✅ Integration tests documented (INTEGRATION-TESTS.md)
2. ✅ CLAUDE.md updated with test info
3. ⏳ Decide: systematic fix (current approach) vs compatibility mode (alternative)
4. ⏳ If fixing: grep for all `$.data` usages and add guards
5. ⏳ If compatibility mode: implement `hidePendingAsync` option

**Your call**: Which approach do you prefer?
