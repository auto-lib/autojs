# Test Suite Categorization

**Created**: 2025-12-26
**Purpose**: Clarify what each test validates and which tests are essential for kernel compatibility

This document categorizes the 75+ test suite to help understand:
- Which tests validate **core behavior** (essential for all kernels)
- Which tests validate **v0.54 internals** (may change in new implementations)
- Which tests validate **new features** (may not apply to minimal kernels)

---

## Test Categories

### 🔵 CORE BEHAVIOR (Essential - Must Pass)

These tests validate fundamental reactivity behavior that ALL kernels must support.

**Basic Functionality** (001-009):
```
001_empty.js                              ✅ ESSENTIAL - Empty object
002_just_one_value.js                     ✅ ESSENTIAL - Static value
003_just_one_function.js                  ✅ ESSENTIAL - Single computed function
004_just_value_and_function.js            ✅ ESSENTIAL - Value + dependent function
005_dependent_function.js                 ✅ ESSENTIAL - Function depends on another function
006_value_set.js                          ✅ ESSENTIAL - Setting values
007_value_set_with_dependent_function.js  ✅ ESSENTIAL - Setting value triggers function
008_value_set_with_get.js                 ✅ ESSENTIAL - Reading computed values
009_nested_deps.js                        ✅ ESSENTIAL - Multi-level dependencies
```

**Circular Dependency Detection** (010-014):
```
010_circle_detection.js                   ✅ ESSENTIAL - Direct circular dependency
011_nested_circle.js                      ✅ ESSENTIAL - Circular through nesting
012_actual_nested_circle.js               ✅ ESSENTIAL - True nested circular
013_conditional_circle_boot.js            ✅ ESSENTIAL - Conditional circle at boot
014_conditional_circle_triggered.js       ✅ ESSENTIAL - Conditional circle on trigger
030_inner_loop_detection.js               ✅ ESSENTIAL - Inner loop detection
074_circular_reference_protection.js      ✅ ESSENTIAL - Protection against circular refs
```

**Subscriptions** (015-021):
```
015_subscribe.js                          ✅ ESSENTIAL - Basic subscription
016_unsubscribe.js                        ✅ ESSENTIAL - Unsubscribing
017_unsubscribe_gaps.js                   ✅ ESSENTIAL - Unsubscribe with gaps
019_check_subscribe_effects.js            ✅ ESSENTIAL - Subscription side effects allowed
020_check_only_subs_update.js             ✅ ESSENTIAL - Only subscriptions update
021_check_subs_on_dependency_chain.js     ✅ ESSENTIAL - Subs on dependency chains
029_sub_must_update.js                    ✅ ESSENTIAL - Subscription must trigger
```

**Side Effect Prevention** (018, 028):
```
018_no_side_affects.js                    ✅ ESSENTIAL - Functions can't write state
028_subscribe_not_function_side_effects.js ✅ ESSENTIAL - Only subs have side effects
```

**Conditional Dependencies** (022-023):
```
022_conditional_deps.js                   ✅ ESSENTIAL - Dependencies change conditionally
023_nested_conditional_deps.js            ✅ ESSENTIAL - Nested conditional deps
```

**Core Patterns** (024-027):
```
024_out_of_order_functions.js             ✅ ESSENTIAL - Function definition order doesn't matter
025_nested_functions.js                   ✅ ESSENTIAL - Nested function calls
026_array_of_objects.js                   ✅ ESSENTIAL - Arrays of reactive objects
027_direct_array_of_objects.js            ✅ ESSENTIAL - Direct array manipulation
```

**Async Support** (041-042):
```
041_async_keyword.js                      ✅ ESSENTIAL - Async functions
042_async_keyword_dependency.js           ✅ ESSENTIAL - Async function dependencies
```

---

### 🟡 IMPLEMENTATION DETAILS (May Change in Kernels)

These tests validate v0.54 specific implementation details. New kernels may handle these differently.

