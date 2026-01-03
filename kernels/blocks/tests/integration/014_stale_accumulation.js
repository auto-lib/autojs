/**
 * Test: Stale functions should not accumulate
 *
 * This test captures the performance issue where:
 * - Clicking repeatedly causes slowdown
 * - Functions that can't execute (deps are Promises) stay in stale set
 * - Each resolveAll() iterates through accumulated stale functions
 * - Should: only keep functions stale if they truly need execution
 */

export default {
    setup: ({ DirectedGraph, Resolver }) => {
        let resolveAllCallCount = 0;
        let staleSetSizes = [];

        const functions = {
            ui_name: null,

            // Async fetch (simulates API call)
            data_async: async ($) => {
                await new Promise(resolve => setTimeout(resolve, 20));
                return { name: $.ui_name || 'default' };
            },

            // Sync transform (depends on async)
            transformed: ($) => {
                const data = $.data_async;
                if (!data) return null;
                return data.name.toUpperCase();
            }
        };

        const graph = new DirectedGraph();
        graph.addNode('ui_name');
        graph.addNode('data_async');
        graph.addNode('transformed');
        graph.addEdge('ui_name', 'data_async');
        graph.addEdge('data_async', 'transformed');

        const resolver = new Resolver(graph, functions);

        // Wrap resolveAll to track calls and stale set size
        const originalResolveAll = resolver.resolveAll.bind(resolver);
        resolver.resolveAll = function() {
            resolveAllCallCount++;
            staleSetSizes.push(this.stale.size);
            return originalResolveAll();
        };

        return {
            resolver,
            getResolveAllCallCount: () => resolveAllCallCount,
            getStaleSetSizes: () => staleSetSizes,
            getStaleSet: () => Array.from(resolver.stale)
        };
    },

    tests: async ({ resolver, getResolveAllCallCount, getStaleSetSizes, getStaleSet }) => {
        // Click 1: Change ui_name
        resolver.set('ui_name', 'dataset_a');
        await new Promise(resolve => setTimeout(resolve, 50));

        const staleAfterClick1 = getStaleSet();

        // Click 2: Change ui_name again
        resolver.set('ui_name', 'dataset_b');
        await new Promise(resolve => setTimeout(resolve, 50));

        const staleAfterClick2 = getStaleSet();

        // Click 3: Change ui_name again
        resolver.set('ui_name', 'dataset_c');
        await new Promise(resolve => setTimeout(resolve, 50));

        const staleAfterClick3 = getStaleSet();

        // After all async completes, stale set should be empty
        if (staleAfterClick3.length > 0) {
            throw new Error(`Stale set not empty after async completes. Contains: ${staleAfterClick3.join(', ')}`);
        }

        // Check that stale set sizes don't keep growing
        const sizes = getStaleSetSizes();
        const maxSize = Math.max(...sizes);

        // Max stale size should be reasonable (not accumulating)
        // With 2 functions to execute (data_async, transformed), max should be ~2
        if (maxSize > 5) {
            throw new Error(`Stale set grew too large (max ${maxSize}). Sizes: ${sizes.join(', ')}`);
        }

        return {
            resolveAllCallCount: getResolveAllCallCount(),
            staleSetSizes: sizes,
            maxStaleSize: maxSize,
            finalStale: staleAfterClick3,
            passed: true
        };
    }
};
