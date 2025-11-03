# Auto.js Architecture Document

## Table of Contents
1. [Core Concept](#core-concept)
2. [Evolution Story](#evolution-story)
3. [Data Structures](#data-structures)
4. [The Five Runtime Functions](#the-five-runtime-functions)
5. [The 8-Phase Propagation Cycle](#the-8-phase-propagation-cycle)
6. [Major Features](#major-features)
7. [Key Invariants](#key-invariants)

---

## Core Concept

**The Central Idea**: Separate state into two types:
- **Static variables** - Changed from the *outside* (by your code)
- **Dynamic variables** - Changed from the *inside* (by their own functions)

**The Fundamental Promise**: "Reactivity Without Side Effects"
- Functions can READ state but never WRITE state
- Dependencies are tracked automatically
- Updates propagate in correct topological order
- Everything stays consistent

### Example
```javascript
let _ = auto({
    // Static - you control this from outside
    data: [1, 2, 3],

    // Dynamic - computed from other values
    count: ($) => $.data ? $.data.length : 0,
    doubled: ($) => $.data.map(x => x * 2)
});

_.data = [1, 2, 3, 4];  // Set from outside
// count and doubled automatically recompute in correct order
```

---

## Evolution Story

### Phase 1: Basic Foundations (001-011)
**001-003**: Started with simple "box" getters/setters, evolved to tracking dependencies
**004-010**: Added proper subscription system, dynamic/static distinction
**011**: **MAJOR**: Circular dependency detection using call stack

### Phase 2: Maturity & Safety (012-033)
**012-017**: Optimizations for dirty checking and stale dependencies
**015**: Key insight - delete values to mark for recomputation
**018-024**: Subscription improvements, nested functions, inner loop detection
**026**: **MAJOR**: Asynchronous functions with `set` parameter
**027-033**: Out-of-order execution, variable existence checking, "complete leaves" optimization

### Phase 3: Observability & Control (034-043)
**034**: **MAJOR**: Transaction tracing - captures what changed and why
**035**: Dynamic addition of variables with `.add_static()` / `.add_dynamic()`
**036-040**: Guards for internal/external variables, async improvements
**041-043**: Deep logging, tagging, try-catch wrapping

### Phase 4: Batching Revolution (044-048)
**044**: **MAJOR ARCHITECTURAL SHIFT** - Explicit 4-phase propagation model
  - Before: Recursive immediate updates (unclear ordering)
  - After: Invalidate → Sort → Update → Notify (crystal clear)
  - Introduced `invalidate()`, `topological_sort()`, and `propagate()` orchestrator
  - Reverse dependency map for O(affected) instead of O(all)

**045**: **MAJOR**: Explicit `batch()` API for grouping multiple sets
**046**: Enhanced transaction metadata (txn_counter, timestamps)
**047**: **MAJOR**: Auto-batching with timer-based debouncing + auto-flush on read
**048**: **CURRENT**: Hybrid change detection (primitives optimized, objects always propagate)

### Key Insight from Evolution
Version 044 was the turning point. Before: "recursive spaghetti." After: "explicit phases."
This makes the system:
- Predictable (clear execution order)
- Batchable (multiple triggers in one transaction)
- Recordable (everything goes through `propagate()`)

---

## Data Structures

### Primary State
```javascript
let deps = {};       // Forward dependencies: deps[parent] = { child1: true, child2: true }
let dependents = {}; // Reverse map: dependents[child] = { parent1: true, parent2: true }
let fn = {};         // Dynamic functions: fn[name] = () => compute_value
let value = {};      // Current values (both static & dynamic)
let subs = {};       // Subscriptions: subs[name] = { '000': callback, '001': callback }
```

### Error Handling
```javascript
let fatal = {};      // { msg: string, stack: string[] } - halts everything if set
let stack = [];      // Current call stack (for circular detection & debugging)
```

### Transaction Tracking
```javascript
let trace = {        // Current transaction metadata
    id: txn_counter,
    timestamp: Date.now(),
    triggers: [{ name: 'foo', value: 42 }],  // What triggered this
    updates: { bar: 84, baz: 126 }           // What got recomputed
};
```

### Batching State
```javascript
let txn_counter = 0;           // Global transaction ID
let in_batch = false;          // Explicit batch active?
let batch_triggers = [];       // Accumulated triggers
let auto_batch_enabled = true; // Auto-batch enabled?
let auto_batch_delay = 0;      // Timer delay (0 = next tick)
let auto_batch_timer = null;   // Pending timer
let auto_batch_pending = [];   // Pending auto-batch triggers
```

### Options
```javascript
{
    trace: (trace) => {},      // Callback for each transaction
    watch: { varName: true },  // Debug logging for specific variables
    tag: 'my-app',             // Prefix for log messages
    deep_log: false,           // Log everything (debug mode)
    report_lag: 100,           // Warn if function takes >100ms
    auto_batch: true,          // Enable auto-batching
    auto_batch_delay: 0,       // Delay before flushing
    tests: { ... }             // Pre-boot function tests
}
```

---

## The Five Runtime Functions

### 1. `getter(name, parent)`
**Purpose**: Read a value and track the dependency

```javascript
let getter = (name, parent) => {
    // Auto-flush pending batches before external reads
    if (!parent && auto_batch_pending.length > 0) {
        flush_auto_batch();
    }

    // Track dependency
    if (parent) {
        deps[parent][name] = true;          // Forward edge
        dependents[name][parent] = true;    // Reverse edge
    }

    return value[name];
}
```

**Key insight**: The `parent` parameter is how we know WHO is reading. Functions get a custom Proxy that passes their name.

### 2. `setter(name, val)`
**Purpose**: Set a static variable and trigger propagation

```javascript
let setter = (name, val) => {
    // Early exit for no change (primitives only)
    if (value[name] === val && typeof val !== 'object') return;

    value[name] = val;

    // Three-priority batching system:
    if (in_batch) {
        batch_triggers.push({ name, value: val });      // Priority 1: Explicit batch
    } else if (auto_batch_enabled) {
        auto_batch_pending.push({ name, value: val });  // Priority 2: Auto-batch
        auto_batch_timer = setTimeout(flush_auto_batch, auto_batch_delay);
    } else {
        propagate({ name, value: val });                // Priority 3: Immediate
    }
}
```

### 3. `update(name, src, caller)`
**Purpose**: Recompute a dynamic function's value

```javascript
let update = (name, src, caller) => {
    if (value[name]) return;  // Already computed
    if (fatal.msg) return;    // System halted

    stack.push(name);
    if (stack.indexOf(name) !== stack.length-1) {
        fail('circular dependency');
        return;
    }

    // Clear old dependencies (from BOTH maps)
    if (deps[name]) {
        Object.keys(deps[name]).forEach(dep => {
            delete dependents[dep][name];
        });
    }
    deps[name] = {};

    // Run the function (which will call getter() and rebuild deps)
    let v = fn[name]();

    // Handle async functions
    if (v && typeof v.then === 'function') {
        value[name] = v;
        v.then(v => set_internal(name, v));
    } else {
        value[name] = v;
    }

    stack.pop();
}
```

**Key insight**: Dependencies are cleared and rebuilt on EVERY execution (dynamic discovery).

### 4. `propagate(triggers)`
**Purpose**: The orchestrator - coordinates the entire update cycle

```javascript
let propagate = (triggers) => {
    triggers = Array.isArray(triggers) ? triggers : [triggers];
    txn_counter += 1;

    // Initialize transaction trace
    trace = {
        id: txn_counter,
        timestamp: Date.now(),
        triggers: triggers,
        updates: {}
    };

    // Phase 1-8 (see next section)
    // ...

    if (trace_fn) trace_fn(trace);
    return trace;
}
```

### 5. `fail(msg)`
**Purpose**: Handle errors and halt the system

```javascript
let fail = (msg) => {
    fatal.msg = msg;
    fatal.stack = stack.map(s => s);

    // Try to call user's error handler
    if (fn['#fatal']) {
        try {
            fn['#fatal']({ msg, stack, vars });
        } catch (e) {
            console.log('EXCEPTION in #fatal', e);
        }
    }
}
```

---

## The 8-Phase Propagation Cycle

Every transaction (whether from a single `setter()` or a batch) flows through these phases:

### Phase 1: Invalidate
```javascript
let affected = new Set();
triggers.forEach(trigger => {
    let trigger_affected = invalidate(trigger.name);
    trigger_affected.forEach(name => affected.add(name));
});
```
**What**: Find all variables that depend on the triggers (recursively)
**How**: Use reverse dependency map `dependents[name]` - O(affected) not O(all)
**Result**: Set of variable names that need recomputation

### Phase 2: Topological Sort
```javascript
let sorted = topological_sort(affected);
```
**What**: Order variables so dependencies compute before dependents
**How**: Depth-first search with cycle detection
**Result**: Array of names in safe execution order

### Phase 3: Capture Old Values
```javascript
let old_values = {};
sorted.forEach(name => {
    if (name in value) old_values[name] = value[name];
});
```
**What**: Save current values for change detection
**Why**: So we can compare and only fire subscriptions if actually changed

### Phase 4: Mark for Recomputation
```javascript
sorted.forEach(name => {
    if (name in value) delete value[name];
});
```
**What**: Delete values to mark them as needing recomputation
**Why**: The `update()` function checks `if (value[name]) return;`

### Phase 5: Recompute
```javascript
sorted.forEach(name => {
    if (name in fn && !(name in value)) {
        update(name, 'txn_' + txn_counter);
    }
});
```
**What**: Call `update()` for each variable in sorted order
**Why**: Topological order ensures dependencies are ready

### Phase 6: Detect Changes
```javascript
let actually_changed = new Set();
triggers.forEach(t => actually_changed.add(t.name));  // Triggers always count

sorted.forEach(name => {
    let old_val = old_values[name];
    let new_val = value[name];
    let isObject = typeof new_val === 'object' && new_val !== null;
    let hasChanged = isObject || old_val !== new_val;

    if (hasChanged) actually_changed.add(name);
});
```
**What**: Compare old vs new to find actual changes
**Why**: Prevent unnecessary subscription fires and UI re-renders
**Hybrid approach**:
- Primitives: Use `===` comparison
- Objects/arrays: Always count as changed (might be mutated)

### Phase 7: Build Trace
```javascript
actually_changed.forEach(name => {
    trace.updates[name] = value[name];
});
```
**What**: Record what changed in the transaction trace
**Why**: Observability, debugging, and **future recording/playback** ⭐

### Phase 8: Notify Subscriptions
```javascript
actually_changed.forEach(name => {
    if (name in subs) run_subs(name);
});
```
**What**: Call subscription callbacks for changed values
**Why**: Notify UI components, side effects, etc.

---

## Major Features

### Asynchronous Functions
**Introduced**: Version 026
**Purpose**: Allow functions to return Promises or use setTimeout

```javascript
let _ = auto({
    data: null,
    async_result: ($, set) => {
        setTimeout(() => set('done'), 100);
        return undefined;  // Initial value
    }
});
```

**How it works**:
1. Function receives second parameter `set` (bound to `setter`)
2. Can call `set(value)` at any time to update its own value
3. Triggers propagation when resolved via `set_internal()`

### Explicit Batching
**Introduced**: Version 045
**Purpose**: Group multiple sets into one transaction

```javascript
_.batch(() => {
    _.data = [1, 2, 3];
    _.filter = 'active';
    _.sort = 'name';
});
// ONE transaction with 3 triggers, updates run once
```

**How it works**:
1. Sets `in_batch = true` flag
2. `setter()` accumulates triggers instead of propagating
3. After callback completes, calls `propagate(batch_triggers)`

### Auto-Batching
**Introduced**: Version 047
**Purpose**: Automatically batch rapid successive sets

```javascript
for (let i = 0; i < 100; i++) {
    _.counter = i;  // Accumulated automatically
}
// Flushes on next tick - ONE transaction instead of 100
```

**How it works**:
1. First `setter()` schedules a timer (default 0ms = next tick)
2. Subsequent `setter()` calls accumulate and reset timer
3. Timer fires → `flush_auto_batch()` → `propagate(auto_batch_pending)`

**Auto-flush on read**: If you read a value while auto-batch is pending, it flushes immediately to prevent stale reads (prevents UI "twitching")

### Change Detection
**Introduced**: Version 048
**Purpose**: Only fire subscriptions when values actually change

**For static variables** (in `setter`):
```javascript
if (value[name] === val && typeof val !== 'object') {
    return;  // No propagation for unchanged primitives
}
```

**For computed variables** (in Phase 6 of `propagate`):
```javascript
let isObject = typeof new_val === 'object' && new_val !== null;
let hasChanged = isObject || old_val !== new_val;
if (hasChanged) actually_changed.add(name);
```

**Hybrid approach**:
- ✅ Optimizes primitives (numbers, strings, booleans)
- ✅ Safe for objects/arrays (always propagate, might be mutated)
- ✅ Works with both immutable and mutable patterns

### Transaction Tracing
**Introduced**: Version 034, enhanced in 046
**Purpose**: Capture what happened in each transaction

```javascript
let _ = auto(state, {
    trace: (trace) => {
        console.log('Transaction', trace.id);
        console.log('Triggers:', trace.triggers);
        console.log('Updates:', trace.updates);
    }
});
```

**Trace structure**:
```javascript
{
    id: 42,                                    // Unique transaction number
    timestamp: 1704326400000,                   // When it happened
    triggers: [{ name: 'data', value: [...] }], // What was set externally
    updates: { count: 3, filtered: [...] }      // What was recomputed
}
```

**This is the foundation for record/playback!** ⭐

### Dependency Guards
**Introduced**: Versions 036-040
**Purpose**: Enforce boundaries between internal/external variables

```javascript
_.add_static_external({ user_input: null });  // Can't be read by functions
_.add_static_internal({ _cache: {} });        // Can't be read from outside
_.add_dynamic_internal({ _helper: ($) => ... }); // Can't be accessed externally
```

**Guards**:
- External static → Functions can't read (enforces data flow)
- Internal dynamic → Outside can't read (enforces encapsulation)

---

## Key Invariants

### Must NEVER be violated:

1. **No side effects in functions**: Functions READ state, never WRITE
   - Enforced by Proxy trap in `setup_dynamic()`
   - Calling `setter()` from inside a function triggers `fail()`

2. **No circular dependencies**: Variable can't depend on itself (directly or indirectly)
   - Runtime detection: `stack.indexOf(name) !== stack.length-1`
   - Structural detection: `topological_sort()` visiting set
   - Both cause `fail('circular dependency')`

3. **Topological order**: Dependencies always compute before dependents
   - Ensured by `topological_sort()` in Phase 2
   - DFS guarantees leaves compute first

4. **Consistent dependency tracking**: Both maps stay in sync
   - `deps[parent][child]` ↔ `dependents[child][parent]`
   - Updated together in `getter()` and `update()`

5. **Single source of truth**: Each variable has exactly one way to be updated
   - Static: Only via external `setter()` calls
   - Dynamic: Only via their own `fn[name]()` function

6. **Transaction atomicity**: Updates either all complete or system halts
   - `fatal.msg` checked at start of every function
   - Once set, nothing else runs

### Should ALWAYS be true:

1. **Change detection accuracy**:
   - Primitives: Only fire subscriptions if `old !== new`
   - Objects: Always fire (might be mutated)

2. **Auto-flush before reads**:
   - External reads trigger `flush_auto_batch()` if pending
   - Prevents reading stale values

3. **Dependency freshness**:
   - Dependencies cleared and rebuilt on every `update()`
   - Handles conditional dependencies correctly

4. **Trace completeness**:
   - Every propagation creates a trace
   - Captures all triggers and all updates

---

## Testing Philosophy

**The Genius Move**: Test internal state, not just outputs

```javascript
// tests/files/004_just_value_and_function.js
{
    obj: { data: null, func: ($) => 'val' },
    _: {
        fn: ['func'],
        deps: { func: [] },
        value: { data: null, func: 'val' },
        fatal: {}
    }
}
```

**Why this is brilliant**:
- Validates not just WHAT but HOW
- Catches internal inconsistencies early
- Makes refactoring safe (change implementation, not contract)
- Provides documentation of expected state

**Test structure**: `setup` → `fn()` → `assert _`

---

## What Makes This Library Special

1. **Automatic dependency tracking** - No manual subscriptions
2. **Guaranteed consistency** - Topological ordering
3. **No side effects** - Functions are pure (read-only)
4. **Batching built-in** - Both explicit and automatic
5. **Change detection** - Subscriptions only when needed
6. **Transaction traces** - Full observability
7. **Async support** - First-class Promises
8. **Robust testing** - Internal state validation
9. **Error handling** - Fatal halts + recovery hooks
10. **Performance optimizations** - Reverse dependency map, auto-batching, change detection

---

## Next Steps: Record/Playback Vision

The architecture is **already prepared** for record/playback:

**What we have**:
- ✅ Transaction traces with triggers and updates
- ✅ All changes flow through `propagate()`
- ✅ Clear distinction between inputs (triggers) and outputs (updates)
- ✅ Timestamps for sequencing

**What we need**:
- 📝 Recorder to capture transaction traces
- 📝 Storage format for recordings
- 📝 Playback engine to replay triggers
- 📝 Comparator to detect regressions

**Key insight**: We don't need to refactor much. The 8-phase propagation cycle is already perfect for this. We just need to plug into the `trace` callback!

---

*Generated from analysis of 48 versions (001-048) spanning years of evolution*
*Current version: 1.48.4 (change detection + auto-batching)*
