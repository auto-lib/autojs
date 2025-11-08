# Kernel Exploration Guide

This document guides you through exploring different architectural approaches for auto.js.

## The Problem

Auto.js was built incrementally over 49 versions. Each feature (async, batching, change detection) required modifying the core propagation logic. The code became increasingly entangled.

**Question**: Is there a way to split auto.js into:
1. A minimal, frozen kernel (~100 lines)
2. Pluggable features that don't require modifying the kernel

## The Experiment

Each subdirectory here contains a **completely different architectural approach** that attempts to achieve this split. All approaches must pass the same test suite.

## Architectural Approaches

### 1. Signal-Based (Channel)
**Status**: ✅ Working prototype

**Core Primitive**: Message queue

**How it works**:
- All operations emit signals
- Signals go into a queue
- Handlers process signals (delayed or immediate)
- Features are signal handlers

**Example**:
```javascript
// Setting a value emits a signal
_.x = 5
  ↓
sig('set', {name: 'x', value: 5})
  ↓
[queued] set handler runs
  ↓
sig('run', 'y')  // if y depends on x
```

**Pros**:
- Completely decoupled
- Easy to add features (just add handler)
- Natural async support
- Can distribute signals across network

**Cons**:
- Queue overhead
- Implicit control flow
- Need to understand queueing model

---

### 2. Hook-Based
**Status**: 📝 Proposed

**Core Primitive**: Explicit lifecycle hooks

**How it works**:
- Core defines hook points (before_set, after_compute, etc.)
- Plugins register callbacks at hooks
- Core calls hooks at appropriate times
- Features are plugins

**Example**:
```javascript
const circularPlugin = {
    dependency_added({parent, child}) {
        // Check for cycles
    }
};

core.use(circularPlugin);
```

**Pros**:
- Clear extension points
- Familiar pattern (like WordPress, Webpack)
- Easy to compose plugins
- Testable in isolation

**Cons**:
- Hook ordering matters
- Potential plugin conflicts
- Need to define right hooks

---

### 3. Middleware-Based
**Status**: 📝 Proposed

**Core Primitive**: Middleware chain (like Express)

**How it works**:
- Every operation flows through middleware
- Each middleware can: observe, transform, defer, skip
- Core is just dispatch mechanism
- Features are middleware

**Example**:
```javascript
function batchMiddleware(op, next) {
    if (op.type === 'set') {
        queue.push(op);
        scheduleFlush();
        return {batched: true};
    }
    return next();
}

core.use(batchMiddleware);
```

**Pros**:
- Complete control over operations
- Composable (standard pattern)
- Can short-circuit execution
- Clear request/response model

**Cons**:
- Order matters
- Everything becomes async
- Need well-defined operation types

---

### 4. Graph-Based
**Status**: 📝 Proposed

**Core Primitive**: Separate data (graph) from behavior (executor)

**How it works**:
- Graph is pure data structure (nodes + edges)
- Executor is pure logic (how/when to compute)
- Runtime combines them
- Swap executors without changing graph

**Example**:
```javascript
const graph = buildGraph({x: 5, y: ($) => $.x * 2});

// Try different executors
const exec1 = new ImmediateExecutor(graph);
const exec2 = new BatchedExecutor(graph);
const exec3 = new LazyExecutor(graph);
```

**Pros**:
- Complete separation of concerns
- Mix/match execution strategies
- Graph is serializable
- Can analyze graph without running

**Cons**:
- More concepts to understand
- Dependency extraction is tricky
- Dynamic changes are complex

---

### 5. Stream-Based
**Status**: 💡 Idea

**Core Primitive**: Values are streams, computations are operators

**How it works**:
- Static values = source streams
- Dynamic values = derived streams (map, combine)
- Changes propagate via stream operators
- Features are stream operators

**Example**:
```javascript
const x = source(5);
const y = x.map(val => val * 2);
const z = combine([x, y], (x, y) => x + y);
```

**Pros**:
- Functional composition
- Rich operator library (RxJS-like)
- Natural async/batching
- Well-understood paradigm

**Cons**:
- Steeper learning curve
- Performance overhead
- Memory (keep streams alive)

---

### 6. Actor-Based
**Status**: 💡 Idea

**Core Primitive**: Each value is an actor with a mailbox

**How it works**:
- Values send messages to each other
- No central coordinator
- Dependency graph emerges from messages
- Features are actor behaviors

**Example**:
```javascript
class ValueActor {
    constructor(id) {
        this.id = id;
        this.mailbox = [];
    }

    receive(msg) {
        if (msg.type === 'get') {
            msg.sender.send({type: 'value', value: this.value});
        }
    }
}
```

**Pros**:
- No central bottleneck
- Natural concurrency
- Fault isolation
- Distributed-friendly

**Cons**:
- Complexity
- Debugging is hard
- Emergent behavior
- Performance unclear

---

### 7. Constraint-Based
**Status**: 💡 Idea

**Core Primitive**: Declarative constraints + solver

