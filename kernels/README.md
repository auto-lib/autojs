# Kernel Explorations

This directory contains **alternative implementations** of auto.js - different architectural approaches that all pass the same test suite.

## Philosophy

The original auto.js was built incrementally over 49 versions. Each new feature (async, batching, change detection, subscriptions) required modifying core code. The propagation function became larger and more entangled.

**Goal**: Split auto.js into:
1. **A minimal, frozen kernel** - the irreducible core that never changes
2. **Pluggable features** - everything else as extensions/plugins/handlers

Each kernel in this directory represents a **completely different approach** to achieving this split.

## The Contract: Test Suite as Specification

All kernels must pass the existing test suite in `/tests/files/`. The tests validate:
- External API behavior
- Internal state structure (fn, deps, value, subs, fatal)
- Edge cases (circular dependencies, async, batching, etc.)

If a kernel passes all tests, it's a valid implementation.

## Running Tests

Each kernel has its own test runner:

```bash
# Test the channel kernel
cd kernels/channel
node run.js

# Test another kernel
cd kernels/hooks
node run.js
```

## Current Kernels

### 1. Signal-Based (`/channel`)
**Core primitive**: Messages (signals) that flow through a queue

**Architecture**:
- Two types of signal handlers:
  - `delayed`: Queued for batch processing (state, run, set, export)
  - `immediate`: Processed synchronously (get, log)
- Features are signal handlers, not inline code
- Queue processes signals until empty

**Key insight**: Decouples features. Adding async doesn't modify core - it's just a signal handler.

**Files**:
- `signal.js` - Core queue/dispatch system (~65 lines)
- `auto.js` - Auto-specific signal handlers (~155 lines)

---

### 2. Hook-Based (`/hooks`) [PROPOSED]
**Core primitive**: Explicit hooks at defined phases

**Architecture**:
- Core defines hook points: `before_set`, `after_compute`, `before_propagate`
- Plugins register callbacks at hooks
- Core is ~100 lines, never changes
- Each feature is a plugin

**Key insight**: Temporal decoupling. Plugins hook into lifecycle events.

---

### 3. Middleware (`/middleware`) [PROPOSED]
**Core primitive**: Composable middleware chain (like Express/Koa)

**Architecture**:
- Every operation flows through middleware
- Each middleware can: observe, transform, defer, skip
- Core is just a dispatch mechanism
- Features are middleware

**Key insight**: Structural decoupling. Execution is a pipeline.

---

### 4. Actor-Based (`/actors`) [PROPOSED]
**Core primitive**: Each value is an actor with a mailbox

**Architecture**:
- Values send messages to each other
- No central propagation - emergent behavior
- Actors handle: get, set, subscribe, compute
- Dependency graph emerges from message passing

**Key insight**: No central coordinator. Pure message passing.

---

### 5. Graph-Based (`/graph`) [PROPOSED]
**Core primitive**: Separate graph structure from execution strategy

**Architecture**:
- Graph is pure data: `{ nodes: {...}, edges: {...} }`
- Executor is pure behavior: `{ when: 'batched', how: 'async' }`
- Runtime combines them
- Swap executors without changing graph

**Key insight**: Data/behavior separation. Mix and match execution strategies.

---

### 6. Stream-Based (`/streams`) [PROPOSED]
**Core primitive**: Values are streams, computations are transformations

**Architecture**:
- Static values are source streams
- Dynamic values are derived streams
- Changes propagate via stream operators
- Features are stream operators (buffer, debounce, filter)

**Key insight**: Functional composition. No explicit propagation logic.

---

### 7. Constraint-Based (`/constraints`) [PROPOSED]
**Core primitive**: Declarative constraints, solver figures out execution

**Architecture**:
- Define: "y must equal x * 2"
- Solver determines execution order
- Change detection is constraint violation
- Circular deps are unsatisfiable constraints

**Key insight**: Declarative. Execution order is derived, not specified.

---

### 8. Event-Sourcing (`/events`) [PROPOSED]
**Core primitive**: All changes are events, state is derived

**Architecture**:
- Log all events: `SetStatic`, `ComputeValue`, `Subscribe`
- State is projection of event log
- Features are event handlers
- Time-travel is replaying events

**Key insight**: Complete history. State is always reproducible.

---

## What Makes a Good Kernel?

Evaluate each kernel on:

1. **Minimal Core**: How small is the kernel? Can it freeze?
2. **Feature Decoupling**: Can you add features without modifying core?
3. **Composability**: Can features be mixed/matched/removed?
4. **Clarity**: Is the architecture easier to understand than the original?
5. **Performance**: Overhead vs original implementation?
6. **Extensibility**: How easy to add new features not yet imagined?

## Adding a New Kernel

1. Create directory: `kernels/my-kernel/`
2. Implement: `auto.js` (must export function matching original API)
3. Add test runner: `run.js` (copy from `/channel/run.js`)
4. Document: Add section to this README
5. Test: Run against full test suite

## The Ultimate Goal

Find the **most elegant** split between:
- What must be in the core (graph? queue? dispatch?)
- What can be pluggable (async? batching? subscriptions?)

The winner becomes auto.js 2.0.

---

## Questions to Explore

- Can circular detection be a plugin? Or must it be core?
- Can subscriptions be a plugin? (Signal: yes. Others?)
- Is there a universal "extension interface"?
- Can we build features from smaller primitives?
- What's the minimal kernel that still makes sense?

---

**Status**: Active exploration. Channel kernel works for basic tests. Others are proposed architectures to try.
