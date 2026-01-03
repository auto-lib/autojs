/**
 * Test: Async chain execution order
 *
 * This test captures the pattern where:
 * - async_1 → async_2 → sync_3
 * - When async_1 completes, async_2 should execute
 * - But sync_3 should NOT execute until async_2 completes
 * - Tests that we don't execute functions whose dependencies are Promises
 */

export default {
    setup: ({ DirectedGraph, Resolver }) => {
        const executionLog = [];

        const functions = {
            trigger: null,

            // First async (fetches data)
            async_1: async ($) => {
                if (!$.trigger) return null;
                executionLog.push('async_1_start');
                await new Promise(resolve => setTimeout(resolve, 20));
                executionLog.push('async_1_complete');
                return { data: 'from_async_1' };
            },

            // Second async (transforms data from async_1)
            async_2: async ($) => {
                const input = $.async_1;
                if (!input) return null;
                executionLog.push('async_2_start');
                await new Promise(resolve => setTimeout(resolve, 20));
                executionLog.push('async_2_complete');
                return { data: input.data + '_transformed' };
            },

            // Sync function (uses result from async_2)
            sync_3: ($) => {
                const input = $.async_2;
                if (!input) return null;
                executionLog.push('sync_3_execute');
                return input.data + '_final';
            }
        };

        const graph = new DirectedGraph();
        graph.addNode('trigger');
        graph.addNode('async_1');
        graph.addNode('async_2');
        graph.addNode('sync_3');
        graph.addEdge('trigger', 'async_1');
        graph.addEdge('async_1', 'async_2');
        graph.addEdge('async_2', 'sync_3');

        const resolver = new Resolver(graph, functions);

        return { resolver, executionLog };
    },

    tests: async ({ resolver, executionLog }) => {
        // Trigger the chain
        resolver.set('trigger', true);

        // Wait for all async operations to complete
        await new Promise(resolve => setTimeout(resolve, 100));

        // Expected execution order:
        // 1. async_1_start
        // 2. async_1_complete
        // 3. async_2_start (NOT before async_1 completes)
        // 4. async_2_complete
        // 5. sync_3_execute (NOT before async_2 completes)

        const expectedOrder = [
            'async_1_start',
            'async_1_complete',
            'async_2_start',
            'async_2_complete',
            'sync_3_execute'
        ];

        // Check order
        if (JSON.stringify(executionLog) !== JSON.stringify(expectedOrder)) {
            throw new Error(`Execution order incorrect.\nExpected: ${expectedOrder.join(' → ')}\nActual: ${executionLog.join(' → ')}`);
        }

        // Check final value
        const final = resolver.get('sync_3');
        if (final !== 'from_async_1_transformed_final') {
            throw new Error(`Final value incorrect. Expected "from_async_1_transformed_final", got "${final}"`);
        }

        return {
            executionLog,
            finalValue: final,
            passed: true
        };
    }
};
