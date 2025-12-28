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

All three are generated from `docs/development/devlog/src/0XX_*.js` (the latest numbered file) by `tests/runall.js`.

### Making Changes to the Library
**Important**: Never edit `auto-es6.js` directly. Changes are made by:
1. Find the latest numbered file in `docs/development/devlog/src/` (e.g., `051_deep_equal.js`)
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

**Test Categories**: See `/docs/status/TEST-CATEGORIES.md` for complete categorization:
- ✅ Core Behavior (~30) - Essential for all kernels
- 🟡 Implementation (~15) - v0.54 internals, can use adapter
- 🟢 Performance (~20) - Batching, change detection
- 🟣 Debugging (~3) - Root cause, tracing
- 🟠 Experimental (~1) - Recording

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
- `/docs/status/TEST-CATEGORIES.md` - Test categorization (essential vs optional)

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

This repository contains **40+ markdown files** organized by audience and purpose. Documentation was reorganized on 2025-12-26 for clarity.

### Structure

```
/docs/
├── user/              # For people USING auto.js (6 files)
├── concepts/          # Understanding reactivity & philosophy (5 files)
├── development/       # For maintainers & contributors (7 files + devlog)
├── experiments/       # Research, exploration, analysis (ideas, notes, archive)
└── status/            # Project tracking (KERNELS.md, STRUCTURE.md)
```

**Full structure reference**: `/docs/status/STRUCTURE.md`

### Quick Reference

**For users learning auto.js**:
- Start: `/docs/user/getting-started.md`
- Tutorial: `/docs/user/tutorial.md`
- API: `/docs/user/api-reference.md`
- Advanced: `/docs/user/advanced-features.md`

**Understanding reactivity concepts**:
- What: `/docs/concepts/what-is-reactivity.md`
- Why: `/docs/concepts/why-reactivity-matters.md`
- How: `/docs/concepts/how-auto-works.md`

**For contributors/maintainers**:
- Architecture: `/docs/development/architecture.md`
- Internals: `/docs/development/internals.md`
- Source: `/docs/development/devlog/src/054_circular_reference_protection.js` (latest)

**Project tracking**:
- Kernels: `/docs/status/KERNELS.md` - Test progress dashboard
- Tests: `/docs/status/TEST-CATEGORIES.md` - Test categorization & guidance
- Structure: `/docs/status/STRUCTURE.md` - Documentation organization
- Todo: `/docs/development/todo.md` - Task tracking

**Experimental work**:
- Ideas: `/docs/experiments/ideas/`
- Notes: `/docs/experiments/notes/`
- Analysis: `/docs/experiments/analysis/`

**When helping with documentation**:
- Check `/docs/status/KERNELS.md` for kernel progress before suggesting architecture changes
- Reference `/docs/development/architecture.md` for understanding the current production system
- Look at `/docs/development/devlog/src/054_*.js` (latest) to see actual implementation
- Don't edit auto-*.js files directly - they're auto-generated
- See `/docs/status/STRUCTURE.md` for complete file listing and navigation guide

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
1. Find latest in `/docs/development/devlog/src/` (currently 054_circular_reference_protection.js)
2. Copy to new file with incremented number (e.g., 055_new_feature.js)
3. Make changes in the new file
4. Run `cd tests && node runall.js` to generate auto-*.js and run tests
5. Test runner auto-updates version in package.json

**For kernel experiments**:
1. Work directly in `/kernels/your-kernel/` directory
2. Each kernel is self-contained
3. Update `/docs/status/KERNELS.md` when test pass rates change
4. Document design decisions in kernel's own README

## Purpose of the Rewrite

The kernel exploration is driven by **real pain points** in the current v0.54 implementation. Understanding these issues is critical for evaluating which kernels solve the right problems.

### Core Issues Being Addressed

**1. Performance Problems**
- **Issue**: Propagation can be inefficient, unnecessary recomputations
- **Solutions explored**:
  - Auto-batching (v0.47+) - Group rapid changes into single propagation
  - Deep equality checks (v0.51+) - Skip propagation if values haven't actually changed
- **Kernel impact**: Kernels must handle batching and change detection efficiently

**2. Simplicity / Complexity**
- **Issue**: Core implementation has grown complex (941 lines, 8 phases)
- **Goal**: Minimal, understandable core that's easy to reason about
- **Solutions explored**:
  - Signal-based kernel (channel) - 65-line core, features as handlers
  - Graph-first kernel - Separate graph topology from execution
- **Kernel impact**: Core size and clarity are key evaluation criteria

**3. Verifying Changes (Debugging)**
- **Issue**: Hard to understand why values changed, debug complex propagations
- **Solutions explored**:
  - Trigger history (v0.52+) - Track what triggered each computation
  - Root cause analysis (v0.53+) - Find original cause of change cascade
  - Recording system (v0.66+, recorder.cjs) - Record/replay state changes
