# Search Fix Implementation Summary

**Date**: 2026-01-03
**Issue**: Clicking on dataset in Search.svelte causes app to refetch all data and crash with null dates
**Solution**: Split `data_000_async` into mode-specific functions

## Changes Made

### 1. Split data_000_async Into Three Functions

**File**: `/Users/karl/prices-app/src/state/data.js`

```javascript
// OLD (single function with mode-dependent behavior):
data_000_async: async $ => {
    if ($.chart_only) {
        // Accesses $.ui_name → creates dependency
        let dataset_name = $.ui_name || /* parse from URL */;
        return await fetch_url(`${base}/dataset/${dataset_name}`);
    } else {
        return await fetch_url(`${base}/titles`);  // Fetches all titles
    }
}

// NEW (split by mode):

// 1. Titles fetcher - NO DEPENDENCIES on UI state
data_000_async_titles: async $ => {
    if ($.fixed_data) return $.fixed_data;
    const base = /* ... */;
    return await fetch_url(`${base}/titles`);
},

// 2. Chart fetcher - depends on URL params (for embedded mode)
data_000_async_chart: async $ => {
    const base = /* ... */;
    let dataset_name = /* parse from $.original_url */;
    return await fetch_url(`${base}/dataset/${dataset_name}`);
},

// 3. Router - selects which function based on mode
data_000_async: $ => {
    if ($.chart_only) return $.data_000_async_chart;
    else return $.data_000_async_titles;
}
```

### 2. How It Works

**Dependency Graph Before**:
```
data_000_async
  ├─→ ui_name (from inlined code)
  ├─→ original_url
  ├─→ presets
  └─→ chart_only
```

When `ui_name` changes → `data_000_async` re-runs → refetches `/titles` → cascade of updates → null dates

**Dependency Graph After**:
```
data_000_async
  └─→ chart_only (to choose which function)

data_000_async_titles
  └─→ fixed_data (if set)

data_000_async_chart
  ├─→ original_url
  ├─→ presets
  ├─→ wholesale_chart
  └─→ specie_filter
```

When `ui_name` changes:
- `data_000_async` checks `chart_only` (unchanged)
- Returns `data_000_async_titles` (same as before)
- `data_000_async_titles` has no dependency on `ui_name`
- **Does NOT re-execute** ✅
- Only `name` → `pre_dataset` → `dataset` chain updates (as intended)

## Why This Works

### Static Analysis Compatibility

The blocks kernel uses static analysis which sees ALL code paths. The problem was:

```javascript
// Even though inside if block, static analysis sees the $.ui_name access
if ($.chart_only) {
    if ($.ui_name) { /* ... */ }
}
```

Creates edge: `data_000_async → ui_name`

By splitting into separate functions:
- `data_000_async_titles` NEVER accesses `ui_name` → no edge created
- `data_000_async_chart` NEVER used in normal mode → its dependencies don't matter
- Router function (`data_000_async`) just reads `chart_only` → minimal dependency

### Mode Separation

| Mode | Uses | Dependencies |
|------|------|-------------|
| Normal (`chart_only=false`) | `data_000_async_titles` | None (except fixed_data) |
| Embedded (`chart_only=true`) | `data_000_async_chart` | URL params, presets |

Each mode has a dedicated function with appropriate dependencies.

## Testing Checklist

- [x] Initial load (normal mode) - app loads without circular dependency
- [x] No console flooding (circular dependency logged once)
- [ ] Select dataset from Search.svelte - should NOT refetch /titles
- [ ] Change dataset multiple times - smooth transitions
- [ ] No null date errors in lines processing
- [ ] Embedded mode (chart_only=true) works
- [ ] Embedded mode dataset switching works

## Related Documentation

- `/kernels/blocks/SEARCH-ANALYSIS.md` - Deep dive into the problem
- `/kernels/PRODUCTION-READINESS.md` - Static analysis vs runtime tracking tradeoffs
- `/Users/karl/prices-app/src/components/shadley/Search.svelte` - User interaction code

## Architectural Insight

This fix highlights a fundamental difference between runtime tracking and static analysis:

**Runtime Tracking (v0.54)**:
- Handles conditional dependencies naturally
- More complex kernel implementation
- Flexible app code

**Static Analysis (blocks kernel)**:
- Cannot express "depend on X only when Y is true"
- Simpler kernel implementation
- Requires app code refactoring for mode-dependent behavior

**Solution**: Split mode-dependent functions into separate functions. Static analysis handles this perfectly.
