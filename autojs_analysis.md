# Auto.js - Reactive State Management Library: Complete Analysis

## 1. OVERALL CODEBASE STRUCTURE

### Directory Layout
```
/Users/karl/autojs/
├── auto-commonjs.js          # Main implementation (514 lines) - CommonJS version
├── auto-es6.js               # ES6 module version (same logic)
├── auto-no-export.js         # Browser version (no export statement)
├── package.json              # v1.48.4, published as @autolib/auto
├── types/index.d.ts          # TypeScript type definitions
├── docs/
│   ├── devlog/src/           # Evolution history (48 numbered versions)
│   ├── discussion/           # Design philosophy & architecture discussions
│   ├── manual/               # User guides
│   └── ...other docs
├── tests/
│   ├── files/                # 65 test files covering all features
│   └── runall.js             # Test runner
└── readme.md                 # Project documentation
```

### Key Files

**Main Implementation (Source of Truth):**
- `/Users/karl/autojs/auto-commonjs.js` - 514 lines, production-ready
- `/Users/karl/autojs/docs/devlog/src/048_change_detection.js` - Latest devlog showing current state

**Version History (Evolution Tracked):**
- 48 numbered devlog files showing incremental development
- Each is a complete, self-contained implementation
- Started at 001_basic_box.js (simple getter/setter pattern)
- Ended at 048_change_detection.js (current implementation)

**Tests (Feature Coverage):**
- 65 test files in `/Users/karl/autojs/tests/files/`
- Each test validates specific features AND internal state
- Tests check: `fn`, `subs`, `deps`, `value`, `fatal` (internal state)

---

## 2. DEVELOPMENT EVOLUTION: MAJOR MILESTONES

### Phase 1: Basic Foundations (001-010)
**001_basic_box.js** - Simplest concept
- Simple getter/setter pattern
- `box(initial)` function creating {get, set}
- No dependencies, no reactivity yet

**003_track_functions.js - 010.js** - Dependency Tracking Era
- Introduced `running` variable to detect which function is executing
- `deps` map to track dependencies as functions read values
- First `dirty` flag concept for invalidation
- Circular dependency detection via stack tracking
- Key insight: **Dependencies discovered dynamically at runtime** (not declared)

### Phase 2: Structure & Safety (011-030)
**011 - Circle Detection** - More robust circular dependency handling
**018_optimized_subs.js** - Subscription optimization
**020_nested_functions.js** - Support for nested function definitions
**025_default_fatal_handler.js** - Error handling with #fatal special function
**026_asynchronous_functions.js** - Promise/async support with `set` callback parameter
**028_options.js** - Configuration via options object
**030_report_lag.js** - Performance monitoring

### Phase 3: Architecture Overhaul (031-046)
**044_batched_updates.js** - MAJOR RESTRUCTURING (foundation for current)
- Introduced explicit phases of change propagation:
  1. **Invalidate phase** - Mark all affected values
  2. **Sort phase** - Topological sort by dependencies
  3. **Update phase** - Recompute in correct order
  4. **Notify phase** - Run subscriptions once
- Replaced implicit recursive updates with explicit transaction model
- Added `propagate()` function as central orchestrator
- Foundation for batching and tracing

**045_optimizations.js** - Performance improvements
**046_batching_metadata.js** - Transaction metadata (id, triggers, updates)

### Phase 4: Batching (047-050)
**047_auto_batching.js** - Automatic batching
- Timer-based accumulation of rapid successive sets
- `auto_batch_enabled` flag (default: true)
- `auto_batch_delay` configurable (default: 0 = next tick)
- Prevents "update storms" from loops or event handlers
- Critical: Auto-flush on external read to prevent reading stale values

**048_change_detection.js** - CURRENT STATE
- **Key Addition**: Smart change detection
  - Primitive values: === comparison (only fire if actually changed)
  - Objects/arrays: Always count as changed (might be mutated)
  - Prevents unnecessary subscription fires for unchanged primitives
- Hybrid approach: works with both immutable and mutable patterns
- Examples:
  - Immutable: `$.items = [...$.items, item]` - new reference detected
  - Mutable: `$.items.push(item); $.items = $.items` - object always propagates

