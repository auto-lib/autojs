# Search.svelte Analysis: The ui_name Refetch Problem

**Date**: 2026-01-03
**Issue**: Clicking on dataset in Search.svelte causes `Unknown datetime argument: null` error

## How Search.svelte Works

### User Interaction Flow

1. User types in search box → filters `$search_options`
2. User clicks on a dataset → `select_dataset(item)` is called
3. Function updates reactive state:

```javascript
function select_dataset(dataset) {
    let choices = get_choices_sorted(dataset, $all_product_datasets);
    const primary = choices.map(...).filter(d => d.is_primary);

    $ui_name = primary.length > 0 ? primary[0].nickname : choices[0].name;  // KEY LINE

    $datasetcomparisons = [];
    $preset = null;
    $ui_currency = null;
    $ui_frequency = null;
    $ui_startend = { start:-1, end:99999 };
}
```

**The key change**: `$ui_name` is set to the selected dataset's nickname (e.g., "norway_salmon_weekly")

## Original Design (With Runtime Tracking - v0.54)

### Data Pipeline Architecture

```
INITIAL LOAD (once):
  data_000_async → fetch('/titles')  [5805 items]
    ↓
  data_001_colors → assign colors
    ↓
  data_002_ensure_count → filter (quoteCount>2)
    ↓
  data → apply specie_filter if needed

SELECTING A DATASET:
  ui_name changes (from Search.svelte)
    ↓
  name → returns ui_name || url_name
    ↓
  pre_dataset → finds name in already-loaded data, fetches details
    ↓
  dataset → selects correct frequency variant
    ↓
  lines → processes dataset into chart data
```

**Key insight**: `data_000_async` runs ONCE. It fetches ALL titles. Subsequent dataset selections just look up from this cached data.

### Why It Worked With Runtime Tracking

v0.54 used **runtime dependency tracking** (Proxy-based):
- Dependencies only created for code paths that ACTUALLY execute
- `data_000_async` has conditional logic:
  ```javascript
  if ($.chart_only) {
      // This branch accesses $.url_name
      let url = `${base}/dataset/${$.url_name}`;
  } else {
      // This branch doesn't access url_name
      return await fetch_url(`${base}/titles`);
  }
  ```
- When `chart_only=false` (normal mode), runtime tracker never sees `$.url_name` access
- When `chart_only=true` (embedded charts), runtime tracker creates `data_000_async → url_name`
- No cycle in normal mode!

## What Broke With Static Analysis (blocks-kernel)

### Static Analysis Limitation

Static analysis (regex parsing of function.toString()) sees ALL code paths:
- Even though `$.url_name` is inside `if ($.chart_only)`, static analysis creates the dependency edge
- Result: `data_000_async → url_name` ALWAYS exists
- This creates cycle: `data → ... → data_000_async → url_name → name → data`

### Attempted Fix #1: Inline url_name Logic

To break the cycle, I inlined the url_name computation directly in data_000_async:

```javascript
if ($.chart_only) {
    let dataset_name = '';
    if ($.ui_name) {  // ← PROBLEM: Creates dependency on ui_name
        dataset_name = $.ui_name;
    } else {
        // Parse from URL...
    }
    let url = `${base}/dataset/${dataset_name}`;
    return await fetch_url(url);
}
```

**Result**:
- ✅ Broke the circular dependency (no longer depends on url_name)
- ❌ Created new problem: `data_000_async → ui_name`

### What Happens When User Clicks on Dataset

1. `$ui_name = "norway_salmon_weekly"` (Search.svelte:41)
2. Static analysis sees `data_000_async` depends on `ui_name`
3. Resolver marks `data_000_async` as stale and re-executes it
4. Since `chart_only=false`, it re-fetches `/titles` (5805 items)
5. This invalidates `data`, `data_001_colors`, `data_002_ensure_count`
6. Entire pipeline recomputes with temporarily null/stale data
7. `lines_06` tries to process data with null dates → **ERROR**

## The Core Problem: Mode-Dependent Dependencies

The fundamental issue is that `data_000_async` has **mode-dependent behavior**:

| Mode | What it fetches | Dependencies needed |
|------|----------------|---------------------|
| `chart_only=false` (normal) | `/titles` (all datasets) | None (or just base URL config) |
| `chart_only=true` (embedded) | `/dataset/{name}` (specific one) | `url_name` or `ui_name` |

**Static analysis cannot express**: "Depend on X only when condition Y is true"

## Possible Solutions

### Solution 1: Split data_000_async by Mode ⭐ RECOMMENDED

Create separate functions for each mode:

```javascript
// Never changes - fetches all titles once
data_000_async_titles: async ($) => {
    const base = /* ... */;
    return await fetch_url(`${base}/titles`);
},

// Re-fetches when ui_name changes - only used in chart_only mode
data_000_async_chart: async ($) => {
    const base = /* ... */;
    let dataset_name = $.ui_name || $.url_name || 'default';
    return await fetch_url(`${base}/dataset/${dataset_name}`);
},

// Router - selects which data source to use
data_000_async: ($) => {
    if ($.chart_only) return $.data_000_async_chart;
    else return $.data_000_async_titles;
}
```

