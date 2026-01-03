/**
 * Module 5: Auto (Integration Layer)
 *
 * Provides simple API for users:
 * - auto(definition) - Single reactive object
 * - blocks(blockConfigs, wires) - Multiple blocks system
 */

import DirectedGraph from './directed-graph.js';
import { buildGraph } from './static-analysis.js';
import { Block, autoWire, buildCrossBlockGraph, combineBlockFunctions } from './blocks.js';
import { Resolver } from './resolver.js';

/**
 * Create a simple reactive object (single block)
 *
 * @param {Object} definition - Object with { varName: valueOrFunction }
 * @param {Object} options - Optional configuration (for compatibility, mostly ignored)
 * @returns {Proxy} - Proxy object that intercepts get/set
 */
export default function auto(definition, options = {}) {
    const tag = options.tag || 'auto';

    // Build graph from definition
    const graph = buildGraph(definition);

    // Create resolver
    const resolver = new Resolver(graph, definition);

    // Eagerly compute all initial values (like v0.54)
    // Try to resolve each function individually - if there's a circular dependency,
    // it will be caught and stored in _fatal, but other functions can still resolve
    for (let name of Object.keys(definition)) {
        if (typeof definition[name] === 'function') {
            // Skip special properties (starting with # like #fatal - these are callbacks, not computed)
            if (name.startsWith('#')) {
                continue;
            }

            try {
                resolver.get(name);  // This will resolve it if not circular
            } catch (err) {
                // Circular dependency or other error - already stored in _fatal by get()
                console.error(`[${tag}] Failed to resolve ${name}:`, err.message);
            }
        }
    }

    // Store options (for future use)
    const opts = {
        tag: options.tag,
        watch: options.watch || {},
        auto_batch: options.auto_batch !== undefined ? options.auto_batch : true,
        deep_equal: options.deep_equal !== undefined ? options.deep_equal : true,
        max_calls_per_second: options.max_calls_per_second || 10,
        call_rate_grace_period: options.call_rate_grace_period || 3000,
        excessive_calls_exclude: options.excessive_calls_exclude || {},
        report_lag: options.report_lag || 100,
        ...options
    };

    // Create subscription accessor
    // Pre-populate it with all variable names so Object.keys() works
    const subscriptionBase = {};
    for (let name of Object.keys(definition)) {
        subscriptionBase[name] = {
            subscribe: (callback) => resolver.subscribe(name, callback),
            set: (value) => resolver.set(name, value),
            // Optional update method for Svelte store compatibility
            update: (fn) => {
                const current = resolver.get(name);
                resolver.set(name, fn(current));
            }
        };
    }

    const subscriptionAccessor = new Proxy(subscriptionBase, {
        get(target, varName) {
            // If it exists in target, return it
            if (varName in target) {
                return target[varName];
            }
            // Otherwise create it dynamically
            return {
                subscribe: (callback) => resolver.subscribe(varName, callback),
                set: (value) => resolver.set(varName, value),
                update: (fn) => {
                    const current = resolver.get(varName);
                    resolver.set(varName, fn(current));
                }
            };
        }
    });

    // Return proxy for get/set access
    return new Proxy(definition, {
        get(target, prop) {
            if (prop === '_resolver') return resolver;
            if (prop === '_graph') return graph;
            if (prop === '_options') return opts;
            if (prop === 'v') return 'blocks-0.1.0'; // Version string
            if (prop === '#') return subscriptionAccessor;
            if (prop === '_') {
                // Provide $._  compatibility for tests
                return {
                    fn: Array.from(graph.nodes).filter(name => typeof definition[name] === 'function'),
                    deps: (() => {
                        const deps = {};
                        for (let node of graph.nodes) {
                            const predecessors = graph.getPredecessors(node);
                            if (predecessors.length > 0) {
                                deps[node] = Object.fromEntries(predecessors.map(p => [p, true]));
                            }
                        }
                        return deps;
                    })(),
                    value: resolver.getAllValues(),
                    subs: (() => {
                        const subs = {};
                        for (let [name] of Object.entries(definition)) {
                            const ids = resolver.getSubscriptionIds(name);
                            if (ids.length > 0) {
                                subs[name] = ids;
                            }
                        }
                        return subs;
                    })(),
                    fatal: resolver._fatal
                };
            }
            return resolver.get(prop);
        },

        set(target, prop, value) {
            resolver.set(prop, value);
            return true;
        }
    });
}

/**
 * Create a multi-block system
 *
 * @param {Array} blockConfigs - Array of block configurations
 * @param {Array|string} wires - Wire array or 'auto' for auto-wiring
 * @returns {Object} - System with blocks, graph, resolver, and proxy access
 */
export function blocks(blockConfigs, wires = 'auto') {
    // Create blocks
    const blockInstances = blockConfigs.map(config => new Block(config));

    // Determine wiring
    let wiresArray;
    if (wires === 'auto') {
        wiresArray = autoWire(blockInstances);
    } else {
        wiresArray = wires || [];
    }

    // Build cross-block graph
    const graph = buildCrossBlockGraph(blockInstances, wiresArray);

    // Combine all functions
    const allFunctions = combineBlockFunctions(blockInstances, wiresArray);

    // Create resolver
    const resolver = new Resolver(graph, allFunctions);

    // Create proxy for easy access
    const proxy = new Proxy({}, {
        get(target, prop) {
            // Special accessors
            if (prop === '_blocks') return blockInstances;
            if (prop === '_graph') return graph;
            if (prop === '_resolver') return resolver;
            if (prop === '_wires') return wiresArray;

            // Variable access (namespaced)
            return resolver.get(prop);
        },

        set(target, prop, value) {
            resolver.set(prop, value);
            return true;
        }
    });

    return {
        blocks: blockInstances,
        wires: wiresArray,
        graph,
        resolver,
        proxy,

        // Convenience methods
        get: (name) => resolver.get(name),
        set: (name, value) => resolver.set(name, value),
        resolve: () => resolver.resolveAll(),

        // Get block by name
        getBlock: (name) => blockInstances.find(b => b.name === name),

        // Get variable from specific block
        getVar: (blockName, varName) => {
            return resolver.get(`${blockName}.${varName}`);
        },

        // Set variable in specific block
        setVar: (blockName, varName, value) => {
            resolver.set(`${blockName}.${varName}`, value);
        }
    };
}

/**
 * Helper to run all blocks until stable (resolve all stale values)
 */
export function runAll(blocksOrSystem) {
    if (Array.isArray(blocksOrSystem)) {
        // Called with array of blocks - need to build system first
        const system = blocks(
            blocksOrSystem.map(b => ({
                name: b.name,
                inputs: b.inputs,
                outputs: b.outputs,
                functions: b.functions
            })),
            autoWire(blocksOrSystem)
        );
        system.resolver.resolveAll();
        return system;
    } else {
        // Called with system object
        blocksOrSystem.resolver.resolveAll();
        return blocksOrSystem;
    }
}