**How it works**:
- Define constraints: "y must equal x * 2"
- Solver determines execution order
- Changes propagate via constraint satisfaction
- Circular deps = unsatisfiable

**Example**:
```javascript
const system = constraints();
system.add('y = x * 2');
system.add('z = x + y');
system.set('x', 5);
// Solver figures out order: x → y → z
```

**Pros**:
- Declarative
- Solver handles complexity
- Bidirectional updates possible
- Clear invariants

**Cons**:
- Solver complexity
- Performance unpredictable
- Debugging opaque

---

### 8. Event-Sourcing
**Status**: 💡 Idea

**Core Primitive**: Event log + projections

**How it works**:
- All changes are events
- State = projection of event log
- Features are event handlers
- Time-travel = replay events

**Example**:
```javascript
const events = [];
events.push({type: 'SetStatic', id: 'x', value: 5});
events.push({type: 'Compute', id: 'y', fn: ...});

const state = events.reduce(applyEvent, {});
```

**Pros**:
- Complete history
- Time-travel debugging
- Reproducible
- Audit trail

**Cons**:
- Memory usage
- Projection complexity
- Performance
- Snapshot strategy needed

---

## Other Possible Approaches

### 9. Rule-Based
- Define rules: "when x changes, recompute y"
- Rule engine matches and executes
- Features are rule definitions

### 10. Functional Pipeline
- Transformations compose functionally
- `pipe(invalidate, sort, compute, notify)`
- Each step is pure function

### 11. Dataflow/FRP
- Classic FRP implementation
- Signals and behaviors
- Time-varying values

### 12. Petri Net
- States and transitions
- Tokens flow through net
- Propagation = token flow

## Evaluation Criteria

For each approach, consider:

### 1. Minimal Core
- How many lines?
- How frozen? (can it truly never change?)
- How understandable?

### 2. Feature Decoupling
- Can add async without modifying core? ✅/❌
- Can add batching without modifying core? ✅/❌
- Can add subscriptions without modifying core? ✅/❌
- Can add circular detection without modifying core? ✅/❌

### 3. Composability
- Can features be mixed/matched? ✅/❌
- Can features be enabled/disabled? ✅/❌
- Can features conflict? ⚠️

### 4. Performance
- Overhead vs original?
- Scalability?
- Memory usage?

### 5. Clarity
- Easier to understand than original? ✅/❌
- Clear execution model? ✅/❌
- Easy to debug? ✅/❌

### 6. Extensibility
- Can add features not yet imagined? ✅/❌
- Clear extension interface? ✅/❌

## Methodology

### 1. Start Small
Each kernel starts with:
- Empty object `{}`
- One static value `{x: 5}`
- One dynamic value `{x: 5, y: ($) => $.x * 2}`
- Setting a value `_.x = 10`

Get these working first.

### 2. Add Features Gradually
Then add one feature at a time:
1. Circular detection
2. Subscriptions
3. Async functions
4. Batching
5. Change detection

### 3. Run Tests
Use the unified test runner:
```bash
cd kernels
node test-runner.js <kernel-name>
```

### 4. Document Learnings
For each kernel, document:
- What worked well
- What was difficult
- Surprising insights
- Performance characteristics

## Getting Started

### Option A: Implement One from Scratch

1. Choose an approach (e.g., hooks)
2. Create directory: `kernels/hooks/`
3. Implement `auto.js`
4. Copy test runner: `cp channel/run.js hooks/`
5. Run tests: `cd hooks && node run.js`

### Option B: Extend Existing

1. Study `kernels/channel/`
2. Add a feature (e.g., subscriptions)
3. Document what changed
4. Run tests

### Option C: Hybrid Approach

1. Take best ideas from multiple approaches
2. Create new kernel combining them
3. E.g., "graph-based with middleware execution"

## Questions to Explore

### Philosophical
- What IS the irreducible core?
- Is there one true kernel?
- Or are there multiple valid approaches?

### Technical
- Can circular detection always be a plugin?
- Can dependency tracking always be a plugin?
- What must be in the core?

### Practical
- Which approach is fastest?
- Which is easiest to understand?
- Which is most extensible?

## Success Metrics

A successful kernel:
1. ✅ Passes all 66 tests
2. ✅ Core is < 150 lines
3. ✅ Core never changes when adding features
4. ✅ Features are isolated modules
5. ✅ Easier to understand than original
6. ✅ Performance within 2x of original

## Next Steps

1. **Implement**: Choose an approach and implement it
2. **Test**: Run against test suite
3. **Benchmark**: Compare performance
4. **Document**: Write up learnings
5. **Iterate**: Try another approach
6. **Compare**: Which is best? Why?

## The Ultimate Goal

Find the **most elegant** architecture where:
- Core is minimal and frozen
- Features are pluggable
- Everything is clear and understandable
- Performance is acceptable
- Future features are easy to add

Then **rebuild auto.js 2.0** using this architecture.

---

**Remember**: There's no wrong answer. This is exploration. Try wild ideas. Fail fast. Learn. Iterate.