**Pros**:
- Clean separation of concerns
- `data_000_async_titles` has NO dependencies, never re-runs
- `data_000_async_chart` can depend on `ui_name` safely
- Static analysis can handle this

**Cons**:
- Requires refactoring state structure
- Need to test both modes thoroughly

### Solution 2: Remove ui_name from data_000_async

Revert to depending ONLY on URL parameters, never on UI state:

```javascript
if ($.chart_only) {
    // Only use url_name (parsed from actual URL)
    // Never use ui_name (set by UI interactions)
    let dataset_name = $.url_name || 'default';
    return await fetch_url(`${base}/dataset/${dataset_name}`);
}
```

Then have Search.svelte update the URL when selecting:
```javascript
function select_dataset(dataset) {
    // Instead of just setting ui_name...
    $ui_name = primary[0].nickname;

    // Also update URL (which will trigger url_name to change)
    window.history.pushState("", "", `#/${primary[0].nickname}`);
}
```

**Pros**:
- Single source of truth (URL)
- Aligns with "URL as state" design pattern

**Cons**:
- Creates circular dependency again: `data_000_async → url_name → name → data`
- Need to break cycle elsewhere (remove name → data dependency)

### Solution 3: Make data_000_async Stateless

Don't make it depend on ANY dynamic state. Pass the dataset name as a parameter instead:

```javascript
// This is now just a helper function, not reactive
async function fetch_titles(base) {
    return await fetch_url(`${base}/titles`);
}

async function fetch_dataset(base, name) {
    return await fetch_url(`${base}/dataset/${name}`);
}

// Reactive wrapper that decides WHEN to fetch
data_000_async: async ($) => {
    const base = /* ... */;

    if ($.chart_only) {
        // But how do we know WHEN to refetch?
        // We'd need to depend on something...
    } else {
        // Fetch once on initial load
        if (!$._data_cache) {
            $._data_cache = await fetch_titles(base);
        }
        return $._data_cache;
    }
}
```

**Pros**:
- Explicit control over when fetches happen

**Cons**:
- Breaks reactive model
- Need manual cache invalidation
- Complicated state management

### Solution 4: Use Events Instead of Reactive Dependencies

When Search selects a dataset, fire a custom event instead of setting `ui_name`:

```javascript
// Search.svelte
function select_dataset(dataset) {
    // Fire event instead of setting reactive state
    window.dispatchEvent(new CustomEvent('dataset-selected', {
        detail: { nickname: primary[0].nickname }
    }));
}

// In state setup
window.addEventListener('dataset-selected', (e) => {
    $ui_name = e.detail.nickname;
    // Manually trigger only the parts that need to update
    // Don't refetch data_000_async
});
```

**Pros**:
- Complete control over propagation

**Cons**:
- Breaks reactive model completely
- Manual state management
- Hard to debug
- Not idiomatic Svelte/auto.js

### Solution 5: Accept the Conditional Dependency (Runtime Override)

Add a mechanism in blocks kernel to MANUALLY specify "ignore this dependency edge":

```javascript
data_000_async: async ($) => {
    if ($.chart_only) {
        // Tell kernel: "Yes I access ui_name, but don't create dependency"
        let dataset_name = $.ignoreeDependency(() => $.ui_name) || 'default';
        return await fetch_url(`${base}/dataset/${dataset_name}`);
    }
}
```

**Pros**:
- Keeps existing code structure
- Handles mode-dependent dependencies

**Cons**:
- Adds complexity to kernel
- Easy to misuse
- Defeats purpose of static analysis

## Root Cause: Architectural Mismatch

The deeper issue is that the prices-app architecture was designed for **runtime dependency tracking** (v0.54), which naturally handles:
- Conditional dependencies
- Mode-dependent behavior
- UI state vs URL state separation

The **blocks kernel** uses **static analysis** for simplicity, which cannot express:
- "Depend on X only when Y is true"
- Different dependency sets for different runtime modes

This is a fundamental tradeoff documented in `/kernels/PRODUCTION-READINESS.md`:
- Runtime tracking: Complex kernel, flexible app code
- Static analysis: Simple kernel, stricter app code requirements

## Recommended Path Forward

**Short-term** (minimal changes):
- Implement **Solution 1** (Split data_000_async by mode)
- Keeps both modes working correctly
- Clean separation, easy to test

**Long-term** (architectural):
- Consider whether embedded mode (`chart_only`) should be a separate app/component
- Or use MCP/iframe for embedded charts with separate state management
- This would eliminate the mode-dependent behavior entirely

## Testing Requirements

Any solution MUST test:
1. ✅ Initial load (normal mode) - fetches /titles
2. ✅ Selecting dataset from Search - doesn't refetch /titles
3. ✅ Changing ui_name multiple times - smooth transitions
4. ✅ Embedded mode (chart_only=true) - fetches specific dataset
5. ✅ Embedded mode switching datasets - refetches correctly
6. ✅ No circular dependency errors in either mode
7. ✅ No null/undefined dates in lines processing
