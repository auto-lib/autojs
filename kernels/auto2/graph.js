/**
 * GRAPH - Reactive Dependencies
 *
 * Pure dependency tracking and recomputation.
 * Doesn't know about timing/queues - just about values and their relationships.
 */

function graph() {
    let values = {};
    let fns = {};
    let deps = {};         // name -> Set of names it depends on
    let dependents = {};   // name -> Set of names that depend on it
    let computing = null;  // which fn is currently running (for dep tracking)
    let stack = [];        // for circular dependency detection

    /**
     * Define a static value or computed function
     */
    function define(name, fnOrValue) {
        if (typeof fnOrValue === 'function') {
            fns[name] = fnOrValue;
            // Don't compute yet - will be computed on first access
        } else {
            values[name] = fnOrValue;
        }
    }

    /**
     * Get a value, computing if necessary
     * Tracks dependencies if called during a computation
     */
    function get(name) {
        // Track dependency if we're inside a computation
        if (computing !== null) {
            if (!deps[computing]) deps[computing] = new Set();
            deps[computing].add(name);
            if (!dependents[name]) dependents[name] = new Set();
            dependents[name].add(computing);
        }

        // Compute if it's a function and not yet computed
        if (name in fns && !(name in values)) {
            compute(name);
        }

        return values[name];
    }

    /**
     * Set a static value
     * Returns the set of names that were invalidated
     */
    function set(name, value) {
        // Check for side effects - setting from within a computation
        if (computing !== null) {
            throw new Error(`function ${computing} is trying to change value ${name}`);
        }

        values[name] = value;
        return invalidate(name);
    }

    /**
     * Compute a function's value, tracking dependencies
     */
    function compute(name) {
        // Circular dependency check
        if (stack.includes(name)) {
            throw new Error(`circular dependency: ${stack.join(' -> ')} -> ${name}`);
        }

        // Clear old deps for this name
        if (deps[name]) {
            for (let dep of deps[name]) {
                if (dependents[dep]) {
                    dependents[dep].delete(name);
                }
            }
        }
        deps[name] = new Set();

        // Run with tracking
        stack.push(name);
        let prev = computing;
        computing = name;

        // The getter proxy - this is what $ is in auto
        // It's a proxy so you can write $.data instead of $('data')
        let proxy = new Proxy({}, {
            get(_, prop) {
                return get(prop);
            },
            set(_, prop, val) {
                throw new Error(`function ${name} is trying to change value ${prop}`);
            }
        });

        try {
            values[name] = fns[name](proxy);
        } finally {
            computing = prev;
            stack.pop();
        }
    }

    /**
     * Invalidate dependents of a name
     * Returns the set of all affected names (in no particular order)
     */
    function invalidate(name) {
        let affected = new Set();

        function visit(n) {
            if (dependents[n]) {
                for (let dep of dependents[n]) {
                    if (!affected.has(dep) && dep in fns) {
                        affected.add(dep);
                        delete values[dep];  // mark as needing recomputation
                        visit(dep);
                    }
                }
            }
        }

        visit(name);
        return affected;
    }

    /**
     * Recompute a set of names in dependency order
     */
    function recompute(names) {
        // Simple topological sort
        let sorted = topSort(names);

        for (let name of sorted) {
            if (name in fns && !(name in values)) {
                compute(name);
            }
        }
    }

    /**
     * Topological sort - compute dependencies before dependents
     */
    function topSort(names) {
        let sorted = [];
        let visited = new Set();
        let visiting = new Set();

        function visit(name) {
            if (visited.has(name)) return;
            if (visiting.has(name)) return;  // cycle - skip

            visiting.add(name);

            // Visit dependencies first
            if (deps[name]) {
                for (let dep of deps[name]) {
                    if (names.has(dep)) {
                        visit(dep);
                    }
                }
            }

            visiting.delete(name);
            visited.add(name);
            sorted.push(name);
        }

        for (let name of names) {
            visit(name);
        }

        return sorted;
    }

    /**
     * Check if a name is defined
     */
    function has(name) {
        return name in values || name in fns;
    }

    /**
     * Get all defined names
     */
    function keys() {
        let all = new Set([...Object.keys(values), ...Object.keys(fns)]);
        return Array.from(all);
    }

    return {
        define,
        get,
        set,
        recompute,
        has,
        keys,
        _: { values, fns, deps, dependents }
    };
}

export { graph };
