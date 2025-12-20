/**
 * GRAPH-FIRST ARCHITECTURE
 *
 * The core insight: separate the STRUCTURE (graph) from the STATE (values)
 *
 * Philosophy:
 * - The graph IS the thing (not an implementation detail)
 * - Compute graph structure once, not on every update
 * - Make the graph inspectable, queryable, visualizable
 * - Clarity and maintainability over micro-optimizations
 */

// =============================================================================
// 1. THE GRAPH (immutable structure, built once)
// =============================================================================

class ReactiveGraph {
    constructor(definition, options = {}) {
        this.options = options;
        this.nodes = new Map();        // name -> NodeInfo { name, type, fn }
        this.edges = new Map();        // name -> Set<dependency names>
        this.reverseEdges = new Map(); // name -> Set<dependent names>
        this.executionOrder = [];      // topologically sorted names

        this._build(definition);
        this._validate();
        this._computeExecutionOrder();

        if (options.debug) {
            console.log('Graph built:', {
                nodes: this.nodes.size,
                edges: this.edges.size,
                order: this.executionOrder
            });
        }
    }

    _build(definition) {
        // First pass: identify nodes
        for (let [name, value] of Object.entries(definition)) {
            const isFunction = typeof value === 'function';
            this.nodes.set(name, {
                name,
                type: isFunction ? 'computed' : 'static',
                fn: isFunction ? value : null
            });

            if (isFunction) {
                this.edges.set(name, new Set());
            }
        }

        // Second pass: discover dependencies by running functions once
        for (let [name, node] of this.nodes) {
            if (node.type === 'computed') {
                const deps = this._discoverDependencies(node.fn, name);
                this.edges.set(name, deps);

                // Build reverse edges (who depends on me?)
                for (let dep of deps) {
                    if (!this.reverseEdges.has(dep)) {
                        this.reverseEdges.set(dep, new Set());
                    }
                    this.reverseEdges.get(dep).add(name);
                }
            }
        }
    }

    _discoverDependencies(fn, name) {
        // Run the function with a proxy that tracks what's accessed
        const accessed = new Set();
        const proxy = new Proxy({}, {
            get(target, prop) {
                if (prop === name) {
                    // Self-reference not allowed
                    return undefined;
                }
                accessed.add(prop);
                return undefined; // Return value doesn't matter for discovery
            },
            set(target, prop, value) {
                // Functions shouldn't set values during discovery
                throw new Error(`Function ${name} tried to set ${prop} during dependency discovery`);
            }
        });

        try {
            fn(proxy);
        } catch (e) {
            // Errors during discovery are mostly ok - we got access tracking
            // But filter out only the "tried to set" errors
            if (!e.message.includes('during dependency discovery')) {
                // Other errors are expected (undefined.length, etc)
            }
        }

        return accessed;
    }

    _validate() {
        // Check for cycles using DFS
        const visiting = new Set();
        const visited = new Set();

        const visit = (name, path = []) => {
            if (visited.has(name)) return;
            if (visiting.has(name)) {
                const cycle = [...path, name];
                throw new Error(`Circular dependency detected: ${cycle.join(' -> ')}`);
            }

            visiting.add(name);
            const deps = this.edges.get(name);
            if (deps) {
                for (let dep of deps) {
                    visit(dep, [...path, name]);
                }
            }
            visiting.delete(name);
            visited.add(name);
        };

        for (let name of this.nodes.keys()) {
            if (this.nodes.get(name).type === 'computed') {
                visit(name);
            }
        }
    }

    _computeExecutionOrder() {
        // Topological sort - compute ONCE at graph creation
        // Dependencies execute before their dependents
        const visited = new Set();
        const order = [];

        const visit = (name) => {
            if (visited.has(name)) return;
            visited.add(name);

            const deps = this.edges.get(name);
            if (deps) {
                for (let dep of deps) {
                    visit(dep);
                }
            }

            order.push(name);
        };

        // Visit all computed nodes
        for (let name of this.nodes.keys()) {
            if (this.nodes.get(name).type === 'computed') {
                visit(name);
            }
        }

        this.executionOrder = order;
    }

    // Query the graph
    getDependencies(name) {
        return this.edges.get(name) || new Set();
    }

    getDependents(name) {
        return this.reverseEdges.get(name) || new Set();
    }

    getAffectedNodes(changedNames) {
        // Walk reverse edges to find all affected nodes
        const affected = new Set();
        const queue = [...changedNames];

        while (queue.length > 0) {
            const name = queue.shift();
            const dependents = this.getDependents(name);

            for (let dep of dependents) {
                if (!affected.has(dep)) {
                    affected.add(dep);
                    queue.push(dep);
                }
            }
        }

        return affected;
    }

    // Get subgraph affecting a specific node
    getUpstreamGraph(name) {
        const upstream = new Set();
        const queue = [name];

        while (queue.length > 0) {
            const current = queue.shift();
            const deps = this.getDependencies(current);

            for (let dep of deps) {
                if (!upstream.has(dep)) {
                    upstream.add(dep);
                    queue.push(dep);
                }
            }
        }

        return upstream;
    }

