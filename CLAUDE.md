# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Auto.js is a JavaScript reactivity library with a core principle: **reactivity without side effects**. Functions can READ state but never WRITE state. This distinguishes it from other reactive libraries like MobX or RxJS.

```js
let $ = auto({
    data: null,
    count: ($) => $.data ? $.data.length : 0,  // dynamic - computed from other values
    msg: ($) => $.data + " has " + $.count + " items"
});
$.data = [1,2,3];  // static - set from outside
console.log($.msg);  // "1,2,3 has 3 items"
```

## Commands

### Running Tests
```bash
cd tests && node runall.js           # Run all tests
cd tests && node runall.js 005_dependent_function.js  # Run single test
```

### Testing with Deno (ES6)
```bash
deno run test.js
```

## Architecture

### Core Files
- `auto-es6.js` - Main library (ES6 module export)
- `auto-commonjs.js` - CommonJS version for Node
- `auto-no-export.js` - Browser version (no export)

All three are generated from `docs/devlog/src/0XX_*.js` (the latest numbered file) by `tests/runall.js`.

### Making Changes to the Library
**Important**: Never edit `auto-es6.js` directly. Changes are made by:
1. Find the latest numbered file in `docs/devlog/src/` (e.g., `051_deep_equal.js`)
2. Copy it to a new file with incremented number (e.g., `052_new_feature.js`)
3. Make your changes in the new file
4. Run `cd tests && node runall.js` to generate the auto-*.js files and run tests

The test runner automatically copies the highest-numbered source file to the root auto files and updates the version in package.json.

### 8-Phase Propagation Cycle
When a value changes, propagation occurs in these phases:
1. **Invalidate** - Find all affected dependents recursively
2. **Topological Sort** - Order by dependencies
3. **Capture Old Values** - For change detection
4. **Clear Values** - Mark for recomputation
5. **Recompute** - Execute functions in order
6. **Detect Changes** - Compare old vs new
7. **Build Trace** - Record transaction metadata
8. **Notify Subscriptions** - Run callbacks

### Key Internal State
```js
$._  // Access internal state
// Contains: { fn, deps, value, subs, fatal }
```

### Test Structure
Tests in `tests/files/` validate both behavior AND internal state:
```js
export default {
    obj: { data: null, count: ($) => $.data?.length ?? 0 },
    fn: ($) => { $.data = [1,2,3] },
    _: {
        fn: ['count'],
        deps: { count: { data: true } },
        value: { data: [1,2,3], count: 3 },
        fatal: {}
    }
}
```

### Kernels Directory
`kernels/` contains experimental alternative implementations (signal-based, hook-based, etc.) that must pass the same test suite. These explore different architectural approaches for a potential 2.0 rewrite.

## Key Invariants

1. **No side effects**: Functions never write to state - attempting this triggers `fail()`
2. **No circular dependencies**: Detected at runtime via call stack
3. **Topological ordering**: Dependencies always compute before dependents
4. **Single source of truth**: Static vars set externally, dynamic vars only by their functions

## Options
```js
auto(obj, {
    trace: (t) => {},        // Transaction callback
    watch: { varName: true }, // Debug logging for specific vars
    tag: 'my-app',           // Log prefix
    deep_log: false,         // Verbose logging
    auto_batch: true,        // Auto-batch rapid sets (default: true)
    deep_equal: true         // Use deep equality for objects (default: true)
});
```
