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

### Kernels Directory - Architectural Exploration
`kernels/` contains experimental alternative implementations exploring different architectural approaches for a potential 2.0 rewrite.

**Philosophy**: We're in the exploration phase - testing ideas, not committing to any single approach yet. The test suite is our specification; any kernel that passes it is a valid implementation.

**The Contract**: All kernels must pass the **75+ test suite** in `/tests/files/`. Tests validate both behavior AND internal state (`$._`), so kernels need either:
1. Compatible internal structure (fn, deps, value, subs, fatal), OR
2. **Adapter/mapper layer** that provides `$._` compatibility (RECOMMENDED)

**Status Tracking**: See `/docs/status/KERNELS.md` for current test pass rates and development status of each kernel.

**Active Kernels**:
- **graph-first** (`/kernels/graph-first/`) - Immutable graph structure approach. Most recent activity.
- **channel** (`/kernels/channel/`) - Signal-based message queue. Passes ~15/75 tests (20%). Minimal 65-line core.
- **auto4** (`/kernels/auto4/`) - Chart-centric design for visualization apps. Design phase.
- **auto2/auto3** - Earlier explorations, historical reference.

**Working with Kernels**:
```bash
# Run tests for a specific kernel (if has own runner)
cd kernels/channel && node run.js

# Run full test suite (requires $._  compatibility layer)
cd tests && node runall.js

# Update status dashboard when test pass rates change
# Edit: /docs/status/KERNELS.md
```

**Key Resources**:
- `/kernels/README.md` - Philosophy & overview of all 8+ kernel approaches
- `/kernels/COMPARISON.md` - Detailed feature matrix & evaluation criteria
- `/docs/status/KERNELS.md` - Current test pass rates & development status

## Key Invariants

1. **No side effects**: Functions never write to state - attempting this triggers `fail()`
2. **No circular dependencies**: Detected at runtime via call stack
3. **Topological ordering**: Dependencies always compute before dependents
4. **Single source of truth**: Static vars set externally, dynamic vars only by their functions

## Options
```js
auto(obj, {
    trace: (t) => {},                // Transaction callback
    watch: { varName: true },         // Debug logging for specific vars
    tag: 'my-app',                    // Log prefix
    deep_log: false,                  // Verbose logging
    auto_batch: true,                 // Auto-batch rapid sets (default: true)
    deep_equal: true,                 // Use deep equality for objects (default: true)

    // Excessive calls detection (for catching infinite loops)
    max_calls_per_second: 10,         // Threshold for excessive calls (default: 10)
    call_rate_grace_period: 3000,     // Grace period after boot in ms (default: 3000)
    excessive_calls_exclude: {        // Variables to exclude from checks
        mousei: true,                  // e.g., mouse position
        scrollY: true                  // e.g., scroll position
    }
});
```

## Documentation Navigation

This repository contains **97+ markdown files** documenting concepts, architecture, development history, and explorations. Here's where to find things:

### Current Structure (97 files, 12K+ lines)

**Production Code**:
- `/auto-es6.js`, `/auto-commonjs.js`, `/auto-no-export.js` - Generated distribution files (DO NOT EDIT)
- `/docs/devlog/src/` - **Source of truth** (54 numbered versions, latest: 054_circular_reference_protection.js)
- `/docs/devlog/readme.md` - Explains the devlog workflow

**Core Documentation**:
- `/readme.md` - Main project README
- `/docs/ARCHITECTURE.md` - Complete system documentation
- `/docs/internals.md` - Internal implementation details
- `/docs/syntax.md` - API reference

**Understanding Auto.js**:
- `/docs/discussion/what-is-reactivity.md` - Core concept
- `/docs/discussion/reactivity-is-a-game-changer.md` - Vision
- `/docs/discussion/auto-architecture-observations.md` - Insights
- `/docs/ok-but-what-is-auto.md` - Beginner explanation

**Development & Planning**:
- `/docs/status/KERNELS.md` - Kernel test progress dashboard
- `/docs/PROJECT_SUMMARY.md` - Current development phases
- `/docs/STRUCTURE_ANALYSIS.md` - Codebase organization
- `/docs/todo.md` - Task tracking

**Experimental/Ideas**:
- `/docs/ideas/` - Future features (dom-as-state, etc.)
- `/docs/rambling/` - Exploratory notes
- `/kernels/*/` - Each kernel has self-contained docs

**User Guides**:
- `/docs/guide/building-objects-reactively.md` - Tutorial
- `/docs/manual/special-functions.md` - Advanced features
- `/docs/html.md` - HTML integration
- `/docs/npm-and-node.md` - Package/deployment

### Proposed Reorganization (In Progress)

The documentation will be reorganized into:

```
/docs/
├── user/              # For library users (getting-started, API, examples)
├── concepts/          # Understanding reactivity & philosophy
├── development/       # For maintainers (architecture, internals, devlog)
├── experiments/       # Research, ideas, discussions, analysis
└── status/            # Project tracking (KERNELS.md, ROADMAP.md, DECISIONS.md)

/kernels/              # Self-contained kernel experiments
```

**When helping with documentation**:
- Check `/docs/status/KERNELS.md` for kernel progress before suggesting architecture changes
- Reference `/docs/ARCHITECTURE.md` for understanding the current production system
- Look at `/docs/devlog/src/054_*.js` (latest) to see actual implementation
- Don't edit auto-*.js files directly - they're auto-generated

## Development Workflow

### Iterative Kernel Development Process

The project is in an **exploration phase** - experimenting with different architectures without committing to one yet.

**Typical workflow**:
1. **Idea** - New architectural approach identified
2. **Kernel creation** - Create `/kernels/new-approach/` directory
3. **Documentation** - Write README.md explaining philosophy
4. **Prototype** - Implement core features
5. **Testing** - Run against test suite, track pass rate in `/docs/status/KERNELS.md`
6. **Iteration** - Refine based on test failures
7. **Compatibility** - Add `$._` adapter layer if needed
8. **Evaluation** - Compare against other kernels using criteria in `/kernels/COMPARISON.md`

**Goal**: Find architecture(s) that:
- Pass all 75+ tests
- Have minimal, understandable core
- Enable easy feature extension
- Maintain clarity and debuggability

**Important**: Each kernel is independent. Don't assume one approach is "the winner" - we're exploring options.

### Making Changes to Production Library

**For v0.54 (current production)**:
1. Find latest in `/docs/devlog/src/` (currently 054_circular_reference_protection.js)
2. Copy to new file with incremented number (e.g., 055_new_feature.js)
3. Make changes in the new file
4. Run `cd tests && node runall.js` to generate auto-*.js and run tests
5. Test runner auto-updates version in package.json

**For kernel experiments**:
1. Work directly in `/kernels/your-kernel/` directory
2. Each kernel is self-contained
3. Update `/docs/status/KERNELS.md` when test pass rates change
4. Document design decisions in kernel's own README

## Current Development Focus

**Primary**: Cleaning up repository structure, organizing documentation, tracking kernel progress
**Active Kernels**: graph-first (most recent), channel (working prototype)
**Philosophy**: Exploration phase - multiple valid approaches being tested