**Internal State Structure** (Most tests check `$._`):
```
ALL TESTS that validate:
  - $._fn (list of computed variables)
  - $._deps (dependency map structure)
  - $._value (internal value storage)
  - $._subs (subscription map structure)
  - $._fatal (error states)
```

**Action**: Kernels can provide `$._` compatibility adapter instead of matching exact structure.

**Update Order** (046):
```
046_update_order.js                       🟡 IMPLEMENTATION - Specific topological order
```
*Note*: Order matters for correctness, but exact order may vary between implementations.

**Variable Checking** (031-040):
```
031_check_vars_exist.js                   🟡 IMPLEMENTATION - Variable existence checking
032_check_existing_vars_overwrite.js      🟡 IMPLEMENTATION - Overwrite protection
033_allow_undefined_value.js              🟡 IMPLEMENTATION - Undefined handling
034_set_undefined_var_fails.js            🟡 IMPLEMENTATION - Error handling
035_check_vars_static_static.js           🟡 IMPLEMENTATION - Static var validation
036_check_vars_static_dynamic.js          🟡 IMPLEMENTATION - Static/dynamic validation
037_check_vars_dynamic_static.js          🟡 IMPLEMENTATION - Dynamic/static validation
038_check_vars_dynamic_dynamic.js         🟡 IMPLEMENTATION - Dynamic var validation
039_guard_static_external.js              🟡 IMPLEMENTATION - Static external guards
040_guard_dynamic_internal.js             🟡 IMPLEMENTATION - Dynamic internal guards
043_set_fatal_function.js                 🟡 IMPLEMENTATION - Fatal function handling
```

**No Duplicate Updates** (047):
```
047_no_duplicate_updates.js               🟡 IMPLEMENTATION - Ensures single update per var
```

---

### 🟢 PERFORMANCE FEATURES (New in v0.47+)

These tests validate performance optimizations. Essential for production but may be optional for minimal kernels.

**Batching** (049-059):
```
049_batch_api.js                          🟢 PERFORMANCE - Manual batching API
050_batch_efficiency.js                   🟢 PERFORMANCE - Batch reduces updates
051_auto_batch.js                         🟢 PERFORMANCE - Auto-batching (v0.47+)
052_auto_batch_off_by_default.js          🟢 PERFORMANCE - Auto-batch config
053_explicit_batch_priority.js            🟢 PERFORMANCE - Explicit batch priority
054_auto_batch_loop_performance.js        🟢 PERFORMANCE - Loop optimization
055_auto_batch_twitch_test.js             🟢 PERFORMANCE - Rapid change handling
056_auto_batch_subscription_count.js      🟢 PERFORMANCE - Subscription efficiency
057_auto_batch_flush_fix.js               🟢 PERFORMANCE - Flush behavior
058_explicit_batch_no_twitch.js           🟢 PERFORMANCE - Batch stability
059_auto_flush_on_read.js                 🟢 PERFORMANCE - Flush on read
```

**Change Detection / Deep Equality** (060-065, 069-071):
```
060_change_detection_static.js            🟢 PERFORMANCE - Detect static changes (v0.51+)
061_change_detection_computed.js          🟢 PERFORMANCE - Detect computed changes
062_change_detection_boolean.js           🟢 PERFORMANCE - Boolean change detection
063_change_detection_performance.js       🟢 PERFORMANCE - Performance improvement
064_change_detection_mutation_problem.js  🟢 PERFORMANCE - Mutation edge cases
065_change_detection_immutable.js         🟢 PERFORMANCE - Immutable data
069_deep_equal_arrays.js                  🟢 PERFORMANCE - Deep array equality
070_deep_equal_objects.js                 🟢 PERFORMANCE - Deep object equality
071_no_deep_equal_default.js              🟢 PERFORMANCE - Deep equal config
```

