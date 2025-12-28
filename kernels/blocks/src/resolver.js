/**
 * Module 4: Resolver
 *
 * Simple execution engine that:
 * - Tracks which values are "stale" (need recomputation)
 * - Executes functions in topological order
 * - Caches computed values
 *
 * No complex kernel/signals - just straightforward execution.
 */

/**
 * Resolver - executes functions to resolve stale values
 */
export class Resolver {
    constructor(graph, functions) {
        this.graph = graph;           // DirectedGraph instance
        this.functions = functions;   // Map or Object: name -> function
        this.values = new Map();      // Cached values
        this.stale = new Set();       // Variables that need recomputation
        this._fatal = {};             // Fatal errors (for $._  compatibility)

        // Initialize with static values and mark computed values as stale
        for (let [name, fn] of Object.entries(functions)) {
            if (typeof fn !== 'function') {
                this.values.set(name, fn);
            } else {
                // Mark computed values as stale initially
                this.stale.add(name);
            }
        }
    }

    /**
     * Set a variable's value (marks dependents as stale)
     */
    set(name, value) {
        // Update value
        this.values.set(name, value);

        // Mark all dependents as stale
        const affected = this.graph.getReachable([name]);
        for (let dep of affected) {
            this.stale.add(dep);
        }
    }

    /**
     * Get a variable's value (resolves if stale)
     */
    get(name) {
        // If stale, resolve it first
        if (this.stale.has(name)) {
            this.resolve(name);
        }

        return this.values.get(name);
    }

    /**
     * Resolve a single variable (and its dependencies)
     */
    resolve(name) {
        if (!this.stale.has(name)) {
            return; // Already fresh
        }

        // Get all stale ancestors that need to execute first
        const staleAncestors = new Set();
        const ancestors = this.graph.getAncestors([name]);

        for (let ancestor of ancestors) {
            if (this.stale.has(ancestor)) {
                staleAncestors.add(ancestor);
            }
        }

        // Include the target variable itself
        staleAncestors.add(name);

        // Execute in topological order (dependencies first)
        const order = this._topologicalSort(staleAncestors);

        for (let varName of order) {
            this._execute(varName);
            this.stale.delete(varName);
        }
    }

    /**
     * Resolve all stale values
     */
    resolveAll() {
        if (this.stale.size === 0) {
            return; // Nothing to do
        }

        // Execute all stale variables in topological order
        const order = this._topologicalSort(this.stale);

        for (let name of order) {
            this._execute(name);
            this.stale.delete(name);
        }
    }

    /**
     * Execute a function and cache its result
     */
    _execute(name) {
        const fn = this.functions[name];

        if (typeof fn !== 'function') {
            return; // Static value, nothing to execute
        }

        // Determine block context (if namespaced)
        const blockPrefix = name.includes('.') ? name.split('.')[0] + '.' : '';

        // Create proxy for function to read values
        const $ = new Proxy({}, {
            get: (target, prop) => {
                // First try direct access (for cross-block references)
                if (this.values.has(prop)) {
                    return this.values.get(prop);
                }

                // Then try block-scoped access (blockName.prop)
                if (blockPrefix) {
                    const scopedProp = blockPrefix + prop;
                    if (this.values.has(scopedProp)) {
                        return this.values.get(scopedProp);
                    }
                }

                // Not found
                return undefined;
            }
        });

        // Execute and cache
        const result = fn($);
        this.values.set(name, result);
    }

    /**
     * Topological sort of a subset of nodes
     */
    _topologicalSort(nodes) {
        const sorted = [];
        const visited = new Set();
        const visiting = new Set();
        const path = [];

        const visit = (node) => {
            if (!nodes.has(node)) return; // Only process nodes in subset
            if (visited.has(node)) return;
            if (visiting.has(node)) {
                // Cycle detected - record the cycle path
                const cycleStart = path.indexOf(node);
                const cycle = path.slice(cycleStart);
                cycle.push(node);

                this._fatal = {
                    msg: `Cycle detected involving: ${node}`,
                    stack: cycle
                };

                throw new Error(`Cycle detected involving: ${node}`);
            }

            visiting.add(node);
            path.push(node);

            // Visit dependencies first
            const deps = this.graph.getPredecessors(node);
            for (let dep of deps) {
                visit(dep);
            }

            path.pop();
            visiting.delete(node);
            visited.add(node);
            sorted.push(node);
        };

        // Visit all nodes in the subset
        for (let node of nodes) {
            visit(node);
        }

        return sorted;
    }

    /**
     * Check if a variable is stale
     */
    isStale(name) {
        return this.stale.has(name);
    }

    /**
     * Mark a variable as stale (without setting its value)
     */
    markStale(name) {
        this.stale.add(name);

        // Mark dependents as stale
        const affected = this.graph.getReachable([name]);
        for (let dep of affected) {
            this.stale.add(dep);
        }
    }

    /**
     * Clear all stale flags
     */
    clearStale() {
        this.stale.clear();
    }

    /**
     * Debug helpers
     */
    getStale() {
        return Array.from(this.stale);
    }

    getAllValues() {
        return Object.fromEntries(this.values);
    }
}
