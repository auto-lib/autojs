/**
 * Test: Functions with pending async dependencies should be skipped
 *
 * This test captures the issue where:
 * - sync_func depends on async_func
 * - When async_func returns a Promise, sync_func should NOT execute
 * - sync_func should only execute once async_func completes
 * - Tests that _execute returns false for skipped functions
 */

export default {
    setup: ({ DirectedGraph, Resolver }) => {
        let syncExecutionCount = 0;

        const functions = {
            trigger: null,

            // Async function (takes time to complete)
            async_func: async ($) => {
                if (!$.trigger) return null;
                await new Promise(resolve => setTimeout(resolve, 30));
                return 'async_complete';
            },

            // Sync function that depends on async
            sync_func: ($) => {
                syncExecutionCount++;
                const value = $.async_func;

                // If async_func is still a Promise, this should NOT be called
                if (value && typeof value.then === 'function') {
                    throw new Error('sync_func was called with a Promise! Should have been skipped.');
                }

                return value ? value.toUpperCase() : null;
            }
        };

        const graph = new DirectedGraph();
        graph.addNode('trigger');
        graph.addNode('async_func');
        graph.addNode('sync_func');
        graph.addEdge('trigger', 'async_func');
        graph.addEdge('async_func', 'sync_func');

        const resolver = new Resolver(graph, functions);

        return { resolver, getSyncExecutionCount: () => syncExecutionCount };
    },

    tests: async ({ resolver, getSyncExecutionCount }) => {
        // Trigger the chain
        resolver.set('trigger', true);

        // Immediately try to get sync_func (while async is still pending)
        const duringAsync = resolver.get('sync_func');

        // sync_func should NOT have executed yet (count should be 0)
        if (getSyncExecutionCount() !== 0) {
            throw new Error(`sync_func executed ${getSyncExecutionCount()} times during async. Should be 0 (skipped).`);
        }

        // Wait for async to complete
        await new Promise(resolve => setTimeout(resolve, 50));

        // Now sync_func should execute
        const afterAsync = resolver.get('sync_func');

        // sync_func should have executed exactly once
        if (getSyncExecutionCount() !== 1) {
            throw new Error(`sync_func executed ${getSyncExecutionCount()} times after async. Should be 1.`);
        }

        // Check final value
        if (afterAsync !== 'ASYNC_COMPLETE') {
            throw new Error(`Final value incorrect. Expected "ASYNC_COMPLETE", got "${afterAsync}"`);
        }

        return {
            syncExecutionCount: getSyncExecutionCount(),
            finalValue: afterAsync,
            passed: true
        };
    }
};
