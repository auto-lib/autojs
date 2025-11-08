# Hook-Based Kernel

**Status**: Proposed architecture (not yet implemented)

## Core Idea

Tiny core (~100 lines) with **explicit hook points**. Features are plugins that register callbacks at hooks.

## Architecture

```
Core (never changes):
├── Dependency graph
├── Topological sort
└── Hook execution

Plugins (features):
├── async-plugin.js
├── batch-plugin.js
├── circular-plugin.js
├── subscription-plugin.js
└── trace-plugin.js
```

## Core API

```javascript
// core.js - Minimal kernel (~100 lines)

class Core {
    constructor(plugins = []) {
        this.graph = new Graph();
        this.hooks = this.registerPlugins(plugins);
    }

    // The only two operations
    set(id, value) { /* ... */ }
    get(id) { /* ... */ }

    // Everything else is hooks
    propagate(changed) {
        this.hooks.emit('before_propagate', { changed });

        const sorted = this.graph.topoSort(changed);

        this.hooks.emit('before_compute_batch', { sorted });

        for (let node of sorted) {
            this.hooks.emit('before_compute', { node });
            const result = this.compute(node);
            this.hooks.emit('after_compute', { node, result });
        }

        this.hooks.emit('after_propagate', { changed });
    }
}
```

## Hook Points

### Lifecycle Hooks
- `before_set(id, value)` - Before setting a value
- `after_set(id, value)` - After setting a value
- `before_get(id)` - Before getting a value
- `after_get(id, value)` - After getting a value

### Propagation Hooks
- `before_propagate(changed)` - Before propagation starts
- `after_propagate(changed)` - After propagation completes

### Computation Hooks
- `before_compute_batch(sorted)` - Before computing all nodes
- `before_compute(node)` - Before computing one node
- `after_compute(node, result)` - After computing one node

### Dependency Hooks
- `dependency_added(parent, child)` - When dependency is tracked
- `dependency_removed(parent, child)` - When dependency breaks

## Example Plugins

### Circular Detection Plugin

```javascript
// plugins/circular.js

export default {
    name: 'circular-detection',

    hooks: {
        dependency_added({ parent, child }) {
            // Check for cycles
            const stack = [child];
            const visited = new Set();

            const check = (node) => {
                if (node === parent) {
                    throw new Error(`Circular: ${stack.join(' → ')}`);
                }
                if (visited.has(node)) return;
                visited.add(node);

                const deps = this.graph.getDependencies(node);
                deps.forEach(dep => {
                    stack.push(dep);
                    check(dep);
                    stack.pop();
                });
            };

            check(child);
        }
    }
};
```

### Async Plugin

```javascript
// plugins/async.js

export default {
    name: 'async',

    hooks: {
        after_compute({ node, result }) {
            if (result instanceof Promise) {
                result.then(value => {
                    this.core.set(node.id, value);
                });
            }
        }
    }
};
```

### Batching Plugin

```javascript
// plugins/batch.js

export default {
    name: 'batch',

    state: {
        queue: [],
        timer: null
    },

    hooks: {
        before_propagate({ changed }) {
            // Cancel propagation, queue instead
            this.state.queue.push(...changed);

            if (!this.state.timer) {
                this.state.timer = setTimeout(() => {
                    const all = [...this.state.queue];
                    this.state.queue = [];
                    this.state.timer = null;
                    this.core.propagate(all);
                }, 0);
            }

            return { cancel: true };  // Stop current propagation
        }
    }
};
```

### Subscription Plugin

```javascript
// plugins/subscriptions.js

export default {
    name: 'subscriptions',

    state: {
        subscribers: {}  // id -> [callbacks]
    },

    hooks: {
        after_set({ id, value }) {
            const callbacks = this.state.subscribers[id] || [];
            callbacks.forEach(fn => fn(value));
        }
    },

    methods: {
        subscribe(id, callback) {
            if (!this.state.subscribers[id]) {
                this.state.subscribers[id] = [];
            }
            this.state.subscribers[id].push(callback);
        },

        unsubscribe(id, callback) {
            const subs = this.state.subscribers[id] || [];
            const idx = subs.indexOf(callback);
            if (idx > -1) subs.splice(idx, 1);
        }
    }
};
```

### Trace Plugin

```javascript
// plugins/trace.js

export default {
    name: 'trace',

    hooks: {
        after_propagate({ changed }) {
            console.log({
                timestamp: Date.now(),
                changed: changed.map(c => c.id),
                // ... more details
            });
        }
    }
};
```

## Building Auto.js

```javascript
// auto.js

import Core from './core.js';
import circular from './plugins/circular.js';
import async from './plugins/async.js';
import batch from './plugins/batch.js';
import subscriptions from './plugins/subscriptions.js';
import trace from './plugins/trace.js';

export default function auto(obj, options = {}) {
    const plugins = [
        circular,
        async,
        batch,
        subscriptions
    ];

    if (options.trace) plugins.push(trace);

    const core = new Core(plugins);

    // Bootstrap from obj
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

## Hook Execution Model

### Sequential Hooks
Most hooks run in order:
```javascript
plugin1.before_set()
plugin2.before_set()
plugin3.before_set()
```

### Cancellable Hooks
Some hooks can cancel execution:
```javascript
result = plugin1.before_propagate({ changed });
if (result?.cancel) return;
```

### Async Hooks
Some hooks can be async (awaited):
```javascript
await plugin.before_compute({ node });
```

## Benefits

### 1. Minimal Core
- Graph + topo sort + hook runner
- ~100 lines that never change
- Easy to understand

### 2. Clear Extension Points
- Every hook is a documented extension point
- Know exactly where to plug in

### 3. Composable
- Mix and match plugins
- Enable/disable features easily

### 4. Testable
- Test core without plugins
- Test plugins in isolation
- Mock hooks for testing

## Challenges

### 1. Hook Ordering
- What if two plugins want different orders?
- Need priority system?

### 2. Plugin Conflicts
- What if two plugins fight over same hook?
- Need coordination mechanism?

### 3. Performance
- Overhead of calling all hooks
- Need to make hook dispatch fast

### 4. API Surface
- Too many hooks = complexity
- Too few hooks = not extensible enough

## Next Steps

- [ ] Implement minimal core
- [ ] Implement circular plugin
- [ ] Implement async plugin
- [ ] Implement batch plugin
- [ ] Run against test suite

---

**Key Insight**: Core is just "manage graph + call hooks". All features are plugins.
