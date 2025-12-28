/**
 * EXAMPLE - Diff-Driven Testing with Blocks
 *
 * Demonstrates the complete workflow:
 * 1. Define blocks with needs/gives
 * 2. Wire blocks together
 * 3. Run with data
 * 4. Modify code and re-run
 * 5. Diff charts and trace causality
 */

import { diffDrivenTest } from './src/test-framework.js';
import { toDotWithBlocks } from './src/cross-block-graph.js';

/**
 * Example: Price charting application
 *
 * Pipeline:
 * - DataBlock: Fetches and parses data
 * - TransformBlock: Applies currency conversion
 * - ChartBlock: Generates chart output
 */

// Mock data fetcher
const mockFetcher = async (url) => {
    console.log(`Fetching: ${url}`);
    return {
        prices: [100, 105, 103, 108, 112],
        dates: ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05']
    };
};

// ORIGINAL CODE - USD prices
const codeOriginal = [
    // Block 1: Data ingestion
    {
        name: 'data',
        needs: ['prices', 'dates'],
        gives: ['priceCount', 'dateRange'],
        state: {
            priceCount: ($) => $.prices.length,
            dateRange: ($) => `${$.dates[0]} to ${$.dates[$.dates.length - 1]}`
        }
    },

    // Block 2: Currency conversion
    {
        name: 'transform',
        needs: ['prices'],  // Will be wired from data block
        gives: ['convertedPrices', 'currency'],
        state: {
            currency: 'USD',  // Static
            convertedPrices: ($) => $.prices  // No conversion for USD
        }
    },

    // Block 3: Chart generation
    {
        name: 'chart',
        needs: ['convertedPrices', 'dateRange', 'currency'],
        gives: ['chartData', 'title'],
        state: {
            title: ($) => `Prices in ${$.currency}`,
            chartData: ($) => ({
                values: $.convertedPrices,
                range: $.dateRange,
                min: Math.min(...$.convertedPrices),
                max: Math.max(...$.convertedPrices),
                avg: $.convertedPrices.reduce((a, b) => a + b, 0) / $.convertedPrices.length
            })
        }
    }
];

// MODIFIED CODE - EUR prices with conversion
const codeModified = [
    // Block 1: Data ingestion (unchanged)
    {
        name: 'data',
        needs: ['prices', 'dates'],
        gives: ['priceCount', 'dateRange'],
        state: {
            priceCount: ($) => $.prices.length,
            dateRange: ($) => `${$.dates[0]} to ${$.dates[$.dates.length - 1]}`
        }
    },

    // Block 2: Currency conversion (CHANGED)
    {
        name: 'transform',
        needs: ['prices'],
        gives: ['convertedPrices', 'currency'],
        state: {
            currency: 'EUR',  // Changed from USD
            exchangeRate: 0.85,  // NEW
            convertedPrices: ($) => $.prices.map(p => p * $.exchangeRate)  // CHANGED
        }
    },

    // Block 3: Chart generation (unchanged)
    {
        name: 'chart',
        needs: ['convertedPrices', 'dateRange', 'currency'],
        gives: ['chartData', 'title'],
        state: {
            title: ($) => `Prices in ${$.currency}`,
            chartData: ($) => ({
                values: $.convertedPrices,
                range: $.dateRange,
                min: Math.min(...$.convertedPrices),
                max: Math.max(...$.convertedPrices),
                avg: $.convertedPrices.reduce((a, b) => a + b, 0) / $.convertedPrices.length
            })
        }
    }
];

/**
 * Run the diff-driven test
 */
async function main() {
    console.log('=== BLOCKS KERNEL: DIFF-DRIVEN TESTING EXAMPLE ===\n');

    const result = await diffDrivenTest({
        name: 'price-chart',
        url: 'http://api.example.com/prices?dataset=oil',
        fetcher: mockFetcher,
        codeOriginal,
        codeModified
    });

    console.log('Test completed!\n');

    // Show the report
    console.log(result.report);

    // Show graph visualization
    console.log('=== GRAPH VISUALIZATION (DOT format) ===\n');
    console.log('ORIGINAL GRAPH:');
    console.log(toDotWithBlocks(result.original.graph, result.original.blocks));
    console.log('\nMODIFIED GRAPH:');
    console.log(toDotWithBlocks(result.modified.graph, result.modified.blocks));

    // Show analysis
    console.log('\n=== GRAPH ANALYSIS ===\n');
    console.log('ORIGINAL:');
    console.log(JSON.stringify(result.original.analysis, null, 2));
    console.log('\nMODIFIED:');
    console.log(JSON.stringify(result.modified.analysis, null, 2));

    // Summary
    console.log('\n=== SUMMARY ===');
    console.log(`Blocks in original: ${result.original.blocks.length}`);
    console.log(`Blocks in modified: ${result.modified.blocks.length}`);
    console.log(`Chart values changed: ${result.comparison.chart.type === 'changed'}`);
    console.log(`Causality traces found: ${result.causality.length}`);

    if (result.causality.length > 0) {
        console.log('\nRoot causes of chart changes:');
        for (let trace of result.causality) {
            console.log(`  - ${trace.chartVariable} changed because:`);
            const uniqueBlocks = new Set(trace.affectedBy.map(d => d.block));
            console.log(`    Variables in ${Array.from(uniqueBlocks).join(', ')} changed`);
        }
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { codeOriginal, codeModified, mockFetcher };
