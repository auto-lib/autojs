# Signal-Based Kernel

**Status**: Working prototype (passes ~15 basic tests)

## Core Idea

Instead of one monolithic `propagate()` function, use a **message queue system** where features are signal handlers.

## Architecture

```
┌─────────────┐
│   sig()     │  ← Emit signals
└──────┬──────┘
       │
       ▼
   ┌────────┐
   │ Queue  │  ← Buffer signals
   └────┬───┘
        │
        ▼
   ┌─────────────────┐
   │ Process Handlers│  ← Delayed or Immediate
   └─────────────────┘
```

## Core Components

### 1. Signal Dispatcher (`signal.js`)

**Minimal queue system** (~65 lines):

```javascript
signal(delayed, immediate, state, options)
```

- `delayed`: Handlers that queue for batch processing
- `immediate`: Handlers that execute synchronously
- `state`: Shared state object
- Returns: `{ sig, step, internal }`

**The entire kernel is this queue + dispatcher. That's it.**

### 2. Signal Handlers (`auto.js`)

Features implemented as signal handlers:

#### Delayed Handlers (queued)
- `obj`: Bootstrap from object
- `state`: Process initial state definitions
- `run`: Execute a dynamic function
- `set`: Update value, propagate, notify
- `export`: Send to connected channels
- `check circle`: Validate no circular deps

#### Immediate Handlers (synchronous)
- `get`: Track dependency, return value
- `log`: Debug output

## How Features Work

### Example: Setting a Value

Original auto.js:
```javascript
// Inline in propagate()
cache[name] = value;
Object.keys(deps).forEach(fn => {
    if (deps[fn].includes(name)) recompute(fn);
});
notify_subscribers(name, value);
```

Signal-based:
```javascript
// Signal handler
set: (n, v, sig, state) => {
    let { name, value } = v;
    state.cache[name] = value;

    // Find affected functions
    let to_run = {};
    Object.keys(state.deps).forEach(fn => {
        if (state.deps[fn].indexOf(name) > -1)
            to_run[fn] = true;
    });

    // Queue them
    Object.keys(to_run).forEach(t => sig('run', t));

    // Export if needed
    if (state.exports.indexOf(name) > -1)
        sig('export', { name, value });
}
```

**Key difference**: Instead of direct calls, emit signals. Other handlers react.

### Example: Circular Detection

Original: Inline during dependency tracking

Signal-based: Separate handler
```javascript
'check circle': (n, v, sig, state) => {
    let stack = [];
    let check = (dep, stack) => {
        if (stack.indexOf(dep) > -1) {
            state.fatal = { msg: 'circular dependency', stack };
            return;
        }
        stack.push(dep);
        if (dep in state.deps)
            state.deps[dep].forEach(dep => check(dep, stack));
    }
    check(v, stack);
}
```

**Triggered by**: `get` handler emits `sig('check circle', parent)` when adding dependency.

## Adding a New Feature

To add async functions:

1. Add delayed handler:
```javascript
delayed.run_async = (n, v, sig, state) => {
    let { name, fn } = v;
    let ctx = /* ... */;
    let set = (value) => sig('set', { name, value });
    fn(ctx, set);  // Pass set callback
}
```

2. Modify `run` to detect async:
```javascript
run: (n, v, sig, state) => {
    // ...
    if (fn.length > 1) sig('run_async', { name, fn });
    else { /* sync path */ }
}
```

**No core changes needed.** Just add handlers and emit signals.

## Signal Flow Example

User sets a value:
```
_.x = 5
  ↓
sig('set', {name:'x', value:5})
  ↓
[queued] set handler processes
  ↓
state.cache['x'] = 5
  ↓
sig('run', 'y')  (if y depends on x)
  ↓
[queued] run handler processes
  ↓
sig('get', {name:'x', parent:'y'})
  ↓
[immediate] get handler returns value
  ↓
sig('check circle', 'y')
  ↓
[queued] check circle validates
  ↓
sig('set', {name:'y', value:10})
  ↓
... propagation continues ...
```

## Execution Model

### Bootstrap Phase
```javascript
sig('obj', { x: 5, y: ($) => $.x * 2 })
  ↓
sig('state', { x: 5, y: [Function] })
  ↓
sig('set', { name: 'x', value: 5 })
sig('run', 'y')
  ↓
cleanup() - process queue until empty
```

### Runtime Phase
```javascript
_.x = 10
  ↓
sig('set', { name: 'x', value: 10 })
  ↓
cleanup() - process queue until empty
```

## State Structure

```javascript
{
    fn: { y: [Function] },           // Dynamic functions
    cache: { x: 5, y: 10 },          // Current values
    deps: { y: ['x'] },              // Dependencies
    channels: {},                     // Connected channels
    imports: [],                      // What to import
    exports: [],                      // What to export
    subs: [],                         // Subscriptions
    fatal: null,                      // Error state
    booting: true                     // Suppress errors during boot
}
```

## Benefits Over Original

### 1. Feature Decoupling
- Circular detection is a handler, not inline code
- Can be removed/replaced without touching core

### 2. Extensibility
- Add tracing: Insert `trace` handler
- Add batching: Wrap `set` handler
- Add async: Add `run_async` handler

### 3. Testability
- Test handlers in isolation
- Mock signal emission

### 4. Visibility
- Log all signals to see execution flow
- Hook into any signal for instrumentation

## Limitations

### 1. Performance
- Queue overhead vs direct calls
- More function calls per operation

### 2. Control Flow
- Harder to trace through code
- Signal flow is implicit

### 3. Complexity
- Need to understand queuing model
- Delayed vs immediate distinction

## Next Steps

### To Complete
- [ ] Add subscription support
- [ ] Add async function support
- [ ] Add batching
- [ ] Add change detection
- [ ] Pass all 66 tests

### To Explore
- Can handlers be defined externally as plugins?
- Can we make handlers first-class (add/remove at runtime)?
- Can signals cross process boundaries (distributed)?
- Performance comparison vs original

## Files

- `signal.js` - Core queue/dispatch (65 lines)
- `auto.js` - Auto signal handlers (155 lines)
- `run.js` - Test runner
- `test.js` - Simple manual tests
- `tests/` - Subset of main tests

## Running

```bash
node run.js              # Run all tests
node test.js             # Run manual tests
```

---

**Key Insight**: The entire reactive system is just signals flowing through handlers. The core never changes - only handlers do.
