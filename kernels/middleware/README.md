# Middleware-Based Kernel

**Status**: Proposed architecture (not yet implemented)

## Core Idea

Like Express or Koa: **every operation flows through a middleware chain**. Each middleware can observe, transform, defer, or skip operations.

## Architecture

```
Operation → [MW1] → [MW2] → [MW3] → [Core] → [MW3] → [MW2] → [MW1] → Result
             ↓       ↓       ↓       ↓       ↓       ↓       ↓
          observe  defer   log    execute  trace  notify  return
```

## Core API

```javascript
// core.js - Minimal middleware runner (~80 lines)

class Core {
    constructor() {
        this.middleware = [];
        this.graph = new Graph();
    }

    use(middleware) {
        this.middleware.push(middleware);
    }

    async dispatch(operation) {
        let index = 0;

        const next = async () => {
            if (index >= this.middleware.length) {
                return this.execute(operation);
            }
            const mw = this.middleware[index++];
            return mw(operation, next);
        };

        return next();
    }

    set(id, value) {
        return this.dispatch({ type: 'set', id, value });
    }

    get(id) {
        return this.dispatch({ type: 'get', id });
    }
}
```

## Operation Types

Every operation is an object:
```javascript
{
    type: 'set' | 'get' | 'propagate' | 'compute',
    id: string,
    value: any,
    // ... operation-specific fields
}
```

## Example Middleware

### Logging Middleware

```javascript
// middleware/log.js

export default function logMiddleware(options = {}) {
    return async (op, next) => {
        const start = Date.now();
        console.log(`→ ${op.type}(${op.id})`);

        const result = await next();

        const duration = Date.now() - start;
        console.log(`← ${op.type}(${op.id}) [${duration}ms]`);

        return result;
    };
}
```

### Batching Middleware

```javascript
// middleware/batch.js

export default function batchMiddleware(delay = 0) {
    let queue = [];
    let timer = null;

    return async (op, next) => {
        if (op.type !== 'set') {
            return next();  // Pass through
        }

        // Queue the set
        queue.push(op);

        // Schedule batch
        if (!timer) {
            timer = setTimeout(async () => {
                const batch = [...queue];
                queue = [];
                timer = null;

                // Process all at once
                const propagateOp = {
                    type: 'propagate',
                    changed: batch.map(op => op.id)
                };

                await next.call(null, propagateOp);
            }, delay);
        }

        // Don't propagate yet
        return { batched: true };
    };
}
```

### Change Detection Middleware

```javascript
// middleware/change-detection.js

export default function changeDetectionMiddleware() {
    const oldValues = {};

    return async (op, next) => {
        if (op.type === 'set') {
            // Capture old value
            oldValues[op.id] = this.graph.getValue(op.id);
        }

        const result = await next();

        if (op.type === 'set') {
            // Compare
            const oldVal = oldValues[op.id];
            const newVal = op.value;

            if (isEqual(oldVal, newVal)) {
                // No change, stop propagation
                return { skipped: true };
            }
        }

        return result;
    };
}
```

### Circular Detection Middleware

```javascript
// middleware/circular.js

export default function circularMiddleware() {
    const stack = [];

    return async (op, next) => {
        if (op.type === 'compute') {
            // Check stack
            if (stack.includes(op.id)) {
                throw new Error(
                    `Circular dependency: ${stack.join(' → ')} → ${op.id}`
                );
            }

            stack.push(op.id);
            const result = await next();
            stack.pop();

            return result;
        }

        return next();
    };
}
```

### Async Middleware

```javascript
// middleware/async.js

export default function asyncMiddleware() {
    return async (op, next) => {
        if (op.type === 'compute') {
            const result = await next();

            // If result is promise, wait for it
            if (result instanceof Promise) {
                const value = await result;
                // Set the resolved value
                return this.dispatch({
                    type: 'set',
                    id: op.id,
                    value
                });
            }

            return result;
        }

        return next();
    };
}
```

### Subscription Middleware

```javascript
// middleware/subscriptions.js

export default function subscriptionMiddleware() {
    const subscribers = {};

    return async (op, next) => {
        const result = await next();

        if (op.type === 'set') {
            // Notify after successful set
            const callbacks = subscribers[op.id] || [];
            callbacks.forEach(fn => fn(op.value));
        }

        return result;
    };
}
```

### Trace Middleware

