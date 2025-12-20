# Three-Layer Architecture: A Better Separation

## Your Insight

You're absolutely correct! We can separate this into three distinct, independent layers:

```
┌─────────────────────────────────────────┐
│  Layer 3: REACTIVE SYSTEM               │
│  - Manages values and dirty flags       │
│  - Provides $ API                       │
│  - Triggers recomputation                │
│  - Uses graph for queries                │
└─────────────────────────────────────────┘
                  ↓ uses
┌─────────────────────────────────────────┐
│  Layer 2: GRAPH BUILDER (Strategy)      │
│  - Static Analysis                      │
│  - Runtime Tracking                     │
│  - Explicit Declaration                 │
│  - Builds/updates the graph             │
└─────────────────────────────────────────┘
                  ↓ builds
┌─────────────────────────────────────────┐
│  Layer 1: GRAPH DATA STRUCTURE          │
│  - Pure data structure                  │
│  - addNode(), addEdge()                 │
│  - getDependents(), topologicalSort()   │
│  - No knowledge of Auto.js              │
└─────────────────────────────────────────┘
```

## Layer 1: Pure Graph Data Structure

**Completely independent module** - knows nothing about reactivity, Auto.js, or dependencies.

```javascript
// graph.js - A pure directed graph data structure

class DirectedGraph {
    constructor() {
        this.nodes = new Map();         // node_id -> { metadata }
        this.edges = new Map();         // node_id -> Set<node_id>
        this.reverseEdges = new Map();  // node_id -> Set<node_id>
    }

    // Basic operations
    addNode(id, metadata = {}) {
        this.nodes.set(id, metadata);
        if (!this.edges.has(id)) {
            this.edges.set(id, new Set());
        }
        if (!this.reverseEdges.has(id)) {
            this.reverseEdges.set(id, new Set());
        }
    }

    removeNode(id) {
        this.nodes.delete(id);
        this.edges.delete(id);
        this.reverseEdges.delete(id);
        // Remove edges pointing to this node
        for (let [_, targets] of this.edges) {
            targets.delete(id);
        }
        for (let [_, sources] of this.reverseEdges) {
            sources.delete(id);
        }
    }

    addEdge(from, to) {
        // Forward edge: from -> to
        if (!this.edges.has(from)) {
            this.edges.set(from, new Set());
        }
        this.edges.get(from).add(to);

        // Reverse edge: to <- from
        if (!this.reverseEdges.has(to)) {
            this.reverseEdges.set(to, new Set());
        }
        this.reverseEdges.get(to).add(from);
    }

    removeEdge(from, to) {
        this.edges.get(from)?.delete(to);
        this.reverseEdges.get(to)?.delete(from);
    }

    // Query operations
    getSuccessors(id) {
        return this.edges.get(id) || new Set();
    }

    getPredecessors(id) {
        return this.reverseEdges.get(id) || new Set();
    }

    // Find all nodes reachable from given nodes (following edges)
    getReachable(startNodes) {
        const reachable = new Set();
        const queue = [...startNodes];

        while (queue.length > 0) {
            const node = queue.shift();
            const successors = this.getSuccessors(node);

            for (let succ of successors) {
                if (!reachable.has(succ)) {
                    reachable.add(succ);
                    queue.push(succ);
                }
            }
        }

        return reachable;
    }

    // Find all nodes that can reach given nodes (following reverse edges)
    getAncestors(endNodes) {
        const ancestors = new Set();
        const queue = [...endNodes];

        while (queue.length > 0) {
            const node = queue.shift();
            const predecessors = this.getPredecessors(node);

            for (let pred of predecessors) {
                if (!ancestors.has(pred)) {
                    ancestors.add(pred);
                    queue.push(pred);
                }
            }
        }

        return ancestors;
    }

    // Topological sort
    topologicalSort() {
        const sorted = [];
        const visited = new Set();
        const visiting = new Set();

        const visit = (node) => {
            if (visited.has(node)) return;
            if (visiting.has(node)) {
                throw new Error(`Cycle detected involving: ${node}`);
            }

            visiting.add(node);

            // Visit dependencies first
            const dependencies = this.getSuccessors(node);
            for (let dep of dependencies) {
                visit(dep);
            }

            visiting.delete(node);
            visited.add(node);
            sorted.push(node);
        };

        for (let node of this.nodes.keys()) {
            visit(node);
        }

        return sorted;
    }

    // Detect cycles
    hasCycle() {
        const visited = new Set();
        const visiting = new Set();

        const visit = (node) => {
            if (visited.has(node)) return false;
            if (visiting.has(node)) return true; // Cycle!

            visiting.add(node);
            const successors = this.getSuccessors(node);
            for (let succ of successors) {
                if (visit(succ)) return true;
            }
            visiting.delete(node);
            visited.add(node);
            return false;
        };

        for (let node of this.nodes.keys()) {
            if (visit(node)) return true;
        }

        return false;
    }

    // Visualization
    toDot() {
        let dot = 'digraph G {\n';
        for (let [node, successors] of this.edges) {
            for (let succ of successors) {
                dot += `  "${node}" -> "${succ}";\n`;
            }
        }
        dot += '}\n';
        return dot;
    }

    // Utilities
    size() {
        return this.nodes.size;
    }

    clone() {
        const g = new DirectedGraph();
        for (let [id, metadata] of this.nodes) {
            g.addNode(id, { ...metadata });
        }
        for (let [from, targets] of this.edges) {
            for (let to of targets) {
                g.addEdge(from, to);
            }
        }
        return g;
    }
}

export default DirectedGraph;
```

