# Kernel Architecture Comparison

Quick reference for comparing different kernel approaches.

## Summary Table

| Approach | Core Size | Decoupling | Composability | Clarity | Performance | Status |
|----------|-----------|------------|---------------|---------|-------------|--------|
| **Signal** | ~65 lines | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ✅ Working |
| **Hook** | ~100 lines | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 📝 Proposed |
| **Middleware** | ~80 lines | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 📝 Proposed |
| **Graph** | ~150 lines | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | 📝 Proposed |
| **Stream** | ? | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | 💡 Idea |
| **Actor** | ~100 lines | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | 💡 Idea |
| **Constraint** | ? | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | 💡 Idea |
| **Event-Source** | ~120 lines | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | 💡 Idea |

## Feature Support

Can each approach support features as plugins (without modifying core)?

| Feature | Signal | Hook | Middleware | Graph | Stream | Actor |
|---------|--------|------|------------|-------|--------|-------|
| Async | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Batching | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| Change Detection | ✅ | ✅ | ✅ | ⚠️ | ✅ | ⚠️ |
| Circular Detection | ✅ | ✅ | ✅ | ✅ | ⚠️ | ❌ |
| Subscriptions | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ |
| Tracing | ✅ | ✅ | ✅ | ⚠️ | ✅ | ⚠️ |

✅ = Definitely pluggable
⚠️ = Might need core support
❌ = Must be in core

## Detailed Comparison

### Signal-Based

**Core Concept**: Message queue + handlers

**Best For**:
- Distributed systems
- Event-driven architectures
- Async-heavy applications

**Pain Points**:
- Implicit control flow
- Queue overhead
- Need to understand message passing

**Example Plugin**:
```javascript
delayed.my_feature = (name, value, sig, state) => {
    // Handle signal
    sig('other_signal', data);
};
```

---

### Hook-Based

**Core Concept**: Lifecycle hooks

**Best For**:
- Plugin systems
- Clear extension points
- WordPress/Webpack-style architecture

**Pain Points**:
- Hook ordering
- Plugin conflicts
- Need good hook design

**Example Plugin**:
```javascript
{
    name: 'my-feature',
    hooks: {
        before_compute(node) {
            // Do something
        }
    }
}
```

---

### Middleware-Based

**Core Concept**: Composable middleware chain

**Best For**:
- Clear operation flow
- HTTP-like request/response
- Familiar Express/Koa pattern

**Pain Points**:
- Everything becomes async
- Order dependency
- Need well-defined operations

**Example Plugin**:
```javascript
function myFeature(op, next) {
    // Before
    const result = await next();
    // After
    return result;
}
```

---

### Graph-Based

**Core Concept**: Data/behavior separation

**Best For**:
- Multiple execution strategies
- Graph analysis
- Serialization needs

**Pain Points**:
- Complexity
- Dependency extraction
- Dynamic changes

**Example Plugin**:
```javascript
class MyExecutor {
    propagate(nodes) {
        // Custom execution strategy
    }
}
```

---

### Stream-Based

**Core Concept**: Reactive streams

**Best For**:
- RxJS users
- Functional composition
- Time-based operations

**Pain Points**:
- Learning curve
- Memory overhead
- Hot/cold stream distinction

**Example Plugin**:
```javascript
const y = x
    .map(v => v * 2)
    .debounce(100)
    .distinctUntilChanged();
```

---

### Actor-Based

**Core Concept**: Message-passing actors

**Best For**:
- Distributed systems
- Fault isolation
- Concurrent systems

**Pain Points**:
- Complexity
- Debugging
- Performance unclear

**Example Plugin**:
```javascript
class MyActor extends Actor {
    receive(msg) {
        // Handle message
    }
}
```

---

## Performance Characteristics

### Signal-Based
- **Overhead**: Medium (queue + dispatch)
- **Scalability**: Good (async-friendly)
- **Memory**: Medium (queue size)
- **Distributed**: Excellent (network-ready)

### Hook-Based
- **Overhead**: Low (direct calls)
- **Scalability**: Good
- **Memory**: Low
- **Distributed**: Poor (local only)

### Middleware-Based
- **Overhead**: Medium (chain traversal)
- **Scalability**: Good (async)
- **Memory**: Low
- **Distributed**: Poor (local only)

