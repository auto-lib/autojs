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
        this.subscriptions = new Map(); // name -> Map of id -> callback
        this.nextSubId = 0;           // Counter for subscription IDs
        this.reportedCycles = new Set(); // Track reported cycles to avoid flooding

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

        // Notify subscribers of the value that was set
        this._notifySubscribers(name);

        // Eagerly resolve all stale values and notify their subscribers
        // This provides push-based reactivity (like v0.54) instead of lazy evaluation
        this.resolveAll();
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

        // Track which variables were resolved
        const resolved = new Set();

        for (let varName of order) {
            this._execute(varName);
            this.stale.delete(varName);
            resolved.add(varName);
        }

        // Notify subscribers after all values are resolved
        for (let varName of resolved) {
            this._notifySubscribers(varName);
        }
    }

    /**
     * Resolve all stale values
     */
    resolveAll() {
        if (this.stale.size === 0) {
            return; // Nothing to do
        }

        // Track which variables were resolved for subscription notifications
        const resolved = new Set();

        // Execute all stale variables in topological order
        try {
            const order = this._topologicalSort(this.stale);

            for (let name of order) {
                try {
                    this._execute(name);
                    this.stale.delete(name);
                    resolved.add(name);
                } catch (err) {
                    // Store error but continue with other variables
                    this._fatal[name] = err.message || String(err);
                    this.stale.delete(name);
                }
            }
        } catch (err) {
            // Topological sort failed (circular dependency)
            // Leave variables stale - they can't be resolved
            // Error will be thrown when trying to access them
        }

        // Notify subscribers after all values are resolved
        for (let name of resolved) {
            this._notifySubscribers(name);
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

        // Skip callback functions (starting with #)
        if (name.startsWith('#')) {
            return; // Callbacks are not computed, they're invoked externally
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

        // Create 'set' callback for async functions
        const set = (value) => {
            this.values.set(name, value);
            // Mark dependents as stale when async value is set
            const affected = this.graph.getReachable([name]);
            for (let dep of affected) {
                this.stale.add(dep);
            }
        };

        // Check if function expects 'set' callback (2 parameters)
        const expectsSetCallback = fn.length >= 2;

        // Execute function (with set callback for async support)
        try {
            const result = fn($, set);

            // Handle the result based on function signature
            if (result && typeof result.then === 'function') {
                // Promise (async function) - await it
                result.then(value => {
                    this.values.set(name, value);
                    // Mark dependents as stale
                    const affected = this.graph.getReachable([name]);
                    for (let dep of affected) {
                        this.stale.add(dep);
                    }
                    // Notify subscribers that value has been set
                    this._notifySubscribers(name);
                    // Eagerly resolve all stale values to provide push-based reactivity
                    this.resolveAll();
                }).catch(err => {
                    console.error(`Error in async function ${name}:`, err);
                });
            } else if (!expectsSetCallback) {
                // Synchronous function - cache result immediately
                this.values.set(name, result);
            }
            // If expectsSetCallback is true and no promise, don't cache the result
            // The value will be set when the callback is invoked
        }
        catch(e)
        {
            console.log('Error running function',name,e);
        }
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

                const cycleStr = cycle.join(' → ');

                // Only log each unique cycle once to avoid console flooding
                if (!this.reportedCycles.has(cycleStr)) {
                    console.error(`🔴 CIRCULAR DEPENDENCY: ${cycleStr}`);
                    this.reportedCycles.add(cycleStr);
                }

                this._fatal = {
                    msg: `Cycle detected: ${cycleStr}`,
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
     * Subscribe to changes on a variable
     */
    subscribe(name, callback) {
        // Immediately call callback with current value (required for Svelte stores)
        const currentValue = this.get(name);
        callback(currentValue);

        // Create subscription map for this variable if it doesn't exist
        if (!this.subscriptions.has(name)) {
            this.subscriptions.set(name, new Map());
        }

        // Generate unique ID (padded to 3 digits like '000', '001', etc.)
        const id = String(this.nextSubId++).padStart(3, '0');

        // Store the callback
        this.subscriptions.get(name).set(id, callback);

        // Return unsubscribe function
        return () => {
            if (this.subscriptions.has(name)) {
                this.subscriptions.get(name).delete(id);

                // Clean up empty maps
                if (this.subscriptions.get(name).size === 0) {
                    this.subscriptions.delete(name);
                }
            }
        };
    }

    /**
     * Notify subscribers of a variable change
     */
    _notifySubscribers(name) {
        if (!this.subscriptions.has(name)) {
            return; // No subscribers
        }

        const value = this.values.get(name);
        const subscribers = this.subscriptions.get(name);

        for (let callback of subscribers.values()) {
            try {
                callback(value);
            } catch (err) {
                console.error(`Error in subscriber for ${name}:`, err);
            }
        }
    }

    /**
     * Get subscription IDs for a variable (for $._  compatibility)
     */
    getSubscriptionIds(name) {
        if (!this.subscriptions.has(name)) {
            return [];
        }
        return Array.from(this.subscriptions.get(name).keys());
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