**This is completely generic!** Could be used for:
- Task dependencies
- Build systems
- Package managers
- Any directed graph

## Layer 2: Graph Builder (Strategy Pattern)

**Builds the graph using different strategies.** Knows about Auto.js functions and dependencies.

```javascript
// graph-builder.js

import DirectedGraph from './graph.js';

/**
 * Abstract base class for graph building strategies
 */
class GraphBuilder {
    build(definition) {
        throw new Error('Must implement build()');
    }
}

/**
 * Strategy 1: Static Analysis
 * Parse function source to find dependencies
 */
class StaticAnalysisBuilder extends GraphBuilder {
    build(definition) {
        const graph = new DirectedGraph();

        // Add nodes
        for (let [name, value] of Object.entries(definition)) {
            const isFunction = typeof value === 'function';
            graph.addNode(name, {
                type: isFunction ? 'computed' : 'static',
                fn: isFunction ? value : null,
                value: isFunction ? undefined : value
            });
        }

        // Add edges via static analysis
        for (let [name, metadata] of graph.nodes) {
            if (metadata.type === 'computed') {
                const deps = this._analyzeFunction(metadata.fn, name);
                for (let dep of deps) {
                    // Edge: name depends on dep
                    // So in execution: dep -> name
                    graph.addEdge(dep, name);
                }
            }
        }

        return graph;
    }

    _analyzeFunction(fn, name) {
        const source = fn.toString();
        const regex = /\$\.(\w+)/g;
        const deps = new Set();
        let match;

        while ((match = regex.exec(source)) !== null) {
            if (match[1] !== name) {
                deps.add(match[1]);
            }
        }

        return deps;
    }
}

/**
 * Strategy 2: Runtime Tracking
 * Discover dependencies by execution
 */
class RuntimeTrackingBuilder extends GraphBuilder {
    build(definition) {
        const graph = new DirectedGraph();

        // Add nodes
        for (let [name, value] of Object.entries(definition)) {
            const isFunction = typeof value === 'function';
            graph.addNode(name, {
                type: isFunction ? 'computed' : 'static',
                fn: isFunction ? value : null,
                value: isFunction ? undefined : value
            });
        }

        // Add edges via proxy tracking
        for (let [name, metadata] of graph.nodes) {
            if (metadata.type === 'computed') {
                const deps = this._trackExecution(metadata.fn, name);
                for (let dep of deps) {
                    graph.addEdge(dep, name);
                }
            }
        }

        return graph;
    }

    _trackExecution(fn, name) {
        const accessed = new Set();
        const proxy = new Proxy({}, {
            get(target, prop) {
                if (prop !== name) {
                    accessed.add(prop);
                }
                return undefined;
            }
        });

        try {
            fn(proxy);
        } catch (e) {
            // Expected
        }

        return accessed;
    }

    // Can also update graph at runtime
    updateDependencies(graph, name, newDeps) {
        // Remove old edges
        const oldDeps = graph.getSuccessors(name);
        for (let dep of oldDeps) {
            graph.removeEdge(dep, name);
        }

        // Add new edges
        for (let dep of newDeps) {
            graph.addEdge(dep, name);
        }
    }
}

/**
 * Strategy 3: Explicit Declaration
 * User provides dependencies
 */
class ExplicitBuilder extends GraphBuilder {
    build(definition) {
        const graph = new DirectedGraph();

        // Add nodes
        for (let [name, value] of Object.entries(definition)) {
            if (value && value.__computed) {
                // Explicit: { deps: [...], fn: ... }
                graph.addNode(name, {
                    type: 'computed',
                    fn: value.fn,
                    value: undefined
                });

                // Add edges from declared deps
                for (let dep of value.deps) {
                    graph.addEdge(dep, name);
                }
            } else {
                const isFunction = typeof value === 'function';
                graph.addNode(name, {
                    type: isFunction ? 'computed' : 'static',
                    fn: isFunction ? value : null,
                    value: isFunction ? undefined : value
                });

                // Fallback to tracking if no explicit deps
                if (isFunction) {
                    const tracker = new RuntimeTrackingBuilder();
                    const deps = tracker._trackExecution(value, name);
                    for (let dep of deps) {
                        graph.addEdge(dep, name);
                    }
                }
            }
        }

        return graph;
    }
}

export {
    GraphBuilder,
    StaticAnalysisBuilder,
    RuntimeTrackingBuilder,
    ExplicitBuilder
};
```

