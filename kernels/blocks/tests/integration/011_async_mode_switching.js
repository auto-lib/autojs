/**
 * Test: Async mode switching (like chart_only in prices-app)
 *
 * This test captures the pattern where:
 * - There are two async data sources (titles vs specific dataset)
 * - A router function selects which one based on mode
 * - Changing ui_name should NOT refetch titles
 */

export default {
    setup: ({ DirectedGraph, Resolver }) => {
        let titlesFetchCount = 0;
        let datasetFetchCount = 0;

        const functions = {
            // Mode flag
            chart_only: false,

            // User-selected dataset name
            ui_name: null,

            // Async: Fetch all titles (expensive, should only run once)
            titles_async: async ($) => {
                titlesFetchCount++;
                await new Promise(resolve => setTimeout(resolve, 10));
                return ['dataset_a', 'dataset_b', 'dataset_c'];
            },

            // Async: Fetch specific dataset (for chart_only mode)
            dataset_async: async ($) => {
                // Only fetch in chart_only mode
                if (!$.chart_only) return null;

                datasetFetchCount++;
                await new Promise(resolve => setTimeout(resolve, 10));
                // Parse ui_name or use default
                const name = $.ui_name || 'default';
                return { name, data: [1, 2, 3] };
            },

            // Router: Select data source based on mode
            data_source: ($) => {
                if ($.chart_only) return $.dataset_async;
                else return $.titles_async;
            },

            // Find dataset in titles
            selected_dataset: ($) => {
                if ($.chart_only) return $.data_source;

                const name = $.ui_name || 'dataset_a';
                const titles = $.data_source;
                return titles.find(t => t === name);
            },

            // Process dataset (depends on selected_dataset)
            processed: ($) => {
                const dataset = $.selected_dataset;
                if (!dataset) return null;
                return `Processed: ${dataset}`;
            }
        };

        const graph = new DirectedGraph();
        const deps = {
            titles_async: [],
            dataset_async: ['chart_only', 'ui_name'],  // Depends on chart_only for guard clause
            data_source: ['chart_only', 'titles_async', 'dataset_async'],
            selected_dataset: ['chart_only', 'data_source', 'ui_name'],
            processed: ['selected_dataset']
        };

        for (let [name, depList] of Object.entries(deps)) {
            graph.addNode(name);
            for (let dep of depList) {
                graph.addNode(dep);
                graph.addEdge(dep, name);
            }
        }

        const resolver = new Resolver(graph, functions);

        return { resolver, titlesFetchCount: () => titlesFetchCount, datasetFetchCount: () => datasetFetchCount };
    },

    tests: async ({ resolver, titlesFetchCount, datasetFetchCount }) => {
        const results = [];

        // Test 1: Initial load in normal mode
        resolver.resolveAll();
        await new Promise(resolve => setTimeout(resolve, 50)); // Wait for async

        const result1 = {
            test: 'Initial load (normal mode)',
            titlesFetchCount: titlesFetchCount(),
            datasetFetchCount: datasetFetchCount(),
            processed: resolver.get('processed')
        };
        results.push(result1);

        // Expected: titles fetched once, dataset not fetched
        if (titlesFetchCount() !== 1) {
            throw new Error(`Initial load: Expected titles to fetch once, got ${titlesFetchCount()}`);
        }
        if (datasetFetchCount() !== 0) {
            throw new Error(`Initial load: Expected dataset not to fetch, got ${datasetFetchCount()}`);
        }

        // Test 2: Change ui_name (like clicking on search result)
        resolver.set('ui_name', 'dataset_b');
        await new Promise(resolve => setTimeout(resolve, 50)); // Wait for async

        const result2 = {
            test: 'After changing ui_name',
            titlesFetchCount: titlesFetchCount(),
            datasetFetchCount: datasetFetchCount(),
            processed: resolver.get('processed')
        };
        results.push(result2);

        // Expected: titles NOT refetched (still 1), dataset still not fetched
        if (titlesFetchCount() !== 1) {
            throw new Error(`After ui_name change: Expected titles to stay at 1, got ${titlesFetchCount()}`);
        }
        if (datasetFetchCount() !== 0) {
            throw new Error(`After ui_name change: Expected dataset not to fetch, got ${datasetFetchCount()}`);
        }

        // Test 3: Change ui_name again
        resolver.set('ui_name', 'dataset_c');
        await new Promise(resolve => setTimeout(resolve, 50)); // Wait for async

        const result3 = {
            test: 'After changing ui_name again',
            titlesFetchCount: titlesFetchCount(),
            datasetFetchCount: datasetFetchCount(),
            processed: resolver.get('processed')
        };
        results.push(result3);

        // Expected: titles STILL not refetched (still 1)
        if (titlesFetchCount() !== 1) {
            throw new Error(`After second ui_name change: Expected titles to stay at 1, got ${titlesFetchCount()}`);
        }

        // Test 4: Switch to chart_only mode
        resolver.set('chart_only', true);
        await new Promise(resolve => setTimeout(resolve, 50)); // Wait for async

        const result4 = {
            test: 'After switching to chart_only mode',
            titlesFetchCount: titlesFetchCount(),
            datasetFetchCount: datasetFetchCount(),
            processed: resolver.get('processed')
        };
        results.push(result4);

        // Expected: dataset NOW fetched (1)
        if (datasetFetchCount() !== 1) {
            throw new Error(`After chart_only: Expected dataset to fetch once, got ${datasetFetchCount()}`);
        }

        return results;
    }
};
