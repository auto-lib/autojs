/**
 * Strategy 2: Runtime Dependency Tracking (Hybrid Approach)
 *
 * Track actual dependencies during execution and update the graph accordingly.
 * Graph becomes mutable, but tracking is precise.
 */

import { ReactiveGraph, GraphState } from './graph-first.js';

/**
 * Graph that can update its structure based on runtime behavior
 */
export class MutableReactiveGraph extends ReactiveGraph {
    constructor(definition, options = {}) {
        super(definition, options);
        this.mutable = true;
        this.updateCount = 0;
    }

    updateDependencies(name, newDeps) {
        this.updateCount++;

        const oldDeps = this.edges.get(name);

        // Update forward edges
        this.edges.set(name, new Set(newDeps));

        // Rebuild reverse edges for affected nodes
        // Remove old reverse edges
        if (oldDeps) {
            for (let dep of oldDeps) {
                const depDependents = this.reverseEdges.get(dep);
                if (depDependents) {
                    depDependents.delete(name);
                }
            }
        }

        // Add new reverse edges
        for (let dep of newDeps) {
            if (!this.reverseEdges.has(dep)) {
                this.reverseEdges.set(dep, new Set());
            }
            this.reverseEdges.get(dep).add(name);
        }

        // Recompute execution order
        this._computeExecutionOrder();

        return { oldDeps: oldDeps || new Set(), newDeps: new Set(newDeps) };
    }
}

/**
 * GraphState that tracks actual dependencies during execution
 */
export class RuntimeTrackingState extends GraphState {
    constructor(graph, initialValues = {}) {
        super(graph, initialValues);
        this.trackingEnabled = true;
        this.actualDependencies = new Map(); // name -> Set of actually accessed deps
    }

    _compute(name) {
        const node = this.graph.nodes.get(name);
        if (!node || !node.fn) return;

        if (this.computing.has(name)) {
            throw new Error(`Circular computation detected involving: ${name}`);
        }

        this.computing.add(name);

        try {
            // Track actual accesses
            const actualDeps = new Set();
            const self = this;

            const proxy = new Proxy(this, {
                get(target, prop) {
                    if (prop === name) {
                        throw new Error(`Variable ${name} cannot reference itself`);
                    }

                    // Track this access
                    if (self.trackingEnabled) {
                        actualDeps.add(prop);
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

            // Update graph if dependencies changed
            if (this.trackingEnabled && this.graph.mutable) {
                this._updateGraphIfNeeded(name, actualDeps);
            }

            // Store for introspection
            this.actualDependencies.set(name, actualDeps);
        } finally {
            this.computing.delete(name);
        }
    }

    _updateGraphIfNeeded(name, actualDeps) {
        const staticDeps = this.graph.edges.get(name);

        // Check if dependencies changed
        if (!staticDeps || !this._setsEqual(staticDeps, actualDeps)) {
            const result = this.graph.updateDependencies(name, actualDeps);

            if (this.graph.options?.debug) {
                console.log(`[${name}] Dependencies updated:`, {
                    old: Array.from(result.oldDeps),
                    new: Array.from(result.newDeps)
                });
            }
        }
    }

    _setsEqual(set1, set2) {
        if (set1.size !== set2.size) return false;
        for (let item of set1) {
            if (!set2.has(item)) return false;
        }
        return true;
    }
}

/**
 * Auto function that uses runtime tracking
 */
export function autoWithRuntimeTracking(definition, options = {}) {
    const graph = new MutableReactiveGraph(definition, options);
    const state = new RuntimeTrackingState(graph, definition);

    const proxy = new Proxy(state, {
        get(target, prop) {
            if (prop === '_') {
                return {
                    graph: graph,
                    deps: Object.fromEntries(
                        Array.from(graph.edges.entries()).map(([k, v]) => [k, Array.from(v)])
                    ),
                    actualDeps: Object.fromEntries(
                        Array.from(state.actualDependencies.entries()).map(([k, v]) => [k, Array.from(v)])
                    ),
                    dependents: Object.fromEntries(
                        Array.from(graph.reverseEdges.entries()).map(([k, v]) => [k, Array.from(v)])
                    ),
                    fn: Array.from(graph.nodes.entries())
                        .filter(([_, node]) => node.type === 'computed')
                        .map(([name, _]) => name),
                    value: Object.fromEntries(state.values),
                    dirty: Array.from(state.dirty),
                    order: graph.executionOrder,
                    updateCount: graph.updateCount
                };
            }

            if (prop === 'flush') {
                return () => state.flush();
            }

            if (prop === 'visualize') {
                return () => graph.toDot();
            }

            return target.get(prop);
        },
        set(target, prop, value) {
            if (prop === '_' || prop === 'flush' || prop === 'visualize') {
                throw new Error(`Cannot set reserved property: ${prop}`);
            }
            target.set(prop, value);
            return true;
        }
    });

    return proxy;
}

/**
 * Test/Demo
 */
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('=== Runtime Dependency Tracking Demo ===\n');

    const $ = autoWithRuntimeTracking({
        mode: 'simple',
        data: [1, 2, 3],
        extra: { detail: 'info' },
        result: ($) => {
            if ($.mode === 'simple') {
                return $.data.length;
            } else {
                return $.data.join(',') + ' ' + $.extra.detail;
            }
        }
    }, { debug: true });

    console.log('1. Initial access (mode=simple):');
    console.log('   result =', $.result);
    console.log('   Static deps:', $._.deps.result);
    console.log('   Actual deps:', $._.actualDeps.result);
    console.log('   Graph updates:', $._.updateCount);
    console.log();

    console.log('2. Change extra (should NOT trigger recompute):');
    $.extra = { detail: 'changed' };
    console.log('   result =', $.result);
    console.log('   Dirty:', $._.dirty);
    console.log();

    console.log('3. Change mode to detailed:');
    $.mode = 'detailed';
    console.log('   result =', $.result);
    console.log('   Static deps:', $._.deps.result);
    console.log('   Actual deps:', $._.actualDeps.result);
    console.log('   Graph updates:', $._.updateCount);
    console.log();

    console.log('4. Now change extra (SHOULD trigger recompute):');
    $.extra = { detail: 'new value' };
    console.log('   result =', $.result);
    console.log();

    console.log('5. Change back to simple mode:');
    $.mode = 'simple';
    console.log('   result =', $.result);
    console.log('   Static deps:', $._.deps.result);
    console.log('   Actual deps:', $._.actualDeps.result);
    console.log('   Graph updates:', $._.updateCount);
    console.log();

    console.log('6. Change extra again (should NOT trigger):');
    const before = $.result;
    $.extra = { detail: 'another change' };
    const after = $.result;
    console.log('   result before:', before);
    console.log('   result after:', after);
    console.log('   Recomputed?', before !== after ? 'YES' : 'NO');
    console.log('   Total graph updates:', $._.updateCount);
}