### Graph-Based
- **Overhead**: Low (executor-dependent)
- **Scalability**: Excellent (parallelizable)
- **Memory**: High (graph + values)
- **Distributed**: Good (graph serializable)

### Stream-Based
- **Overhead**: High (operator overhead)
- **Scalability**: Good (lazy evaluation)
- **Memory**: High (stream retention)
- **Distributed**: Medium

### Actor-Based
- **Overhead**: High (message passing)
- **Scalability**: Excellent (concurrent)
- **Memory**: High (mailboxes)
- **Distributed**: Excellent

## Learning Curve

From easiest to hardest:

1. **Hook-Based** - Familiar pattern, clear extension points
2. **Middleware-Based** - Like Express, well-understood
3. **Signal-Based** - Queue model is intuitive
4. **Graph-Based** - Two concepts (graph + executor)
5. **Event-Sourcing** - Projection model is different
6. **Stream-Based** - FRP is a shift in thinking
7. **Constraint-Based** - Solver is opaque
8. **Actor-Based** - Message passing + emergent behavior

## Development Velocity

How fast can you add new features?

1. **Signal-Based** - Add handler, emit signals (fast)
2. **Hook-Based** - Implement hook callback (fast)
3. **Middleware-Based** - Add middleware (fast)
4. **Graph-Based** - New executor or decorator (medium)
5. **Stream-Based** - New operator (medium)
6. **Event-Sourcing** - New event type + handler (medium)
7. **Actor-Based** - New actor type (slow)
8. **Constraint-Based** - Extend solver (slow)

## Debugging Experience

From easiest to hardest:

1. **Hook-Based** - Breakpoint in hook, step through
2. **Middleware-Based** - Log each middleware, clear flow
3. **Graph-Based** - Inspect graph structure
4. **Signal-Based** - Log signals, trace queue
5. **Event-Sourcing** - Replay events
6. **Stream-Based** - Marble diagrams, tricky async
7. **Actor-Based** - Message tracing required
8. **Constraint-Based** - Solver internals opaque

## Best Hybrid Approaches

### Graph + Middleware
- Graph is data
- Middleware executors
- Best of both worlds

### Signal + Hook
- Signals for communication
- Hooks for extension points
- Very flexible

### Event-Source + Graph
- Events for history
- Graph for structure
- Complete auditability

### Stream + Actor
- Streams for values
- Actors for coordination
- FRP + distribution

## Recommendation Matrix

| If you want... | Choose... |
|----------------|-----------|
| Simplest core | Signal or Middleware |
| Best performance | Hook or Graph |
| Most flexible | Signal or Graph |
| Easiest to learn | Hook or Middleware |
| Distributed-ready | Signal or Actor |
| Best tooling | Stream (RxJS ecosystem) |
| Time-travel debugging | Event-Sourcing |
| Multiple execution strategies | Graph |
| Familiar pattern | Hook or Middleware |

## Quick Decision Tree

```
Do you need distributed/network support?
├─ Yes → Signal or Actor
└─ No
   Do you want multiple execution strategies?
   ├─ Yes → Graph
   └─ No
      Do you want familiar patterns?
      ├─ Yes → Hook or Middleware
      └─ No
         Do you want FRP?
         ├─ Yes → Stream
         └─ No → Start with Hook
```

## Implementation Order Recommendation

If building from scratch, try in this order:

1. **Hook** - Easiest, proves the concept
2. **Middleware** - Similar but different
3. **Signal** - More different, interesting
4. **Graph** - Fundamentally different approach
5. **Stream** - If FRP interests you
6. **Event-Source** - If time-travel interests you
7. **Actor** - If distribution interests you
8. **Constraint** - Advanced, experimental

## The Winner?

There might not be one. Different approaches excel at different things:

- **Production use**: Hook or Middleware
- **Research**: Signal or Graph
- **Distribution**: Signal or Actor
- **Flexibility**: Graph
- **Simplicity**: Hook
- **Power**: Stream

Your choice depends on:
- What you value most
- What constraints you have
- What you want to learn
- What problems you face

**Recommendation**: Implement Hook first (familiar, fast), then Signal (different, interesting), then decide.
