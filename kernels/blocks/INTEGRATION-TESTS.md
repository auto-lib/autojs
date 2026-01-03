# Integration Tests for Async Propagation

**Location**: `/tests/integration/`
**Runner**: `run-integration-tests.js`

## Purpose

These integration tests were created to debug performance degradation issues in the prices-app when clicking repeatedly on datasets. They capture real-world async propagation patterns and verify correct behavior.

## Running Tests

```bash
cd /Users/karl/autojs/kernels/blocks
node run-integration-tests.js
```

## Test Suite (4 tests, all passing ✅)

### 011_async_mode_switching.js
**What it tests**: Mode-dependent async fetching (like `chart_only` in prices-app)

**Pattern**:
- Two async data sources: `titles_async` (all titles) vs `dataset_async` (specific dataset)
- Router function selects which one based on `chart_only` flag
- Changing `ui_name` should NOT refetch titles

**Why it matters**:
- In prices-app, clicking search results changes `ui_name`
- Should only refetch when switching modes, not when selecting different datasets
- Prevents unnecessary API calls

**Key assertions**:
```javascript
// After changing ui_name twice, titles should still only fetch once
if (titlesFetchCount() !== 1) {
    throw new Error(`Expected titles to stay at 1, got ${titlesFetchCount()}`);
}

// After switching to chart_only mode, dataset should now fetch
if (datasetFetchCount() !== 1) {
    throw new Error(`Expected dataset to fetch once, got ${datasetFetchCount()}`);
}
```

---

### 012_async_chain_execution.js
**What it tests**: Async chains execute in correct order

**Pattern**:
- `async_1` → `async_2` → `sync_3` (chain of dependencies)
- Each function logs when it starts/completes
- Tests that execution order is sequential, not premature

**Why it matters**:
- Ensures `async_2` doesn't start until `async_1` completes
- Ensures `sync_3` doesn't execute until `async_2` completes
- Prevents race conditions and stale data

**Key assertions**:
```javascript
const expectedOrder = [
    'async_1_start',
    'async_1_complete',
    'async_2_start',     // NOT before async_1 completes
    'async_2_complete',
    'sync_3_execute'     // NOT before async_2 completes
];

if (JSON.stringify(executionLog) !== JSON.stringify(expectedOrder)) {
    throw new Error(`Execution order incorrect`);
}
```

---

### 013_async_skip_pending.js
**What it tests**: Functions with Promise dependencies are skipped

**Pattern**:
- `async_func` returns a Promise (takes 30ms to resolve)
- `sync_func` depends on `async_func`
- Tests that `sync_func` does NOT execute while Promise is pending

**Why it matters**:
- Core invariant: functions should only execute when dependencies are resolved
- If `sync_func` executes with a Promise value, it gets the wrong type
- This was the root cause of performance issues (functions executing prematurely)

**Key assertions**:
```javascript
// Immediately after triggering, sync_func should NOT have executed
if (getSyncExecutionCount() !== 0) {
    throw new Error(`sync_func executed during async. Should be 0 (skipped).`);
}

// After async completes, sync_func should execute exactly once
if (getSyncExecutionCount() !== 1) {
    throw new Error(`sync_func should execute exactly once.`);
}
```

**Critical fix**: This test initially failed, revealing that Promises weren't being stored in values, so dependents couldn't detect pending state.

---

### 014_stale_accumulation.js
**What it tests**: Stale set doesn't accumulate with repeated changes

**Pattern**:
- Click simulation: change `ui_name` 3 times rapidly
- Each click triggers async fetch → sync transform
- Tracks stale set size over time

**Why it matters**:
- Original hypothesis: performance degradation from stale set growing unbounded
- Test proves this was NOT the problem (max size stays at 2)
- Rules out stale accumulation as root cause

**Key assertions**:
```javascript
// After all async completes, stale set should be empty
if (staleAfterClick3.length > 0) {
    throw new Error(`Stale set not empty after async completes`);
}

// Max stale size should be bounded (not accumulating)
// With 2 functions to execute, max should be ~2
if (maxSize > 5) {
    throw new Error(`Stale set grew too large (max ${maxSize})`);
}
```

**Result**: Max size = 2, stays bounded. Stale accumulation is NOT the problem.

---

## Root Cause Analysis

The integration tests revealed the **actual root cause** of performance issues:

### ❌ Original Problem
1. Functions were executing while dependencies were still Promises
2. Functions were executing while dependencies were still stale
3. Promises weren't stored in values, so dependents couldn't detect pending state

### ✅ Fixes Implemented

**Fix 1: Store Promises immediately** (`resolver.js:224`)
```javascript
if (result && typeof result.then === 'function') {
    // Store Promise so dependents can detect pending state
    this.values.set(name, result);

    // Then await it
    result.then(value => {
        this.values.set(name, value);
        // ... mark dependents stale and resolve
    });
}
```

**Fix 2: Skip if dependency is stale** (`resolver.js:174-176`)
```javascript
for (let dep of deps) {
    // Skip if dependency hasn't been computed yet
    if (this.stale.has(dep)) return false;
```

**Fix 3: Skip if dependency is a Promise** (`resolver.js:179-182`)
```javascript
    // Skip if dependency value is a Promise (async not yet resolved)
    const depValue = this.values.get(dep);
    if (depValue && typeof depValue.then === 'function') {
        return false;
    }
}
```

---

## Test Results Timeline

**Initial run** (before fixes):
- ❌ 011: Failed - TypeError (undefined.find)
- ✅ 012: Passed
- ❌ 013: **Failed - sync_func executed during async** (key finding!)
- ✅ 014: Passed (proved stale accumulation wasn't the issue)

**After Promise storage fix**:
- ❌ 011: Failed - dataset didn't fetch
- ✅ 012: Passed
- ✅ 013: **Now passes** (Promise detection working)
- ✅ 014: Passed

**After dependency graph fix** (011 was missing `chart_only` → `dataset_async` edge):
- ✅ 011: Passed
- ✅ 012: Passed
- ✅ 013: Passed
- ✅ 014: Passed

**Current status**: ✅ All 4 tests passing (100%)

---

## Lessons Learned

1. **Stale accumulation was a red herring** - Test 014 proved the stale set stays bounded
2. **Promise detection is critical** - Test 013 revealed functions were executing prematurely
3. **Integration tests > unit tests for async issues** - Real-world patterns exposed the bug
4. **Static analysis requires complete dependency graphs** - Test 011 needed explicit `chart_only` edge

---

## Future Tests

Consider adding tests for:
- Promise rejection handling
- Circular dependencies with async functions
- Subscription notifications during async resolution
- Multiple async functions completing in different orders
- Cancellation of pending async operations when dependencies change
