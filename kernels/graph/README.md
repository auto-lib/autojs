# Graph-Based Kernel

**Status**: Proposed architecture (not yet implemented)

## Core Idea

**Separate structure from execution**. Graph is pure data. Executor is pure behavior. Runtime combines them.

## Architecture

```
┌──────────────┐
│ Graph (data) │  ← What depends on what
└──────┬───────┘
       │
       ├── nodes: { x: {...}, y: {...} }
       └── edges: { y: [x], z: [x, y] }

┌─────────────────┐
│ Executor (logic)│  ← How/when to compute
└──────┬──────────┘
       │
       ├── when: 'immediate' | 'batched' | 'lazy'
       ├── how: 'sync' | 'async'
       └── notify: true | false

┌─────────────────┐
│ Runtime         │  ← Combines graph + executor
└─────────────────┘
```

## Core Components

### 1. Graph (Pure Data)

```javascript
// graph.js

class Graph {
    constructor() {
        this.nodes = {};
        this.edges = {};
    }

    addNode(id, definition) {
        this.nodes[id] = definition;
    }

    addEdge(from, to) {
        if (!this.edges[to]) this.edges[to] = [];
        if (!this.edges[to].includes(from)) {
            this.edges[to].push(from);
        }
    }

    getNode(id) {
        return this.nodes[id];
    }

    getDependencies(id) {
        return this.edges[id] || [];
    }

    getDependents(id) {
        return Object.keys(this.edges)
            .filter(key => this.edges[key].includes(id));
    }

    topoSort(nodes) {
        // Pure topological sort
        // Returns sorted array of node IDs
    }

    // No execution logic here!
}
```

### 2. Executor (Pure Behavior)

```javascript
// executors/immediate.js

export default class ImmediateExecutor {
    constructor(graph, options = {}) {
        this.graph = graph;
        this.values = {};
        this.options = options;
    }

    set(id, value) {
        this.values[id] = value;

        // Immediate propagation
        const affected = this.graph.getDependents(id);
        this.propagate(affected);
    }

    get(id) {
        return this.values[id];
    }

    propagate(nodes) {
        const sorted = this.graph.topoSort(nodes);

        for (let id of sorted) {
            const node = this.graph.getNode(id);
            const value = this.compute(id, node);
            this.values[id] = value;
        }
    }

    compute(id, node) {
        if (node.type === 'static') {
            return node.value;
        }

        if (node.type === 'computed') {
            const deps = this.graph.getDependencies(id);
            const ctx = this.buildContext(deps);
            return node.fn(ctx);
        }
    }

    buildContext(deps) {
        const ctx = {};
        deps.forEach(dep => {
            ctx[dep] = this.values[dep];
        });
        return ctx;
    }
}
```

### 3. Other Executors

#### Batched Executor

```javascript
// executors/batched.js

export default class BatchedExecutor {
    constructor(graph, options = {}) {
        this.graph = graph;
        this.values = {};
        this.queue = [];
        this.timer = null;
        this.delay = options.delay || 0;
    }

    set(id, value) {
        this.values[id] = value;

        // Queue for batch
        if (!this.queue.includes(id)) {
            this.queue.push(id);
        }

        // Schedule batch
        if (!this.timer) {
            this.timer = setTimeout(() => {
                this.flush();
            }, this.delay);
        }
    }

    flush() {
        const changed = [...this.queue];
        this.queue = [];
        this.timer = null;

        const affected = new Set();
        changed.forEach(id => {
            this.graph.getDependents(id).forEach(dep => {
                affected.add(dep);
            });
        });

        this.propagate([...affected]);
    }

    propagate(nodes) {
        // Same as ImmediateExecutor
    }
}
```

#### Lazy Executor

```javascript
// executors/lazy.js

export default class LazyExecutor {
    constructor(graph, options = {}) {
        this.graph = graph;
        this.values = {};
        this.dirty = new Set();
    }

    set(id, value) {
        this.values[id] = value;

        // Mark dependents as dirty
        const dependents = this.graph.getDependents(id);
        dependents.forEach(dep => this.dirty.add(dep));

        // Don't compute yet!
    }

    get(id) {
        if (this.dirty.has(id)) {
            // Recompute on access
            this.recompute(id);
            this.dirty.delete(id);
        }

        return this.values[id];
    }

    recompute(id) {
        const node = this.graph.getNode(id);
        // ... compute value
    }
}
```

#### Async Executor

```javascript
// executors/async.js

export default class AsyncExecutor {
    constructor(graph, options = {}) {
        this.graph = graph;
        this.values = {};
    }

    async set(id, value) {
        this.values[id] = value;

        const affected = this.graph.getDependents(id);
        await this.propagate(affected);
    }

    async propagate(nodes) {
        const sorted = this.graph.topoSort(nodes);

        for (let id of sorted) {
            const node = this.graph.getNode(id);
            const value = await this.compute(id, node);
            this.values[id] = value;
        }
    }

    async compute(id, node) {
        if (node.type === 'computed') {
            const deps = this.graph.getDependencies(id);
            const ctx = this.buildContext(deps);
            const result = node.fn(ctx);

            // Wait for promises
            if (result instanceof Promise) {
                return await result;
            }

            return result;
        }
    }
}
```

### 4. Runtime