```javascript
// middleware/trace.js

export default function traceMiddleware(callback) {
    return async (op, next) => {
        if (op.type === 'propagate') {
            const trace = {
                timestamp: Date.now(),
                changed: op.changed,
                updates: []
            };

            // Intercept sets during propagation
            const originalNext = next;
            next = async (innerOp) => {
                if (innerOp && innerOp.type === 'set') {
                    trace.updates.push({
                        id: innerOp.id,
                        value: innerOp.value
                    });
                }
                return originalNext(innerOp);
            };

            const result = await originalNext();

            callback(trace);

            return result;
        }

        return next();
    };
}
```

## Building Auto.js

```javascript
// auto.js

import Core from './core.js';
import log from './middleware/log.js';
import circular from './middleware/circular.js';
import changeDetection from './middleware/change-detection.js';
import async from './middleware/async.js';
import batch from './middleware/batch.js';
import subscriptions from './middleware/subscriptions.js';
import trace from './middleware/trace.js';

export default function auto(obj, options = {}) {
    const core = new Core();

    // Order matters!
    if (options.trace) core.use(trace(options.trace));
    core.use(log());
    core.use(batch(options.auto_batch_delay || 0));
    core.use(changeDetection());
    core.use(circular());
    core.use(async());
    core.use(subscriptions());

    // Bootstrap
    Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'function') {
            core.addDynamic(key, obj[key]);
        } else {
            core.set(key, obj[key]);
        }
    });

    return core.proxy();
}
```

## Execution Flow

### Simple Set
```
_.x = 5

→ set(x, 5)
  → log: "→ set(x)"
    → batch: queue
      → change-detection: check old value
        → circular: pass through
          → async: pass through
            → subscriptions: notify after
              → CORE: execute set
            ← subscriptions: notify
          ← async
        ← circular
      ← change-detection
    ← batch
  ← log: "← set(x) [2ms]"
← result
```

### Batched Sets
```
_.x = 5
_.y = 10

→ set(x, 5)
  → batch: queue, schedule timer
← batched: true

→ set(y, 10)
  → batch: queue (already scheduled)
← batched: true

[timer fires]
→ propagate([x, y])
  → trace: start recording
    → ... middleware chain ...
      → CORE: compute affected nodes
    ← ... middleware chain ...
  ← trace: emit trace
← result
```

## Benefits

### 1. Composable
- Add middleware: `core.use(myMiddleware())`
- Remove middleware: filter array
- Reorder middleware: change order

### 2. Full Control
- Middleware can:
  - Skip operations (return without calling next)
  - Transform operations (modify op object)
  - Defer operations (batch, debounce)
  - Wrap operations (timing, logging)
  - Observe operations (tracing, debugging)

### 3. Clear Semantics
- Request/response model (like HTTP)
- Middleware either: pass through, transform, or handle

### 4. Testable
- Test middleware in isolation
- Mock `next` function
- Verify operations passed through

## Challenges

### 1. Order Dependency
- Middleware order matters
- batch before change-detection? or after?
- Need clear ordering guidelines

### 2. Async Complexity
- Everything is async (for consistency)
- Performance overhead?

### 3. Operation Model
- What operations exist?
- How granular? (set, get, compute, propagate, ...)

### 4. Context Passing
- Middleware needs access to graph, state
- How to pass context?

## Advanced: Composing Middleware

```javascript
// Compose multiple middleware
function compose(...middleware) {
    return (op, next) => {
        let index = 0;

        const dispatch = async () => {
            if (index >= middleware.length) return next();
            return middleware[index++](op, dispatch);
        };

        return dispatch();
    };
}

// Use it
core.use(compose(
    log(),
    trace(),
    batch()
));
```

## Advanced: Conditional Middleware

```javascript
// Only apply in dev mode
if (process.env.NODE_ENV === 'development') {
    core.use(log());
    core.use(trace(console.log));
}

// Only for specific operations
core.use(async (op, next) => {
    if (op.id.startsWith('debug_')) {
        console.log('Debug operation:', op);
    }
    return next();
});
```

## Next Steps

- [ ] Implement core middleware runner
- [ ] Implement basic middleware (log, circular)
- [ ] Implement batch middleware
- [ ] Implement async middleware
- [ ] Run against test suite
- [ ] Benchmark performance

---

**Key Insight**: Every operation flows through a pipeline. Features are middleware that intercept operations.
