/**
 * GRAPH - Reactive Handlers for Kernel
 *
 * This module provides handler configurations that implement
 * reactive semantics on top of the kernel.
 *
 * Signals:
 *   - get: (immediate) read a value, track dependency
 *   - set: (deferred) write a value, trigger dependents
 *   - run: (deferred) execute a computed function
 *   - define: (deferred) define a static or computed value
 *   - invalidate: (deferred) mark dependents as needing recomputation
 */

/**
 * Create reactive handlers for a kernel
 */
function createReactiveHandlers() {
    return {
        /**
         * GET - immediate, returns value
         * Tracks dependency if called during a computation
         */
        get: {
            policy: 'immediate',
            handler: (name, value, sig, state) => {
                let { target, parent } = value;

                // Track dependency if we're inside a computation
                if (parent) {
                    if (!state.deps[parent]) state.deps[parent] = {};
                    if (!(target in state.deps[parent])) {
                        state.deps[parent][target] = true;

                        // Track reverse dependency
                        if (!state.dependents[target]) state.dependents[target] = {};
                        state.dependents[target][parent] = true;

                        // Check for circular dependency
                        sig('check_circle', parent);
                    }
                }

                // Compute if needed
                if (target in state.fns && !(target in state.cache)) {
                    sig('run', target);
                    // After run, need to step to actually execute it
                    // But we're immediate... this is tricky
                    // For now, run synchronously
                    runFn(target, sig, state);
                }

                return state.cache[target];
            }
        },

        /**
         * SET - deferred, stores value and triggers dependents
         */
        set: {
            policy: 'deferred',
            handler: (name, value, sig, state) => {
                let { target, val } = value;

                // Check for side effects
                if (state.computing) {
                    state.fatal = { msg: `function ${state.computing} is trying to change value ${target}` };
                    return;
                }

                state.cache[target] = val;

                // Trigger dependents
                sig('invalidate', target);
            }
        },

        /**
         * RUN - deferred, executes a computed function
         */
        run: {
            policy: 'deferred',
            handler: (name, value, sig, state) => {
                let target = value;
                runFn(target, sig, state);
            }
        },

        /**
         * DEFINE - deferred, defines a value or function
         */
        define: {
            policy: 'deferred',
            handler: (name, value, sig, state) => {
                let { target, val } = value;

                if (typeof val === 'function') {
                    state.fns[target] = val;
                    state.deps[target] = {};
                    sig('run', target);
                } else {
                    state.cache[target] = val;
                }
            }
        },

        /**
         * INVALIDATE - deferred, marks dependents for recomputation
         */
        invalidate: {
            policy: 'deferred',
            handler: (name, value, sig, state) => {
                let target = value;

                if (!state.dependents[target]) return;

                for (let dep of Object.keys(state.dependents[target])) {
                    if (dep in state.fns) {
                        delete state.cache[dep];  // mark as stale
                        sig('run', dep);
                        sig('invalidate', dep);  // cascade
                    }
                }
            }
        },

        /**
         * CHECK_CIRCLE - immediate, detects circular dependencies
         */
        check_circle: {
            policy: 'immediate',
            handler: (name, value, sig, state) => {
                let start = value;
                let visited = new Set();

                function check(node) {
                    if (visited.has(node)) {
                        state.fatal = { msg: `circular dependency detected at ${node}` };
                        return true;
                    }
                    visited.add(node);

                    if (state.deps[node]) {
                        for (let dep of Object.keys(state.deps[node])) {
                            if (dep === start) {
                                state.fatal = { msg: `circular dependency: ${start} -> ... -> ${node} -> ${start}` };
                                return true;
                            }
                            if (check(dep)) return true;
                        }
                    }
                    return false;
                }

                check(start);
            }
        }
    };
}

/**
 * Run a function, tracking dependencies
 */
function runFn(target, sig, state) {
    if (state.fatal && state.fatal.msg) return;

    let fn = state.fns[target];
    if (!fn) return;

    // Clear old dependencies
    if (state.deps[target]) {
        for (let dep of Object.keys(state.deps[target])) {
            if (state.dependents[dep]) {
                delete state.dependents[dep][target];
            }
        }
    }
    state.deps[target] = {};

    // Create proxy for tracking reads
    let prevComputing = state.computing;
    state.computing = target;

    let proxy = new Proxy({}, {
        get(_, prop) {
            return sig('get', { target: prop, parent: target });
        },
        set(_, prop, val) {
            state.fatal = { msg: `function ${target} is trying to change value ${prop}` };
            return true;
        }
    });

    try {
        let result = fn(proxy);
        state.cache[target] = result;
    } catch (e) {
        state.fatal = { msg: `exception in ${target}: ${e.message}` };
    } finally {
        state.computing = prevComputing;
    }
}

/**
 * Create initial state for reactive system
 */
function createReactiveState() {
    return {
        cache: {},       // current values
        fns: {},         // computed functions
        deps: {},        // name -> { dep: true, ... }
        dependents: {},  // name -> { dependent: true, ... }
        computing: null, // currently computing function
        fatal: {}        // error state
    };
}

export { createReactiveHandlers, createReactiveState };
