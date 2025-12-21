/**
 * LAYER 3: Reactive System
 *
 * Uses a DirectedGraph to manage reactive computations.
 * Doesn't care HOW the graph was built - just uses it.
 */

class ReactiveSystem {
    constructor(graph, options = {}) {
        this.graph = graph;
        this.options = options;

        // State
        this.values = new Map();
        this.dirty = new Set();
        this.computing = new Set();  // For cycle detection during computation
        this.subscriptions = new Map();  // name -> Map(id -> callback)
        this.nextSubId = 0;  // Counter for subscription IDs
        this.freedSubIds = [];  // Pool of freed subscription IDs to reuse

        // Initialize static values
        for (let [name, metadata] of graph.nodes) {
            if (metadata.type === 'static') {
                this.values.set(name, metadata.initialValue);
            }
            else
            {
                this.dirty.add(name);
            }
        }

        if (options.debug) {
            console.log('ReactiveSystem initialized:', {
                nodes: graph.size(),
                static: this._countNodesByType('static'),
                computed: this._countNodesByType('computed')
            });
        }
    }

    /**
     * Get a value (computes if needed)
     */
    get(name) {
        const metadata = this.graph.nodes.get(name);
        if (!metadata) {
            throw new Error(`Unknown variable: ${name}`);
        }

        // If computed and (dirty or never computed), compute it
        if (metadata.type === 'computed') {
            if (this.dirty.has(name) || !this.values.has(name)) {
                this._compute(name);
            }
        }

        return this.values.get(name);
    }

    /**
     * Set a value (only for static nodes)
     */
    set(name, value) {
        const metadata = this.graph.nodes.get(name);
        if (!metadata) {
            throw new Error(`Unknown variable: ${name}`);
        }

        if (metadata.type === 'computed') {
            throw new Error(`Cannot set computed variable: ${name}`);
        }

        const oldValue = this.values.get(name);

        // Simple equality check (could use deep_equal)
        if (oldValue === value) {
            return; // No change
        }

        // Update value
        this.values.set(name, value);

        // Mark all reachable nodes as dirty (using the graph!)
        const affected = this.graph.getReachable([name]);
        for (let node of affected) {
            this.dirty.add(node);
        }

        // Notify subscribers of static value change
        this._notifySubscribers(name, value);

        if (this.options.debug) {
            console.log(`Set ${name}, affected:`, Array.from(affected));
        }
    }

    /**
     * Compute a single node
     */
    _compute(name) {

        const metadata = this.graph.nodes.get(name);
        if (!metadata || !metadata.fn) return;

        // Cycle detection
        if (this.computing.has(name)) {
            const cycle = Array.from(this.computing);
            cycle.push(name);
            throw new Error(`Circular computation detected: ${cycle.join(' -> ')}`);
        }

        this.computing.add(name);

        try {
            // Create proxy for function to access other values
            const self = this;
            const proxy = new Proxy(this, {
                get(target, prop) {
                    if (prop === name) {
                        throw new Error(`Variable ${name} cannot reference itself`);
                    }
                    // Recursively get (may trigger nested computation)
                    return self.get(prop);
                },
                set(target, prop, value) {
                    throw new Error(`Function ${name} cannot set ${prop} - functions are read-only`);
                }
            });

            // Get old value for change detection
            const oldValue = this.values.get(name);

            // Execute the function
            const result = metadata.fn(proxy);

            // Store result and mark clean
            this.values.set(name, result);
            this.dirty.delete(name);

            // Notify subscribers if value changed
            if (oldValue !== result) {
                this._notifySubscribers(name, result);
            }

            if (this.options.debug) {
                console.log(`Computed ${name} =`, result);
            }
        } finally {
            this.computing.delete(name);
        }
    }

    /**
     * Flush - eagerly compute all dirty nodes in topological order
     */
    flush() {
        
        const order = this.graph.topologicalSort();

        for (let name of order) {
            if (this.dirty.has(name)) {
                this._compute(name);
            }
        }
    }

    /**
     * Get snapshot of current state
     */
    snapshot() {
        return {
            values: Object.fromEntries(this.values),
            dirty: Array.from(this.dirty)
        };
    }

    /**
     * Subscribe to value changes
     */
    subscribe(name, callback) {
        const metadata = this.graph.nodes.get(name);
        if (!metadata) {
            throw new Error(`Unknown variable: ${name}`);
        }

        // Reuse freed ID or create new one
        let subId;
        if (this.freedSubIds.length > 0) {
            subId = this.freedSubIds.shift();
        } else {
            subId = String(this.nextSubId++).padStart(3, '0');
        }

        // Initialize subscriptions map for this variable if needed
        if (!this.subscriptions.has(name)) {
            this.subscriptions.set(name, new Map());
        }

        // Store the callback
        this.subscriptions.get(name).set(subId, callback);

        // Call immediately with current value
        callback(this.get(name));

        // Return unsubscribe function
        const self = this;
        return () => {
            self.subscriptions.get(name)?.delete(subId);
            // Add freed ID to pool for reuse
            self.freedSubIds.push(subId);
            // Keep freed IDs sorted
            self.freedSubIds.sort();
        };
    }

    /**
     * Notify all subscribers of a value change
     */
    _notifySubscribers(name, value) {
        const subs = this.subscriptions.get(name);
        if (subs) {
            for (let [_, callback] of subs) {
                callback(value);
            }
        }
    }

    /**
     * Utilities
     */
    _countNodesByType(type) {
        let count = 0;
        for (let [_, metadata] of this.graph.nodes) {
            if (metadata.type === type) count++;
        }
        return count;
    }
}

export default ReactiveSystem;