```javascript
// runtime.js

export default class Runtime {
    constructor(graph, executor) {
        this.graph = graph;
        this.executor = executor;
    }

    proxy() {
        return new Proxy({}, {
            get: (target, id) => {
                if (id === '_') {
                    return this.internals();
                }
                return this.executor.get(id);
            },

            set: (target, id, value) => {
                this.executor.set(id, value);
                return true;
            }
        });
    }

    internals() {
        return {
            graph: this.graph,
            executor: this.executor,
            values: this.executor.values
        };
    }
}
```

## Building Auto.js

```javascript
// auto.js

import Graph from './graph.js';
import ImmediateExecutor from './executors/immediate.js';
import BatchedExecutor from './executors/batched.js';
import LazyExecutor from './executors/lazy.js';
import AsyncExecutor from './executors/async.js';
import Runtime from './runtime.js';

export default function auto(obj, options = {}) {
    const graph = new Graph();

    // Build graph from object
    Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'function') {
            graph.addNode(key, {
                type: 'computed',
                fn: obj[key]
            });

            // Track dependencies
            const deps = extractDependencies(obj[key]);
            deps.forEach(dep => graph.addEdge(dep, key));
        } else {
            graph.addNode(key, {
                type: 'static',
                value: obj[key]
            });
        }
    });

    // Choose executor
    let executor;
    if (options.lazy) {
        executor = new LazyExecutor(graph, options);
    } else if (options.async) {
        executor = new AsyncExecutor(graph, options);
    } else if (options.auto_batch) {
        executor = new BatchedExecutor(graph, options);
    } else {
        executor = new ImmediateExecutor(graph, options);
    }

    // Bootstrap
    Object.keys(obj).forEach(key => {
        if (typeof obj[key] !== 'function') {
            executor.set(key, obj[key]);
        }
    });

    // Compute all computed nodes
    const computed = Object.keys(obj)
        .filter(key => typeof obj[key] === 'function');
    executor.propagate(computed);

    return new Runtime(graph, executor).proxy();
}
```

## Usage

### Different Execution Strategies

```javascript
// Immediate execution
const _ = auto({
    x: 5,
    y: ($) => $.x * 2
});

// Batched execution
const _ = auto({
    x: 5,
    y: ($) => $.x * 2
}, { auto_batch: true });

// Lazy execution
const _ = auto({
    x: 5,
    y: ($) => $.x * 2
}, { lazy: true });

// Async execution
const _ = auto({
    user: null,
    data: async ($) => {
        return fetch(`/api/user/${$.user}`);
    }
}, { async: true });
```

### Swapping Executors

```javascript
const graph = buildGraph({ x: 5, y: ($) => $.x * 2 });

// Try different executors
const exec1 = new ImmediateExecutor(graph);
const exec2 = new BatchedExecutor(graph);
const exec3 = new LazyExecutor(graph);

// Same graph, different behavior!
```

### Composing Executors

```javascript
// Batched + Async
class BatchedAsyncExecutor extends BatchedExecutor {
    async propagate(nodes) {
        const sorted = this.graph.topoSort(nodes);

        for (let id of sorted) {
            const node = this.graph.getNode(id);
            const value = await this.compute(id, node);
            this.values[id] = value;
        }
    }
}
```

## Benefits

### 1. Complete Separation
- Graph is pure data (serialize, save, load)
- Executor is pure logic (swap, test, benchmark)

### 2. Multiple Execution Strategies
- Same graph, different executors
- Easy to compare performance
- Easy to test edge cases

### 3. Composable
- Mix executor features (batched + async)
- Decorate executors (add logging, tracing)

### 4. Analyzable
- Graph can be analyzed (cycles, complexity)
- Without running any code!

## Challenges

### 1. Dependency Tracking
- How to extract dependencies from functions?
- Static analysis? Runtime tracking?

### 2. Feature Integration
- Where does circular detection go? (Graph? Executor?)
- Where do subscriptions go? (Executor?)

### 3. Complexity
- More concepts to understand (graph, executor, runtime)
- More files/classes

### 4. Dynamic Changes
- Adding nodes at runtime?
- Modifying graph structure?

## Advanced: Graph Analysis

```javascript
// Analyze graph structure
class GraphAnalyzer {
    constructor(graph) {
        this.graph = graph;
    }

    detectCycles() {
        // Find all cycles
    }

    complexity(id) {
        // How many dependencies (recursive)
    }

    criticalPath() {
        // Longest dependency chain
    }

    visualize() {
        // Generate DOT format for graphviz
    }
}

// Use it
const analyzer = new GraphAnalyzer(graph);
console.log(analyzer.complexity('y'));  // → 3 (y depends on x, z; z depends on w)
```

## Advanced: Executor Decorators

```javascript
// Add logging to any executor
class LoggingExecutor {
    constructor(executor) {
        this.executor = executor;
    }

    set(id, value) {
        console.log(`set(${id}, ${value})`);
        return this.executor.set(id, value);
    }

    get(id) {
        const value = this.executor.get(id);
        console.log(`get(${id}) → ${value}`);
        return value;
    }
}

// Use it
const base = new ImmediateExecutor(graph);
const logged = new LoggingExecutor(base);
```

## Next Steps

- [ ] Implement graph data structure
- [ ] Implement immediate executor
- [ ] Implement batched executor
- [ ] Add dependency tracking
- [ ] Add circular detection to graph
- [ ] Run against test suite

---

**Key Insight**: Graph is "what". Executor is "how". Separate them completely.