### Version Summary
```
001-010:  Basic dependency tracking, circular detection
011-030:  Subscriptions, async, options, performance monitoring
044-046:  Batched updates, explicit phases, transaction model
047:      Auto-batching (timer-based)
048:      Change detection (primitive vs object optimization)
```

---

## 3. TEST-DRIVEN FEATURES (tests/files/)

### Core Functionality Tests

**Basic Setup (001-008)**
- 001_empty.js - Empty object initialization
- 002_just_one_value.js - Single static value
- 003_just_one_function.js - Single computed function
- 004_just_value_and_function.js - Mixed values and functions
- 005_dependent_function.js - Computed value depending on another
- 006_value_set.js - Setting static values
- 007_value_set_with_dependent_function.js - Updates cascade
- 008_value_set_with_get.js - Getter/setter pattern

### Dependency & Reactivity Tests (009-030)

**009_nested_deps.js** - Multi-level dependency chains
- `count` -> `data`
- `msg` -> `count` and `data`
- Transitive dependencies work correctly

**010_circle_detection.js** - Circular dependency handling
```javascript
tick: ($) => $.tock,  // tick depends on tock
tock: ($) => $.tick   // tock depends on tick → FATAL
```
- Sets `fatal.msg = 'circular dependency'`
- Call stack recorded: `['tick', 'tock', 'tick']`