**Performance Benchmarks** (044-045, 048):
```
044_performance_tests.js                  🟢 BENCHMARK - Performance testing
045_large_graph_performance.js            🟢 BENCHMARK - Large graph perf
048_timing_benchmark.js                   🟢 BENCHMARK - Timing benchmarks
```

---

### 🟣 DEBUGGING FEATURES (New in v0.52+)

These tests validate debugging/tracing features. May not be needed in minimal kernels.

**Root Cause Analysis** (072-073):
```
072_root_cause_analysis.js                🟣 DEBUG - Root cause tracking (v0.53+)
073_root_cause_with_batching.js           🟣 DEBUG - Root cause + batching
```

**Excessive Call Detection** (067):
```
067_excessive_call_detection.js           🟣 DEBUG - Catch infinite loops
```

---

### 🟠 NEW FEATURES (Experimental)

These tests validate new, experimental features that may not be in core.

**Recording** (066):
```
066_recorder_basic.js                     🟠 EXPERIMENTAL - Record/replay (v0.66+)
```
*Note*: Recording is implemented in separate `recorder.cjs` file, not core library.

---

## Test Matrix Summary

| Category | Count | Essential? | Notes |
|----------|-------|------------|-------|
| Core Behavior | ~30 | ✅ YES | Must pass for valid implementation |
| Implementation Details | ~15 | 🟡 ADAPTER | Can use `$._` compatibility layer |
| Performance Features | ~20 | 🟢 OPTIONAL | Important for production, optional for minimal kernels |
| Debugging Features | ~3 | 🟣 OPTIONAL | Nice to have, not required |
| Experimental | ~1 | 🟠 FUTURE | May not be in core |

---

## Guidance for Kernel Developers

### Minimum Viable Kernel
To be a valid auto.js implementation, a kernel must pass:
- ✅ All **Core Behavior** tests (~30 tests)
- 🟡 Either match `$._` structure OR provide compatibility adapter

**Estimated minimum**: ~30 essential tests

### Production-Ready Kernel
For production use, additionally pass:
- 🟢 **Performance Features** tests (batching, change detection)
- 🟣 **Debugging Features** tests (root cause, excessive calls)

**Estimated production**: ~55 tests

### Full Compatibility
To be a drop-in replacement for v0.54:
- ✅ All essential tests
- 🟡 All implementation detail tests (with adapter)
- 🟢 All performance tests
- 🟣 All debugging tests
- 🟠 All experimental tests

**Estimated full**: All 75+ tests

---

## Next Steps - Test Clarity Work

**TODO**: For each test category, document:
1. **What it tests** - Behavior, not just what the test file does
2. **Why it matters** - What breaks if this test fails?
3. **Kernel requirements** - What must a kernel do to pass this?

**TODO**: Identify tests that check `$._` internals:
1. Can they be rewritten to test behavior only?
2. Or should kernels provide `$._` adapter?
3. Mark each test with whether it's behavior-only or internals-dependent

**TODO**: New feature test specs:
1. **Recording** - What guarantees? Deterministic replay? State isolation?
2. **Batching** - What's the contract? When must batches flush?
3. **Change detection** - Deep vs shallow? Mutation detection guarantees?
4. **Root cause** - How deep should traces go? What info is essential?

---

## Using This Document

**When developing a kernel**:
1. Start with Core Behavior tests - these define auto.js
2. Add `$._` compatibility adapter for implementation tests
3. Add performance features based on kernel goals
4. Track progress in `/docs/status/KERNELS.md`

**When adding new features**:
1. Write test spec first - what's the contract?
2. Decide: Core behavior or optional feature?
3. Add to appropriate category in this document
4. Update KERNELS.md with feature support matrix

**When evaluating kernels**:
1. Check Core Behavior pass rate - validates correctness
2. Check Performance Feature support - validates production readiness
3. Check code size/clarity - validates simplicity goal
4. See `/docs/status/KERNELS.md` for current status