    // Visualization
    toDot() {
        let dot = 'digraph ReactiveGraph {\n';
        dot += '  rankdir=LR;\n';
        dot += '  node [shape=box];\n\n';

        // Color static vs computed nodes
        for (let [name, node] of this.nodes) {
            if (node.type === 'static') {
                dot += `  "${name}" [style=filled, fillcolor=lightblue];\n`;
            } else {
                dot += `  "${name}" [style=filled, fillcolor=lightgreen];\n`;
            }
        }

        dot += '\n';

        // Edges
        for (let [name, deps] of this.edges) {
            for (let dep of deps) {
                dot += `  "${dep}" -> "${name}";\n`;
            }
        }

        dot += '}\n';
        return dot;
    }

    // Summary
    toString() {
        return `ReactiveGraph(nodes=${this.nodes.size}, edges=${this.edges.size})`;
    }
}

// =============================================================================
// 2. THE STATE (mutable values at a point in time)
// =============================================================================

class GraphState {
    constructor(graph, initialValues = {}) {
        this.graph = graph;
        this.values = new Map();
        this.dirty = new Set();
        this.computing = new Set(); // Track what's currently being computed (for cycle detection)

        // Initialize static values
        for (let [name, node] of graph.nodes) {
            if (node.type === 'static') {
                if (name in initialValues) {
                    this.values.set(name, initialValues[name]);
                } else {
                    this.values.set(name, initialValues[name]); // Could be undefined
                }
            }
        }
    }

    get(name) {
        const node = this.graph.nodes.get(name);
        if (!node) {
            throw new Error(`Unknown variable: ${name}`);
        }

        // If it's computed and either dirty or never computed, compute it
        if (node.type === 'computed') {
            if (this.dirty.has(name) || !this.values.has(name)) {
                this._compute(name);
            }
        }

        return this.values.get(name);
    }

    set(name, value) {
        const node = this.graph.nodes.get(name);

        if (!node) {
            throw new Error(`Unknown variable: ${name}`);
        }

        if (node.type === 'computed') {
            throw new Error(`Cannot set computed variable: ${name}`);
        }

        const oldValue = this.values.get(name);

        // Simple equality check (could use deep_equal here)
        if (oldValue === value) {
            return; // No change
        }

        this.values.set(name, value);

        // Mark all dependents as dirty
        const affected = this.graph.getAffectedNodes([name]);
        for (let dep of affected) {
            this.dirty.add(dep);
        }
    }

    _compute(name) {
        const node = this.graph.nodes.get(name);
        if (!node || !node.fn) return;

        // Check for cycles during computation
        if (this.computing.has(name)) {
            throw new Error(`Circular computation detected involving: ${name}`);
        }

        this.computing.add(name);

        try {
            // Create proxy for accessing other values
            const self = this;
            const proxy = new Proxy(this, {
                get(target, prop) {
                    if (prop === name) {
                        // Self-reference during computation
                        throw new Error(`Variable ${name} cannot reference itself`);
                    }
                    return self.get(prop);
                },
                set(target, prop, value) {
                    throw new Error(`Function ${name} cannot set ${prop} - functions are read-only`);
                }
            });

            const result = node.fn(proxy);
            this.values.set(name, result);
            this.dirty.delete(name);
        } finally {
            this.computing.delete(name);
        }
    }

    // Force eager evaluation of all dirty nodes
    flush() {
        // Process in execution order to ensure dependencies compute first
        for (let name of this.graph.executionOrder) {
            if (this.dirty.has(name)) {
                this._compute(name);
            }
        }
    }

    // Get snapshot of current state
    snapshot() {
        return {
            values: Object.fromEntries(this.values),
            dirty: Array.from(this.dirty)
        };
    }
}

// =============================================================================
// 3. THE API (thin wrapper providing familiar $ interface)
// =============================================================================

function auto(definition, options = {}) {
    const graph = new ReactiveGraph(definition, options);
    const state = new GraphState(graph, definition);

    // Create the $ proxy
    const proxy = new Proxy(state, {
        get(target, prop) {
            // Special introspection property
            if (prop === '_') {
                return {
                    // The graph structure
                    graph: graph,

                    // Convenience accessors
                    deps: Object.fromEntries(
                        Array.from(graph.edges.entries()).map(([k, v]) => [k, Array.from(v)])
                    ),
                    dependents: Object.fromEntries(
                        Array.from(graph.reverseEdges.entries()).map(([k, v]) => [k, Array.from(v)])
                    ),
                    fn: Array.from(graph.nodes.entries())
                        .filter(([_, node]) => node.type === 'computed')
                        .map(([name, _]) => name),

                    // Current state
                    value: Object.fromEntries(state.values),
                    dirty: Array.from(state.dirty),

                    // Execution order
                    order: graph.executionOrder,
                };
            }

            // Flush method
            if (prop === 'flush') {
                return () => state.flush();
            }

            // Subscribe method (placeholder for future)
            if (prop === 'subscribe') {
                return (name, callback) => {
                    // TODO: implement subscriptions
                    throw new Error('Subscriptions not yet implemented in graph-first kernel');
                };
            }

            // Visualize method
            if (prop === 'visualize') {
                return () => graph.toDot();
            }

            // Normal property access
            return target.get(prop);
        },
        set(target, prop, value) {
            // Don't allow setting special properties
            if (prop === '_' || prop === 'flush' || prop === 'subscribe' || prop === 'visualize') {
                throw new Error(`Cannot set reserved property: ${prop}`);
            }
            target.set(prop, value);
            return true;
        }
    });

    return proxy;
}

// =============================================================================
// EXPORTS
// =============================================================================

// Export for ES6
export default auto;

// Also export classes for testing
export { ReactiveGraph, GraphState };