**Strategies are interchangeable!** Same interface, different behavior.

## Layer 3: Reactive System

**Uses the graph.** Manages values, dirty tracking, and the $ API.

```javascript
// reactive.js

class ReactiveSystem {
    constructor(graph) {
        this.graph = graph;
        this.values = new Map();
        this.dirty = new Set();
        this.computing = new Set();

        // Initialize static values
        for (let [name, metadata] of graph.nodes) {
            if (metadata.type === 'static') {
                this.values.set(name, metadata.value);
            }
        }
    }

    get(name) {
        const metadata = this.graph.nodes.get(name);
        if (!metadata) throw new Error(`Unknown: ${name}`);

        if (metadata.type === 'computed') {
            if (this.dirty.has(name) || !this.values.has(name)) {
                this._compute(name);
            }
        }

        return this.values.get(name);
    }

    set(name, value) {
        const metadata = this.graph.nodes.get(name);
        if (!metadata) throw new Error(`Unknown: ${name}`);
        if (metadata.type === 'computed') {
            throw new Error(`Cannot set computed: ${name}`);
        }

        const oldValue = this.values.get(name);
        if (oldValue === value) return;

        this.values.set(name, value);

        // Use graph to find affected nodes
        const affected = this.graph.getReachable([name]);
        for (let node of affected) {
            this.dirty.add(node);
        }
    }

    _compute(name) {
        const metadata = this.graph.nodes.get(name);
        if (!metadata || !metadata.fn) return;

        if (this.computing.has(name)) {
            throw new Error(`Circular computation: ${name}`);
        }

        this.computing.add(name);

        try {
            const self = this;
            const proxy = new Proxy(this, {
                get(target, prop) {
                    return self.get(prop);
                },
                set() {
                    throw new Error('Functions are read-only');
                }
            });

            const result = metadata.fn(proxy);
            this.values.set(name, result);
            this.dirty.delete(name);
        } finally {
            this.computing.delete(name);
        }
    }

    flush() {
        const order = this.graph.topologicalSort();
        for (let name of order) {
            if (this.dirty.has(name)) {
                this._compute(name);
            }
        }
    }
}

export default ReactiveSystem;
```

**This layer just uses the graph!** It doesn't know HOW the graph was built.

## Putting It Together

