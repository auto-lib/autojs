/**
 * Strategy 3: Explicit Dependencies (Manual Declaration)
 *
 * Users explicitly declare what each computed value depends on.
 * Like React's useEffect dependency array.
 */

import { ReactiveGraph, GraphState } from './graph-first.js';

/**
 * Helper to create computed values with explicit dependencies
 */
export function computed(deps, fn) {
    return { deps, fn, __computed: true };
}

/**
 * Graph that uses explicitly declared dependencies
 */
export class ExplicitDependencyGraph extends ReactiveGraph {
    _build(definition) {
        // First pass: identify nodes
        for (let [name, value] of Object.entries(definition)) {
            let isFunction = false;
            let fn = null;
            let declaredDeps = null;

            // Check if it's a computed value with explicit deps
            if (value && typeof value === 'object' && value.__computed) {
                isFunction = true;
                fn = value.fn;
                declaredDeps = new Set(value.deps);
            } else if (typeof value === 'function') {
                isFunction = true;
                fn = value;
                // No explicit deps - will use discovery as fallback
            }

            this.nodes.set(name, {
                name,
                type: isFunction ? 'computed' : 'static',
                fn: fn,
                declaredDeps: declaredDeps
            });
        }

        // Second pass: use declared dependencies or discover
        for (let [name, node] of this.nodes) {
            if (node.type === 'computed') {
                let deps;

                if (node.declaredDeps) {
                    // Use explicitly declared dependencies
                    deps = node.declaredDeps;

                    // Validate: all declared deps exist
                    for (let dep of deps) {
                        if (!this.nodes.has(dep)) {
                            throw new Error(
                                `Invalid dependency: '${name}' declares dependency on '${dep}' which doesn't exist`
                            );
                        }
                    }
                } else {
                    // Fallback to discovery for regular functions
                    deps = this._discoverDependencies(node.fn, name);
                }

                this.edges.set(name, deps);

                // Build reverse edges
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
        // Fallback discovery for functions without explicit deps
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
}

/**
 * Auto function that uses explicit dependencies
 */
export function autoWithExplicitDeps(definition, options = {}) {
    const graph = new ExplicitDependencyGraph(definition, options);
    const state = new GraphState(graph, definition);

    const proxy = new Proxy(state, {
        get(target, prop) {
            if (prop === '_') {
                return {
                    graph: graph,
                    deps: Object.fromEntries(
                        Array.from(graph.edges.entries()).map(([k, v]) => [k, Array.from(v)])
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
    console.log('=== Explicit Dependencies Demo ===\n');

    console.log('1. Create with explicit dependencies:');
    const $ = autoWithExplicitDeps({
        mode: 'simple',
        data: [1, 2, 3],
        extra: 'info',

        // Explicit: only depends on mode and data
        result: computed(['mode', 'data'], ($) => {
            if ($.mode === 'simple') {
                return $.data.length;
            } else {
                return $.data.join(',') + ' ' + $.extra;
            }
        }),

        // Another computed with explicit deps
        summary: computed(['result'], ($) => {
            return `Result is: ${$.result}`;
        })
    });

    console.log('   Dependencies:', $._.deps);
    console.log('   Execution order:', $._.order);
    console.log();

    console.log('2. Initial access:');
    console.log('   result =', $.result);
    console.log('   summary =', $.summary);
    console.log();

    console.log('3. Change extra (NOT in deps, should not trigger):');
    const before = $.result;
    $.extra = 'new info';
    const after = $.result;
    console.log('   result before:', before);
    console.log('   result after:', after);
    console.log('   Recomputed?', before !== after ? 'YES' : 'NO');
    console.log();

    console.log('4. Change mode (IS in deps, should trigger):');
    $.mode = 'detailed';
    console.log('   result =', $.result);
    console.log('   summary =', $.summary);
    console.log();

    console.log('5. Now extra is used, but still not in deps!');
    console.log('   ⚠️ BUG: result uses $.extra but it\'s not declared');
    console.log('   Changing extra again:');
    $.extra = 'another value';
    console.log('   result =', $.result);
    console.log('   ⚠️ Result is stale! Should include "another value"');
    console.log();

    console.log('6. Try invalid dependency (should throw):');
    try {
        const $bad = autoWithExplicitDeps({
            data: [1, 2, 3],
            result: computed(['nonexistent'], ($) => $.data.length)
        });
    } catch (e) {
        console.log('   ✓ Caught error:', e.message);
    }
    console.log();

    console.log('=== Comparison: Explicit vs Auto-discovered ===\n');

    console.log('Explicit (must declare):');
    const $explicit = autoWithExplicitDeps({
        x: 1,
        y: 2,
        sum: computed(['x', 'y'], ($) => $.x + $.y),
        product: computed(['x', 'y'], ($) => $.x * $.y),
        combined: computed(['sum', 'product'], ($) => $.sum + $.product)
    });
    console.log('   Dependencies:', $explicit._.deps);
    console.log();

    console.log('Auto-discovered (no declaration needed):');
    const $auto = autoWithExplicitDeps({
        x: 1,
        y: 2,
        sum: ($) => $.x + $.y,  // Auto-discovers: [x, y]
        product: ($) => $.x * $.y,  // Auto-discovers: [x, y]
        combined: ($) => $.sum + $.product  // Auto-discovers: [sum, product]
    });
    console.log('   Dependencies:', $auto._.deps);
    console.log();

    console.log('Both produce same result:');
    console.log('   Explicit combined =', $explicit.combined);
    console.log('   Auto combined =', $auto.combined);
}