**015_subscribe.js - 017_unsubscribe_gaps.js** - Subscription management
- Multiple subscriptions per value
- Unique tags generated for each subscription (#000, #001, etc.)
- Unsubscribe properly removes subscriptions
- Gaps handled correctly (reuses IDs)

**020_check_only_subs_update.js** - Subscriptions only fire when subscribed
```javascript
// count has subscriber, is_data_set does not
$.data = [1,2,3];  // Only 'count' subscription runs
```

### Advanced Features (031-065)

**031_async_function.js** - Async computation
- Functions returning promises store promise as value
- On resolve: internal update via `set_internal()`
- Subscriptions run on promise resolution

**032_async_dependency.js** - Async with dependencies
```javascript
async_func: (_,set) => setTimeout(() => set('done'), 50),
another_async: (_,set) => setTimeout(() => set(_.async_func + ' more'), 100)
```
- Async resolution triggers cascade
- Next async can depend on first async

**037_trace.js** - Transaction tracing
- `opt.trace` callback receives complete transaction object
- Contains: id, timestamp, triggers, updates
- Each set triggers one trace event

**041_async_keyword.js** - Native async/await keyword support
```javascript
async_func: async (_,set) => 123  // Returns promise directly
```

**049_batch_api.js** - Explicit batching (key test)
```javascript
// Three separate sets = 2 transactions (one per change)
$.data = [...];    // txn 1
$.filter = ...;    // txn 2 (data changed)
$.page = 1;        // no txn (same value)

// Batch = ONE transaction with THREE triggers
$.batch(() => {
    $.data = [...];
    $.filter = ...;
    $.page = 2;
});
// Result: 1 txn with 3 triggers in single trace event
```

**051_auto_batch.js** - Automatic batching
- Three rapid sets automatically combined
- Result: 1 transaction with 3 triggers
- Requires waiting for next tick (setTimeout)

**060_change_detection_static.js** - Change detection (primitive values)
```javascript
input: 5
doubled: ($) => $.input * 2  // computed value

// Set input to 10 - triggers update
$.input = 10;              // doubled updates: 5*2=10
$.flush();

// Set input to 10 AGAIN - NO update
$.input = 10;              // NO change detection = no update
$.flush();

// Set input to 20 - triggers update
$.input = 20;              // doubled updates: 20*2=40
```
- Subscription fires: 3 times (initial: 10, change: 20, change: 40)
- Function updates: 2 times (skips 10→10)

**062_change_detection_boolean.js** - Change detection with booleans
**063_change_detection_performance.js** - Performance benefit
**064_change_detection_mutation_problem.js** - Mutable objects always propagate
**065_change_detection_immutable.js** - Immutable patterns work correctly

---

## 4. MAIN IMPLEMENTATION: CORE ARCHITECTURE

### File: `/Users/karl/autojs/docs/devlog/src/048_change_detection.js`
(Same as `/Users/karl/autojs/auto-commonjs.js` - 514 lines)

### Core Data Structures

```javascript
// === DEPENDENCY TRACKING ===
let deps = {};          // deps[name] = {dep1: true, dep2: true}
                        // What each value depends on (discovered at runtime)
let dependents = {};    // dependents[name] = {dependent1: true, ...}
                        // REVERSE map - O(affected) instead of O(n)
                        // What depends on each value

// === VALUES ===
let fn = {};            // fn[name] = function - stored functions for computed values
let value = {};         // value[name] = current value - both static and dynamic

// === TRACKING & CONTROL ===
let stack = [];         // Call stack for circular detection
let fatal = {};         // {msg, stack} - stops execution if set
let subs = {};          // subs[name][tag] = callback - subscriptions

// === TRANSACTIONS & BATCHING ===
let txn_counter = 0;           // Global transaction ID counter
let in_batch = false;          // Are we in explicit $.batch() call?
let batch_triggers = [];       // Accumulated triggers in explicit batch
let auto_batch_enabled = true; // Timer-based accumulation enabled?
let auto_batch_delay = 0;      // Delay before flush (0 = next tick)
let auto_batch_timer = null;   // Pending setTimeout handle
let auto_batch_pending = [];   // Triggers waiting for auto-batch flush

// === TRACING ===
let trace_fn = null;   // Optional: callback for each transaction
let trace = {};        // Current transaction object
let tnode = {};        // Reference to trace.updates being built
```

### Main Functions (5 Core + Helpers)

#### 1. **fail(msg, stop)** - Error Handler
```javascript
let fail = (msg,stop) => {
    fatal.msg = msg;
    fatal.stack = stack.map(s => s);  // Copy call stack
    let vars = get_vars(stack[stack.length-1], true);
    
    // Run #fatal special function if defined
    if (typeof fn['#fatal'] === 'function') {
        try { fn['#fatal']({msg, res, stack, vars}); }
        catch (e) { console.log(...); }
    }
};
```
- Stops all execution once called (fatal.msg persists)
- Runs #fatal callback for error handling/logging
- Prints dependent variable state for debugging

#### 2. **getter(name, parent)** - Read a Value
```javascript
let getter = (name, parent) => {
    // Auto-flush: pending auto-batch changes before external read
    if (!parent && auto_batch_pending.length > 0) {
        flush_auto_batch();  // Prevent stale reads
    }
    
    // Track dependency: if called from function, record the relationship
    if (parent) {
        deps[parent][name] = true;              // parent depends on name
        if (!dependents[name]) dependents[name] = {};
        dependents[name][parent] = true;        // reverse map
    }
    
    return value[name];
};
```
- Called from within functions: tracks dependencies
- External reads: auto-flushes pending auto-batch updates
- Returns current value

#### 3. **update(name, src, caller)** - Recompute a Function's Value
```javascript
let update = (name, src, caller) => {
    if (value[name]) return;  // Already computed in this txn
    if (fatal.msg) return;    // Stop if error occurred
    
    stack.push(name);
    if (stack.indexOf(name) !== stack.length-1) {
        fail('circular dependency');
        return;
    }
    
    // Clear old dependencies from both maps
    if (deps[name]) {
        Object.keys(deps[name]).forEach(dep => {
            if (dependents[dep] && dependents[dep][name]) {
                delete dependents[dep][name];
            }
        });
    }
    deps[name] = {};  // Fresh dependency set
    
    let v = fn[name]();  // Execute the function
    
    if (!!v && typeof v.then === 'function') {
        value[name] = v;  // Store promise
        v.then(v => set_internal(name, v));  // Update on resolve
    } else {
        value[name] = v;  // Store computed value
        tnode[name] = value[name];  // Record in trace
    }
    
    stack.pop();
};
```
- Runs a computed function and stores result
- Discovers dependencies dynamically (recorded in getter)
- Detects circular dependencies via stack
- Handles promises with internal setter

#### 4. **invalidate(name, affected)** - Mark What Needs Updating
```javascript
let invalidate = (name, affected) => {
    if (!affected) affected = new Set();
    
    // Use reverse dependency map - O(dependents) not O(all deps)
    if (dependents[name]) {
        Object.keys(dependents[name]).forEach(dep => {
            if (dep in fn && dep in value) {
                affected.add(dep);
                invalidate(dep, affected);  // Recursive
            }
        });
    }
    
    return affected;
};
```
- Finds all computed values affected by a change
- Uses reverse dependency map for O(affected) complexity
- Recursively invalidates dependents

#### 5. **setter(name, val)** - Set a Static Value
```javascript
let setter = (name, val) => {
    if (fatal.msg) return;
    
    // Change detection: skip if no change (primitives only)
    if (value[name] === val && (typeof val !== 'object' || val === null)) {
        return;  // No propagation needed
    }
    
    value[name] = val;
    
    // Priority 1: Explicit batch
    if (in_batch) {
        batch_triggers.push({name, value: val});
        return;  // Accumulate, don't propagate yet
    }
    
    // Priority 2: Auto-batch
    else if (auto_batch_enabled) {
        auto_batch_pending.push({name, value: val});
        if (auto_batch_timer !== null) clearTimeout(auto_batch_timer);
        auto_batch_timer = setTimeout(flush_auto_batch, auto_batch_delay);
        return;  // Accumulate, schedule flush
    }
    
    // Priority 3: Immediate propagation
    else {
        propagate({name, value: val});
    }
};
```
- Prioritizes batching modes
- Primitive change detection prevents unnecessary updates
- Accumulates or immediately propagates

#### 6. **propagate(triggers)** - CENTRAL ORCHESTRATOR
```javascript
let propagate = (triggers) => {
    if (!Array.isArray(triggers)) triggers = [triggers];
    
    txn_counter += 1;
    
    // Initialize transaction
    trace = {
        id: txn_counter,
        timestamp: Date.now(),
        triggers: triggers,  // Array of {name, value} objects
        updates: {}
    };
    tnode = trace.updates;
    
    // PHASE 1: Invalidate - find all affected variables
    let affected = new Set();
    triggers.forEach(trigger => {
        let trigger_affected = invalidate(trigger.name);
        trigger_affected.forEach(name => affected.add(name));
    });
    
    // PHASE 2: Sort - topological sort by dependencies
    let sorted = affected.size > 0 ? topological_sort(affected) : [];
    
    // PHASE 3: Save old values (for change detection)
    let old_values = {};
    sorted.forEach(name => {
        if (name in value) old_values[name] = value[name];
    });
    
    // PHASE 4: Delete old values
    sorted.forEach(name => {
        if (name in value) delete value[name];
    });
    
    // PHASE 5: Recompute in dependency order
    sorted.forEach(name => {
        if (name in fn && !(name in value)) {
            update(name, 'txn_' + txn_counter);
        }
    });
    
    // PHASE 6: Change detection - only propagate what changed
    let actually_changed = new Set();
    triggers.forEach(t => actually_changed.add(t.name));
    
    sorted.forEach(name => {
        let old_val = old_values[name];
        let new_val = value[name];
        
        // Objects always count as changed, primitives use ===
        let isObject = typeof new_val === 'object' && new_val !== null;
        let hasChanged = isObject || old_val !== new_val;
        
        if (hasChanged) {
            actually_changed.add(name);
        }
    });
    
    // PHASE 7: Build trace updates
    actually_changed.forEach(name => {
        trace.updates[name] = value[name];
    });
    
    // PHASE 8: Notify subscriptions ONLY for changed values
    let changed = actually_changed;
    changed.forEach(name => {
        if (name in subs) run_subs(name);
    });
    
    if (trace_fn) trace_fn(trace);
    return trace;
};
```
- Orchestrates complete change propagation
- 8 explicit phases
- Single transaction per call (or batched call)

### Key Concepts

#### Static vs Dynamic Values
- **Static**: Set from outside, read by functions
  - `data: null` or `data: [1,2,3]`
  - Changed via setter
- **Dynamic**: Computed from other values via functions
  - `count: ($) => $.data ? $.data.length : 0`
  - Only changed internally through update()

#### Dependency Discovery (Runtime)
- Not declared - discovered when function runs
- When function calls `$.data`, `getter('data', functionName)` records it
- Allows conditional dependencies:
  ```javascript
  filtered: ($) => $.data && $.filter ? $.data.filter(...) : null
  // Only depends on $.data and $.filter if both truthy
  ```

#### Change Detection Strategy
```javascript
// For STATIC values (in setter):
// Primitives: only propagate if value changed (===)
// Objects/arrays: always propagate (might be mutated)

// For DYNAMIC values (in propagate):
// Primitives: only fire subscriptions if changed (===)
// Objects/arrays: always fire subscriptions

// Result: Hybrid approach safe for both patterns
```

#### Transaction Model
- Each propagation = one transaction
- Transaction contains:
  - `id`: unique counter
  - `timestamp`: Date.now()
  - `triggers`: what changed (array of {name, value})
  - `updates`: what computed values were updated
- Passed to `opt.trace` callback for logging/debugging

#### Batching Priority
```
1. Explicit batch ($.batch(() => {...}))
   → Accumulate all sets, propagate once when done
2. Auto-batch (auto_batch: true, auto_batch_delay: 0)
   → Accumulate, schedule flush on next tick
3. Immediate (auto_batch: false)
   → Propagate immediately after each set
```

---

## 5. ARCHITECTURE PATTERNS

### Pattern 1: Reverse Dependency Map
```javascript
// Forward: deps[a] = {b: true} means a depends on b
// Reverse: dependents[b] = {a: true} means a depends on b

// When b changes:
// Old way: scan all deps O(n)
// New way: check dependents[b] O(affected)
```
**Benefit**: Performance on large graphs with few local changes

### Pattern 2: Dynamic Dependency Discovery
```javascript
let getter = (name, parent) => {
    if (parent) {
        deps[parent][name] = true;  // Record at read time
    }
    return value[name];
};

// Functions don't declare dependencies - they're discovered
let count = ($) => $.data ? $.data.length : 0;
// Dependency recorded WHEN $ is read, not declared
```
**Benefit**: Conditional dependencies, can be updated per call

### Pattern 3: Explicit Propagation Phases
```
Invalidate → Sort → Save Old → Delete → Update → Change Detect → Notify
```
**Benefits**:
- Clear, debuggable flow
- Separate concerns
- Enables batching
- Supports transaction tracing

### Pattern 4: Proxy-based Function Binding
```javascript
let _ = new Proxy({}, {
    get(target, prop) {
        return getter(prop, functionName);  // parent = functionName
    },
    set(target, prop, value) {
        fail('function trying to set');  // Prevent side effects
    }
});

// Function sees magic object $_:
let count = (_) => _.data.length;
// But _ is actually a Proxy calling getter/setter
```
**Benefit**: Automatic dependency tracking without manual declaration

### Pattern 5: Topological Sort for Update Ordering
```javascript
let topological_sort = (variables) => {
    let sorted = [];
    let visited = new Set();
    
    let visit = (name) => {
        if (visited.has(name)) return;
        
        // Visit dependencies first
        if (name in deps) {
            Object.keys(deps[name]).forEach(dep => {
                if (variables.has(dep)) visit(dep);
            });
        }
        
        visited.add(name);
        sorted.push(name);
    };
    
    variables.forEach(name => visit(name));
    return sorted;
};
// Result: dependencies always computed before dependents
```

### Pattern 6: Change Detection (Hybrid)
```javascript
let hasChanged = isObject || old_val !== new_val;
// Objects/arrays: always true (might be mutated)
// Primitives: === comparison

// Supports both patterns:
// Immutable: $.items = [...$.items, item]  // new reference
// Mutable: $.items.push(item); $.items = $.items  // object reference
```

### Pattern 7: Error Isolation
```javascript
let fatal = {};  // Once set, stops ALL execution
fn['#fatal'] = (info) => {  // Special callback
    console.log(info);  // Log detailed state
};
```
**Benefit**: Single error stops cascade, no silent failures

### Pattern 8: Subscription Management
```javascript
// Each value can have multiple subscribers
subs[name][tag] = callback;

// Generate unique tags:
let get_subtag = (name) => {
    let val = 0;
    while (subs[name] && tag() in subs[name]) val++;
    return tag();  // Returns "000", "001", etc.
};

// Unsubscribe: just delete from map
unsubscribe = () => delete subs[name][tag];
```

---

## 6. FEATURE SUMMARY TABLE

| Feature | Introduced | How It Works | Tests |
|---------|-----------|-------------|-------|
| Basic values | 001-003 | Getter/setter pattern | 001-008 |
| Dependency tracking | 010-014 | Runtime discovery via getter | 009, 021 |
| Circular detection | 010-011 | Stack tracking | 010, 011 |
| Subscriptions | 015+ | Callback registry per value | 015-019 |
| Async support | 026, 031+ | Promise handling + set() callback | 031-032, 041-042 |
| Batching | 044-047 | Explicit batch() API + auto-batching | 049-050, 051-057 |
| Auto-batching | 047+ | Timer-based accumulation (delay: 0-∞) | 051-057, 059 |
| Change detection | 048+ | Primitive: ===, Object: always | 060-065 |
| Transaction tracing | 046+ | opt.trace callback | 037-038, 049, 051 |
| Performance monitoring | 030+ | opt.count, opt.report_lag | 044-045, 048, 054 |
| Error handling | 025+ | #fatal special function | 034, 043 |
| Access control | 039-040 | Static/dynamic external/internal | 039-040 |

---

## 7. KEY EXECUTION MODEL

### Initialization (Boot)
```javascript
wrap(res, res['#'], obj);  // Set up all properties

Object.keys(fn).forEach(name => {
    value[name] = undefined;
    update(name);  // Initial computation for all functions
});
```

### Setting a Value (Static)
```javascript
$.data = [1,2,3];  // Calls setter('data', [1,2,3])
// ↓
// Setter decides: batch or propagate
// ↓
// propagate(triggers) orchestrates:
//   1. Invalidate all affected computed values
//   2. Topologically sort them
//   3. Recompute in order
//   4. Detect what actually changed
//   5. Fire subscriptions for changed values
//   6. Send trace event
```

### Reading a Value (Static or Dynamic)
```javascript
let x = $.data;  // External read → getter('data')
// ↓
// If auto-batch pending: flush first
// ↓
// Return value[name]

let x = _.data;  // Internal read (in function) → getter('data', functionName)
// ↓
// Record dependency: deps[functionName]['data'] = true
// ↓
// Return value[name]
```

### Computing a Function's Value (Dynamic)
```javascript
let count = ($) => $.data ? $.data.length : 0;
// When count needs updating:
// ↓
// update('count'):
//   1. Create magic Proxy object ($_)
//   2. Run count($_) 
//   3. When reads $.data: getter records dependency
//   4. Store returned value
//   5. Record in transaction trace
```

---

## Summary Statistics

- **Lines of Code**: 514 (main implementation)
- **Core Functions**: 5 (fail, getter, update, setter, propagate)
- **Helper Functions**: 10+ (invalidate, topological_sort, run_subs, etc.)
- **State Variables**: 20+ (deps, fn, value, stack, fatal, subs, trace, batching)
- **Test Coverage**: 65 tests covering all features
- **Evolution**: 48 devlog versions showing design decisions
- **Package Version**: 1.48.4
- **Dependencies**: Zero external libraries
- **Platforms**: Node.js, Browser, ES6, CommonJS

---

## Key Insight: "Reactivity Without Side Effects"

The fundamental principle: **Functions can READ state but NOT WRITE it**

```javascript
// ALLOWED
let count = ($) => $.data.length;  // Read data

// FORBIDDEN
let bad = ($) => { $.data = []; }  // Fatal error!
// Error: "function bad is trying to change value data"
```

This constraint ensures:
1. Pure computation functions
2. Clear state flow (only external sets change state)
3. Predictable propagation
4. No hidden side effects
5. Easier debugging and reasoning

