# Kernel Development Status

**Last Updated**: 2025-12-26

This document tracks the progress of experimental kernel implementations. All kernels are attempting to pass the **75+ test suite** in `/tests/files/` while exploring different architectural approaches.

## Test Suite Overview

**Total Tests**: 75+ tests (001-066 with variations)
**Test Categories**:
- Core functionality (001-009)
- Circular dependency detection (010-014)
- Subscriptions (015-021)
- Side effects & safety (018-030)
- Advanced features (022-050)
- Modern features (050-066)

**Compatibility Requirement**: New kernels must pass all tests. Tests check both behavior AND internal state (`$._`), so kernels need either:
1. Compatible internal structure (fn, deps, value, subs, fatal), OR
2. Adapter/mapper layer that provides `$._` compatibility

---

## Active Kernels

### 🟢 graph-first
**Status**: Active Development
**Test Progress**: *Not yet tracked* (24 files updated 2025-12-26)
**Philosophy**: Graph structure as primary concern, not propagation. Explicit, immutable graph structure instead of implicit runtime discovery.

**Architecture**:
```
ReactiveGraph (immutable) → GraphState (mutable values) → Auto API (thin wrapper)
```

**Key Insight**: Separate graph topology from execution strategy. Graph is defined once, values propagate through it.

**Location**: `/kernels/graph-first/`
**Documentation**:
- `README.md` - Overview & philosophy
- `INDEX.md` - Detailed reference
- `ARCHITECTURE.md` - Technical architecture
- `COMPARISON.md` - vs other approaches
- `DYNAMIC-DEPENDENCIES.md` - Handling conditional deps

**Key Files**: `src/` directory with implementations

**Next Steps**:
- [ ] Run against test suite
- [ ] Implement `$._` compatibility layer
- [ ] Track test pass rate

---

### 🟡 channel (Signal-Based)
**Status**: Working Prototype
**Test Progress**: ~15/75 tests passing (20%)
**Philosophy**: Message queue system where features are signal handlers. Core is a 65-line signal queue dispatcher.

**Architecture**:
```
Signal Queue → Dispatch → Signal Handlers (features)
```

**Key Insight**: Features as loosely-coupled signal processors rather than monolithic core.

**Location**: `/kernels/channel/`
**Documentation**:
- `README.md` - Overview
- `BLOCKS.md`, `EXCHANGE.md`, `STATUS.md` - Design docs
- `rants/` - Exploration notes (callbag.md, etc.)

**Key Files**:
- `signal.js` - Core queue/dispatch (65 lines)
- `auto.js` - Signal handlers (155 lines)
- `run.js` - Test runner

**Strengths**: Extremely minimal core, clear separation of concerns
**Challenges**: Test compatibility, performance overhead of queue

**Next Steps**:
- [ ] Implement remaining features to pass more tests
- [ ] Add `$._` compatibility layer
- [ ] Optimize signal dispatch performance

---

### 🔵 auto4 (Chart-Centric)
**Status**: Design + Partial Implementation
**Test Progress**: Not yet tested
**Philosophy**: Chart object as central abstraction. Designed for visualization/price apps.

**Architecture**:
```
Kernel → Graph → Block → Tracer (from auto3) → Chart Layer
```

**Key Insight**: Domain-specific abstraction (Chart) on top of reactive foundation.

**Location**: `/kernels/auto4/`
**Documentation**:
- `ARCHITECTURE.md` - Technical details
- `APPS-ANALYSIS.md` - Requirements analysis
- `CHART-OBJECT.md` - Chart abstraction
- `MIGRATION.md` - Migration path
- `TESTS-PLAN.md` - Testing strategy
- `SESSION-NOTES.md` - Development notes

**Key Files**: `src/` directory with kernel, graph, block, tracer, auto, chart.js
**Tests**: 10 dedicated tests (001-010)