- **Kernel impact**: Kernels need trace/debug infrastructure or adapter

**4. Simplifying User Code**
- **Issue**: Users need cleaner abstractions for common patterns
- **Solutions explored**:
  - Splitting into parts/boxes/channels - Modular reactive components
  - Chart objects (auto4 kernel) - Domain-specific abstractions
- **Kernel impact**: API ergonomics and composition patterns matter

### The Path Forward

The rewrite effort is moving from **exploration** to **purposeful iteration**. Focus areas:

**1. Test Clarity**
- **Goal**: Understand what each of the 75+ tests is actually validating
- **Reference**: `/docs/status/TEST-CATEGORIES.md` - Complete test categorization
- **Categories**:
  - ✅ Core Behavior (~30 tests) - Essential, all kernels must pass
  - 🟡 Implementation Details (~15 tests) - v0.54 internals, kernels can use adapter
  - 🟢 Performance Features (~20 tests) - Batching, change detection (v0.47+, v0.51+)
  - 🟣 Debugging Features (~3 tests) - Root cause, excessive calls (v0.52+, v0.53+)
  - 🟠 Experimental (~1 test) - Recording (v0.66+)
- **Action**: See TEST-CATEGORIES.md for detailed breakdown and guidance

**2. New Feature Testing**
- **Recording**: How to test record/replay? What guarantees does it need?
- **Performance features**: How to test batching, deep equality work correctly?
- **Debug features**: How to test trigger history, root cause analysis?
- **Action**: Write test specs for each feature, determine if they belong in core test suite

**3. Testing Vision: Diff-Based Change Analysis**

A new testing approach is emerging that treats tests as **transformation pipelines** with visual diff analysis:

**The Four-Part Structure**:
1. **URL** - External data source or API endpoint
2. **Data** - Input data (static or from URL)
3. **Code** - Reactive computation graph (auto.js code)
4. **Chart** - Output visualization or data structure

**The Testing Flow**:
```
URL + Data → Code → Chart₁
           ↓ (modify code)
URL + Data → Code' → Chart₂
           ↓ (analyze)
        Chart₁ ↔ Chart₂ (diff)
```

**Key Concepts**:
- **Graph Invariant**: Same input → same output (deterministic computation)
- **Diff-Driven Debugging**: Work backwards from chart diffs or forwards through code changes
- **Block Composition**: Split code into modular blocks/boxes with clear boundaries
- **Cross-Block Graphs**: Dependency graphs that span multiple blocks/modules
- **Signals as Connectors**: Use signals to wire blocks together and pass data between them

**Questions to Explore**:
- How to split reactive code into composable blocks?
- How to track which block's code/output changed?
- How to represent graphs that span block boundaries?
- What role do signals play in connecting blocks vs traditional reactive dependencies?
- How to visualize diffs at the graph level vs the data level?

**Kernel Direction**: See `/kernels/blocks/` for exploration of this approach.

**Real-World Context**: The blocks kernel is designed based on actual usage patterns in production charting apps:
- `/Users/karl/prices-app` - Commodity price charting
- `/Users/karl/trade-portal-app-v2` - Trade flow visualization

See `/kernels/blocks/REAL-WORLD-USAGE.md` for detailed analysis of how auto.js is used in these apps, including:
- URL as state encoding (chart configuration)
- Data as external sources (API endpoints, JSON files)
- Reactive pipelines (URL → state → data → transforms → chart)
- Component composition patterns
- Bidirectional URL ⟷ State sync

**4. Kernel Evaluation Criteria**
When evaluating kernels, ask:
- Does it solve the **performance** issues? (batching, change detection)
- Is it **simpler** than v0.54? (core size, understandability)
- Does it support **debugging** features? (tracing, recording)
- Does it enable **user code simplicity**? (good abstractions, composability)
- Does it pass all **essential tests**? (core behavior, not just v0.54 internals)

### Current Development Focus

**Immediate**:
- Gaining clarity on existing tests - categorizing by purpose
- Understanding which tests are essential vs implementation-specific
- Documenting new features (recording, tracing) and their test requirements
- Exploring diff-based testing and block composition (see `/kernels/blocks/`)

**Active Kernels**:
- **blocks** (newest) - Diff-driven testing, modular blocks, cross-block graphs, signals as connectors
- **graph-first** - Explores simplicity through immutable graph structure
- **channel** - Explores simplicity through 65-line signal core

**Philosophy**:
- Moving from exploration to purposeful iteration
- Each kernel must solve real pain points, not just pass tests
- Test suite needs clarity - what's core behavior vs v0.54 implementation details
- Testing approach should enable understanding changes (diff-driven debugging)