```javascript
// auto.js - The high-level API

import DirectedGraph from './graph.js';
import { StaticAnalysisBuilder } from './graph-builder.js';
import ReactiveSystem from './reactive.js';

function auto(definition, options = {}) {
    // Layer 2: Build the graph
    const builder = options.builder || new StaticAnalysisBuilder();
    const graph = builder.build(definition);

    // Validate
    if (graph.hasCycle()) {
        throw new Error('Circular dependencies detected');
    }

    // Layer 3: Create reactive system
    const reactive = new ReactiveSystem(graph);

    // Create API proxy
    const proxy = new Proxy(reactive, {
        get(target, prop) {
            if (prop === '_') {
                return {
                    graph: graph,
                    values: Object.fromEntries(target.values),
                    dirty: Array.from(target.dirty)
                };
            }
            if (prop === 'flush') {
                return () => target.flush();
            }
            return target.get(prop);
        },
        set(target, prop, value) {
            target.set(prop, value);
            return true;
        }
    });

    return proxy;
}

// Use different strategies
import { RuntimeTrackingBuilder, ExplicitBuilder } from './graph-builder.js';

// Static analysis (default)
const $1 = auto({ data: null, count: ($) => $.data?.length ?? 0 });

// Runtime tracking
const $2 = auto(
    { data: null, count: ($) => $.data?.length ?? 0 },
    { builder: new RuntimeTrackingBuilder() }
);

// Explicit
const $3 = auto(
    { data: null, count: computed(['data'], ($) => $.data?.length ?? 0) },
    { builder: new ExplicitBuilder() }
);
```

## Benefits of This Separation

### 1. Layer 1 (Graph) is Reusable

```javascript
// Use for anything!
import DirectedGraph from './graph.js';

// Task runner
const tasks = new DirectedGraph();
tasks.addNode('build', { command: 'npm run build' });
tasks.addNode('test', { command: 'npm test' });
tasks.addEdge('build', 'test'); // test depends on build

// Package manager
const packages = new DirectedGraph();
packages.addNode('react');
packages.addNode('react-dom');
packages.addEdge('react', 'react-dom');
```

### 2. Layer 2 (Strategy) is Swappable

```javascript
// Easy to switch strategies
const staticBuilder = new StaticAnalysisBuilder();
const runtimeBuilder = new RuntimeTrackingBuilder();
const explicitBuilder = new ExplicitBuilder();

// Or even create your own!
class CustomBuilder extends GraphBuilder {
    build(definition) {
        // Your custom logic
    }
}
```

### 3. Layer 3 (Reactive) is Decoupled

```javascript
// Reactive system doesn't care HOW graph was built
const graph1 = staticBuilder.build(def);
const graph2 = runtimeBuilder.build(def);

// Same reactive system works with both
const reactive1 = new ReactiveSystem(graph1);
const reactive2 = new ReactiveSystem(graph2);
```

## Testing Each Layer Independently

```javascript
// Test Layer 1 (graph) independently
describe('DirectedGraph', () => {
    it('should detect cycles', () => {
        const g = new DirectedGraph();
        g.addNode('a');
        g.addNode('b');
        g.addEdge('a', 'b');
        g.addEdge('b', 'a');
        assert(g.hasCycle());
    });
});

// Test Layer 2 (builders) independently
describe('StaticAnalysisBuilder', () => {
    it('should find all dependencies', () => {
        const builder = new StaticAnalysisBuilder();
        const graph = builder.build({
            a: 1,
            b: ($) => $.a + 2
        });
        assert(graph.getSuccessors('a').has('b'));
    });
});

// Test Layer 3 (reactive) independently
describe('ReactiveSystem', () => {
    it('should recompute when dirty', () => {
        const graph = new DirectedGraph();
        graph.addNode('a', { type: 'static', value: 1 });
        graph.addNode('b', { type: 'computed', fn: ($) => $.a * 2 });
        graph.addEdge('a', 'b');

        const reactive = new ReactiveSystem(graph);
        assert.equal(reactive.get('b'), 2);
    });
});
```

## Summary

Yes, you're absolutely right! Three layers:

1. **Graph Data Structure** (Layer 1)
   - Pure, generic directed graph
   - No knowledge of Auto.js
   - Could use Map, could use arrays, could use anything
   - Completely reusable

2. **Graph Builder Strategy** (Layer 2)
   - How to build the graph
   - Static analysis, runtime tracking, explicit, custom
   - Interchangeable strategies
   - Knows about Auto.js specifics

3. **Reactive System** (Layer 3)
   - Uses the graph
   - Manages values and dirty tracking
   - Provides $ API
   - Doesn't care how graph was built

This is a **much cleaner architecture** than what I originally built. Each layer has a single responsibility and can be tested/used independently.

Want me to implement this properly as a clean three-layer system?