**Next Steps**:
- [ ] Complete implementation
- [ ] Run against full test suite
- [ ] Evaluate if chart-centric approach is needed in core

---

## Earlier Explorations

### 🔵 auto3 (Block-Based)
**Status**: Historical
**Philosophy**: Block-based architecture with separate kernel, graph, block components

**Location**: `/kernels/auto3/`
**Key Learnings**: Led to tracer.js, influenced auto4 design

---

### 🔵 auto2
**Status**: Historical
**Philosophy**: Early kernel/graph separation experiment

**Location**: `/kernels/auto2/`
**Key Files**: `discussion.md`, prototype implementations

---

## Proposed Kernels (Minimal/No Code)

### hooks/
**Philosophy**: Explicit lifecycle hooks (like Webpack/WordPress)

### middleware/
**Philosophy**: Composable middleware chain

### graph/
**Philosophy**: Separate graph structure from execution strategy
*(Note: graph-first is the active implementation of this idea)*

---

## Kernel Comparison Matrix

| Kernel | Tests Passing | Core Size | Decoupling | Status |
|--------|--------------|-----------|------------|--------|
| **graph-first** | TBD | TBD | High | Active Dev |
| **channel** | ~15/75 (20%) | 65 lines | Very High | Prototype |
| **auto4** | Not tested | Medium | Medium | Design Phase |
| **auto3** | N/A | Medium | Medium | Historical |
| **auto2** | N/A | Small | Low | Historical |

---

## Testing Strategy

### Phase 1: Behavior Tests
Run against basic functionality tests (001-009) to validate core reactivity.

### Phase 2: Advanced Features
Subscriptions, circular detection, async support (010-030).

### Phase 3: Modern Features
Batching, deep equality, trigger history, root cause analysis (031-066).

### Phase 4: Compatibility Layer
Implement `$._` adapter to provide:
- `$._fn` - List of computed variables
- `$._deps` - Dependency map
- `$._value` - Current values
- `$._subs` - Subscription map
- `$._fatal` - Error states

---

## How to Run Tests for a Kernel

```bash
# From kernel directory (if has own test runner)
cd kernels/channel
node run.js

# Or using main test suite (requires compatibility layer)
cd tests
node runall.js

# Single test
cd tests
node runall.js 005_dependent_function.js
```

---

## Evaluation Criteria

When a kernel reaches maturity, evaluate on:
1. **Test Coverage**: Does it pass all 75+ tests?
2. **Core Size**: How minimal is the core?
3. **Clarity**: Is the code easy to understand?
4. **Performance**: How does it compare to v0.54?
5. **Extensibility**: How easy to add new features?
6. **Compatibility**: Clean `$._` adapter or native support?

---

## Current Focus

**Primary**: `graph-first` kernel - most recent activity, comprehensive docs
**Secondary**: `channel` kernel - promising minimal core, needs compatibility work
**Research**: `auto4` - evaluating domain-specific abstractions

**Philosophy**: We're in the **exploration phase** - testing ideas, not committing to any single approach yet. The test suite is our specification; any kernel that passes it is a valid implementation.

---

## Resources

- **Test Suite**: `/tests/files/` - 75+ test cases
- **Test Runner**: `/tests/runall.js` - Main test orchestration
- **Kernel Philosophy**: `/kernels/README.md` - Overview of all approaches
- **Kernel Comparison**: `/kernels/COMPARISON.md` - Detailed comparison matrix
- **Current Production**: `/docs/devlog/src/054_circular_reference_protection.js` - Latest v0.54

---

## Notes for Contributors

1. **Don't edit auto-*.js directly** - They're generated from `/docs/devlog/src/`
2. **Tests are the spec** - If it passes tests, it's valid
3. **Each kernel is independent** - Self-contained in its own directory
4. **Compatibility layer is OK** - Don't need to match internal structure exactly
5. **Document everything** - Each kernel should have comprehensive docs
6. **Track progress** - Update this file when test pass rates change
